/**
 * DashboardPage - Main application page integrating tables, data, and chat
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTables, useTableData, useChat, useShortcuts, useSessionHistory } from '@/hooks';
import { useTabs } from '@/hooks/useTabs';
import { useTabShortcuts } from '@/hooks/useTabShortcuts';
import { DataTable, DataTableColumn, SortDirection } from '@/components/data';
import { ChatInterface, SessionList } from '@/components/chat';
import { TabBar } from '@/components/chat/TabBar';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Database, Table2, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

// ==================== Sidebar Components ====================

interface SidebarTablesContentProps {
  tables: { name: string; schema?: string }[];
  loading: boolean;
  error: Error | null;
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
  onPreviewTable: (tableName: string) => void;
  onRefresh: () => void;
}

function SidebarTablesContent({
  tables,
  loading,
  error,
  selectedTable,
  onSelectTable,
  onPreviewTable,
  onRefresh,
}: SidebarTablesContentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gold-400" />
          <span className="text-sm font-medium">Tabelas</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-gold-400/10 hover:text-gold-400 transition-colors"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </Button>
      </div>

      {tables.length > 0 && (
        <p className="text-xs text-muted-foreground px-3 pb-2">
          {tables.length} tabela{tables.length !== 1 ? 's' : ''} disponíve{tables.length !== 1 ? 'is' : 'l'}
        </p>
      )}

      <ScrollArea className="flex-1">
        <div className="flex flex-col px-2 pb-2 gap-1">
          {/* Loading state */}
          {loading && (
            <>
              <Skeleton className="h-8 w-full bg-secondary/50 animate-shimmer" />
              <Skeleton className="h-8 w-full bg-secondary/50 animate-shimmer" />
              <Skeleton className="h-8 w-full bg-secondary/50 animate-shimmer" />
              <Skeleton className="h-8 w-full bg-secondary/50 animate-shimmer" />
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
              <Table2 className="h-8 w-8 text-gold-400/30" />
              <p className="text-xs text-muted-foreground">
                Nenhuma tabela encontrada
              </p>
            </div>
          )}

          {/* Tables list */}
          {!loading && !error && tables.map((table) => (
            <div
              key={table.name}
              className="flex items-center gap-2 group"
            >
              <Button
                variant={selectedTable === table.name ? "secondary" : "ghost"}
                className={cn(
                  "justify-start text-sm h-8 flex-1 transition-all duration-200",
                  selectedTable === table.name
                    ? "font-medium bg-gold-400/15 text-gold-400 border border-gold-400/20"
                    : "hover:bg-gold-400/10 hover:text-gold-400"
                )}
                onClick={() => onSelectTable(table.name)}
              >
                <Table2 className={cn(
                  "h-3 w-3 mr-2 flex-shrink-0 transition-colors",
                  selectedTable === table.name ? "text-gold-400" : "text-muted-foreground group-hover:text-gold-400"
                )} />
                <span className="truncate">{table.name}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-border/50 hover:border-gold-400/30 hover:bg-gold-400/10 hover:text-gold-400 transition-all"
                onClick={() => onPreviewTable(table.name)}
              >
                Preview
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface SidebarProps {
  // Tables props
  tables: { name: string; schema?: string }[];
  loadingTables: boolean;
  errorTables: Error | null;
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
  onPreviewTable: (tableName: string) => void;
  onRefreshTables: () => void;
  // Sessions props
  sessions: import('@/hooks/useSessionHistory').SessionSummary[];
  loadingSessions: boolean;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
}

function Sidebar({
  tables,
  loadingTables,
  errorTables,
  selectedTable,
  onSelectTable,
  onPreviewTable,
  onRefreshTables,
  sessions,
  loadingSessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: SidebarProps) {
  return (
    <Card className="w-64 h-full flex flex-col border-r border-gold-400/10 rounded-none bg-background/95">
      <Tabs defaultValue="tables" className="flex-1 flex flex-col">
        <div className="px-3 pt-3">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
            <TabsTrigger
              value="tables"
              className="text-xs data-[state=active]:bg-gold-400/20 data-[state=active]:text-gold-400"
            >
              <Database className="h-3 w-3 mr-1" />
              Tabelas
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="text-xs data-[state=active]:bg-gold-400/20 data-[state=active]:text-gold-400"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Conversas
            </TabsTrigger>
          </TabsList>
        </div>

        <Separator className="bg-border/50 mt-3" />

        <TabsContent value="tables" className="flex-1 m-0 overflow-hidden">
          <SidebarTablesContent
            tables={tables}
            loading={loadingTables}
            error={errorTables}
            selectedTable={selectedTable}
            onSelectTable={onSelectTable}
            onPreviewTable={onPreviewTable}
            onRefresh={onRefreshTables}
          />
        </TabsContent>

        <TabsContent value="sessions" className="flex-1 m-0 overflow-hidden">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            loading={loadingSessions}
            onSelectSession={onSelectSession}
            onCreateSession={onCreateSession}
            onDeleteSession={onDeleteSession}
          />
        </TabsContent>
      </Tabs>
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
    <Card className="flex flex-col h-full border-gold-400/10 bg-card/95">
      <CardHeader className="pb-2 bg-gradient-to-r from-gold-400/5 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {tableName ? (
                <>
                  <Table2 className="h-4 w-4 text-gold-400" />
                  <span className="text-gold-400">{tableName}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Selecione uma tabela</span>
              )}
            </CardTitle>
            {tableName && !error && (
              <CardDescription className="text-xs">
                {total > 0 ? (
                  <span className="text-gold-400/70">{total} registro{total !== 1 ? 's' : ''}</span>
                ) : (
                  'Sem registros'
                )}
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
              className="flex items-center gap-1 border-gold-400/20 hover:bg-gold-400/10 hover:text-gold-400 hover:border-gold-400/40 transition-all"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              <span className="text-xs">Atualizar</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <Separator className="bg-border/50" />

      <CardContent className="flex-1 p-4 overflow-hidden">
        {!tableName ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Database className="h-16 w-16 text-gold-400/20" />
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

  // ==================== Sessions Hook ====================
  const {
    sessions,
    activeSessionId,
    activeSession,
    loading: loadingSessions,
    createSession,
    deleteSession,
    switchSession,
    addMessage: persistMessage,
    updateSessionTitle,
  } = useSessionHistory();

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

  // ==================== Tab System ====================
  const {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    activateTab,
    renameTab,
    togglePin,
    setLoading,
    setTableContext,
    setSessionId,
    getActiveTab,
  } = useTabs();

  // Obter sessionId da aba ativa, com fallback para sessão global
  const activeTab = tabs.find(t => t.id === activeTabId);
  const effectiveSessionId = activeTab?.sessionId || activeSessionId || null;

  // ==================== Chat Session ====================
  // Usa sessão da aba ou sessão global como fallback
  const {
    messages,
    sending: loadingChat,
    error: errorChat,
    sendMessage,
    clearHistory,
  } = useChat(effectiveSessionId || '');

  // Sincronizar tabela selecionada com aba ativa
  useEffect(() => {
    if (activeTabId && selectedTable) {
      setTableContext(activeTabId, selectedTable);
    }
  }, [activeTabId, selectedTable, setTableContext]);

  // Garantir que aba ativa tenha sessão (usando ref para evitar loop)
  const sessionCreationRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (activeTabId && !effectiveSessionId && !sessionCreationRef.current.has(activeTabId)) {
      // Marcar que está criando sessão para esta aba
      sessionCreationRef.current.add(activeTabId);

      // Criar sessão para aba que não tem
      createSession().then(session => {
        if (session && activeTabId) {
          setSessionId(activeTabId, session.id);
          renameTab(activeTabId, session.title || 'Chat Principal');
        }
      }).catch(error => {
        console.error('Erro ao criar sessão para aba:', error);
        sessionCreationRef.current.delete(activeTabId);
      });
    }
  }, [activeTabId, effectiveSessionId]);

  // Sincronizar loading da aba
  useEffect(() => {
    if (activeTabId) {
      setLoading(activeTabId, loadingChat);
    }
  }, [activeTabId, loadingChat, setLoading]);

  // Handlers de navegação de abas
  const handleNewTab = useCallback(() => {
    const newTab = createTab();
    // Opcionalmente criar nova sessão
    createSession().then(session => {
      if (session) {
        setSessionId(newTab.id, session.id);
        renameTab(newTab.id, session.title || 'Nova Conversa');
      }
    });
  }, [createTab, createSession, setSessionId, renameTab]);

  const handleCloseTab = useCallback(() => {
    const activeTab = getActiveTab();
    if (activeTab && !activeTab.isPinned) {
      closeTab(activeTab.id);
    }
  }, [getActiveTab, closeTab]);

  const handleNextTab = useCallback(() => {
    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    if (currentIndex < tabs.length - 1) {
      activateTab(tabs[currentIndex + 1].id);
    } else if (tabs.length > 0) {
      activateTab(tabs[0].id);
    }
  }, [tabs, activeTabId, activateTab]);

  const handlePrevTab = useCallback(() => {
    const currentIndex = tabs.findIndex(t => t.id === activeTabId);
    if (currentIndex > 0) {
      activateTab(tabs[currentIndex - 1].id);
    } else if (tabs.length > 0) {
      activateTab(tabs[tabs.length - 1].id);
    }
  }, [tabs, activeTabId, activateTab]);

  const handleGoToTab = useCallback((index: number) => {
    if (index >= 0 && index < tabs.length) {
      activateTab(tabs[index].id);
    }
  }, [tabs, activateTab]);

  // Atalhos de teclado para abas
  useTabShortcuts({
    onNewTab: handleNewTab,
    onCloseTab: handleCloseTab,
    onNextTab: handleNextTab,
    onPrevTab: handlePrevTab,
    onGoToTab: handleGoToTab,
  });

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
    // Make sure we have an active session
    if (!activeSessionId || !activeSession) {
      toast.error('Selecione ou crie uma conversa primeiro');
      return;
    }

    try {
      // 1. Save user message to Supabase
      await persistMessage('user', message);

      // 2. Send to AI and get response
      const response = await sendMessage(message, { currentTable: selectedTable || undefined });

      if (response?.message) {
        // 3. Save assistant response to Supabase
        await persistMessage('assistant', response.message.content, response.message.metadata);

        // 4. Auto-update title based on first user message
        const totalMessages = activeSession.messages.length;
        if (totalMessages === 0 && message.length > 0) {
          const autoTitle = message.length > 50 ? message.substring(0, 47) + '...' : message;
          await updateSessionTitle(activeSessionId, autoTitle);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    }
  }, [activeSessionId, activeSession, persistMessage, sendMessage, selectedTable, updateSessionTitle]);

  const handlePreviewTable = useCallback((tableName: string) => {
    setPreviewTable(tableName);
    setPreviewOpen(true);
  }, []);

  const handleClearHistory = useCallback(async () => {
    // Implementar confirmação antes de limpar
    if (confirm('Tem certeza que deseja limpar todo o histórico desta conversa?')) {
      await clearHistory();
      toast.success('Histórico limpo');
    }
  }, [clearHistory]);

  // Handler para selecionar sessão
  const handleSelectSession = useCallback((sessionId: string) => {
    // Procurar se já existe aba com essa sessão
    const existingTab = tabs.find(t => t.sessionId === sessionId);

    if (existingTab) {
      // Ativar aba existente
      activateTab(existingTab.id);
    } else {
      // Criar nova aba para essa sessão
      const newTab = createTab();
      setSessionId(newTab.id, sessionId);
      // Buscar título da sessão
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        renameTab(newTab.id, session.title || 'Conversa');
      }
    }
  }, [tabs, activateTab, createTab, setSessionId, sessions, renameTab]);

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
      <Sidebar
        tables={tables}
        loadingTables={loadingTables}
        errorTables={errorTables}
        selectedTable={selectedTable}
        onSelectTable={handleSelectTable}
        onPreviewTable={handlePreviewTable}
        onRefreshTables={refetchTables}
        sessions={sessions}
        loadingSessions={loadingSessions}
        activeSessionId={effectiveSessionId}
        onSelectSession={handleSelectSession}
        onCreateSession={handleNewTab}
        onDeleteSession={deleteSession}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Tab Bar */}
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={activateTab}
          onCreate={handleNewTab}
          onClose={closeTab}
          onPin={togglePin}
        />

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
                disabled={!effectiveSessionId}
                placeholder={
                  !effectiveSessionId
                    ? 'Aguardando criar sessão...'
                    : selectedTable
                      ? `Pergunte algo sobre a tabela "${selectedTable}"...`
                      : 'Faça uma pergunta sobre seus dados...'
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
