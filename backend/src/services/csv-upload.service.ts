/**
 * CSV Upload Service
 * Handles CSV file validation, parsing, and table creation
 */

import Papa from 'papaparse';
import { supabase } from '../config/auth.config';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

// Constants
export const CSV_LIMITS = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_ROWS: 1_000_000,
    MAX_COLUMNS: 100,
    MAX_TABLES_PER_ORG: 10,
};

// Types
export interface CsvUploadMetadata {
    id: string;
    orgId: string;
    userId: string;
    filename: string;
    originalFilename: string;
    displayName: string;
    tableName: string;
    rowCount: number;
    columnCount: number;
    columns: ColumnInfo[];
    fileSizeBytes: number;
    encoding: string;
    delimiter: string;
    expiresAt: Date | null;
    status: 'processing' | 'ready' | 'error' | 'expired';
    errorMessage?: string;
    createdAt: Date;
}

export interface ColumnInfo {
    name: string;
    originalName: string;
    type: 'text' | 'integer' | 'numeric' | 'boolean' | 'timestamp';
    nullable: boolean;
}

export interface CsvParseResult {
    data: Record<string, any>[];
    columns: ColumnInfo[];
    rowCount: number;
    columnCount: number;
    errors: string[];
}

export interface UploadOptions {
    encoding?: string;
    delimiter?: string;
    expiresIn?: '24h' | '7d' | '30d' | 'never';
    displayName?: string;
}

/**
 * Detect delimiter in CSV content
 */
function detectDelimiter(content: string): string {
    const firstLine = content.split('\n')[0] || '';
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let detectedDelimiter = ',';

    for (const d of delimiters) {
        const count = (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length;
        if (count > maxCount) {
            maxCount = count;
            detectedDelimiter = d;
        }
    }

    return detectedDelimiter;
}

/**
 * Sanitize column name for PostgreSQL
 */
function sanitizeColumnName(name: string): string {
    // Remove special characters, replace spaces with underscores
    let sanitized = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    // Ensure it starts with a letter
    if (/^[0-9]/.test(sanitized)) {
        sanitized = 'col_' + sanitized;
    }

    // Fallback for empty names
    if (!sanitized) {
        sanitized = 'column';
    }

    return sanitized;
}

/**
 * Infer column type from sample values
 */
function inferColumnType(values: any[]): ColumnInfo['type'] {
    const sampleSize = Math.min(values.length, 100);
    let intCount = 0;
    let numCount = 0;
    let boolCount = 0;
    let nullCount = 0;

    for (let i = 0; i < sampleSize; i++) {
        const val = values[i];

        if (val === null || val === undefined || val === '') {
            nullCount++;
            continue;
        }

        const strVal = String(val).trim().toLowerCase();

        // Check boolean
        if (['true', 'false', 'yes', 'no', '1', '0', 'sim', 'não'].includes(strVal)) {
            boolCount++;
            continue;
        }

        // Check integer
        if (/^-?\d+$/.test(strVal)) {
            intCount++;
            continue;
        }

        // Check numeric (with decimal)
        if (/^-?\d+([.,]\d+)?$/.test(strVal)) {
            numCount++;
            continue;
        }
    }

    const validCount = sampleSize - nullCount;
    if (validCount === 0) return 'text';

    const threshold = 0.8; // 80% of values must match

    if (boolCount / validCount >= threshold) return 'boolean';
    if (intCount / validCount >= threshold) return 'integer';
    if ((intCount + numCount) / validCount >= threshold) return 'numeric';

    return 'text';
}

/**
 * Parse CSV content
 */
export function parseCsv(
    content: string,
    options: { delimiter?: string; encoding?: string } = {}
): CsvParseResult {
    const delimiter = options.delimiter || detectDelimiter(content);

    const parseResult = Papa.parse(content, {
        delimiter,
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
        const criticalErrors = parseResult.errors.filter(
            (e) => e.type === 'Delimiter' || e.type === 'Quotes'
        );
        if (criticalErrors.length > 0) {
            return {
                data: [],
                columns: [],
                rowCount: 0,
                columnCount: 0,
                errors: criticalErrors.map((e) => e.message),
            };
        }
    }

    const data = parseResult.data as Record<string, any>[];
    const headers = parseResult.meta.fields || [];

    // Check limits
    if (data.length > CSV_LIMITS.MAX_ROWS) {
        return {
            data: [],
            columns: [],
            rowCount: 0,
            columnCount: 0,
            errors: [`Arquivo excede o limite de ${CSV_LIMITS.MAX_ROWS.toLocaleString()} linhas`],
        };
    }

    if (headers.length > CSV_LIMITS.MAX_COLUMNS) {
        return {
            data: [],
            columns: [],
            rowCount: 0,
            columnCount: 0,
            errors: [`Arquivo excede o limite de ${CSV_LIMITS.MAX_COLUMNS} colunas`],
        };
    }

    // Process columns
    const usedNames = new Set<string>();
    const columns: ColumnInfo[] = headers.map((header) => {
        let sanitized = sanitizeColumnName(header);

        // Handle duplicates
        let finalName = sanitized;
        let counter = 1;
        while (usedNames.has(finalName)) {
            finalName = `${sanitized}_${counter}`;
            counter++;
        }
        usedNames.add(finalName);

        // Get sample values for type inference
        const values = data.slice(0, 100).map((row) => row[header]);
        const type = inferColumnType(values);
        const nullable = values.some((v) => v === null || v === undefined || v === '');

        return {
            name: finalName,
            originalName: header,
            type,
            nullable,
        };
    });

    return {
        data,
        columns,
        rowCount: data.length,
        columnCount: columns.length,
        errors: [],
    };
}

/**
 * Generate table name for CSV
 */
function generateTableName(orgId: string): string {
    const shortUuid = uuidv4().split('-')[0];
    const orgShort = orgId.split('-')[0];
    return `csv_${orgShort}_${shortUuid}`;
}

/**
 * Calculate expiration date
 */
function calculateExpiresAt(expiresIn?: string): Date | null {
    if (!expiresIn || expiresIn === 'never') return null;

    const now = new Date();
    switch (expiresIn) {
        case '24h':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case '7d':
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        case '30d':
            return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        default:
            return null;
    }
}

/**
 * Main CSV Upload Service
 */
class CsvUploadService {
    /**
     * Check if organization can upload more CSVs
     */
    async canUpload(orgId: string): Promise<{ allowed: boolean; message?: string }> {
        const { count, error } = await supabase
            .from('csv_uploads')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId)
            .in('status', ['processing', 'ready']);

        if (error) {
            logger.error('Error checking upload limit', { error });
            return { allowed: false, message: 'Erro ao verificar limite de uploads' };
        }

        if ((count || 0) >= CSV_LIMITS.MAX_TABLES_PER_ORG) {
            return {
                allowed: false,
                message: `Limite de ${CSV_LIMITS.MAX_TABLES_PER_ORG} tabelas CSV atingido. Exclua alguma para continuar.`,
            };
        }

        return { allowed: true };
    }

    /**
     * Process and upload CSV file
     */
    async processUpload(
        fileBuffer: Buffer,
        originalFilename: string,
        orgId: string,
        userId: string,
        options: UploadOptions = {}
    ): Promise<CsvUploadMetadata> {
        const uploadId = uuidv4();
        const tableName = generateTableName(orgId);
        const encoding = options.encoding || 'UTF-8';
        const expiresAt = calculateExpiresAt(options.expiresIn);

        logger.info('Processing CSV upload', { uploadId, originalFilename, orgId });

        try {
            // Check file size
            if (fileBuffer.length > CSV_LIMITS.MAX_FILE_SIZE) {
                throw new Error(`Arquivo excede o limite de ${CSV_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`);
            }

            // Parse content
            const content = fileBuffer.toString(encoding as BufferEncoding);
            const delimiter = options.delimiter || detectDelimiter(content);
            const parseResult = parseCsv(content, { delimiter });

            if (parseResult.errors.length > 0) {
                throw new Error(parseResult.errors.join('; '));
            }

            // Create metadata record (status: processing)
            const displayName = options.displayName || originalFilename;
            const { error: insertError } = await supabase.from('csv_uploads').insert({
                id: uploadId,
                org_id: orgId,
                user_id: userId,
                filename: tableName,
                original_filename: originalFilename,
                display_name: displayName,
                table_name: tableName,
                row_count: parseResult.rowCount,
                column_count: parseResult.columnCount,
                columns: parseResult.columns,
                file_size_bytes: fileBuffer.length,
                encoding,
                delimiter,
                expires_at: expiresAt,
                status: 'processing',
            });

            if (insertError) {
                throw new Error(`Erro ao salvar metadados: ${insertError.message}`);
            }

            // Create dynamic table
            await this.createDynamicTable(tableName, parseResult.columns, orgId);

            // Insert data
            await this.insertData(tableName, parseResult.data, parseResult.columns);

            // Update status to ready
            await supabase
                .from('csv_uploads')
                .update({ status: 'ready' })
                .eq('id', uploadId);

            logger.info('CSV upload completed', { uploadId, tableName, rows: parseResult.rowCount });

            return {
                id: uploadId,
                orgId,
                userId,
                filename: tableName,
                originalFilename,
                displayName,
                tableName,
                rowCount: parseResult.rowCount,
                columnCount: parseResult.columnCount,
                columns: parseResult.columns,
                fileSizeBytes: fileBuffer.length,
                encoding,
                delimiter,
                expiresAt,
                status: 'ready',
                createdAt: new Date(),
            };
        } catch (error: any) {
            logger.error('CSV upload failed', { uploadId, error: error.message });

            // Update status to error
            await supabase
                .from('csv_uploads')
                .update({ status: 'error', error_message: error.message })
                .eq('id', uploadId);

            throw error;
        }
    }

    /**
     * Create dynamic table for CSV data
     */
    private async createDynamicTable(
        tableName: string,
        columns: ColumnInfo[],
        orgId: string
    ): Promise<void> {
        const columnDefs = columns.map((col) => {
            let sqlType: string;
            switch (col.type) {
                case 'integer':
                    sqlType = 'INTEGER';
                    break;
                case 'numeric':
                    sqlType = 'NUMERIC';
                    break;
                case 'boolean':
                    sqlType = 'BOOLEAN';
                    break;
                case 'timestamp':
                    sqlType = 'TIMESTAMP';
                    break;
                default:
                    sqlType = 'TEXT';
            }
            return `"${col.name}" ${sqlType}${col.nullable ? '' : ' NOT NULL'}`;
        });

        const createTableSql = `
      CREATE TABLE "${tableName}" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL DEFAULT '${orgId}'::uuid,
        ${columnDefs.join(',\n        ')}
      );
      
      CREATE INDEX ON "${tableName}"(org_id);
      
      ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY org_access_${tableName.replace(/-/g, '_')} ON "${tableName}"
        FOR ALL USING (org_id = '${orgId}'::uuid);
    `;

        const { error } = await supabase.rpc('exec_sql', { sql: createTableSql });

        if (error) {
            // Try direct query if RPC not available
            logger.warn('RPC exec_sql not available, table creation may need manual setup', { error });
            throw new Error(`Erro ao criar tabela: ${error.message}`);
        }
    }

    /**
     * Insert data into dynamic table using direct SQL
     */
    private async insertData(
        tableName: string,
        data: Record<string, any>[],
        columns: ColumnInfo[]
    ): Promise<void> {
        // Process data in batches
        const batchSize = 500; // Smaller batches for SQL

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);

            // Build INSERT statement with VALUES
            const columnNames = columns.map((col) => `"${col.name}"`).join(', ');

            const valueRows: string[] = [];
            for (const row of batch) {
                const values: string[] = [];

                for (const col of columns) {
                    let value = row[col.originalName];

                    // Type conversion and SQL escaping
                    if (value === '' || value === null || value === undefined) {
                        values.push('NULL');
                    } else if (col.type === 'integer') {
                        const parsed = parseInt(String(value).replace(/[^\d-]/g, ''), 10);
                        values.push(isNaN(parsed) ? 'NULL' : String(parsed));
                    } else if (col.type === 'numeric') {
                        const parsed = parseFloat(String(value).replace(',', '.'));
                        values.push(isNaN(parsed) ? 'NULL' : String(parsed));
                    } else if (col.type === 'boolean') {
                        const lower = String(value).toLowerCase();
                        values.push(['true', 'yes', '1', 'sim'].includes(lower) ? 'TRUE' : 'FALSE');
                    } else {
                        // Escape single quotes for SQL
                        const escaped = String(value).replace(/'/g, "''");
                        values.push(`'${escaped}'`);
                    }
                }

                valueRows.push(`(${values.join(', ')})`);
            }

            const insertSql = `INSERT INTO "${tableName}" (${columnNames}) VALUES ${valueRows.join(', ')};`;

            const { error } = await supabase.rpc('exec_sql', { sql: insertSql });

            if (error) {
                logger.error('Error inserting batch', { tableName, batchIndex: i / batchSize, error });
                throw new Error(`Erro ao inserir dados: ${error.message}`);
            }

            logger.debug('Batch inserted', { tableName, batchIndex: i / batchSize, rowsInBatch: batch.length });
        }
    }

    /**
     * List CSV uploads for organization
     */
    async listUploads(orgId: string): Promise<CsvUploadMetadata[]> {
        logger.debug('listUploads called', { orgId });

        const { data, error } = await supabase
            .from('csv_uploads')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });

        logger.debug('listUploads query result', {
            orgId,
            count: data?.length || 0,
            error: error?.message,
            rawData: data?.map(d => ({ id: d.id, status: d.status, original_filename: d.original_filename }))
        });

        if (error) {
            logger.error('Error listing uploads', { error });
            throw new Error('Erro ao listar arquivos');
        }

        return (data || []).map((row) => ({
            id: row.id,
            orgId: row.org_id,
            userId: row.user_id,
            filename: row.filename,
            originalFilename: row.original_filename,
            displayName: row.display_name || row.original_filename,
            tableName: row.table_name,
            rowCount: row.row_count,
            columnCount: row.column_count,
            columns: row.columns || [],
            fileSizeBytes: row.file_size_bytes,
            encoding: row.encoding,
            delimiter: row.delimiter,
            expiresAt: row.expires_at ? new Date(row.expires_at) : null,
            status: row.status,
            errorMessage: row.error_message,
            createdAt: new Date(row.created_at),
        }));
    }

    /**
     * Delete CSV upload and its table
     */
    async deleteUpload(uploadId: string, orgId: string): Promise<void> {
        // Get upload info
        const { data: upload, error: fetchError } = await supabase
            .from('csv_uploads')
            .select('table_name')
            .eq('id', uploadId)
            .eq('org_id', orgId)
            .single();

        if (fetchError || !upload) {
            throw new Error('Upload não encontrado');
        }

        // Drop the dynamic table
        const { error: dropError } = await supabase.rpc('exec_sql', {
            sql: `DROP TABLE IF EXISTS "${upload.table_name}" CASCADE;`,
        });

        if (dropError) {
            logger.warn('Could not drop table (may need manual cleanup)', { dropError });
        }

        // Delete metadata
        const { error: deleteError } = await supabase
            .from('csv_uploads')
            .delete()
            .eq('id', uploadId)
            .eq('org_id', orgId);

        if (deleteError) {
            throw new Error(`Erro ao excluir: ${deleteError.message}`);
        }

        logger.info('CSV upload deleted', { uploadId, tableName: upload.table_name });
    }
}

export const csvUploadService = new CsvUploadService();
