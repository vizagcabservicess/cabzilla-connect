
import React from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { Booking } from '@/types/api';
import { formatPhoneNumber, generateBookingConfirmationMessage } from '@/services/whatsappService';

interface WhatsAppShareButtonProps {
  booking: Booking;
  variant?: "outline" | "default" | "destructive" | "secondary" | "ghost" | "link" | "whatsapp";
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export function WhatsAppShareButton({ 
  booking, 
  variant = "default", 
  fullWidth = false,
  children,
}: WhatsAppShareButtonProps) {
  const handleShare = () => {
    const phone = booking.passengerPhone || booking.guest_phone;
    const message = generateBookingConfirmationMessage(booking);
    
    if (!phone) {
      console.error('No phone number available for sharing');
      return;
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    window.open(url, '_blank');
  };

  // Special WhatsApp green styling if variant is "whatsapp"
  const className = variant === "whatsapp" ? "bg-[#25D366] hover:bg-[#128C7E] text-white" : "";
  
  return (
    <Button
      variant={variant === "whatsapp" ? "default" : variant}
      onClick={handleShare}
      className={`${className} ${fullWidth ? 'w-full' : ''}`}
    >
      <MessageCircle className="mr-2 h-4 w-4" />
      {children || 'Share via WhatsApp'}
    </Button>
  );
}

export default WhatsAppShareButton;
