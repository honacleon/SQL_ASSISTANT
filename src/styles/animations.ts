/**
 * Framer Motion Animation Variants
 * Reusable animation configurations for premium UI effects
 */

import { Variants } from 'framer-motion';

// Fade in from bottom with slight translation
export const fadeInUp: Variants = {
    initial: {
        opacity: 0,
        y: 20,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
        },
    },
    exit: {
        opacity: 0,
        y: 10,
        transition: {
            duration: 0.2,
        },
    },
};

// Simple fade in/out
export const fadeIn: Variants = {
    initial: {
        opacity: 0,
    },
    animate: {
        opacity: 1,
        transition: {
            duration: 0.3,
        },
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.2,
        },
    },
};

// Slide in from right
export const slideInRight: Variants = {
    initial: {
        opacity: 0,
        x: 30,
    },
    animate: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.3,
            ease: 'easeOut',
        },
    },
    exit: {
        opacity: 0,
        x: 20,
        transition: {
            duration: 0.2,
        },
    },
};

// Container for staggered children animations
export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};

// Scale up slightly on hover
export const scaleOnHover: Variants = {
    initial: {
        scale: 1,
    },
    hover: {
        scale: 1.02,
        transition: {
            duration: 0.2,
            ease: 'easeOut',
        },
    },
    tap: {
        scale: 0.98,
    },
};

// Pulse glow effect (can be used with animate presence)
export const pulseGlow: Variants = {
    initial: {
        boxShadow: '0 0 0 rgba(212, 164, 24, 0)',
    },
    animate: {
        boxShadow: [
            '0 0 0 rgba(212, 164, 24, 0)',
            '0 0 20px rgba(212, 164, 24, 0.4)',
            '0 0 0 rgba(212, 164, 24, 0)',
        ],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// List item animation (for use with staggerContainer)
export const listItem: Variants = {
    initial: {
        opacity: 0,
        y: 10,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.2,
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: {
            duration: 0.15,
        },
    },
};

// Card entrance animation
export const cardEntrance: Variants = {
    initial: {
        opacity: 0,
        scale: 0.95,
        y: 20,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    },
};
