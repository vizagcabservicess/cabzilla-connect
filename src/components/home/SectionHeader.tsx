import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
  children?: ReactNode;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
  children,
}: SectionHeaderProps) {
  const centered = align === 'center';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'mb-4 md:mb-5',
        centered && 'mx-auto max-w-2xl text-center',
        className,
      )}
    >
      {eyebrow && (
        <span className="home-section-eyebrow mb-2 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.07em]">
          {eyebrow}
        </span>
      )}
      <h2 className="home-section-title text-xl font-semibold tracking-tight text-slate-900 md:text-2xl lg:text-[1.625rem]">
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            'mt-1.5 text-sm leading-relaxed text-slate-500 md:text-[0.9375rem]',
            centered && 'mx-auto max-w-xl',
          )}
        >
          {subtitle}
        </p>
      )}
      {children ? <div className={cn('mt-2', centered && 'flex justify-center')}>{children}</div> : null}
    </motion.div>
  );
}
