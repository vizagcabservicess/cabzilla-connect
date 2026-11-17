import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      className="mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500 sm:mb-6 sm:text-sm"
      aria-label="Breadcrumb"
    >
      <Link to="/" className="inline-flex items-center transition-colors hover:text-[var(--brand-primary)]">
        <Home className="mr-1 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
        <span>Home</span>
      </Link>
      {items.map((item, index) => (
        <div key={index} className="inline-flex min-w-0 items-center">
          <ChevronRight className="mr-1.5 h-3.5 w-3.5 shrink-0 text-slate-400 sm:h-4 sm:w-4" aria-hidden />
          {item.href ? (
            <Link to={item.href} className="transition-colors hover:text-[var(--brand-primary)]">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
