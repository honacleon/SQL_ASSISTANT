/**
 * ExportMenu - Dropdown de opções de exportação
 * Suporta CSV, Excel, JSON, e opcionalmente PNG/PDF para gráficos
 */

import React, { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
    Download,
    FileSpreadsheet,
    FileJson,
    FileImage,
    FileText,
    Copy,
    Loader2,
} from 'lucide-react';
import {
    exportToCSV,
    exportToExcel,
    exportToJSON,
    exportToImage,
    exportToPDF,
    copyToClipboard,
} from '@/utils/exporters';
import toast from 'react-hot-toast';

interface ExportMenuProps {
    data: Record<string, unknown>[];
    filename?: string;
    chartRef?: React.RefObject<HTMLDivElement>;
    disabled?: boolean;
    variant?: 'default' | 'ghost' | 'outline';
    size?: 'default' | 'sm' | 'icon';
}

type ExportFormat = 'csv' | 'excel' | 'json' | 'png' | 'pdf' | 'clipboard';

export const ExportMenu: React.FC<ExportMenuProps> = ({
    data,
    filename = 'export',
    chartRef,
    disabled = false,
    variant = 'outline',
    size = 'sm',
}) => {
    const [loading, setLoading] = useState<ExportFormat | null>(null);

    const handleExport = async (format: ExportFormat) => {
        if (data.length === 0 && !chartRef?.current) {
            toast.error('Nenhum dado para exportar');
            return;
        }

        setLoading(format);

        try {
            switch (format) {
                case 'csv':
                    exportToCSV(data, filename);
                    toast.success('CSV exportado com sucesso!');
                    break;

                case 'excel':
                    exportToExcel(data, filename);
                    toast.success('Excel exportado com sucesso!');
                    break;

                case 'json':
                    exportToJSON(data, filename);
                    toast.success('JSON exportado com sucesso!');
                    break;

                case 'png':
                    if (chartRef?.current) {
                        await exportToImage(chartRef.current, filename);
                        toast.success('Imagem exportada com sucesso!');
                    } else {
                        toast.error('Nenhum gráfico para exportar');
                    }
                    break;

                case 'pdf':
                    if (chartRef?.current) {
                        await exportToPDF(chartRef.current, filename);
                        toast.success('PDF exportado com sucesso!');
                    } else {
                        toast.error('Nenhum gráfico para exportar');
                    }
                    break;

                case 'clipboard':
                    await copyToClipboard(data);
                    toast.success('Dados copiados! Cole em uma planilha.');
                    break;
            }
        } catch (error) {
            console.error('[ExportMenu] Erro:', error);
            toast.error('Erro ao exportar. Tente novamente.');
        } finally {
            setLoading(null);
        }
    };

    const isLoading = loading !== null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    disabled={disabled || isLoading}
                    className="gap-2"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    {size !== 'icon' && 'Exportar'}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
                {/* Data Exports */}
                <DropdownMenuItem
                    onClick={() => handleExport('csv')}
                    disabled={loading === 'csv'}
                    className="gap-2 cursor-pointer"
                >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>CSV</span>
                    {loading === 'csv' && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleExport('excel')}
                    disabled={loading === 'excel'}
                    className="gap-2 cursor-pointer"
                >
                    <FileSpreadsheet className="h-4 w-4 text-green-500" />
                    <span>Excel (.xlsx)</span>
                    {loading === 'excel' && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleExport('json')}
                    disabled={loading === 'json'}
                    className="gap-2 cursor-pointer"
                >
                    <FileJson className="h-4 w-4 text-yellow-500" />
                    <span>JSON</span>
                    {loading === 'json' && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => handleExport('clipboard')}
                    disabled={loading === 'clipboard'}
                    className="gap-2 cursor-pointer"
                >
                    <Copy className="h-4 w-4" />
                    <span>Copiar para área de transferência</span>
                    {loading === 'clipboard' && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                </DropdownMenuItem>

                {/* Chart Exports (only if chartRef provided) */}
                {chartRef && (
                    <>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={() => handleExport('png')}
                            disabled={loading === 'png'}
                            className="gap-2 cursor-pointer"
                        >
                            <FileImage className="h-4 w-4 text-blue-500" />
                            <span>Imagem (PNG)</span>
                            {loading === 'png' && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => handleExport('pdf')}
                            disabled={loading === 'pdf'}
                            className="gap-2 cursor-pointer"
                        >
                            <FileText className="h-4 w-4 text-red-500" />
                            <span>PDF</span>
                            {loading === 'pdf' && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ExportMenu;
