/**
 * Data Formatter Service
 * 
 * Transforma dados brutos em informação formatada e legível.
 * Detecta automaticamente tipos de dados e aplica formatação apropriada.
 */

// ==================== Types ====================

export interface FormattedValue {
    /** Valor formatado para exibição */
    display: string;
    /** Valor original (para sorting/filtering) */
    raw: unknown;
    /** Se deve ser oculto na exibição */
    hidden?: boolean;
    /** Tipo de formatação aplicada */
    formatType?: FormatType;
}

export type FormatType =
    | 'currency'
    | 'status'
    | 'timestamp'
    | 'percent'
    | 'id'
    | 'boolean'
    | 'number'
    | 'text';

export interface FormatterOptions {
    /** Ocultar colunas de ID */
    hideIds?: boolean;
    /** Locale para formatação (default: pt-BR) */
    locale?: string;
    /** Moeda (default: BRL) */
    currency?: string;
}

// ==================== Status Mapping ====================

const STATUS_MAP: Record<string, { emoji: string; label: string }> = {
    // Payment/Transaction statuses
    'paid': { emoji: '💰', label: 'Pago' },
    'pending': { emoji: '⏳', label: 'Pendente' },
    'completed': { emoji: '✅', label: 'Completo' },
    'failed': { emoji: '❌', label: 'Falhou' },
    'cancelled': { emoji: '🚫', label: 'Cancelado' },
    'canceled': { emoji: '🚫', label: 'Cancelado' },
    'refunded': { emoji: '↩️', label: 'Reembolsado' },
    'processing': { emoji: '⚙️', label: 'Processando' },
    'approved': { emoji: '✅', label: 'Aprovado' },
    'rejected': { emoji: '❌', label: 'Rejeitado' },

    // Order statuses
    'delivered': { emoji: '📦', label: 'Entregue' },
    'shipped': { emoji: '🚚', label: 'Enviado' },
    'in_transit': { emoji: '🚚', label: 'Em Trânsito' },
    'preparing': { emoji: '📋', label: 'Preparando' },

    // User statuses
    'active': { emoji: '🟢', label: 'Ativo' },
    'inactive': { emoji: '🔴', label: 'Inativo' },
    'blocked': { emoji: '🔒', label: 'Bloqueado' },
    'suspended': { emoji: '⚠️', label: 'Suspenso' },

    // Generic
    'yes': { emoji: '✅', label: 'Sim' },
    'no': { emoji: '❌', label: 'Não' },
    'true': { emoji: '✅', label: 'Sim' },
    'false': { emoji: '❌', label: 'Não' },
    'open': { emoji: '🔓', label: 'Aberto' },
    'closed': { emoji: '🔒', label: 'Fechado' },
    'new': { emoji: '🆕', label: 'Novo' },
};

// ==================== Column Pattern Matching ====================

/**
 * Detecta o tipo de formatação baseado no nome da coluna
 */
function detectFormatType(columnName: string, value: unknown): FormatType {
    const name = columnName.toLowerCase();

    // IDs - padrões comuns de colunas de ID
    if (name === 'id' || name.endsWith('_id') || name.endsWith('id') || name === 'uuid') {
        return 'id';
    }

    // Monetário - valores em centavos ou amounts
    if (
        name.includes('cents') ||
        name.includes('amount') ||
        name.includes('total') ||
        name.includes('price') ||
        name.includes('cost') ||
        name.includes('value') ||
        name.includes('fee') ||
        name.includes('revenue') ||
        name.includes('payment')
    ) {
        if (typeof value === 'number') {
            return 'currency';
        }
    }

    // Timestamps
    if (
        name.endsWith('_at') ||
        name.includes('timestamp') ||
        name.includes('date') ||
        name === 'created' ||
        name === 'updated'
    ) {
        return 'timestamp';
    }

    // Percentuais
    if (
        name.includes('percent') ||
        name.includes('rate') ||
        name.includes('ratio') ||
        name.includes('tax')
    ) {
        if (typeof value === 'number') {
            return 'percent';
        }
    }

    // Status
    if (
        name === 'status' ||
        name.includes('state') ||
        name.includes('tipo') ||
        name.includes('situacao')
    ) {
        return 'status';
    }

    // Boolean
    if (typeof value === 'boolean') {
        return 'boolean';
    }

    // Number
    if (typeof value === 'number') {
        return 'number';
    }

    return 'text';
}

// ==================== Formatters ====================

/**
 * Formata valor monetário (centavos → R$ X,XX)
 */
function formatCurrency(value: number, locale = 'pt-BR', currency = 'BRL'): string {
    // Assume que valores > 1000 já estão em reais, não em centavos
    const inReais = Math.abs(value) >= 1000 ? value : value / 100;

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(inReais);
}

/**
 * Formata status com emoji + label
 */
function formatStatus(value: string): string {
    const status = STATUS_MAP[value.toLowerCase()];
    if (status) {
        return `${status.emoji} ${status.label}`;
    }
    // Capitaliza primeira letra se não encontrar no mapa
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Formata timestamp para DD/MM/YYYY HH:MM
 */
function formatTimestamp(value: string | Date, locale = 'pt-BR'): string {
    try {
        const date = value instanceof Date ? value : new Date(value);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        const dateStr = date.toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

        const timeStr = date.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
        });

        return `${dateStr} ${timeStr}`;
    } catch {
        return String(value);
    }
}

/**
 * Formata percentual
 */
function formatPercent(value: number): string {
    // Se valor < 1, assume que é decimal (0.15 = 15%)
    const percent = Math.abs(value) <= 1 ? value * 100 : value;
    return `${percent.toFixed(1).replace('.', ',')}%`;
}

/**
 * Formata boolean
 */
function formatBoolean(value: boolean): string {
    return value ? '✅ Sim' : '❌ Não';
}

/**
 * Formata número genérico
 */
function formatNumber(value: number, locale = 'pt-BR'): string {
    return new Intl.NumberFormat(locale).format(value);
}

// ==================== Main API ====================

/**
 * Formata um valor baseado no nome da coluna e valor
 */
export function formatCellValue(
    columnName: string,
    value: unknown,
    options: FormatterOptions = {}
): FormattedValue {
    const { hideIds = true, locale = 'pt-BR', currency = 'BRL' } = options;

    // Null/undefined handling
    if (value === null || value === undefined) {
        return { display: '-', raw: value, formatType: 'text' };
    }

    const formatType = detectFormatType(columnName, value);

    switch (formatType) {
        case 'id':
            return {
                display: String(value),
                raw: value,
                hidden: hideIds,
                formatType: 'id',
            };

        case 'currency':
            return {
                display: formatCurrency(value as number, locale, currency),
                raw: value,
                formatType: 'currency',
            };

        case 'status':
            return {
                display: formatStatus(String(value)),
                raw: value,
                formatType: 'status',
            };

        case 'timestamp':
            return {
                display: formatTimestamp(value as string | Date, locale),
                raw: value,
                formatType: 'timestamp',
            };

        case 'percent':
            return {
                display: formatPercent(value as number),
                raw: value,
                formatType: 'percent',
            };

        case 'boolean':
            return {
                display: formatBoolean(value as boolean),
                raw: value,
                formatType: 'boolean',
            };

        case 'number':
            return {
                display: formatNumber(value as number, locale),
                raw: value,
                formatType: 'number',
            };

        default:
            return {
                display: String(value),
                raw: value,
                formatType: 'text',
            };
    }
}

/**
 * Formata todos os valores de uma linha
 */
export function formatRow(
    row: Record<string, unknown>,
    options: FormatterOptions = {}
): Record<string, FormattedValue> {
    const formatted: Record<string, FormattedValue> = {};

    for (const [key, value] of Object.entries(row)) {
        formatted[key] = formatCellValue(key, value, options);
    }

    return formatted;
}

/**
 * Filtra colunas que devem ser ocultadas (IDs)
 */
export function filterVisibleColumns(
    columns: string[],
    sampleRow?: Record<string, unknown>,
    options: FormatterOptions = {}
): string[] {
    const { hideIds = true } = options;

    if (!hideIds) {
        return columns;
    }

    return columns.filter(col => {
        const name = col.toLowerCase();
        // Oculta colunas que são claramente IDs
        if (name === 'id' || name.endsWith('_id') || name === 'uuid') {
            return false;
        }
        return true;
    });
}

/**
 * Formata dados completos (array de registros)
 * Retorna dados formatados e colunas visíveis
 */
export function formatData(
    data: Record<string, unknown>[],
    options: FormatterOptions = {}
): {
    formattedData: Record<string, FormattedValue>[];
    visibleColumns: string[];
    allColumns: string[];
} {
    if (!data || data.length === 0) {
        return { formattedData: [], visibleColumns: [], allColumns: [] };
    }

    const allColumns = Object.keys(data[0]);
    const visibleColumns = filterVisibleColumns(allColumns, data[0], options);

    const formattedData = data.map(row => formatRow(row, options));

    return { formattedData, visibleColumns, allColumns };
}

// ==================== Utility ====================

/**
 * Verifica se uma coluna é de ID
 */
export function isIdColumn(columnName: string): boolean {
    const name = columnName.toLowerCase();
    return name === 'id' || name.endsWith('_id') || name === 'uuid';
}

/**
 * Retorna o tipo de formatação para uma coluna
 */
export function getColumnFormatType(
    columnName: string,
    sampleValue?: unknown
): FormatType {
    return detectFormatType(columnName, sampleValue);
}
