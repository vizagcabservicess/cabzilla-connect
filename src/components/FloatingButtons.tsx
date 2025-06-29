import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

export function FloatingButtons({ onChatbotClick }: { onChatbotClick: () => void }) {
  const handleCall = () => {
    window.location.href = 'tel:+919966363662';
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent('Hi! I would like to book a taxi.');
    window.open(`https://wa.me/919966363662?text=${message}`, '_blank');
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
