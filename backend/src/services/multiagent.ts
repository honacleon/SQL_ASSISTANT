import { NLQueryRequest, NLQueryResponse, TableInfo } from '@ai-data-assistant/shared';
import logger from '../config/logger';

// Interfaces para o sistema multiagente
interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence: number;
}

interface ConversationContext {
  history: Array<{ role: string; content: string }>;
  currentTable?: string;
  availableTables: TableInfo[];
  previousQueries: string[];
}

// Agente Coordenador - Gerencia o fluxo entre os agentes
class CoordinatorAgent {
  async processQuery(request: NLQueryRequest, tables: TableInfo[], context: ConversationContext): Promise<NLQueryResponse> {
    logger.info('🔄 CoordinatorAgent: Iniciando processamento multiagente');
    
    try {
      // 1. Agente de Schema - Analisa o schema e identifica tabelas relevantes
      const schemaAgent = new SchemaAgent();
      const schemaAnalysis = await schemaAgent.analyzeSchema(request.message, tables, context);
      
      if (!schemaAnalysis.success) {
        logger.warn('❌ SchemaAgent falhou, usando fallback');
        return this.fallbackResponse(request.message);
      }

      // 2. Agente SQL - Gera a query SQL
      const sqlAgent = new SQLAgent();
      const sqlResult = await sqlAgent.generateSQL(request.message, schemaAnalysis.data, context);
      
      if (!sqlResult.success) {
        logger.warn('❌ SQLAgent falhou, usando fallback');
        return this.fallbackResponse(request.message);
      }

      // 3. Agente Analista - Valida e otimiza a query
      const analystAgent = new AnalystAgent();
      const analysis = await analystAgent.analyzeQuery(sqlResult.data.sql, schemaAnalysis.data, context);
      
      // 4. Agente Formatador - Prepara a resposta final
      const formatterAgent = new FormatterAgent();
      const finalResponse = await formatterAgent.formatResponse(
        sqlResult.data.sql,
        analysis.data?.suggestions || [],
        context
      );

      logger.info(`✅ CoordinatorAgent: Processamento concluído com confiança ${finalResponse.confidence}`);
      
      return finalResponse;

    } catch (error) {
      logger.error('❌ CoordinatorAgent: Erro no processamento multiagente:', error);
      return this.fallbackResponse(request.message);
    }
  }

  private fallbackResponse(message: string): NLQueryResponse {
    // Fallback simples para quando o sistema multiagente falha
    const simpleQueries: Record<string, string> = {
      'quantos': 'SELECT COUNT(*) FROM users',
      'listar': 'SELECT * FROM products LIMIT 100',
      'mostrar': 'SELECT * FROM users LIMIT 100',
      'encontrar': 'SELECT * FROM products WHERE name ILIKE \'%\' LIMIT 100'
    };

    const keyword = Object.keys(simpleQueries).find(k => message.toLowerCase().includes(k));
    const sql = keyword ? simpleQueries[keyword] : 'SELECT COUNT(*) FROM users';

    return {
      sqlQuery: sql,
      explanation: 'Consulta gerada pelo sistema de fallback',
      confidence: 0.3,
      suggestedTable: keyword === 'quantos' ? 'users' : 'products'
    };
  }
}

// Agente de Schema - Especializado em análise de schema
class SchemaAgent {
  async analyzeSchema(userQuery: string, tables: TableInfo[], context: ConversationContext): Promise<AgentResponse> {
    logger.info('📊 SchemaAgent: Analisando schema do banco de dados');
    
    try {
      // Identificar tabelas relevantes baseadas na query do usuário
      const relevantTables = this.identifyRelevantTables(userQuery, tables, context);
      
      if (relevantTables.length === 0) {
        return {
          success: false,
          error: 'Nenhuma tabela relevante encontrada',
          confidence: 0.0
        };
      }

      // Analisar relações entre tabelas
      const tableRelationships = this.analyzeTableRelationships(relevantTables);
      
      // Identificar colunas mais relevantes
      const keyColumns = this.identifyKeyColumns(userQuery, relevantTables);

      return {
        success: true,
        data: {
          relevantTables,
          tableRelationships,
          keyColumns,
          primaryTable: this.identifyPrimaryTable(userQuery, relevantTables)
        },
        confidence: 0.9
      };

    } catch (error) {
      logger.error('❌ SchemaAgent: Erro na análise do schema:', error);
      return {
        success: false,
        error: 'Erro na análise do schema',
        confidence: 0.0
      };
    }
  }

  private identifyRelevantTables(userQuery: string, tables: TableInfo[], context: ConversationContext): TableInfo[] {
    const query = userQuery.toLowerCase();
    const relevantTables: TableInfo[] = [];

    // Busca por palavras-chave relacionadas a tabelas
    const tableKeywords: Record<string, string[]> = {
      'users': ['usuário', 'user', 'pessoa', 'cliente', 'funcionário'],
      'products': ['produto', 'product', 'item', 'mercadoria', 'serviço'],
      'orders': ['pedido', 'order', 'venda', 'compra', 'transação'],
      'customers': ['cliente', 'customer', 'consumidor', 'comprador']
    };

    for (const table of tables) {
      // Verificar se a query menciona o nome da tabela
      if (query.includes(table.name.toLowerCase())) {
        relevantTables.push(table);
        continue;
      }

      // Verificar palavras-chave relacionadas
      const keywords = tableKeywords[table.name] || [];
      if (keywords.some(keyword => query.includes(keyword))) {
        relevantTables.push(table);
        continue;
      }

      // Verificar contexto da conversa
      if (context.currentTable === table.name) {
        relevantTables.push(table);
      }
    }

    // Se nenhuma tabela foi encontrada, usar fallback
    if (relevantTables.length === 0 && tables.length > 0) {
      return [tables[0]]; // Usar primeira tabela como fallback
    }

    return relevantTables;
  }

  private analyzeTableRelationships(tables: TableInfo[]): any[] {
    // Análise básica de relações entre tabelas
    const relationships: any[] = [];

    for (const table of tables) {
      // Verificar colunas de chave estrangeira
      const foreignKeys = table.columns.filter(col => 
        col.name.includes('_id') || col.name === 'user_id' || col.name === 'product_id'
      );

      for (const fk of foreignKeys) {
        const relatedTable = tables.find(t => 
          t.name === fk.name.replace('_id', '') || 
          t.name === fk.name.replace('_id', 's')
        );

        if (relatedTable) {
          relationships.push({
            fromTable: table.name,
            toTable: relatedTable.name,
            foreignKey: fk.name
          });
        }
      }
    }

    return relationships;
  }

  private identifyKeyColumns(userQuery: string, tables: TableInfo[]): string[] {
    const query = userQuery.toLowerCase();
    const keyColumns: string[] = [];

    for (const table of tables) {
      for (const column of table.columns) {
        // Buscar por menções de colunas na query
        if (query.includes(column.name.toLowerCase())) {
          keyColumns.push(`${table.name}.${column.name}`);
        }

        // Buscar por tipos de dados específicos
        if (column.type.includes('date') && (query.includes('data') || query.includes('recente'))) {
          keyColumns.push(`${table.name}.${column.name}`);
        }

        if (column.type.includes('numeric') && (query.includes('preço') || query.includes('valor'))) {
          keyColumns.push(`${table.name}.${column.name}`);
        }

        if (column.type.includes('text') && (query.includes('nome') || query.includes('email'))) {
          keyColumns.push(`${table.name}.${column.name}`);
        }
      }
    }

    return keyColumns;
  }

  private identifyPrimaryTable(userQuery: string, tables: TableInfo[]): string {
    if (tables.length === 1) return tables[0].name;

    const query = userQuery.toLowerCase();
    
    // Priorizar tabelas baseadas na query
    if (query.includes('usuário') || query.includes('user')) return 'users';
    if (query.includes('produto') || query.includes('product')) return 'products';
    if (query.includes('pedido') || query.includes('order')) return 'orders';

    return tables[0].name; // Fallback para primeira tabela
  }
}

// Agente SQL - Especializado em geração de queries SQL
class SQLAgent {
  async generateSQL(userQuery: string, schemaAnalysis: any, context: ConversationContext): Promise<AgentResponse> {
    logger.info('💾 SQLAgent: Gerando query SQL');
    
    try {
      const { relevantTables, keyColumns, primaryTable } = schemaAnalysis;
      
      // Determinar o tipo de query baseado na intenção do usuário
      const queryType = this.identifyQueryType(userQuery);
      
      // Gerar a query SQL apropriada
      const sql = this.generateAppropriateSQL(userQuery, queryType, primaryTable, keyColumns, context);
      
      return {
        success: true,
        data: {
          sql,
          queryType,
          tablesUsed: [primaryTable],
          columnsUsed: keyColumns
        },
        confidence: 0.85
      };

    } catch (error) {
      logger.error('❌ SQLAgent: Erro na geração da query SQL:', error);
      return {
        success: false,
        error: 'Erro na geração da query SQL',
        confidence: 0.0
      };
    }
  }

  private identifyQueryType(userQuery: string): string {
    const query = userQuery.toLowerCase();

    if (query.includes('quantos') || query.includes('contar') || query.includes('count')) {
      return 'COUNT';
    }

    if (query.includes('listar') || query.includes('mostrar') || query.includes('exibir')) {
      return 'SELECT';
    }

    if (query.includes('últimos') || query.includes('recentes') || query.includes('mais novos')) {
      return 'SELECT_ORDERED';
    }

    if (query.includes('onde') || query.includes('com') || query.includes('que tem')) {
      return 'SELECT_FILTERED';
    }

    return 'SELECT'; // Default
  }

  private generateAppropriateSQL(
    userQuery: string, 
    queryType: string, 
    primaryTable: string, 
    keyColumns: string[], 
    context: ConversationContext
  ): string {
    const baseTable = primaryTable || 'users';

    switch (queryType) {
      case 'COUNT':
        return `SELECT COUNT(*) FROM ${baseTable}`;

      case 'SELECT_ORDERED':
        // Tentar encontrar coluna de data para ordenação
        const dateColumn = keyColumns.find(col => 
          col.includes('created_at') || col.includes('date') || col.includes('timestamp')
        );
        const orderColumn = dateColumn ? dateColumn.split('.')[1] : 'id';
        return `SELECT * FROM ${baseTable} ORDER BY ${orderColumn} DESC LIMIT 100`;

      case 'SELECT_FILTERED':
        // Extrair condições de filtro da query
        const conditions = this.extractFilterConditions(userQuery, keyColumns);
        if (conditions.length > 0) {
          return `SELECT * FROM ${baseTable} WHERE ${conditions.join(' AND ')} LIMIT 100`;
        }
        return `SELECT * FROM ${baseTable} LIMIT 100`;

      default:
        return `SELECT * FROM ${baseTable} LIMIT 100`;
    }
  }

  private extractFilterConditions(userQuery: string, keyColumns: string[]): string[] {
    const conditions: string[] = [];
    const query = userQuery.toLowerCase();

    // Extrair condições básicas baseadas em palavras-chave
    if (query.includes('gmail')) {
      conditions.push("email ILIKE '%gmail%'");
    }

    if (query.includes('ativo') || query.includes('active')) {
      conditions.push("active = true");
    }

    if (query.includes('maior que') || query.includes('acima de')) {
      const match = query.match(/(maior que|acima de)\s+(\d+)/);
      if (match) {
        conditions.push(`price > ${match[2]}`);
      }
    }

    return conditions;
  }
}

// Agente Analista - Valida e otimiza queries
class AnalystAgent {
  async analyzeQuery(sql: string, schemaAnalysis: any, context: ConversationContext): Promise<AgentResponse> {
    logger.info('🔍 AnalystAgent: Analisando e validando query SQL');
    
    try {
      const suggestions: string[] = [];
      let confidence = 0.9;

      // Validar sintaxe básica
      if (!this.isValidSQL(sql)) {
        suggestions.push('Query SQL parece ter sintaxe inválida');
        confidence = 0.3;
      }

      // Verificar se as tabelas mencionadas existem
      const tableValidation = this.validateTables(sql, schemaAnalysis.relevantTables);
      if (!tableValidation.valid) {
        suggestions.push(`Tabela "${tableValidation.invalidTable}" não encontrada no schema`);
        confidence = Math.min(confidence, 0.5);
      }

      // Sugerir otimizações
      const optimizationSuggestions = this.suggestOptimizations(sql, schemaAnalysis);
      suggestions.push(...optimizationSuggestions);

      return {
        success: true,
        data: {
          isValid: confidence > 0.5,
          suggestions,
          optimizedSQL: this.optimizeSQL(sql, optimizationSuggestions)
        },
        confidence
      };

    } catch (error) {
      logger.error('❌ AnalystAgent: Erro na análise da query:', error);
      return {
        success: false,
        error: 'Erro na análise da query',
        confidence: 0.0
      };
    }
  }

  private isValidSQL(sql: string): boolean {
    // Validação básica de sintaxe SQL
    const sqlUpper = sql.toUpperCase();
    return sqlUpper.startsWith('SELECT') && 
           !sqlUpper.includes('DROP') && 
           !sqlUpper.includes('DELETE') &&
           !sqlUpper.includes('UPDATE');
  }

  private validateTables(sql: string, availableTables: TableInfo[]): { valid: boolean; invalidTable?: string } {
    const tableNames = availableTables.map(t => t.name.toLowerCase());
    const sqlTables = sql.match(/(?:FROM|JOIN)\s+(\w+)/gi) || [];
    
    for (const tableRef of sqlTables) {
      const tableName = tableRef.replace(/(FROM|JOIN)\s+/i, '').toLowerCase();
      if (!tableNames.includes(tableName)) {
        return { valid: false, invalidTable: tableName };
      }
    }

    return { valid: true };
  }

  private suggestOptimizations(sql: string, schemaAnalysis: any): string[] {
    const suggestions: string[] = [];
    const sqlUpper = sql.toUpperCase();

    // Sugerir LIMIT se não houver
    if (!sqlUpper.includes('LIMIT') && sqlUpper.includes('SELECT *')) {
      suggestions.push('Adicionar LIMIT para evitar retornar muitos registros');
    }

    // Sugerir ordenação para queries de lista
    if (sqlUpper.includes('SELECT *') && !sqlUpper.includes('ORDER BY')) {
      suggestions.push('Considerar adicionar ORDER BY para resultados consistentes');
    }

    return suggestions;
  }

  private optimizeSQL(sql: string, suggestions: string[]): string {
    let optimized = sql;

    // Aplicar otimizações baseadas nas sugestões
    if (suggestions.includes('Adicionar LIMIT para evitar retornar muitos registros') && 
        !sql.toUpperCase().includes('LIMIT')) {
      optimized += ' LIMIT 100';
    }

    if (suggestions.includes('Considerar adicionar ORDER BY para resultados consistentes') &&
        !sql.toUpperCase().includes('ORDER BY')) {
      optimized = optimized.replace(/LIMIT \d+$/, 'ORDER BY id DESC $&');
    }

    return optimized;
  }
}

// Agente Formatador - Prepara a resposta final
class FormatterAgent {
  async formatResponse(sql: string, suggestions: string[], context: ConversationContext): Promise<NLQueryResponse> {
    logger.info('📝 FormatterAgent: Formatando resposta final');
    
    try {
      // Gerar explicação baseada na query
      const explanation = this.generateExplanation(sql, context);
      
      // Calcular confiança baseada na qualidade da query
      const confidence = this.calculateConfidence(sql, suggestions);
      
      // Identificar tabela sugerida
      const suggestedTable = this.identifySuggestedTable(sql);

      return {
        sqlQuery: sql,
        explanation,
        confidence,
        suggestedTable
      };

    } catch (error) {
      logger.error('❌ FormatterAgent: Erro na formatação da resposta:', error);
      return {
        sqlQuery: sql,
        explanation: 'Query gerada pelo sistema multiagente',
        confidence: 0.7,
        suggestedTable: this.identifySuggestedTable(sql)
      };
    }
  }

  private calculateConfidence(sql: string, suggestions: string[]): number {
    let confidence = 0.9;

    // Reduzir confiança baseado em problemas identificados
    if (suggestions.length > 0) {
      confidence -= suggestions.length * 0.1;
    }

    // Verificar qualidade da query
    if (!sql.toUpperCase().includes('LIMIT') && sql.toUpperCase().includes('SELECT *')) {
      confidence -= 0.1;
    }

    if (!sql.toUpperCase().includes('FROM')) {
      confidence = 0.1; // Query muito básica
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private identifySuggestedTable(sql: string): string {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    return tableMatch ? tableMatch[1] : 'users';
  }
  private generateExplanation(sql: string, context: ConversationContext): string {
    const sqlUpper = sql.toUpperCase();

    if (sqlUpper.includes('COUNT(*)')) {
      return 'Conta o número total de registros na tabela';
    }

    if (sqlUpper.includes('SELECT *')) {
      if (sqlUpper.includes('WHERE')) {
        return 'Retorna registros filtrados de acordo com os critérios especificados';
      }
      if (sqlUpper.includes('ORDER BY')) {
        return 'Retorna registros ordenados pelos critérios especificados';
      }
      return 'Retorna todos os registros da tabela (limitado a 100 registros)';
    }

    return 'Consulta gerada para atender sua solicitação';
  }
}

// Serviço principal que integra o sistema multiagente
export class MultiAgentService {
  private coordinator: CoordinatorAgent;
  private conversationContext: ConversationContext;

  constructor() {
    this.coordinator = new CoordinatorAgent();
    this.conversationContext = {
      history: [],
      availableTables: [],
      previousQueries: []
    };
  }

  async processQuery(request: NLQueryRequest, tables: TableInfo[]): Promise<NLQueryResponse> {
    try {
      // Atualizar contexto da conversa
      this.updateConversationContext(request, tables);

      // Processar usando o sistema multiagente
      const response = await this.coordinator.processQuery(request, tables, this.conversationContext);

      // Atualizar histórico
      this.conversationContext.history.push(
        { role: 'user', content: request.message },
        { role: 'assistant', content: response.explanation }
      );
      this.conversationContext.previousQueries.push(response.sqlQuery);

      // Manter histórico limitado
      if (this.conversationContext.history.length > 10) {
        this.conversationContext.history = this.conversationContext.history.slice(-10);
      }
      if (this.conversationContext.previousQueries.length > 5) {
        this.conversationContext.previousQueries = this.conversationContext.previousQueries.slice(-5);
      }

      return response;

    } catch (error) {
      logger.error('❌ MultiAgentService: Erro no processamento:', error);
      // Fallback para o serviço NLP original se o multiagente falhar
      return this.fallbackToOriginalNLP(request.message);
    }
  }

  private updateConversationContext(request: NLQueryRequest, tables: TableInfo[]) {
    this.conversationContext.availableTables = tables;
    
    if (request.context?.currentTable) {
      this.conversationContext.currentTable = request.context.currentTable;
    }

    if (request.context?.previousQueries) {
      this.conversationContext.previousQueries = [
        ...this.conversationContext.previousQueries,
        ...request.context.previousQueries
      ];
    }
  }

  private fallbackToOriginalNLP(message: string): NLQueryResponse {
    // Fallback simples baseado em palavras-chave
    const simpleResponses: Record<string, NLQueryResponse> = {
      'quantos': {
        sqlQuery: 'SELECT COUNT(*) FROM users',
        explanation: 'Conta o número total de usuários',
        confidence: 0.5,
        suggestedTable: 'users'
      },
      'listar': {
        sqlQuery: 'SELECT * FROM products LIMIT 100',
        explanation: 'Lista todos os produtos',
        confidence: 0.5,
        suggestedTable: 'products'
      },
      'mostrar': {
        sqlQuery: 'SELECT * FROM users LIMIT 100',
        explanation: 'Mostra informações dos usuários',
        confidence: 0.5,
        suggestedTable: 'users'
      }
    };

    const keyword = Object.keys(simpleResponses).find(k =>
      message.toLowerCase().includes(k)
    );

    return keyword ? simpleResponses[keyword] : {
      sqlQuery: 'SELECT COUNT(*) FROM users',
      explanation: 'Consulta de fallback para contar usuários',
      confidence: 0.3,
      suggestedTable: 'users'
    };
  }

  // Método para limpar o contexto da conversa
  clearConversationContext() {
    this.conversationContext = {
      history: [],
      availableTables: [],
      previousQueries: []
    };
  }

  // Método para obter estatísticas do contexto
  getContextStats() {
    return {
      historyLength: this.conversationContext.history.length,
      previousQueriesCount: this.conversationContext.previousQueries.length,
      availableTablesCount: this.conversationContext.availableTables.length,
      currentTable: this.conversationContext.currentTable
    };
  }
}