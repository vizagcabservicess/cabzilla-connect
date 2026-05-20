import { Bell, Phone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { BRAND_GREEN } from './constants';
import { VIZAG_TAXI_HUB_PHONE_E164, buildWhatsAppMeUrl } from '@/utils/whatsappPrefillMessage';

const OPTIONS = [
  {
    Icon: Bell,
    title: 'Join Waitlist',
    desc: "We'll notify you when a ride becomes available",
    cta: 'Join Waitlist',
    action: 'waitlist' as const,
  },
  {
    Icon: FaWhatsapp,
    title: 'Talk to Us on WhatsApp',
    desc: 'Chat with our team for quick assistance',
    cta: 'Chat Now',
    action: 'whatsapp' as const,
  },
  {
    Icon: Phone,
    title: 'Request a Callback',
    desc: 'Our team will call you back shortly',
    cta: 'Request Callback',
    action: 'callback' as const,
  },
] as const;

export function OtherOptions() {
  const waBase = buildWhatsAppMeUrl('/shared-carpooling/no-rides');

  const handleAction = (action: (typeof OPTIONS)[number]['action']) => {
    const messages: Record<typeof action, string> = {
      waitlist: 'Hi! I would like to join the waitlist for shared carpool rides on my route.',
      whatsapp: '',
      callback: 'Hi! I would like to request a callback regarding shared carpooling on my route.',
    };
    if (action === 'whatsapp') {
      window.open(waBase, '_blank', 'noopener,noreferrer');
      return;
    }
    const url = `https://wa.me/${VIZAG_TAXI_HUB_PHONE_E164}?text=${encodeURIComponent(messages[action])}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xl font-bold text-gray-900">Other Options</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {OPTIONS.map(({ Icon, title, desc, cta, action }) => (
            <div
              key={title}
              className="flex flex-col items-center rounded-2xl border border-gray-100 bg-gray-50/50 p-6 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <Icon className="h-6 w-6" style={{ color: action === 'whatsapp' ? '#25D366' : BRAND_GREEN }} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-gray-900">{title}</h3>
              <p className="mt-1 text-xs text-gray-500">{desc}</p>
              <button
                type="button"
                onClick={() => handleAction(action)}
                className="mt-4 rounded-lg px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: BRAND_GREEN }}
              >
                {cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
