import React from 'react';

type AirportSectionHeadProps = {
  title: string;
  eyebrow?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
};

export function AirportSectionHead({
  title,
  eyebrow,
  viewAllHref,
  viewAllLabel = 'view all',
}: AirportSectionHeadProps) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[1.125rem] font-semibold leading-tight tracking-tight text-slate-900">
          {title}
        </h2>
        {eyebrow ? (
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
      </div>
      {viewAllHref ? (
        <a
          href={viewAllHref}
          className="shrink-0 text-sm font-medium text-slate-400"
        >
          {viewAllLabel} <span aria-hidden>›</span>
        </a>
      ) : null}
    </div>
  );
}

type AirportPeekRailProps = {
  children: React.ReactNode;
  className?: string;
};

export function AirportPeekRail({ children, className = '' }: AirportPeekRailProps) {
  const items = React.Children.toArray(children);
  if (items.length === 0) return null;

  return (
    <div className={`min-w-0 -mx-4 ${className}`.trim()}>
      <div className="airport-peek-rail flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1">
        {items}
      </div>
    </div>
  );
}
