/**
 * DashboardPage - Main application page integrating tables, data, and chat
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTables, useTableData, useChat, useShortcuts } from '@/hooks';
import { DataTable, DataTableColumn, SortDirection } from '@/components/data';
import { ChatInterface } from '@/components/chat';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Database, Table2, AlertCircle, RefreshCw } from 'lucide-react';
import type { ColumnInfo } from '@ai-assistant/shared';
import toast from 'react-hot-toast';

// ==================== Helper Functions ====================

/**
 * Convert ColumnInfo from API to DataTableColumn format
 */
function mapColumnsToDataTable(columns: ColumnInfo[]): DataTableColumn<Record<string, unknown>>[] {
  return columns.map((col) => ({
    id: col.name,
    header: col.name,
    accessorKey: col.name,
    sortable: true,
    align: col.type === 'number' ? 'right' : 'left',
  }));
}

// ==================== Sub-components ====================

interface SidebarTablesProps {
  tables: { name: string; schema?: string }[];
  loading: boolean;
  error: Error | null;
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
   onPreviewTable: (tableName: string) => void;
  onRefresh: () => void;
}

function SidebarTables({
  tables,
  loading,
  error,
  selectedTable,
  onSelectTable,
  onPreviewTable,
  onRefresh,
}: SidebarTablesProps) {
  return (
    <Card className="w-64 h-full flex flex-col border-r rounded-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Tabelas</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </Button>
        </div>
        {tables.length > 0 && (
          <CardDescription className="text-xs">
            {tables.length} tabela{tables.length !== 1 ? 's' : ''} disponíve{tables.length !== 1 ? 'is' : 'l'}
          </CardDescription>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col p-2 gap-1">
            {/* Loading state */}
            {loading && (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-xs text-destructive">
                  Erro ao carregar tabelas
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {error.message}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && tables.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <Table2 className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Nenhuma tabela encontrada
                </p>
              </div>
            )}

            {/* Tables list */}
            {!loading && !error && tables.map((table) => (
              <div
                key={table.name}
                className="flex items-center gap-2"
              >
                <Button
                  variant={selectedTable === table.name ? "secondary" : "ghost"}
                  className={cn(
                    "justify-start text-sm h-8 flex-1",
                    selectedTable === table.name && "font-medium"
                  )}
                  onClick={() => onSelectTable(table.name)}
                >
                  <Table2 className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="truncate">{table.name}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => onPreviewTable(table.name)}
                >
                  Preview
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface DataPanelProps {
  tableName: string | null;
  columns: DataTableColumn<Record<string, unknown>>[];
  data: Record<string, unknown>[];
  loading: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  total: number;
  sortBy: string | undefined;
  sortDirection: SortDirection;
  onPageChange: (page: number) => void;
  onSortChange: (columnId: string, direction: SortDirection) => void;
  onRefresh: () => void;
}

function DataPanel({
  tableName,
  columns,
  data,
  loading,
  error,
  page,
  pageSize,
  total,
  sortBy,
  sortDirection,
  onPageChange,
  onSortChange,
  onRefresh,
}: DataPanelProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {tableName ? (
                <>
                  <Table2 className="h-4 w-4" />
                  {tableName}
                </>
              ) : (
                'Selecione uma tabela'
              )}
            </CardTitle>
            {tableName && !error && (
              <CardDescription className="text-xs">
                {total > 0 ? `${total} registro${total !== 1 ? 's' : ''}` : 'Sem registros'}
              </CardDescription>
            )}
            {error && (
              <CardDescription className="text-xs text-destructive">
                {error.message}
              </CardDescription>
            )}
          </div>
          {tableName && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              <span className="text-xs">Atualizar</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-4 overflow-hidden">
        {!tableName ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Database className="h-16 w-16 opacity-20" />
            <p className="text-sm">Selecione uma tabela na barra lateral para visualizar os dados</p>
          </div>
        ) : (
          <div className="relative h-full">
            <LoadingOverlay visible={loading} />
            <DataTable
              columns={columns}
              data={data}
              loading={loading}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={onPageChange}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSortChange={onSortChange}
              maxHeight="100%"
              emptyMessage="Nenhum registro encontrado nesta tabela."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== Main Component ====================

export function DashboardPage() {
  // ==================== Tables Hook ====================
  const {
    tables,
    loading: loadingTables,
    error: errorTables,
    refetch: refetchTables,
  } = useTables();

  // ==================== Selected Table State ====================
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // ==================== Preview Table State (drawer) ====================
  const [previewTable, setPreviewTable] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ==================== Table Data Hook ====================
  const {
    columns: previewColumns,
    data: previewRows,
    totalCount: previewTotalCount,
    loading: previewLoading,
    error: previewError,
    pagination: previewPagination,
    sort: previewSort,
    setPage: setPreviewPage,
    setSort: setPreviewSort,
    refetch: refetchPreview,
  } = useTableData(previewTable || '', {
    autoFetch: !!previewTable,
  });

  // ==================== Chat Session ====================
  const [sessionId] = useState<string>(() => crypto.randomUUID());

  const {
    messages,
    sending: loadingChat,
    error: errorChat,
    sendMessage,
    clearHistory,
  } = useChat(sessionId);

  // ==================== Derived State ====================
  
  // Convert columns to DataTable format
  const columns = useMemo(() => mapColumnsToDataTable(previewColumns), [previewColumns]);

  // Extract sort values
  const sortBy = previewSort?.column;
  const sortDirection: SortDirection = previewSort?.order === 'desc' ? 'desc' : 'asc';

  // ==================== Handlers ====================

  const handleSelectTable = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    toast.success(`Tabela "${tableName}" selecionada`);
  }, []);

  const handleSortChange = useCallback((columnId: string, direction: SortDirection) => {
    setPreviewSort({ column: columnId, order: direction });
  }, [setPreviewSort]);

  const handleSendMessage = useCallback(async (message: string) => {
    try {
      await sendMessage(message, { currentTable: selectedTable || undefined });
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  }, [sendMessage, selectedTable]);

  const handlePreviewTable = useCallback((tableName: string) => {
    setPreviewTable(tableName);
    setPreviewOpen(true);
  }, []);

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
  }, [clearHistory]);

  // Create ref for handleSendMessage to use in shortcuts
  const handleSendMessageRef = useRef(handleSendMessage);
  handleSendMessageRef.current = handleSendMessage;

  // Keyboard shortcuts
  useShortcuts({
    onSendChat: () => {
      // This will be triggered by Ctrl+Enter in the chat textarea
      // The actual send is handled by the ChatInterface component
    },
  });

  // ==================== Render ====================

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <SidebarTables
        tables={tables}
        loading={loadingTables}
        error={errorTables}
        selectedTable={selectedTable}
        onSelectTable={handleSelectTable}
        onPreviewTable={handlePreviewTable}
        onRefresh={refetchTables}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-hidden min-h-0">
          <Card className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden p-4">
              <ChatInterface
                messages={messages}
                loading={loadingChat}
                errorMessage={errorChat?.message}
                onSendMessage={handleSendMessage}
                onClearHistory={handleClearHistory}
                currentTable={selectedTable || undefined}
                disabled={!selectedTable}
                placeholder={
                  selectedTable
                    ? `Pergunte algo sobre a tabela "${selectedTable}"...`
                    : 'Selecione uma tabela para começar...'
                }
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Drawer for table preview */}
      <Drawer open={previewOpen} onOpenChange={setPreviewOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Preview: {previewTable || 'Nenhuma tabela'}</DrawerTitle>
            <DrawerDescription>
              Visualização rápida dos dados sem sair do chat. Use o botão na lista de tabelas para abrir outra.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-6">
            <DataPanel
              tableName={previewTable}
              columns={columns}
              data={previewRows}
              loading={previewLoading}
              error={previewError}
              page={previewPagination.page}
              pageSize={previewPagination.pageSize}
              total={previewTotalCount}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onPageChange={setPreviewPage}
              onSortChange={handleSortChange}
              onRefresh={refetchPreview}
            />
            <div className="flex justify-end mt-3">
              <DrawerClose asChild>
                <Button variant="secondary">Fechar</Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default DashboardPage;
