import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const strokeProps = {
  stroke: "currentColor" as const,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "nonScalingStroke" as const,
};

/** Custom tab icons from cab_tab_icons.svg — stroke/fills use currentColor; non-scaling stroke stays visible at 16px. */
export function OutstationTabIcon(props: IconProps) {
  return (
    <svg viewBox="0 14 82 58" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <g {...strokeProps}>
        <rect x={4} y={34} width={72} height={28} rx={5} />
        <path d="M14 34 L20 18 C21 16 23 15 25 15 L55 15 C57 15 59 16 60 18 L66 34" />
        <path d="M22 34 L26 20 L40 20 L40 34" />
        <path d="M40 34 L40 20 L54 20 L58 34" />
        <circle cx={20} cy={62} r={8} />
        <circle cx={60} cy={62} r={8} />
        <line x1={28} y1={62} x2={52} y2={62} />
        <line x1={4} y1={46} x2={0} y2={46} />
        <line x1={76} y1={46} x2={80} y2={46} />
      </g>
    </svg>
  );
}

export function LocalTabIcon(props: IconProps) {
  return (
    <svg viewBox="2 2 76 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <g {...strokeProps}>
        <circle cx={40} cy={40} r={34} />
        <line x1={40} y1={14} x2={40} y2={40} />
        <line x1={40} y1={40} x2={58} y2={50} />
        <circle cx={40} cy={40} r={3} fill="currentColor" stroke="none" />
        <line x1={40} y1={8} x2={40} y2={14} />
        <line x1={40} y1={66} x2={40} y2={72} />
        <line x1={8} y1={40} x2={14} y2={40} />
        <line x1={66} y1={40} x2={72} y2={40} />
      </g>
    </svg>
  );
}

export function AirportTabIcon(props: IconProps) {
  return (
    <svg viewBox="4 4 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <g {...strokeProps}>
        <path d="M40 8 C44 8 48 12 48 20 L48 42 C48 44 47 45 46 45 L40 43 L34 45 C33 45 32 44 32 42 L32 20 C32 12 36 8 40 8 Z" />
        <path d="M32 30 L8 44 L8 50 L32 40" />
        <path d="M48 30 L72 44 L72 50 L48 40" />
        <path d="M34 58 L22 68 L22 72 L34 64" />
        <path d="M46 58 L58 68 L58 72 L46 64" />
      </g>
    </svg>
  );
}

export function TourTabIcon(props: IconProps) {
  return (
    <svg viewBox="6 10 68 70" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <g {...strokeProps}>
        <path d="M10 20 L10 75 L28 68 L50 75 L70 68 L70 13 L50 20 L28 13 Z" />
        <line x1={28} y1={13} x2={28} y2={68} />
        <line x1={50} y1={20} x2={50} y2={75} />
        <path d="M16 50 Q22 38 28 44 Q36 54 42 40" strokeDasharray="3 2" />
        <circle cx={42} cy={34} r={6} />
        <line x1={42} y1={40} x2={42} y2={50} />
        <circle cx={42} cy={34} r={2} fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

/** Multi-stop / freeform itinerary (admin Smart Budget). */
export function CustomItineraryTabIcon(props: IconProps) {
  return (
    <svg viewBox="4 4 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden {...props}>
      <g {...strokeProps}>
        <circle cx={20} cy={22} r={8} />
        <circle cx={20} cy={22} r={2.5} fill="currentColor" stroke="none" />
        <path d="M20 30 C20 38 28 42 36 48 C44 54 52 56 52 66" />
        <circle cx={52} cy={58} r={8} />
        <circle cx={52} cy={58} r={2.5} fill="currentColor" stroke="none" />
        <path d="M58 52 L68 42 M68 42 L60 42 M68 42 L68 50" />
      </g>
    </svg>
  );
}
