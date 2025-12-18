/**
 * Chart Suggester - Sugere tipo de gráfico baseado nos dados
 * Analisa estrutura e tipos de dados para sugestão inteligente
 */

export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'metric';

export interface ChartSuggestion {
    type: ChartType;
    xKey: string;
    yKey: string;
    reason: string;
    confidence: number; // 0-1
}

/**
 * Detecta se uma coluna contém datas
 */
function isDateColumn(columnName: string, values: unknown[]): boolean {
    // Primeiro, verificar pelo nome da coluna
    const dateColumnNames = [
        /date/i, /data/i, /created/i, /updated/i, /timestamp/i,
        /time/i, /dia/i, /mes/i, /ano/i, /periodo/i
    ];

    const nameMatchesDate = dateColumnNames.some(pattern => pattern.test(columnName));
    if (nameMatchesDate) return true;

    // Depois, verificar pelos valores
    const datePatterns = [
        /^\d{4}-\d{2}-\d{2}/, // ISO date
        /^\d{2}\/\d{2}\/\d{4}/, // DD/MM/YYYY
        /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
        /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i, // Month names PT
        /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, // Month names EN
    ];

    const sampleValues = values.slice(0, 10).filter(v => v != null);
    if (sampleValues.length === 0) return false;

    const matchCount = sampleValues.filter(v => {
        const str = String(v);
        return datePatterns.some(p => p.test(str)) || !isNaN(Date.parse(str));
    }).length;

    return matchCount / sampleValues.length > 0.7;
}

/**
 * Detecta se uma coluna contém valores numéricos
 */
function isNumericColumn(values: unknown[]): boolean {
    const sampleValues = values.slice(0, 10).filter(v => v != null);
    if (sampleValues.length === 0) return false;

    const numericCount = sampleValues.filter(v => {
        const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,R$\s]/g, ''));
        return !isNaN(num);
    }).length;

    return numericCount / sampleValues.length > 0.8;
}

/**
 * Conta valores únicos em uma coluna
 */
function countUniqueValues(values: unknown[]): number {
    const uniqueSet = new Set(values.map(v => String(v)));
    return uniqueSet.size;
}

/**
 * Encontra a melhor coluna para eixo X (categórica ou temporal)
 */
function findBestXKey(
    data: Record<string, unknown>[],
    columns: string[]
): { key: string; isDate: boolean } | null {
    // PRIORIDADE 1: Procura por colunas de data pelo NOME
    const dateNamePatterns = [
        /created_?at/i, /updated_?at/i, /date/i, /data/i,
        /timestamp/i, /time/i, /dia/i, /periodo/i
    ];

    for (const col of columns) {
        if (dateNamePatterns.some(pattern => pattern.test(col))) {
            return { key: col, isDate: true };
        }
    }

    // PRIORIDADE 2: Procura por colunas de data pelo VALOR
    for (const col of columns) {
        const values = data.map(row => row[col]);
        // Só verifica valores se não for numérica
        if (!isNumericColumn(values) && isDateColumn(col, values)) {
            return { key: col, isDate: true };
        }
    }

    // PRIORIDADE 3: Procura por colunas categóricas (texto com poucos valores únicos)
    for (const col of columns) {
        const values = data.map(row => row[col]);
        // EXCLUI colunas numéricas - essas devem ir para o eixo Y
        if (isNumericColumn(values)) continue;

        const uniqueCount = countUniqueValues(values);
        if (uniqueCount <= 20 && uniqueCount > 0) {
            return { key: col, isDate: false };
        }
    }

    // PRIORIDADE 4: Fallback - primeira coluna não numérica
    for (const col of columns) {
        const values = data.map(row => row[col]);
        if (!isNumericColumn(values)) {
            return { key: col, isDate: false };
        }
    }

    return null;
}

/**
 * Encontra a melhor coluna para eixo Y (numérica)
 */
function findBestYKey(
    data: Record<string, unknown>[],
    columns: string[],
    excludeKey?: string
): string | null {
    for (const col of columns) {
        if (col === excludeKey) continue;
        const values = data.map(row => row[col]);
        if (isNumericColumn(values)) {
            return col;
        }
    }
    return null;
}

/**
 * Sugere o tipo de gráfico mais apropriado para os dados
 */
export function suggestChartType(
    data: unknown[],
    question?: string
): ChartSuggestion {
    // Fallback para dados inválidos
    if (!Array.isArray(data) || data.length === 0) {
        return {
            type: 'table',
            xKey: '',
            yKey: '',
            reason: 'Dados vazios ou inválidos',
            confidence: 0,
        };
    }

    const typedData = data as Record<string, unknown>[];
    const columns = Object.keys(typedData[0] || {});

    // Caso 1: Apenas 1 linha com 1 número → Metric
    if (data.length === 1 && columns.length <= 2) {
        const yKey = findBestYKey(typedData, columns);
        if (yKey) {
            return {
                type: 'metric',
                xKey: columns[0] || '',
                yKey,
                reason: 'Resultado único numérico - exibir como métrica',
                confidence: 0.9,
            };
        }
    }

    // Caso 2: Muitas linhas → Table é mais apropriado
    if (data.length > 15) {
        const xResult = findBestXKey(typedData, columns);
        const yKey = findBestYKey(typedData, columns, xResult?.key);

        // Se tem coluna de data, mesmo com muitos dados, LineChart pode funcionar
        if (xResult?.isDate && yKey) {
            return {
                type: 'line',
                xKey: xResult.key,
                yKey,
                reason: 'Série temporal - gráfico de linha',
                confidence: 0.7,
            };
        }

        return {
            type: 'table',
            xKey: '',
            yKey: '',
            reason: 'Muitos registros - tabela é mais legível',
            confidence: 0.8,
        };
    }

    const xResult = findBestXKey(typedData, columns);
    const yKey = findBestYKey(typedData, columns, xResult?.key);

    if (!xResult || !yKey) {
        return {
            type: 'table',
            xKey: '',
            yKey: '',
            reason: 'Estrutura de dados não adequada para gráfico',
            confidence: 0.6,
        };
    }

    // Caso 3: Dados temporais → LineChart
    if (xResult.isDate) {
        return {
            type: 'line',
            xKey: xResult.key,
            yKey,
            reason: 'Dados temporais - gráfico de linha',
            confidence: 0.85,
        };
    }

    // Caso 4: 2-5 categorias → PieChart
    const uniqueCategories = countUniqueValues(typedData.map(row => row[xResult.key]));
    if (uniqueCategories >= 2 && uniqueCategories <= 5) {
        return {
            type: 'pie',
            xKey: xResult.key,
            yKey,
            reason: 'Poucas categorias - gráfico de pizza',
            confidence: 0.8,
        };
    }

    // Caso 5: 6-15 categorias → BarChart
    if (uniqueCategories <= 15) {
        return {
            type: 'bar',
            xKey: xResult.key,
            yKey,
            reason: 'Categorias comparativas - gráfico de barras',
            confidence: 0.85,
        };
    }

    // Fallback
    return {
        type: 'table',
        xKey: '',
        yKey: '',
        reason: 'Dados complexos - tabela é mais adequada',
        confidence: 0.5,
    };
}

export default suggestChartType;
