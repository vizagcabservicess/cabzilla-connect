
import React from 'react';
import { Button, ButtonProps } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from '@/services/whatsappService';

interface WhatsAppButtonProps extends Omit<ButtonProps, 'variant'> {
  phone: string;
  message: string;
  icon?: boolean;
  fullWidth?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link" | "whatsapp";
  openInNewTab?: boolean;
}

export function WhatsAppButton({ 
  phone, 
  message, 
  icon = true,
  fullWidth = false,
  variant = "whatsapp",
  openInNewTab = true,
  className, 
  children, 
  ...props 
}: WhatsAppButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const formattedPhone = formatPhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    if (openInNewTab) {
      window.open(url, '_blank');
    } else {
      window.location.href = url;
    }
  };
  
  const buttonVariant = variant === "whatsapp" ? "default" : variant;
  
  return (
    <Button
      variant={buttonVariant}
      onClick={handleClick}
      className={cn(
        variant === "whatsapp" && "bg-[#25D366] hover:bg-[#128C7E] text-white",
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {icon && <MessageCircle className="w-4 h-4 mr-2" />}
      {children || "Share via WhatsApp"}
    </Button>
  );
}

export function WhatsAppShareButton({ 
  phone, 
  message,
  variant = "outline",
  className,
  ...props 
}: WhatsAppButtonProps) {
  return (
    <WhatsAppButton
      phone={phone}
      message={message}
      variant={variant}
      className={cn("text-sm px-2 py-1 h-8", className)}
      {...props}
    >
      Share via WhatsApp
    </WhatsAppButton>
  );
}
