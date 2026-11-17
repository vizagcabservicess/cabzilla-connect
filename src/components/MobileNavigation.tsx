import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, User, Phone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { buildWhatsAppMeUrl } from '@/utils/whatsappPrefillMessage';

interface RouteNavItem {
  kind: 'route';
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface ExternalNavItem {
  kind: 'external';
  icon: React.ReactNode;
  label: string;
  href: string;
  external: true;
  ctaName: string;
  iconClassName?: string;
  labelClassName?: string;
}

type NavItem = RouteNavItem | ExternalNavItem;

export const MobileNavigation = () => {
  const { pathname: currentPath } = useLocation();

  const whatsappHref = useMemo(() => buildWhatsAppMeUrl(currentPath), [currentPath]);

  const navItems: NavItem[] = [
    {
      kind: 'route',
      icon: <Home size={20} />,
      label: 'Home',
      href: '/',
    },
    {
      kind: 'external',
      icon: <FaWhatsapp className="h-4 w-4" aria-hidden />,
      label: 'WhatsApp',
      href: whatsappHref,
      external: true,
      ctaName: 'mobile_nav_whatsapp',
      iconClassName: 'flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm',
      labelClassName: 'text-[11px] mt-0.5 font-semibold text-[#15803D]',
    },
    {
      kind: 'external',
      icon: <Phone className="h-3.5 w-3.5" aria-hidden />,
      label: 'Call',
      href: 'tel:+919966363662',
      external: true,
      ctaName: 'mobile_nav_call',
      iconClassName: 'flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm',
      labelClassName: 'text-[11px] mt-0.5 font-semibold text-blue-700',
    },
    {
      kind: 'route',
      icon: <User size={20} />,
      label: 'Profile',
      href: '/login',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] isolate border-t border-gray-200/90 bg-white/85 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))] shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-white/75 md:hidden mobile-safe-bottom">
      <div className="grid min-h-[4.25rem] grid-cols-4">
        {navItems.map((item) => {
          if (item.kind === 'external') {
            return (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                data-cta-name={item.ctaName}
                className="relative flex min-h-[48px] flex-col items-center justify-center px-2 py-1.5 transition-opacity hover:opacity-90 active:bg-gray-50/80"
                aria-label={item.label}
              >
                <div className={item.iconClassName ?? 'relative'}>{item.icon}</div>
                <span className={item.labelClassName ?? 'text-xs mt-1'}>{item.label}</span>
              </a>
            );
          }

          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`relative flex min-h-[48px] flex-col items-center justify-center px-2 py-2 transition-colors active:bg-gray-50/80 ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                {item.icon}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="navBottomIndicator"
                  className="absolute bottom-0 w-12 h-1 bg-blue-600 rounded-t-md"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
