/**
 * TypingIndicator - Animated dots indicating assistant is thinking
 * Premium gold-themed animation
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
    className?: string;
    message?: string;
}

export function TypingIndicator({ className, message = 'Analisando sua pergunta...' }: TypingIndicatorProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn('flex gap-2 justify-start', className)}
        >
            {/* Avatar do bot */}
            <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-gold-400/20 ring-1 ring-gold-400/30">
                <Bot className="h-4 w-4 text-gold-400 animate-pulse" />
            </div>

            {/* Bolha de digitação */}
            <div className="bg-secondary/80 rounded-2xl rounded-bl-sm border border-border/50 px-4 py-3 shadow-md">
                <div className="flex items-center gap-3">
                    {/* Dots animados */}
                    <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                            <motion.span
                                key={i}
                                className="h-2 w-2 rounded-full bg-gold-400"
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.4, 1, 0.4],
                                }}
                                transition={{
                                    duration: 0.8,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                    ease: 'easeInOut',
                                }}
                            />
                        ))}
                    </div>

                    {/* Mensagem opcional */}
                    <span className="text-xs text-muted-foreground animate-pulse">
                        {message}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

export default TypingIndicator;
