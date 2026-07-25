import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import { buildWhatsAppMeUrl } from '@/utils/whatsappPrefillMessage';
import { trackContactCta } from '@/utils/trackContactCta';

export function FloatingButtons({ onChatbotClick }: { onChatbotClick: () => void }) {
  const location = useLocation();

  const handleCall = () => {
    trackContactCta('phone', { name: 'floating_call', path: location.pathname });
    window.location.href = 'tel:+919966363662';
  };

  const handleWhatsApp = () => {
    trackContactCta('whatsapp', { name: 'floating_whatsapp', path: location.pathname });
    window.open(buildWhatsAppMeUrl(location.pathname), '_blank');
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
      {/* Chatbot Button */}
      <Button
        onClick={onChatbotClick}
        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
        size="icon"
        aria-label="Open Chatbot"
      >
        <MessageCircle className="h-7 w-7 group-hover:scale-110 transition-transform" />
      </Button>
      {/* WhatsApp Button */}
      <Button
        onClick={handleWhatsApp}
        className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
        size="icon"
        aria-label="WhatsApp"
      >
        <FaWhatsapp className="h-7 w-7 group-hover:scale-110 transition-transform" />
      </Button>
      {/* Call Button */}
      <Button
        onClick={handleCall}
        className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
        size="icon"
        aria-label="Call"
      >
        <Phone className="h-6 w-6 group-hover:scale-110 transition-transform" />
      </Button>
    </div>
  );
}
