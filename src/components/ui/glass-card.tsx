/**
 * GlassCard - Premium glassmorphism card component
 * Features backdrop blur, subtle gold border, and elevated variants
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassCardVariants = cva(
    'rounded-xl backdrop-blur-md transition-all duration-300',
    {
        variants: {
            variant: {
                default: [
                    'bg-card/80',
                    'border border-gold-400/10',
                    'shadow-lg shadow-black/20',
                ].join(' '),
                elevated: [
                    'bg-card/90',
                    'border border-gold-400/20',
                    'shadow-xl shadow-black/30',
                    'hover:shadow-2xl hover:shadow-gold-400/5',
                ].join(' '),
                bordered: [
                    'bg-card/70',
                    'border-2 border-gold-400/30',
                    'shadow-lg shadow-gold-400/10',
                ].join(' '),
                subtle: [
                    'bg-background/50',
                    'border border-border/50',
                    'shadow-md shadow-black/10',
                ].join(' '),
            },
            padding: {
                none: 'p-0',
                sm: 'p-3',
                md: 'p-4',
                lg: 'p-6',
            },
            glow: {
                true: 'hover:animate-glow-pulse',
                false: '',
            },
        },
        defaultVariants: {
            variant: 'default',
            padding: 'md',
            glow: false,
        },
    }
);

export interface GlassCardProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> { }

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, variant, padding, glow, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(glassCardVariants({ variant, padding, glow }), className)}
                {...props}
            />
        );
    }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard, glassCardVariants };
