/**
 * PieChart - Gráfico de pizza/donut com estilo premium
 * Paleta dourada com legendas e percentuais
 */

import React from 'react';
import {
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    TooltipProps,
} from 'recharts';

interface PieChartData {
    name: string;
    value: number;
}

interface PieChartProps {
    data: PieChartData[];
    colors?: string[];
    showLabels?: boolean;
    showLegend?: boolean;
    innerRadius?: number;
    animate?: boolean;
}

// Paleta de cores dourada/champanhe
const DEFAULT_COLORS = [
    '#d4a418',
    '#d9b84d',
    '#ecc94b',
    '#b88a14',
    '#d4c9a3',
    '#a67c00',
    '#ffdf00',
    '#c5a030',
];

// Custom Tooltip Component
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { total?: number } }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
}) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0];
    const total = data.payload?.total || 0;
    const percentage = total > 0 ? ((data.value) / total * 100).toFixed(1) : '0';

    return (
        <div className="bg-card/95 backdrop-blur-sm border border-gold-500/30 rounded-lg px-3 py-2 shadow-lg">
            <p className="text-sm font-medium text-foreground">{data.name}</p>
            <p className="text-sm text-gold-400">
                {typeof data.value === 'number'
                    ? data.value.toLocaleString('pt-BR')
                    : data.value}
                <span className="text-muted-foreground ml-1">({percentage}%)</span>
            </p>
        </div>
    );
};

// Custom Label Component
interface CustomLabelProps {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
}

const renderCustomLabel = (props: CustomLabelProps): React.ReactElement | null => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Hide labels for small slices

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            className="text-xs font-medium"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

// Custom Legend Component
const CustomLegend: React.FC<{ payload?: Array<{ value: string; color: string }> }> = ({
    payload,
}) => {
    if (!payload) return null;

    return (
        <div className="flex flex-wrap justify-center gap-3 mt-2">
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-xs text-muted-foreground">{entry.value}</span>
                </div>
            ))}
        </div>
    );
};

export const PieChart: React.FC<PieChartProps> = ({
    data,
    colors = DEFAULT_COLORS,
    showLabels = true,
    showLegend = true,
    innerRadius = 0,
    animate = true,
}) => {
    // Calculate total for percentage
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const dataWithTotal = data.map((item) => ({ ...item, total }));

    return (
        <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <Pie
                data={dataWithTotal}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={showLabels ? renderCustomLabel : false}
                labelLine={false}
                isAnimationActive={animate}
                animationDuration={800}
                animationEasing="ease-out"
            >
                {data.map((_, index) => (
                    <Cell
                        key={`cell-${index}`}
                        fill={colors[index % colors.length]}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                ))}
            </Pie>

            <Tooltip content={<CustomTooltip />} />

            {showLegend && (
                <Legend
                    content={<CustomLegend />}
                    verticalAlign="bottom"
                />
            )}
        </RechartsPieChart>
    );
};

export default PieChart;
