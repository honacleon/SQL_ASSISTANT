/**
 * ChatSkeleton - Loading state for chat messages
 * Shows animated placeholder while loading initial data
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatSkeletonProps {
    count?: number;
    className?: string;
}

export function ChatSkeleton({ count = 3, className }: ChatSkeletonProps) {
    return (
        <div className={cn('flex flex-col gap-4 py-4', className)}>
            {Array.from({ length: count }).map((_, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                        'flex gap-2',
                        index % 2 === 0 ? 'justify-start' : 'justify-end'
                    )}
                >
                    {/* Avatar skeleton (only for assistant messages) */}
                    {index % 2 === 0 && (
                        <div className="h-7 w-7 rounded-full bg-secondary animate-pulse" />
                    )}

                    {/* Message skeleton */}
                    <div
                        className={cn(
                            'rounded-2xl px-4 py-3 animate-pulse',
                            index % 2 === 0
                                ? 'bg-secondary/60 rounded-bl-sm max-w-[70%]'
                                : 'bg-gold-400/20 rounded-br-sm max-w-[50%]'
                        )}
                    >
                        <div className="space-y-2">
                            <div
                                className={cn(
                                    'h-3 rounded-full',
                                    index % 2 === 0 ? 'bg-secondary' : 'bg-gold-400/30',
                                    index % 2 === 0 ? 'w-48' : 'w-32'
                                )}
                            />
                            {index % 2 === 0 && (
                                <div className="h-3 w-32 rounded-full bg-secondary" />
                            )}
                        </div>
                    </div>

                    {/* Avatar skeleton (only for user messages) */}
                    {index % 2 === 1 && (
                        <div className="h-7 w-7 rounded-full bg-gold-400/30 animate-pulse" />
                    )}
                </motion.div>
            ))}
        </div>
    );
}

export default ChatSkeleton;
