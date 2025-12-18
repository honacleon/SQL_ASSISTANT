/**
 * Exporters - Utilitários para exportação de dados
 * Suporta CSV, Excel, JSON, Imagem e PDF
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Formata valor para exportação
 */
function formatValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (value instanceof Date) return value.toLocaleDateString('pt-BR');
    if (typeof value === 'number') {
        return value.toLocaleString('pt-BR');
    }
    return String(value);
}

/**
 * Prepara dados para exportação com formatação
 */
function prepareDataForExport(data: Record<string, unknown>[]): Record<string, string>[] {
    return data.map(row => {
        const formattedRow: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
            formattedRow[key] = formatValue(value);
        }
        return formattedRow;
    });
}

/**
 * Gera nome de arquivo com timestamp
 */
function generateFilename(baseName: string, extension: string): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${safeName}_${timestamp}.${extension}`;
}

/**
 * Dispara download de arquivo
 */
function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Exporta dados para CSV usando PapaParse
 */
export function exportToCSV(
    data: Record<string, unknown>[],
    filename: string = 'export'
): void {
    try {
        const preparedData = prepareDataForExport(data);
        const csv = Papa.unparse(preparedData, {
            delimiter: ';', // Padrão brasileiro
            header: true,
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
        triggerDownload(blob, generateFilename(filename, 'csv'));

        console.log(`[Exporters] CSV exportado: ${data.length} linhas`);
    } catch (error) {
        console.error('[Exporters] Erro ao exportar CSV:', error);
        throw new Error('Falha ao exportar CSV');
    }
}

/**
 * Exporta dados para Excel usando SheetJS
 */
export function exportToExcel(
    data: Record<string, unknown>[],
    filename: string = 'export',
    sheetName: string = 'Dados'
): void {
    try {
        const preparedData = prepareDataForExport(data);

        const worksheet = XLSX.utils.json_to_sheet(preparedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Ajusta largura das colunas
        const columnWidths = Object.keys(preparedData[0] || {}).map(key => ({
            wch: Math.max(key.length, 15),
        }));
        worksheet['!cols'] = columnWidths;

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        triggerDownload(blob, generateFilename(filename, 'xlsx'));

        console.log(`[Exporters] Excel exportado: ${data.length} linhas`);
    } catch (error) {
        console.error('[Exporters] Erro ao exportar Excel:', error);
        throw new Error('Falha ao exportar Excel');
    }
}

/**
 * Exporta dados para JSON
 */
export function exportToJSON(
    data: Record<string, unknown>[],
    filename: string = 'export'
): void {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

        triggerDownload(blob, generateFilename(filename, 'json'));

        console.log(`[Exporters] JSON exportado: ${data.length} registros`);
    } catch (error) {
        console.error('[Exporters] Erro ao exportar JSON:', error);
        throw new Error('Falha ao exportar JSON');
    }
}

/**
 * Exporta elemento HTML como imagem PNG
 */
export async function exportToImage(
    element: HTMLElement,
    filename: string = 'chart'
): Promise<void> {
    try {
        const canvas = await html2canvas(element, {
            backgroundColor: '#1a1a1a', // Fundo escuro para tema dark
            scale: 2, // Melhor qualidade
            logging: false,
        });

        canvas.toBlob((blob) => {
            if (blob) {
                triggerDownload(blob, generateFilename(filename, 'png'));
                console.log('[Exporters] Imagem exportada');
            }
        }, 'image/png');
    } catch (error) {
        console.error('[Exporters] Erro ao exportar imagem:', error);
        throw new Error('Falha ao exportar imagem');
    }
}

/**
 * Exporta elemento HTML como PDF
 */
export async function exportToPDF(
    element: HTMLElement,
    filename: string = 'document'
): Promise<void> {
    try {
        const canvas = await html2canvas(element, {
            backgroundColor: '#1a1a1a',
            scale: 2,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(generateFilename(filename, 'pdf'));

        console.log('[Exporters] PDF exportado');
    } catch (error) {
        console.error('[Exporters] Erro ao exportar PDF:', error);
        throw new Error('Falha ao exportar PDF');
    }
}

/**
 * Copia dados para clipboard como TSV (para colar em Excel/Sheets)
 */
export async function copyToClipboard(
    data: Record<string, unknown>[]
): Promise<void> {
    try {
        const preparedData = prepareDataForExport(data);

        if (preparedData.length === 0) {
            throw new Error('Dados vazios');
        }

        const headers = Object.keys(preparedData[0]);
        const rows = preparedData.map(row => headers.map(h => row[h]).join('\t'));
        const tsv = [headers.join('\t'), ...rows].join('\n');

        await navigator.clipboard.writeText(tsv);

        console.log(`[Exporters] Dados copiados: ${data.length} linhas`);
    } catch (error) {
        console.error('[Exporters] Erro ao copiar para clipboard:', error);
        throw new Error('Falha ao copiar para clipboard');
    }
}
