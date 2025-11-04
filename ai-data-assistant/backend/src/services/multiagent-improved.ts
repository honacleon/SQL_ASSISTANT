import { NLQueryRequest, NLQueryResponse, TableInfo } from '@ai-data-assistant/shared';
import logger from '../config/logger';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { supabase } from '../config/supabase';

/**
 * Sistema Multiagentes Completo - Portado 100% do Webinar
 * Arquitetura: Coordenador + Schema + Query + Analyst + Formatter
 * Adaptado para Chat Web (em vez de WhatsApp)
 */
export class ImprovedMultiAgentService {
  private anthropic: Anthropic;
  private openai: OpenAI | null;
  private model: string;
  private openaiModel: string;
  private maxTokens: number;
  private schemaCache: Map<string, any>;
  private conversationContext: {
    lastEmail: string | null;
    lastTable: string | null;
    lastOperation: string | null;
    recentQueries: any[];
  };
  private lastModelUsed: string = '';

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });
    
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-4o';
    this.maxTokens = parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1500');
    
    // Log de configuração
    logger.info(`🔧 IA configurada: Claude (${this.model}) + OpenAI fallback (${this.openaiModel})`);
    
    // Cache de metadados para otimização
    this.schemaCache = new Map();
    
    // Contexto de conversa
    this.conversationContext = {
      lastEmail: null,
      lastTable: null,
      lastOperation: null,
      recentQueries: []
    };
    
    logger.info('🤖 Sistema Multiagentes inicializado (100% baseado no Webinar)');
  }

  /**
   * Ponto de entrada principal - coordena todos os agentes
   */
  async processNaturalLanguageQuery(
    request: NLQueryRequest,
    tables: TableInfo[]
  ): Promise<NLQueryResponse> {
    try {
      logger.info(`🧠 Coordenador processando: "${request.message}"`);

      // ⚡ FAST PATH: Detecta perguntas conversacionais que não precisam de SQL
      const directResponse = this.detectDirectQuestion(request.message, tables);
      if (directResponse) {
        logger.info('⚡ Resposta direta detectada - bypass de agentes');
        return directResponse;
      }

      // 1. Agente Coordenador analisa a intenção
      const intention = await this.coordinatorAgent(request.message, tables);
      
      // ⚡ FAST PATH: Se é pergunta conversacional (não precisa SQL)
      if (intention.analysis_type === 'conversational' || intention.skip_sql) {
        logger.info('⚡ Pergunta conversacional - resposta direta');
        return {
          sqlQuery: '',
          explanation: intention.direct_answer || 'Resposta conversacional',
          confidence: intention.confidence || 0.95,
          suggestedTable: undefined
        };
      }
      
      // Atualiza contexto de conversa
      this.updateConversationContext(intention, request.message);

      // 2. Agente Schema descobre estrutura necessária
      const schemas = await this.schemaAgent(intention.tables_needed || [], tables);
      logger.info(`📋 Schema obtido para ${schemas.length} tabelas`);

      // 3. Agente Query constrói e executa consultas
      const queryResult = await this.queryAgent(intention, schemas, request.message);
      logger.info(`🔍 Query executada:`, queryResult.success ? 'Sucesso' : 'Erro');
      
      // ⚡ PROTEÇÃO: Se SQL é null/undefined, retorna erro amigável
      if (!queryResult.success || !queryResult.sql_strategy?.sql_query) {
        logger.warn('⚠️ Query Agent não gerou SQL válido');
        return {
          sqlQuery: '',
          explanation: '🤖 Não consegui gerar uma consulta SQL para sua pergunta. Pode reformular de forma mais específica? Por exemplo: "Quantos registros tem na tabela X?" ou "Mostre os dados da tabela Y"',
          confidence: 0.3,
          suggestedTable: intention.tables_needed?.[0]
        };
      }

      // 4. Agente Analyst analisa os resultados
      const analysis = await this.analystAgent(queryResult, intention, request.message);
      logger.info(`📊 Análise concluída`);

      // 5. Agente Formatter cria resposta para Chat Web
      const response = await this.formatterAgent(analysis, queryResult, request.message);
      logger.info(`💬 Resposta formatada: ${response.length} caracteres`);

      return {
        sqlQuery: queryResult.sql_strategy?.sql_query || '',
        explanation: `${response}\n\n_Modelo usado: ${this.lastModelUsed}_`,
        confidence: intention.confidence || 0.8,
        suggestedTable: intention.tables_needed[0] || tables[0]?.name
      };

    } catch (error) {
      logger.error('❌ Erro no sistema multiagentes:', error);
      return {
        sqlQuery: '',
        explanation: `🤖 Desculpe, encontrei um erro ao analisar sua solicitação: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0.0,
        suggestedTable: undefined
      };
    }
  }

  /**
   * DETECÇÃO RÁPIDA DE PERGUNTAS DIRETAS (sem IA)
   * Responde instantaneamente perguntas conversacionais comuns
   */
  private detectDirectQuestion(message: string, tables: TableInfo[]): NLQueryResponse | null {
    const text = message.toLowerCase().trim();
    logger.info(`🔍 Fast Path: Testando "${text}" contra ${11} padrões`);
    
    // Perguntas sobre capacidades do sistema
    const capabilityPatterns = [
      { pattern: /\b(consegue|pode|sabe|faz|suporta|aceita).*(join|juntar|unir|relacionar).*(tabela)/i, 
        answer: '✅ **Sim, consigo fazer JOINs!**\n\nPosso relacionar múltiplas tabelas usando JOIN. Por exemplo:\n\n• "Mostre pedidos com dados dos clientes"\n• "Liste produtos e suas categorias"\n• "Relacione usuários com seus pedidos"\n\nBasta me dizer quais tabelas você quer relacionar!' },
      
      { pattern: /\b(consegue|pode|sabe|faz).*(filtrar|buscar|pesquisar|encontrar)/i,
        answer: '✅ **Sim, posso filtrar dados!**\n\nConsigo fazer buscas e filtros como:\n\n• "Filtre usuários do estado SP"\n• "Mostre pedidos acima de R$ 1000"\n• "Busque produtos da categoria eletrônicos"\n\nQual filtro você precisa?' },
      
      { pattern: /\b(consegue|pode|sabe|faz).*(agrupar|group|agregar)/i,
        answer: '✅ **Sim, posso agrupar dados!**\n\nConsigo fazer agregações como:\n\n• "Agrupe vendas por mês"\n• "Conte pedidos por status"\n• "Some valores por categoria"\n\nQue tipo de agrupamento você quer?' },
      
      { pattern: /\b(consegue|pode|sabe|faz).*(ordenar|sort|classificar)/i,
        answer: '✅ **Sim, posso ordenar dados!**\n\nConsigo ordenar por qualquer coluna:\n\n• "Mostre os últimos 10 registros"\n• "Liste produtos do mais caro ao mais barato"\n• "Ordene por data de criação"\n\nComo você quer ordenar?' },
      
      { pattern: /\b(quais|que).*(funcionalidades|recursos|capacidades|comandos)/i,
        answer: '🤖 **Minhas capacidades:**\n\n✅ Consultar dados (SELECT)\n✅ Filtrar e buscar\n✅ Agrupar e agregar\n✅ Fazer JOINs entre tabelas\n✅ Ordenar resultados\n✅ Contar registros\n✅ Calcular estatísticas\n\nPergunte em português natural!' },
      
      { pattern: /\b(oi|olá|ola|hello|hi)\b/i,
        answer: `👋 **Olá! Sou seu assistente de dados.**\n\nTenho acesso a **${tables.length} tabelas** com dados reais.\n\nPosso te ajudar a:\n• Consultar dados\n• Fazer análises\n• Gerar relatórios\n\nQue dados você precisa?` },
      
      { pattern: /\b(obrigado|obrigada|valeu|thanks)\b/i,
        answer: '😊 **Por nada! Estou aqui para ajudar.**\n\nPrecisa de mais alguma análise?' },
      
      { pattern: /\b(ajuda|help|socorro)\b/i,
        answer: `📚 **Como posso ajudar:**\n\n**Exemplos de perguntas:**\n• "Quantos registros tem na tabela X?"\n• "Mostre os últimos 10 pedidos"\n• "Filtre usuários de SP"\n• "Agrupe vendas por mês"\n\n**Tabelas disponíveis:** ${tables.slice(0, 5).map(t => t.name).join(', ')}${tables.length > 5 ? '...' : ''}` },
      
      { pattern: /\b(quais|que|lista).*(tabelas|tables)/i,
        answer: `📊 **Tabelas disponíveis (${tables.length}):**\n\n${tables.slice(0, 10).map((t, i) => `${i + 1}. **${t.name}** (${t.rowCount?.toLocaleString('pt-BR') || 0} registros)`).join('\n')}${tables.length > 10 ? `\n\n...e mais ${tables.length - 10} tabelas` : ''}\n\nQual tabela você quer consultar?` },
      
      { pattern: /\b(quem|who).*(voce|você|vc|es|are you)/i,
        answer: '🤖 **Sou um assistente de dados com IA.**\n\nUso um sistema de **5 agentes especializados** para:\n• Entender suas perguntas\n• Gerar SQL otimizado\n• Analisar resultados\n• Responder em linguagem natural\n\nPowered by Claude Sonnet 4 🚀' },
    ];
    
    for (const { pattern, answer } of capabilityPatterns) {
      if (pattern.test(text)) {
        logger.info(`✅ Fast Path: Match encontrado! Padrão: ${pattern}`);
        return {
          sqlQuery: '',
          explanation: answer,
          confidence: 1.0,
          suggestedTable: undefined
        };
      }
    }
    
    logger.info('❌ Fast Path: Nenhum match - seguindo para agentes');
    return null;
  }

  /**
   * AGENTE COORDENADOR - Analisa intenção e planeja execução
   */
  private async coordinatorAgent(messageText: string, tables: TableInfo[]): Promise<any> {
    // Primeiro descobre as tabelas disponíveis dinamicamente
    const availableTables = tables.map(t => ({
      table_name: t.name,
      row_count: t.rowCount || 0,
      columns: t.columns.map(c => c.name)
    }));
    
    // Detecta referências contextuais
    const contextualInfo = this.extractContextualReferences(messageText);
    
    // DETECTA CONFIRMAÇÕES: "sim", "mostre", "continue", "ok"
    const isConfirmation = /^(sim|yes|ok|mostre|continue|vai|pode|quero|show me)$/i.test(messageText.trim());
    
    if (isConfirmation && this.conversationContext.recentQueries.length > 0) {
      logger.info('✅ Confirmação detectada! Usando contexto da última query');
      const lastQuery = this.conversationContext.recentQueries[0];
      
      // Retorna a mesma intenção da última query
      return {
        ...lastQuery.intention,
        analysis_type: "list", // Força listagem para mostrar dados
        operations: ["list", "show_data"],
        explanation: `Executando novamente: ${lastQuery.message}`,
        confidence: 1.0,
        is_continuation: true
      };
    }
    
    const prompt = `Você é o Agente Coordenador de um sistema de análise de dados.

TABELAS DESCOBERTAS DINAMICAMENTE:
${availableTables.map(table =>
    `- ${table.table_name} (${table.row_count} registros, ${table.columns.length} colunas)`
).join('\n')}

CONTEXTO DA CONVERSA:
${this.conversationContext.lastEmail ? `- Último email consultado: ${this.conversationContext.lastEmail}` : ''}
${this.conversationContext.lastTable ? `- Última tabela consultada: ${this.conversationContext.lastTable}` : ''}
${this.conversationContext.lastOperation ? `- Última operação: ${this.conversationContext.lastOperation}` : ''}

HISTÓRICO RECENTE (últimas 3 queries):
${this.conversationContext.recentQueries.slice(0, 3).map((q, i) => `
${i + 1}. Pergunta: "${q.message}"
   Tabelas: ${q.intention?.tables_needed?.join(', ') || 'N/A'}
   Operação: ${q.intention?.analysis_type || 'N/A'}
`).join('\n')}

REFERÊNCIAS DETECTADAS NA MENSAGEM:
${contextualInfo.email ? `- Email mencionado: ${contextualInfo.email}` : ''}
${contextualInfo.table ? `- Tabela mencionada: ${contextualInfo.table}` : ''}
${contextualInfo.sameEmail ? '- Referência ao "mesmo email" detectada' : ''}
${contextualInfo.sameTable ? '- Referência à "mesma tabela" detectada' : ''}

INSTRUÇÕES CRÍTICAS:
1. Se a pergunta é CONVERSACIONAL ("você consegue?", "você faz?", "olá") → use analysis_type: "conversational" e skip_sql: true
2. Se o usuário responder "sim", "mostre", "continue" → USE a última query do histórico
3. Se detectar "mesmo email", "esse email", use: ${this.conversationContext.lastEmail || 'email anterior'}
4. Se detectar "mesma tabela", "essa tabela", use: ${this.conversationContext.lastTable || 'tabela anterior'}
5. Para busca de email específico, use analysis_type: "list" e operations: ["filter"]
6. Para contagens, use analysis_type: "count" e operations: ["count"]
7. Para listagem de tabelas, use analysis_type: "list" e operations: ["metadata_query"]
8. Se o usuário pedir para "agrupar", "mostrar distribuição" → use analysis_type: "aggregate" e operations: ["group_by"]

EXEMPLOS DE ANÁLISE CORRETA:
- "buscar email X na tabela Y" → {"analysis_type": "list", "tables_needed": ["Y"], "operations": ["filter"]}
- "dados do mesmo email na tabela Z" → {"analysis_type": "list", "tables_needed": ["Z"], "operations": ["filter"]}
- "quantos registros tem" → {"analysis_type": "count", "tables_needed": ["tabela"], "operations": ["count"]}

RESPONDA APENAS EM JSON VÁLIDO (sem markdown, sem explicações extras):
{
  "analysis_type": "conversational|count|list|aggregate|join|complex_analysis",
  "tables_needed": ["tabela1", "tabela2"],
  "operations": ["count", "filter", "join", "group_by", "metadata_query"],
  "complexity": "simple|medium|complex",
  "explanation": "Explicação do que será feito",
  "confidence": 0.95,
  "skip_sql": false,
  "direct_answer": "Resposta direta (se conversacional)"
}

SOLICITAÇÃO DO USUÁRIO: "${messageText}"`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 500,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      const analysisText = content.type === 'text' ? content.text : '';
      this.lastModelUsed = `Claude (${this.model})`;
      
      return this.parseJSON(analysisText, {
        analysis_type: "list",
        tables_needed: availableTables.length > 0 ? [availableTables[0].table_name] : [],
        operations: ["count"],
        complexity: "simple",
        explanation: "Análise básica com descoberta dinâmica",
        confidence: 0.5
      });

    } catch (error) {
      logger.error('❌ Erro no Agente Coordenador (Claude):', error);
      
      // FALLBACK: Tenta com OpenAI GPT-4o
      if (this.openai) {
        try {
          logger.info('🔄 Tentando fallback com OpenAI GPT-4o...');
          
          const completion = await this.openai.chat.completions.create({
            model: this.openaiModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 500
          });
          
          const analysisText = completion.choices[0]?.message?.content || '';
          this.lastModelUsed = `OpenAI (${this.openaiModel})`;
          
          return this.parseJSON(analysisText, {
            analysis_type: "list",
            tables_needed: availableTables.length > 0 ? [availableTables[0].table_name] : [],
            operations: ["count"],
            complexity: "simple",
            explanation: "Análise básica com descoberta dinâmica",
            confidence: 0.5
          });
          
        } catch (openaiError) {
          logger.error('❌ Erro no fallback OpenAI:', openaiError);
        }
      }
      
      // Fallback inteligente baseado em contexto (sem IA)
      this.lastModelUsed = 'Fallback (sem IA)';
      const smartFallback = this.createSmartFallback(messageText, availableTables, contextualInfo);
      return smartFallback;
    }
  }

  extractContextualReferences(messageText: string): any {
    const text = messageText.toLowerCase();
    
    return {
      email: this.extractEmailFromText(text),
      table: this.extractTableFromText(text),
      sameEmail: /mesmo email|esse email|este email|email anterior/.test(text),
      sameTable: /mesma tabela|essa tabela|esta tabela|tabela anterior/.test(text),
      isSearch: /buscar|procurar|encontrar|localizar|verificar/.test(text),
      isCount: /quantos|quantidade|contar|total/.test(text),
      isList: /listar|mostrar|trazer|dados|informações/.test(text)
    };
  }

  extractEmailFromText(text: string): string | null {
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return emailMatch ? emailMatch[1] : null;
  }

  extractTableFromText(text: string): string | null {
    // Extrai nome de tabela da mensagem (busca por padrão table_name)
    const tableMatch = text.match(/tabela\s+(\w+)/);
    return tableMatch ? tableMatch[1] : null;
  }

  createSmartFallback(messageText: string, availableTables: any[], contextualInfo: any): any {
    const text = messageText.toLowerCase();
    
    // Detecta tipo de operação baseado em palavras-chave
    let analysis_type = "list";
    let operations = ["filter"];
    let tables_needed: string[] = [];
    
    if (contextualInfo.isCount) {
      analysis_type = "count";
      operations = ["count"];
    } else if (contextualInfo.isList && !contextualInfo.isSearch) {
      analysis_type = "list";
      operations = ["metadata_query"];
    }
    
    // Detecta tabela
    if (contextualInfo.table) {
      tables_needed = [contextualInfo.table];
    } else if (contextualInfo.sameTable && this.conversationContext.lastTable) {
      tables_needed = [this.conversationContext.lastTable];
    } else if (availableTables.length > 0) {
      // Se menciona email, provavelmente quer qualified_leads ou engaged_leads
      if (contextualInfo.email || contextualInfo.sameEmail) {
        const emailTables = availableTables.filter(t =>
          t.table_name.includes('leads') || t.table_name.includes('qualified') || t.table_name.includes('engaged')
        );
        tables_needed = emailTables.length > 0 ? [emailTables[0].table_name] : [availableTables[0].table_name];
      } else {
        tables_needed = [availableTables[0].table_name];
      }
    }
    
    return {
      analysis_type,
      tables_needed,
      operations,
      complexity: "simple",
      explanation: `Fallback inteligente: ${analysis_type} em ${tables_needed.join(', ')}`,
      confidence: 0.7
    };
  }

  /**
   * AGENTE SCHEMA - Descobre estrutura das tabelas necessárias
   */
  private async schemaAgent(tablesNeeded: string[], allTables: TableInfo[]): Promise<any[]> {
    const schemas: any[] = [];

    for (const tableName of tablesNeeded) {
      try {
        // Verifica cache primeiro
        const cacheKey = `schema_${tableName}`;
        if (this.schemaCache.has(cacheKey)) {
          const cached = this.schemaCache.get(cacheKey);
          if (Date.now() - cached.timestamp < 300000) { // 5 minutos
            schemas.push(cached.data);
            continue;
          }
        }

        // Busca schema real
        const tableInfo = allTables.find(t => t.name === tableName);
        if (!tableInfo) {
          logger.warn(`⚠️ Não foi possível obter schema de ${tableName}`);
          continue;
        }

        // Busca amostra de dados
        const sampleData = await this.getSampleData(tableName);
        
        const schema = {
          table_name: tableName,
          columns: tableInfo.columns.map(c => c.name),
          row_count: tableInfo.rowCount || 0,
          sample_data: sampleData
        };
        
        schemas.push(schema);
        
        // Atualiza cache
        this.schemaCache.set(cacheKey, {
          data: schema,
          timestamp: Date.now()
        });
        
        logger.info(`📋 Schema ${tableName}: ${schema.columns.length} colunas`);

      } catch (error) {
        logger.error(`❌ Erro ao obter schema de ${tableName}:`, error);
      }
    }

    return schemas;
  }

  /**
   * AGENTE SQL - Constrói queries SQL precisas e inteligentes
   */
  private async queryAgent(intention: any, schemas: any[], originalMessage: string): Promise<any> {
    // ⚡ PROTEÇÃO: Se não há tabelas, não pode gerar SQL
    if (!schemas || schemas.length === 0) {
      logger.warn('⚠️ Nenhuma tabela fornecida para Query Agent');
      return {
        success: false,
        error: 'Nenhuma tabela disponível',
        sql_strategy: null,
        results: []
      };
    }
    const prompt = `Você é um Agente SQL Expert que constrói queries PostgreSQL perfeitas para Supabase.

SCHEMAS DISPONÍVEIS:
${schemas.map(s => `
Tabela: ${s.table_name}
Colunas: ${s.columns.join(', ')}
Registros: ${s.row_count}
Amostra: ${JSON.stringify(s.sample_data?.slice(0, 1) || [])}
`).join('\n')}

CONTEXTO DA CONVERSA:
${this.conversationContext.lastEmail ? `- Email em contexto: ${this.conversationContext.lastEmail}` : ''}
${this.conversationContext.lastTable ? `- Tabela em contexto: ${this.conversationContext.lastTable}` : ''}

INTENÇÃO ANALISADA:
${JSON.stringify(intention, null, 2)}

INSTRUÇÕES CRÍTICAS:
1. Se intention.operations inclui "filter" e há email em contexto, USE WHERE email = '${this.conversationContext.lastEmail || 'email_contexto'}'
2. Para "quantidade distintas" ou "emails únicos" → USE COUNT(DISTINCT coluna)
3. Para "últimos registros" → USE ORDER BY timestamp/created_at DESC LIMIT N
4. Para "filtros" → USE WHERE com condições apropriadas
5. Para "agregações" → USE SUM, AVG, MAX, MIN conforme necessário
6. Para "joins" → USE INNER/LEFT JOIN quando necessário

EXEMPLOS CONTEXTUAIS:
- Se buscar dados do "mesmo email" → USE WHERE email = '${this.conversationContext.lastEmail || 'email_anterior'}'
- Se buscar na "mesma tabela" → USE FROM ${this.conversationContext.lastTable || 'tabela_anterior'}

RESPONDA APENAS EM JSON VÁLIDO (sem markdown):
{
  "sql_query": "SELECT * FROM qualified_leads WHERE email = 'exemplo@email.com'",
  "query_type": "count_distinct|simple_count|list|aggregation|complex",
  "explanation": "Query SQL construída baseada no contexto",
  "expected_result": "dados do email específico"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 800,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      const sqlResponseText = content.type === 'text' ? content.text : '';
      this.lastModelUsed = `Claude (${this.model})`;
      
      const sqlStrategy = this.parseJSON(sqlResponseText, {
        sql_query: `SELECT COUNT(*) FROM ${intention.tables_needed[0] || 'unknown'}`,
        query_type: "simple_count",
        explanation: "Query básica de fallback",
        expected_result: "contagem simples"
      });

      logger.info(`🔍 SQL gerado: ${sqlStrategy.sql_query}`);

      // Executa a query SQL diretamente
      const result = await this.executeSQLQuery(sqlStrategy.sql_query);

      return {
        success: true,
        sql_strategy: sqlStrategy,
        results: [result],
        total_queries: 1
      };

    } catch (error) {
      logger.error('❌ Erro no Agente SQL (Claude):', error);
      
      // FALLBACK: Tenta com OpenAI GPT-4o
      if (this.openai) {
        try {
          logger.info('🔄 Tentando fallback com OpenAI GPT-4o...');
          
          const completion = await this.openai.chat.completions.create({
            model: this.openaiModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 800
          });
          
          const sqlResponseText = completion.choices[0]?.message?.content || '';
          this.lastModelUsed = `OpenAI (${this.openaiModel})`;
          
          const sqlStrategy = this.parseJSON(sqlResponseText, {
            sql_query: `SELECT COUNT(*) FROM ${intention.tables_needed[0] || 'unknown'}`,
            query_type: "simple_count",
            explanation: "Query básica de fallback",
            expected_result: "contagem simples"
          });

          logger.info(`🔍 SQL gerado (OpenAI): ${sqlStrategy.sql_query}`);

          // Executa a query SQL diretamente
          const result = await this.executeSQLQuery(sqlStrategy.sql_query);

          return {
            success: true,
            sql_strategy: sqlStrategy,
            results: [result],
            total_queries: 1
          };
          
        } catch (openaiError) {
          logger.error('❌ Erro no fallback OpenAI:', openaiError);
        }
      }
      
      // Fallback final sem IA
      this.lastModelUsed = 'Fallback (sem IA)';
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sql_strategy: null,
        results: []
      };
    }
  }

  /**
   * AGENTE ANALYST - Analisa resultados e gera insights
   */
  private async analystAgent(queryResult: any, intention: any, originalMessage: string): Promise<any> {
    if (!queryResult.success) {
      return {
        insights: [],
        summary: "Não foi possível analisar os dados devido a erro na consulta",
        recommendations: [],
        raw_data: null
      };
    }

    // LOG CRÍTICO: Verificar o que está sendo recebido
    logger.info('📊 Analyst recebeu:', JSON.stringify(queryResult.results[0], null, 2));

    const prompt = `Você é o Agente Analyst especialista em análise de dados de negócio.

DADOS ANALISADOS:
${JSON.stringify(queryResult.results, null, 2)}

CONTEXTO DA SOLICITAÇÃO:
Pergunta original: "${originalMessage}"
Intenção: ${JSON.stringify(intention)}

REGRAS ESTRITAS:
1. Insights DEVEM ser baseados APENAS nos dados fornecidos
2. NÃO faça suposições ou inferências além dos dados
3. Use APENAS métricas quantificáveis
4. Máximo de 3 insights por análise
5. Máximo de 2 recomendações por análise
6. NÃO use linguagem subjetiva ou emocional

RESPONDA EM JSON:
{
  "insights": [
    {
      "metric": "nome_da_metrica",
      "value": "valor_numerico",
      "comparison": "comparacao_com_anterior",
      "significance": "alta|media|baixa"
    }
  ],
  "summary": "Resumo técnico dos dados (máximo 100 caracteres)",
  "recommendations": [
    {
      "action": "acao_especifica",
      "metric_target": "metrica_alvo",
      "expected_impact": "impacto_esperado"
    }
  ],
  "key_metrics": {
    "metric1": "valor_numerico",
    "metric2": "valor_numerico"
  }
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 500,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      const analysisText = content.type === 'text' ? content.text : '';
      
      return this.parseJSON(analysisText, {
        insights: [{
          metric: "total_records",
          value: queryResult.results[0]?.data?.count || 0,
          comparison: "n/a",
          significance: "baixa"
        }],
        summary: "Análise básica dos dados",
        recommendations: [],
        key_metrics: {
          total: queryResult.results[0]?.data?.count || 0
        }
      });

    } catch (error) {
      logger.error('❌ Erro no Agente Analyst:', error);
      return {
        insights: [{
          metric: "error",
          value: "n/a",
          comparison: "n/a",
          significance: "baixa"
        }],
        summary: "Erro na análise dos dados",
        recommendations: [],
        key_metrics: {}
      };
    }
  }

  /**
   * AGENTE FORMATTER - Formata resposta para Chat Web (adaptado do WhatsApp)
   */
  private async formatterAgent(analysis: any, queryResult: any, originalMessage: string): Promise<string> {
    // LOG CRÍTICO: Verificar o que está sendo recebido
    const resultData = queryResult.results[0]?.data;
    const isArrayData = Array.isArray(resultData);
    const dataCount = isArrayData ? resultData.length : 0;
    
    logger.info(`💬 Formatter recebeu: ${dataCount} registros (isArray: ${isArrayData})`);
    
    // Se há dados em array, formatar como tabela markdown DIRETAMENTE
    if (isArrayData && dataCount > 0) {
      const tableMarkdown = this.formatAsMarkdownTable(resultData, 20);
      logger.info(`📊 Tabela markdown gerada com ${dataCount} registros`);
      
      // Cria um resumo inteligente dos dados
      const firstRow = resultData[0];
      const columns = Object.keys(firstRow);
      const summary = this.generateSmartSummary(resultData, columns, originalMessage);
      
      // RETORNA DIRETO SEM PASSAR PELO CLAUDE (evita alucinação)
      return `${summary}\n\n${tableMarkdown}\n\n_Modelo usado: ${this.lastModelUsed}_`;
    }
    
    const prompt = `Você é o Agente Formatter especialista em comunicação para chat web.

ANÁLISE GERADA:
${JSON.stringify(analysis, null, 2)}

RESULTADOS DAS QUERIES:
${JSON.stringify(queryResult.results, null, 2)}

PERGUNTA ORIGINAL: "${originalMessage}"

TAREFA: Crie uma resposta CONCISA e DIRETA para chat web (não WhatsApp).

DIRETRIZES OBRIGATÓRIAS:
- Seja DIRETO e OBJETIVO (máximo 800 caracteres)
- Use emojis com moderação (máximo 3)
- Destaque números com **negrito**
- Se houver DADOS (array com registros), SEMPRE mostre os principais campos
- Para listagens, mostre em formato de lista com bullets
- NÃO faça recomendações extensas
- Use Markdown simples

EXEMPLOS DE RESPOSTA BOA:

Para contagens:
"Temos **21 tabelas** no banco de dados. 📊"

Para listagens com dados:
"Aqui estão os **10 últimos registros** da tabela aug25:

📧 **email1@example.com** - 06/10/2025
📧 **email2@example.com** - 05/10/2025
📧 **email3@example.com** - 04/10/2025
..."

IMPORTANTE: Se RESULTS contém array de dados, SEMPRE mostre os registros!

RESPONDA APENAS O TEXTO FORMATADO (sem JSON):`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1200,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      return content.type === 'text' ? content.text.trim() : 'Resposta não disponível';

    } catch (error) {
      logger.error('❌ Erro no Agente Formatter:', error);
      
      // Fallback para formatação básica
      if (queryResult.success && queryResult.results.length > 0) {
        const result = queryResult.results[0];
        if (result.data && typeof result.data.count === 'number') {
          return `📊 **Resultado**\n\n🔢 Total: **${result.data.count.toLocaleString('pt-BR')}** registros\n\n💡 Dados obtidos com sucesso!`;
        }
        return `📊 **Resultado**\n\n✅ Consulta executada com sucesso\n📋 ${queryResult.results.length} resultado(s) encontrado(s)`;
      }
      
      return `❌ **Erro**\n\nNão foi possível processar sua solicitação. Tente reformular a pergunta.`;
    }
  }

  /**
   * MÉTODOS AUXILIARES
   */
  private formatAsMarkdownTable(data: any[], maxRows: number = 20): string {
    if (!data || data.length === 0) return '';
    
    const keys = Object.keys(data[0]);
    
    // Formata os nomes das colunas (remove underscores, capitaliza)
    const formattedHeaders = keys.map(k => 
      k.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    );
    
    const header = `| ${formattedHeaders.join(' | ')} |`;
    const separator = `| ${keys.map(() => '---').join(' | ')} |`;
    
    const rows = data.slice(0, maxRows).map(row => {
      const cells = keys.map(k => {
        const value = row[k];
        if (value === null || value === undefined) return '-';
        
        // Formata números
        if (typeof value === 'number') {
          return value.toLocaleString('pt-BR');
        }
        
        return String(value).substring(0, 50);
      });
      
      return `| ${cells.join(' | ')} |`;
    }).join('\n');
    
    return `${header}\n${separator}\n${rows}`;
  }

  private generateSmartSummary(data: any[], columns: string[], question: string): string {
    const count = data.length;
    const q = question.toLowerCase();
    
    // 📊 ESTILO SOURCETABLE: Resumo executivo + contexto + próximos passos
    
    // Detecta tipo de operação
    let operation = 'consulta';
    let emoji = '📊';
    
    if (q.includes('agrupar') || q.includes('group') || q.includes('distribuição')) {
      operation = 'agrupamento';
      emoji = '📊';
    } else if (q.includes('últim') || q.includes('recente')) {
      operation = 'listagem';
      emoji = '📋';
    } else if (q.includes('filtrar') || q.includes('buscar')) {
      operation = 'filtro';
      emoji = '🔍';
    } else if (q.includes('estatística') || q.includes('faixa')) {
      operation = 'análise estatística';
      emoji = '📈';
    }
    
    // Calcula métricas
    const totalColumn = columns.find(c => 
      c.toLowerCase().includes('total') || 
      c.toLowerCase().includes('count') ||
      c.toLowerCase().includes('quantidade')
    );
    
    let totalRecords = 0;
    if (totalColumn) {
      totalRecords = data.reduce((sum, row) => {
        const val = row[totalColumn];
        return sum + (typeof val === 'number' ? val : parseInt(val) || 0);
      }, 0);
    }
    
    // 🎯 RESUMO EXECUTIVO (estilo SourceTable)
    let summary = `${emoji} **Perfeito! Criei uma tabela com ${count} ${count === 1 ? 'linha' : 'linhas'} de dados.**\n\n`;
    
    // Adiciona contexto específico
    if (operation === 'agrupamento' && totalRecords > 0) {
      summary += `Agrupei os dados em **${count} categorias** totalizando **${totalRecords.toLocaleString('pt-BR')} registros**.\n\n`;
    } else if (operation === 'listagem') {
      summary += `Aqui estão os **${count} registros** mais recentes encontrados.\n\n`;
    } else if (operation === 'filtro') {
      summary += `Filtrei os dados e encontrei **${count} resultados** que atendem aos critérios.\n\n`;
    } else {
      summary += `A consulta retornou **${count} ${count === 1 ? 'resultado' : 'resultados'}**.\n\n`;
    }
    
    // 📋 INFORMAÇÕES DAS COLUNAS
    const columnList = columns.slice(0, 5).map(col => {
      const formatted = col.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `• **${formatted}**`;
    }).join('\n');
    
    summary += `**Colunas disponíveis:**\n${columnList}`;
    if (columns.length > 5) {
      summary += `\n• ...e mais ${columns.length - 5} colunas`;
    }
    
    // 💡 PRÓXIMOS PASSOS (estilo SourceTable)
    summary += `\n\n**💡 O que você pode fazer agora:**\n`;
    summary += `• Filtrar por qualquer coluna\n`;
    summary += `• Agrupar os dados de outra forma\n`;
    summary += `• Exportar para CSV\n`;
    summary += `• Fazer análises adicionais\n`;
    
    return summary;
  }

  async getSampleData(tableName: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(2);
      
      return error ? [] : (data || []);
    } catch (error) {
      return [];
    }
  }

  async executeSQLQuery(sqlQuery: string): Promise<any> {
    try {
      // ⚡ PROTEÇÃO: Valida SQL antes de executar
      if (!sqlQuery || sqlQuery.trim() === '' || sqlQuery === 'null' || sqlQuery === 'undefined') {
        logger.error('❌ SQL inválido ou vazio:', sqlQuery);
        return {
          success: false,
          error: 'SQL query is null or empty',
          data: null
        };
      }
      
      const startTime = Date.now();
      logger.info(`🔍 Executando SQL: ${sqlQuery.substring(0, 100)}...`);
      
      const sql = sqlQuery.toLowerCase();
      
      // ESTRATÉGIA UNIFICADA: Sempre tentar RPC primeiro para QUALQUER query complexa
      const needsRPC = 
        sql.includes('group by') ||
        sql.includes('case when') ||
        sql.includes('count(distinct') ||
        sql.includes('date_trunc') ||
        sql.includes('ilike') ||
        sql.includes('join');
      
      if (needsRPC) {
        logger.info('🚀 Query complexa detectada → Usando RPC para máxima performance');
        
        // Tenta RPC genérica primeiro
        try {
          const { data, error } = await supabase.rpc('execute_sql', { 
            query: sqlQuery 
          });
          
          if (!error && data) {
            const elapsed = Date.now() - startTime;
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            logger.info(`✅ RPC execute_sql: ${Array.isArray(parsedData) ? parsedData.length : 'N/A'} registros em ${elapsed}ms`);
            
            return {
              success: true,
              data: parsedData,
              count: Array.isArray(parsedData) ? parsedData.length : 0,
              sql_query: sqlQuery
            };
          }
        } catch (rpcError) {
          logger.warn('⚠️ RPC execute_sql falhou, tentando fallback...');
        }
      }
      
      // Para queries de metadados (information_schema ou available_tables)
      if (sql.includes('information_schema') || sql.includes('available_tables')) {
        logger.info('🔍 Query de metadados detectada, usando available_tables view');
        
        // Se for COUNT
        if (sql.includes('count(')) {
          const { count, error } = await supabase
            .from('available_tables')
            .select('*', { count: 'exact', head: true });
          
          if (error) throw error;
          
          return {
            success: true,
            data: { count },
            sql_query: sqlQuery
          };
        }
        
        // Se for SELECT
        const { data, error } = await supabase
          .from('available_tables')
          .select('*');
        
        if (error) throw error;
        
        return {
          success: true,
          data: data,
          count: data?.length || 0,
          sql_query: sqlQuery
        };
      }
      
      // Para COUNT DISTINCT, usa RPC ou fallback
      if (sql.includes('count(distinct')) {
        return await this.executeCountDistinctSQL(sqlQuery);
      }
      
      // Para queries simples, usa Supabase client
      const result = await this.convertSQLToSupabaseOperation(sqlQuery);
      
      const elapsed = Date.now() - startTime;
      logger.info(`✅ SQL executado em ${elapsed}ms`);
      return result;

    } catch (error) {
      logger.error('❌ Erro ao executar SQL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }

  async executeCountDistinctSQL(sqlQuery: string): Promise<any> {
    const table = this.extractTableFromSQL(sqlQuery);
    const column = this.extractColumnFromSQL(sqlQuery);
    
    logger.info(`🔍 COUNT DISTINCT fallback: ${table}.${column}`);
    
    // Busca todos os registros e conta únicos
    const { data, error } = await supabase
      .from(table)
      .select(column);
    
    if (error) throw error;
    
    const uniqueValues = new Set(data?.map((row: any) => row[column]).filter(Boolean));
    
    return {
      success: true,
      data: { count: uniqueValues.size },
      sql_query: sqlQuery
    };
  }

  async convertSQLToSupabaseOperation(sqlQuery: string): Promise<any> {
    const sql = sqlQuery.toLowerCase();
    
    // Extrai nome da tabela (suporta schema.table)
    const tableMatch = sql.match(/from\s+([\w.]+)/);
    if (!tableMatch) {
      throw new Error('Não foi possível extrair nome da tabela');
    }
    
    let table = tableMatch[1];
    
    // Se for information_schema ou pg_catalog, não pode executar via Supabase client
    if (table.includes('information_schema') || table.includes('pg_catalog') || table.includes('.')) {
      throw new Error(`Tabela do sistema (${table}) não pode ser consultada via Supabase client. Use RPC ou view.`);
    }
    
    // Detecta queries complexas que precisam de RPC
    const hasGroupBy = sql.includes('group by');
    const hasCase = sql.includes('case when');
    const hasComplexAggregation = hasGroupBy || hasCase;
    
    if (hasComplexAggregation) {
      logger.warn('⚠️ Query complexa detectada (GROUP BY/CASE). Tentando otimizações...');
      
      // ESTRATÉGIA 1: RPC específica para user_agent categorization (mais rápida)
      if (sql.includes('user_agent') && sql.includes('case when')) {
        try {
          const startTime = Date.now();
          const { data, error } = await supabase.rpc('categorize_user_agents', { 
            table_name: table 
          });
          
          if (!error && data) {
            const elapsed = Date.now() - startTime;
            logger.info(`✅ RPC categorize_user_agents: ${data.length} registros em ${elapsed}ms`);
            return {
              success: true,
              data: data,
              count: data.length,
              sql_query: sqlQuery
            };
          }
        } catch (rpcError) {
          logger.warn('⚠️ RPC categorize_user_agents não disponível');
        }
      }
      
      // ESTRATÉGIA 2: RPC genérica execute_sql
      try {
        const startTime = Date.now();
        const { data, error } = await supabase.rpc('execute_sql', { 
          query: sqlQuery 
        });
        
        if (!error && data) {
          const elapsed = Date.now() - startTime;
          logger.info(`✅ RPC execute_sql: ${Array.isArray(data) ? data.length : 'N/A'} registros em ${elapsed}ms`);
          
          // Se retornou JSON, parsear
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          
          return {
            success: true,
            data: parsedData,
            count: Array.isArray(parsedData) ? parsedData.length : 0,
            sql_query: sqlQuery
          };
        }
      } catch (rpcError) {
        logger.warn('⚠️ RPC execute_sql não disponível');
      }
      
      // ESTRATÉGIA 3: FALLBACK - Processamento em memória (mais lento)
      logger.warn('⚠️ Usando fallback: processamento em memória (pode ser lento)');
      const startTime = Date.now();
      const result = await this.executeComplexQueryInMemory(sqlQuery, table);
      const elapsed = Date.now() - startTime;
      logger.info(`⏱️ Processamento em memória: ${elapsed}ms`);
      
      return result;
    }
    
    // Para COUNT queries SIMPLES (sem GROUP BY)
    if (sql.includes('count(') && !hasGroupBy) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      return {
        success: true,
        data: { count },
        sql_query: sqlQuery
      };
    }
    
    // Para SELECT queries
    let supabaseQuery = supabase.from(table).select('*');
    
    // Detecta WHERE
    const whereMatch = sql.match(/where\s+(\w+)\s*=\s*'([^']+)'/);
    if (whereMatch) {
      supabaseQuery = supabaseQuery.eq(whereMatch[1], whereMatch[2]);
    }
    
    // Detecta ORDER BY
    const orderMatch = sql.match(/order\s+by\s+(\w+)\s+(asc|desc)?/);
    if (orderMatch) {
      const ascending = orderMatch[2] !== 'desc';
      supabaseQuery = supabaseQuery.order(orderMatch[1], { ascending });
    }
    
    // Detecta LIMIT
    const limitMatch = sql.match(/limit\s+(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 100;
    supabaseQuery = supabaseQuery.limit(limit);
    
    const { data, error } = await supabaseQuery;
    
    if (error) throw error;
    
    return {
      success: true,
      data,
      count: data?.length || 0,
      sql_query: sqlQuery
    };
  }

  async executeComplexQueryInMemory(sqlQuery: string, table: string): Promise<any> {
    logger.info(`🔄 Executando query complexa em memória para tabela: ${table}`);
    
    // Busca TODOS os dados da tabela
    const { data: allData, error } = await supabase
      .from(table)
      .select('*');
    
    if (error) throw error;
    if (!allData || allData.length === 0) {
      return { success: true, data: [], count: 0, sql_query: sqlQuery };
    }
    
    const sql = sqlQuery.toLowerCase();
    
    // Processa GROUP BY com CASE WHEN para categorizar user_agent
    if (sql.includes('case when') && sql.includes('user_agent')) {
      logger.info('📊 Processando categorização de user_agent em memória...');
      
      const categorized = allData.map((row: any) => {
        const ua = (row.user_agent || '').toLowerCase();
        let device_type = 'desktop';
        
        if (ua.includes('mobile') || ua.includes('android') || 
            ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
          device_type = 'mobile';
        } else if (ua.includes('bot') || ua.includes('crawler') || 
                   ua.includes('spider') || ua.includes('scraper')) {
          device_type = 'bots';
        }
        
        return { ...row, device_type };
      });
      
      // Agrupa por device_type
      const grouped = categorized.reduce((acc: any, row: any) => {
        const key = row.device_type;
        if (!acc[key]) acc[key] = { device_type: key, total: 0 };
        acc[key].total++;
        return acc;
      }, {});
      
      const result = Object.values(grouped).sort((a: any, b: any) => b.total - a.total);
      
      logger.info(`✅ Processamento em memória concluído: ${result.length} categorias`);
      
      return {
        success: true,
        data: result,
        count: result.length,
        sql_query: sqlQuery
      };
    }
    
    // Para outros GROUP BY simples
    if (sql.includes('group by')) {
      const groupByMatch = sql.match(/group\s+by\s+(\w+)/);
      if (groupByMatch) {
        const groupColumn = groupByMatch[1];
        
        const grouped = allData.reduce((acc: any, row: any) => {
          const key = row[groupColumn];
          if (!acc[key]) acc[key] = { [groupColumn]: key, total: 0 };
          acc[key].total++;
          return acc;
        }, {});
        
        const result = Object.values(grouped).sort((a: any, b: any) => b.total - a.total);
        
        return {
          success: true,
          data: result,
          count: result.length,
          sql_query: sqlQuery
        };
      }
    }
    
    // Fallback: retorna dados brutos
    return {
      success: true,
      data: allData,
      count: allData.length,
      sql_query: sqlQuery
    };
  }

  extractTableFromSQL(sql: string): string {
    const match = sql.toLowerCase().match(/from\s+(\w+)/);
    return match ? match[1] : 'unknown';
  }

  extractColumnFromSQL(sql: string): string {
    const match = sql.toLowerCase().match(/count\(distinct\s+(\w+)\)/);
    return match ? match[1] : 'email';
  }

  parseJSON(text: string, fallback: any): any {
    try {
      // Múltiplas tentativas de limpeza
      let cleanText = text.trim();
      
      // Remove markdown
      if (cleanText.includes('```json')) {
        cleanText = cleanText.replace(/```json\s*/g, '').replace(/\s*```$/g, '');
      }
      if (cleanText.includes('```')) {
        cleanText = cleanText.replace(/```\s*/g, '').replace(/\s*```$/g, '');
      }
      
      // Remove texto antes e depois do JSON
      const jsonStart = cleanText.indexOf('{');
      const jsonEnd = cleanText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
      }
      
      // Primeira tentativa
      try {
        return JSON.parse(cleanText);
      } catch (firstError) {
        // Segunda tentativa: corrige aspas simples
        const fixedQuotes = cleanText.replace(/'/g, '"');
        try {
          return JSON.parse(fixedQuotes);
        } catch (secondError) {
          // Terceira tentativa: remove comentários
          const noComments = cleanText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
          return JSON.parse(noComments);
        }
      }
    } catch (error) {
      logger.warn('⚠️ Erro ao fazer parse JSON após múltiplas tentativas, usando fallback');
      logger.warn('📝 Texto original:', text.substring(0, 200));
      return fallback;
    }
  }

  updateConversationContext(intention: any, messageText: string): void {
    // Atualiza contexto baseado na intenção identificada
    if (intention.tables_needed && intention.tables_needed.length > 0) {
      this.conversationContext.lastTable = intention.tables_needed[0];
    }
    
    if (intention.operations && intention.operations.length > 0) {
      this.conversationContext.lastOperation = intention.operations[0];
    }
    
    // Extrai email da mensagem
    const email = this.extractEmailFromText(messageText.toLowerCase());
    if (email) {
      this.conversationContext.lastEmail = email;
    }
    
    // Mantém histórico das últimas 5 queries
    this.conversationContext.recentQueries.unshift({
      message: messageText,
      intention: intention,
      timestamp: Date.now()
    });
    
    if (this.conversationContext.recentQueries.length > 5) {
      this.conversationContext.recentQueries.pop();
    }
  }
}
