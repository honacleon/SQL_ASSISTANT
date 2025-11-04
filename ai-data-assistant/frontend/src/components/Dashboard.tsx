import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Table2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { TableInfo, QueryResult } from '@ai-data-assistant/shared';

// Utility function for generating IDs
const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
import { dataApi } from '../services/api';
import { useApiState } from '../hooks/useApi';
import DataTable from './DataTable';
import ChatInterface from './ChatInterface';
import toast from 'react-hot-toast';

interface DashboardProps {
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  // State
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [sessionId] = useState(generateId());
  const [tableData, setTableData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  // API state
  const { data: tables, loading: tablesLoading, executeAsync: loadTables } = useApiState<TableInfo[]>([]);
  const { loading: dataLoading, executeAsync: loadTableData } = useApiState<QueryResult>();

  // Load tables on mount
  useEffect(() => {
    loadTables(
      () => dataApi.getTables(),
      {
        onSuccess: (tables) => {
          if (tables.length > 0 && !selectedTable) {
            setSelectedTable(tables[0].name);
          }
        }
      }
    );
  }, []);

  // Load table data when table changes
  useEffect(() => {
    if (selectedTable) {
      handleLoadTableData();
    }
  }, [selectedTable, currentPage, pageSize, searchQuery]);

  const handleLoadTableData = async () => {
    if (!selectedTable) return;

    try {
      const result = await loadTableData(
        () => dataApi.executeQuery({
          tableName: selectedTable,
          page: currentPage,
          pageSize,
          searchQuery: searchQuery || undefined
        })
      );

      if (result) {
        setTableData(result.data);
        setTotalCount(result.count);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
    }
  };

  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setCurrentPage(1);
    setSearchQuery('');
    setColumnVisibility({});
  };

  const handlePaginationChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleColumnToggle = (column: string, visible: boolean) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: visible
    }));
  };

  const handleQueryResult = (result: QueryResult & { confidence?: number }) => {
    // Update table data with chat query results
    if (result.data && result.data.length > 0) {
      setTableData(result.data);
      setTotalCount(result.count);
      setCurrentPage(1);

      toast.success(
        `Consulta executada com sucesso! ${result.count} resultado(s) encontrado(s)`,
        { duration: 3000 }
      );
    }
  };

  const handleRefresh = () => {
    if (selectedTable) {
      handleLoadTableData();
      toast.success('Dados atualizados!');
    }
  };

  const handleExport = () => {
    // Simple CSV export
    if (tableData.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const headers = Object.keys(tableData[0]);
    const csvContent = [
      headers.join(','),
      ...tableData.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedTable}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Dados exportados com sucesso!');
  };

  if (tablesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-dots justify-center mb-4">
            <div></div>
            <div></div>
            <div></div>
          </div>
          <p className="text-gray-600">Carregando aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Database className="w-8 h-8 text-primary-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI Data Assistant</h1>
                  <p className="text-sm text-gray-600">
                    Converse com seus dados em linguagem natural
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-600">Conectado</span>
              </div>

              {/* Table Selector */}
              {tables && tables.length > 0 && (
                <select
                  value={selectedTable}
                  onChange={(e) => handleTableChange(e.target.value)}
                  className="input min-w-48"
                >
                  <option value="">Selecione uma tabela</option>
                  {tables.map((table) => (
                    <option key={table.name} value={table.name}>
                      📊 {table.name} ({table.columns.length} colunas)
                    </option>
                  ))}
                </select>
              )}

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={!selectedTable || dataLoading}
                className="btn-outline px-3 py-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {!tables || tables.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma tabela encontrada
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Não foi possível encontrar tabelas no banco de dados.
              Verifique sua conexão e configuração do Supabase.
            </p>
          </div>
        ) : !selectedTable ? (
          <div className="text-center py-12">
            <Table2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Selecione uma tabela
            </h2>
            <p className="text-gray-600">
              Escolha uma tabela no menu superior para começar a explorar os dados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Data Table - 2/3 width */}
            <div className="lg:col-span-2">
              <DataTable
                data={tableData}
                loading={dataLoading}
                pagination={{
                  current: currentPage,
                  pageSize,
                  total: totalCount,
                  onChange: handlePaginationChange
                }}
                onSearch={handleSearch}
                searchQuery={searchQuery}
                onColumnToggle={handleColumnToggle}
                columnVisibility={columnVisibility}
                onExport={handleExport}
                className="h-full"
              />
            </div>

            {/* Chat Interface - 1/3 width */}
            <div className="lg:col-span-1">
              <ChatInterface
                sessionId={sessionId}
                onQueryResult={handleQueryResult}
                currentTable={selectedTable}
                availableTables={tables?.map(t => t.name) || []}
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            🤖 AI Data Assistant v1.0.0 - Powered by OpenAI/Anthropic
          </div>
          <div className="flex items-center space-x-4">
            <span>Tabelas: {tables?.length || 0}</span>
            <span>Registros: {totalCount.toLocaleString()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;