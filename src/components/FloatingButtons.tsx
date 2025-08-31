import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

export function FloatingButtons({ onChatbotClick }: { onChatbotClick: () => void }) {
  const location = useLocation();
  
  const handleCall = () => {
    window.location.href = 'tel:+919966363662';
  };

  const getWhatsAppMessage = () => {
    const path = location.pathname;
    
    // Check for vehicle detail pages first (dynamic paths)
    if (path.startsWith('/vehicle/')) {
      const vehicleName = path.split('/vehicle/')[1];
      // Convert URL format to readable name (e.g., "tempo_traveller" -> "Tempo Traveller")
      const readableVehicleName = vehicleName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `Hi Kumar! I would like to know more about the ${readableVehicleName} vehicle`;
    }
    
    // Check for tour detail pages (dynamic paths)
    if (path.startsWith('/tours/') && path !== '/tours') {
      const tourId = path.split('/tours/')[1];
      return `Hi Kumar! I would like to know more about tour package ${tourId}`;
    }
    
    // Check for booking-related pages
    if (path.startsWith('/booking/')) {
      return 'Hi Kumar! I need help with my booking';
    }
    
    // Check for payment page
    if (path === '/payment') {
      return 'Hi Kumar! I need help with payment';
    }
    
    // Define messages based on actual page paths
    const messages = {
      '/': 'Hi Kumar! I would like to know more about your taxi services',
      '/hire-driver': 'Hi Kumar! I would like to hire a driver',
      '/tours': 'Hi Kumar! I would like to know more about your tour packages',
      '/fleet': 'Hi Kumar! I would like to know more about your fleet',
      '/careers': 'Hi Kumar! I would like to know more about career opportunities',
      '/our-story': 'Hi Kumar! I would like to know more about your company',
      '/vision-mission': 'Hi Kumar! I would like to know more about your vision and mission',
      '/contact': 'Hi Kumar! I would like to get in touch with you',
      '/about': 'Hi Kumar! I would like to know more about Vizag Taxi Hub',
      '/local-taxi': 'Hi Kumar! I would like to book a local taxi',
      '/outstation-taxi': 'Hi Kumar! I would like to book an outstation taxi',
      '/airport-taxi': 'Hi Kumar! I would like to book an airport transfer',
      '/pooling': 'Hi Kumar! I would like to know more about your car pooling service',
      '/rentals': 'Hi Kumar! I would like to know more about your car rental services',
      '/support': 'Hi Kumar! I need support with my booking',
      '/help-center': 'Hi Kumar! I need help with your services',
      '/contact-us': 'Hi Kumar! I would like to get in touch with you',
      '/terms-conditions': 'Hi Kumar! I have a question about your terms and conditions',
      '/privacy-policy': 'Hi Kumar! I have a question about your privacy policy',
      '/user-agreement': 'Hi Kumar! I have a question about your user agreement',
      '/terms': 'Hi Kumar! I have a question about your terms',
      '/privacy': 'Hi Kumar! I have a question about your privacy policy',
      '/data-deletion': 'Hi Kumar! I would like to request data deletion',
      '/refunds': 'Hi Kumar! I have a question about refunds',
      '/cancellation-refund-policy': 'Hi Kumar! I have a question about cancellation and refund policy'
    };

    // Return specific message or default message
    return messages[path] || 'Hi Kumar! I would like to know more about your services';
  };

  const handleWhatsApp = () => {
    const message = getWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/919966363662?text=${encodedMessage}`, '_blank');
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
