/**
 * InsightCard Component
 * 
 * Exibe insights acionáveis gerados pela IA.
 * Usa cores diferentes para tipos positive/warning/neutral.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface Insight {
    title: string;
    description: string;
    type: 'positive' | 'warning' | 'neutral';
    icon: string;
}

interface InsightCardProps {
    insight: Insight;
    index?: number;
}

interface InsightsListProps {
    insights: Insight[];
}

/**
 * Card individual de insight
 */
export const InsightCard: React.FC<InsightCardProps> = ({ insight, index = 0 }) => {
    const { title, description, type, icon } = insight;

    const typeStyles = {
        positive: {
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            icon: 'text-emerald-400',
            title: 'text-emerald-300',
        },
        warning: {
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            icon: 'text-amber-400',
            title: 'text-amber-300',
        },
        neutral: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            icon: 'text-blue-400',
            title: 'text-blue-300',
        },
    };

    const styles = typeStyles[type];

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={cn(
                'flex items-start gap-2.5 p-2.5 rounded-lg border',
                styles.bg,
                styles.border
            )}
        >
            <span className={cn('text-lg flex-shrink-0', styles.icon)}>
                {icon}
            </span>
            <div className="flex-1 min-w-0">
                <h4 className={cn('text-sm font-medium leading-tight', styles.title)}>
                    {title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {description}
                </p>
            </div>
        </motion.div>
    );
};

/**
 * Lista de insights
 */
export const InsightsList: React.FC<InsightsListProps> = ({ insights }) => {
    if (!insights || insights.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>💡</span>
                <span className="font-medium">Insights</span>
            </div>
            <div className="space-y-2">
                {insights.map((insight, index) => (
                    <InsightCard key={index} insight={insight} index={index} />
                ))}
            </div>
        </div>
    );
};

export default InsightCard;
