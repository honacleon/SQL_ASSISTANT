/**
 * DataTable - Generic table component for data display
 * Handles rendering, sorting, and pagination (no data fetching)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ==================== Types ====================

export type SortDirection = 'asc' | 'desc';

export interface DataTableColumn<T extends Record<string, unknown>> {
  /** ID único da coluna (também usado como key e para sort) */
  id: string;
  /** Label exibida no header */
  header: string;
  /** Campo padrão usado se não houver accessor (ex: 'name') */
  accessorKey?: keyof T | string;
  /** Função customizada para renderizar a célula */
  cell?: (row: T) => React.ReactNode;
  /** Se a coluna é ordenável */
  sortable?: boolean;
  /** Alinhamento opcional */
  align?: 'left' | 'center' | 'right';
  /** Largura opcional */
  width?: string;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;

  /** Paginação (opcional, mas recomendada) */
  page?: number;          // página atual (1-based)
  pageSize?: number;      // tamanho da página
  total?: number;         // total de registros (para mostrar "x de y")
  onPageChange?: (page: number) => void;

  /** Ordenação */
  sortBy?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (columnId: string, direction: SortDirection) => void;

  /** Mensagem quando não há dados */
  emptyMessage?: string;

  /** Altura máxima opcional (para scroll interno) */
  maxHeight?: string;
}

// ==================== Helper Functions ====================

/**
 * Get cell value from row using accessorKey
 */
function getCellValue<T extends Record<string, unknown>>(
  row: T,
  accessorKey?: keyof T | string
): React.ReactNode {
  if (!accessorKey) return null;
  
  const keys = String(accessorKey).split('.');
  let value: unknown = row;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return null;
    }
  }
  
  // Handle different value types
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (value instanceof Date) return value.toLocaleDateString('pt-BR');
  if (typeof value === 'object') return JSON.stringify(value);
  
  return String(value);
}

/**
 * Get alignment class
 */
function getAlignClass(align?: 'left' | 'center' | 'right'): string {
  switch (align) {
    case 'center': return 'text-center';
    case 'right': return 'text-right';
    default: return 'text-left';
  }
}

// ==================== Sub-components ====================

/**
 * Sort indicator icon
 */
function SortIndicator({ 
  active, 
  direction 
}: { 
  active: boolean; 
  direction: SortDirection;
}) {
  if (!active) {
    return <span className="ml-1 text-muted-foreground/40">↕</span>;
  }
  return (
    <span className="ml-1 text-primary">
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}

/**
 * Loading skeleton rows
 */
function LoadingSkeleton<T extends Record<string, unknown>>({ 
  columns, 
  rows = 5 
}: { 
  columns: DataTableColumn<T>[]; 
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`}>
          {columns.map((column) => (
            <TableCell 
              key={`skeleton-${rowIndex}-${column.id}`}
              className={getAlignClass(column.align)}
              style={{ width: column.width }}
            >
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * Empty state row
 */
function EmptyState({ 
  colSpan, 
  message 
}: { 
  colSpan: number; 
  message: string;
}) {
  return (
    <TableRow>
      <TableCell 
        colSpan={colSpan} 
        className="h-24 text-center text-muted-foreground"
      >
        {message}
      </TableCell>
    </TableRow>
  );
}

/**
 * Pagination footer
 */
function PaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        Mostrando {startItem}–{endItem} de {total}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  page,
  pageSize,
  total,
  onPageChange,
  sortBy,
  sortDirection = 'asc',
  onSortChange,
  emptyMessage = 'Nenhum dado encontrado.',
  maxHeight = '480px',
}: DataTableProps<T>) {
  
  // Handle sort click
  const handleSortClick = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    
    let newDirection: SortDirection = 'asc';
    
    if (sortBy === column.id) {
      // Toggle direction if same column
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    onSortChange(column.id, newDirection);
  };

  // Check if pagination should be shown
  const showPagination = 
    page !== undefined && 
    pageSize !== undefined && 
    total !== undefined && 
    onPageChange !== undefined &&
    total > 0;

  return (
    <div className="w-full rounded-md border">
      {/* Table container with scroll */}
      <div 
        className="overflow-x-auto"
        style={{ maxHeight }}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    getAlignClass(column.align),
                    column.sortable && 'cursor-pointer select-none hover:bg-muted/50'
                  )}
                  style={{ width: column.width }}
                  onClick={() => handleSortClick(column)}
                >
                  <span className="inline-flex items-center">
                    {column.header}
                    {column.sortable && (
                      <SortIndicator
                        active={sortBy === column.id}
                        direction={sortBy === column.id ? sortDirection : 'asc'}
                      />
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {/* Loading state */}
            {loading && (
              <LoadingSkeleton columns={columns} rows={5} />
            )}
            
            {/* Empty state */}
            {!loading && data.length === 0 && (
              <EmptyState colSpan={columns.length} message={emptyMessage} />
            )}
            
            {/* Data rows */}
            {!loading && data.length > 0 && data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell
                    key={`${rowIndex}-${column.id}`}
                    className={getAlignClass(column.align)}
                    style={{ width: column.width }}
                  >
                    {column.cell 
                      ? column.cell(row) 
                      : getCellValue(row, column.accessorKey)
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination footer */}
      {showPagination && (
        <div className="border-t">
          <PaginationFooter
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}

export default DataTable;
