import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Download,
  Eye,
  EyeOff,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
// Utility functions for formatting
const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatCurrency = (value: number, currency = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};
import { TableProps, Column } from '../types';

interface DataTableProps extends Omit<TableProps, 'columns'> {
  columns?: Column[];
  onExport?: () => void;
  onColumnToggle?: (column: string, visible: boolean) => void;
  columnVisibility?: Record<string, boolean>;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  columns = [],
  loading = false,
  pagination,
  rowSelection,
  onSort,
  onExport,
  onColumnToggle,
  columnVisibility = {},
  searchable = true,
  onSearch,
  searchQuery = '',
  className = ''
}) => {
  const [sortState, setSortState] = useState<{
    column: string | null;
    direction: 'asc' | 'desc';
  }>({ column: null, direction: 'asc' });

  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Auto-generate columns if not provided
  const finalColumns = useMemo(() => {
    if (columns.length > 0) return columns;

    if (data.length === 0) return [];

    const firstRow = data[0];
    return Object.keys(firstRow).map((key) => ({
      key,
      title: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      sortable: true,
      filterable: true,
      render: (value: any) => {
        if (value === null || value === undefined) return '-';

        // Auto-format based on column name and value type
        if (typeof value === 'number') {
          if (key.toLowerCase().includes('price') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('total')) {
            return formatCurrency(value);
          }
          return formatNumber(value);
        }

        if (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('created') || key.toLowerCase().includes('updated'))) {
          try {
            return formatDate(new Date(value));
          } catch {
            return value;
          }
        }

        if (typeof value === 'boolean') {
          return value ? '✅' : '❌';
        }

        return String(value);
      }
    }));
  }, [columns, data]);

  // Filter visible columns
  const visibleColumns = finalColumns.filter(
    col => columnVisibility[col.key] !== false
  );

  const handleSort = (column: string) => {
    let newDirection: 'asc' | 'desc' = 'asc';

    if (sortState.column === column && sortState.direction === 'asc') {
      newDirection = 'desc';
    }

    setSortState({ column, direction: newDirection });
    onSort?.(column, newDirection);
  };

  const handleSearch = (query: string) => {
    setLocalSearch(query);
    onSearch?.(query);
  };

  const getSortIcon = (column: string) => {
    if (sortState.column !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }

    return sortState.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 text-primary-600" />
      : <ArrowDown className="w-4 h-4 text-primary-600" />;
  };

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="loading-dots justify-center">
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p className="mt-4 text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum dado encontrado</h3>
        <p className="text-gray-600">
          Não há dados para exibir no momento. Tente ajustar seus filtros ou consulta.
        </p>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Dados ({pagination?.total || data.length})
            </h2>

            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="input pl-9 w-64"
                  value={localSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Column visibility toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="btn-outline px-3 py-2"
              >
                <Eye className="w-4 h-4 mr-2" />
                Colunas
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>

              {showColumnMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    {finalColumns.map((column) => {
                      const isVisible = columnVisibility[column.key] !== false;
                      return (
                        <label
                          key={column.key}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={(e) => onColumnToggle?.(column.key, e.target.checked)}
                            className="mr-2"
                          />
                          {isVisible ? (
                            <Eye className="w-4 h-4 mr-2 text-green-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 mr-2 text-gray-400" />
                          )}
                          <span className="text-sm">{column.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Export button */}
            {onExport && (
              <button onClick={onExport} className="btn-outline px-3 py-2">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {rowSelection && (
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={rowSelection.selectedRows.size === data.length && data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = data.map(rowSelection.getRowId);
                        rowSelection.onChange(new Set(allIds));
                      } else {
                        rowSelection.onChange(new Set());
                      }
                    }}
                  />
                </th>
              )}

              {visibleColumns.map((column) => (
                <th key={column.key} style={{ width: (column as any).width }}>
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {getSortIcon(column.key)}
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => {
              const rowId = rowSelection?.getRowId(row) || String(index);
              const isSelected = rowSelection?.selectedRows.has(rowId) || false;

              return (
                <tr
                  key={rowId}
                  className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  {rowSelection && (
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSelected = new Set(rowSelection.selectedRows);
                          if (e.target.checked) {
                            newSelected.add(rowId);
                          } else {
                            newSelected.delete(rowId);
                          }
                          rowSelection.onChange(newSelected);
                        }}
                      />
                    </td>
                  )}

                  {visibleColumns.map((column) => (
                    <td key={column.key}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {((pagination.current - 1) * pagination.pageSize) + 1} até{' '}
              {Math.min(pagination.current * pagination.pageSize, pagination.total)} de{' '}
              {pagination.total} resultados
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
                disabled={pagination.current <= 1}
                className="btn-outline px-2 py-1 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-sm bg-primary-100 text-primary-800 rounded">
                {pagination.current}
              </span>

              <button
                onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
                disabled={pagination.current * pagination.pageSize >= pagination.total}
                className="btn-outline px-2 py-1 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handler for column menu */}
      {showColumnMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowColumnMenu(false)}
        />
      )}
    </div>
  );
};

export default DataTable;