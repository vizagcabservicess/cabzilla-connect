import { useEffect, useState } from 'react';

function initialsFromName(name?: string | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  const letters = ((parts[0]?.[0] || 'D') + (parts[1]?.[0] || '')).toUpperCase();
  return letters.slice(0, 2);
}

export function driverAvatarUrl(name?: string | null, mobile?: string | null): string {
  const letters = initialsFromName(name);
  const seed = (name || mobile || 'driver').trim();
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = [
    ['#2563eb', '#1d4ed8'],
    ['#0f766e', '#0f766e'],
    ['#7c3aed', '#6d28d9'],
    ['#c2410c', '#9a3412'],
    ['#0369a1', '#075985'],
  ];
  const [from, to] = palettes[Math.abs(hash) % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="80" height="80" rx="40" fill="url(#g)"/>
    <text x="40" y="50" text-anchor="middle" fill="#ffffff" font-size="28" font-family="Inter,Segoe UI,Arial,sans-serif" font-weight="700">${letters}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function DriverFace({
  name,
  mobile,
  photoUrl,
  className = 'h-10 w-10 rounded-full object-cover',
}: {
  name?: string | null;
  mobile?: string | null;
  photoUrl?: string | null;
  className?: string;
}) {
  const fallback = driverAvatarUrl(name, mobile);
  const [src, setSrc] = useState(photoUrl || fallback);

  useEffect(() => {
    setSrc(photoUrl || fallback);
  }, [photoUrl, fallback]);

  return (
    <img
      src={src}
      alt={name || 'Driver'}
      className={className}
      onError={() => setSrc(fallback)}
    />
  );
}
