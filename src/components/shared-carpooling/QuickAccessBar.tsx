import { CalendarDays, Ticket, Users } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { BRAND_GREEN, BRAND_GREEN_LIGHT } from './constants';
import { buildWhatsAppMeUrl } from '@/utils/whatsappPrefillMessage';

const QUICK_ITEMS = [
  {
    Icon: CalendarDays,
    title: 'Daily Office / College',
    subtitle: 'Regular daily rides',
    href: '#find-ride',
  },
  {
    Icon: Ticket,
    title: 'Monthly Pass',
    subtitle: 'Best value for regular commuters',
    href: '#find-ride',
  },
  {
    Icon: Users,
    title: 'Group Booking',
    subtitle: 'Book for your team/college',
    href: '#commute-form',
  },
] as const;

export function QuickAccessBar() {
  const waUrl = buildWhatsAppMeUrl('/shared-carpooling');

  return (
    <section className="overflow-x-hidden border-b border-gray-100 bg-gray-50">
      <div className="mx-auto flex min-w-0 max-w-[1400px] flex-col gap-4 overflow-x-hidden px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK_ITEMS.map(({ Icon, title, subtitle, href }) => (
            <a
              key={title}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: BRAND_GREEN_LIGHT }}
              >
                <Icon className="h-5 w-5" style={{ color: BRAND_GREEN }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{subtitle}</p>
              </div>
            </a>
          ))}
        </div>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition-colors hover:bg-green-50 lg:ml-4"
          style={{ color: BRAND_GREEN }}
        >
          <FaWhatsapp className="h-5 w-5" style={{ color: '#25D366' }} />
          Need Help? Chat on WhatsApp
        </a>
      </div>
    </section>
  );
}
