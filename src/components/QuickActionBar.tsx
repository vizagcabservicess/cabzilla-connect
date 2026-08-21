
import React, { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { Phone, MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FloatingButtons } from './FloatingButtons';
import { useLocation } from 'react-router-dom';
import { trackContactCta } from '@/utils/trackContactCta';

interface ChatMessage {
  id: number | string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
}

export const QuickActionBar = () => {
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      text: "Hello! I'm Vizag Taxi Hub assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const handleCall = () => {
    trackContactCta('phone', { name: 'mobile_bar_call', path: location.pathname });
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
      '/airport-taxi': 'Hi! I need a Bhogapuram Airport taxi (Alluri Sitarama Raju International Airport).\n\n✈️ Flight Number:\n📅 Arrival Date:\n⏰ Arrival Time:\n📍 Drop Location:\n👥 Number of Passengers:',
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
    trackContactCta('whatsapp', { name: 'mobile_bar_whatsapp', path: location.pathname });
    const message = getWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/919966363662?text=${encodedMessage}`, '_blank');
  };

  const handleSendMessage = async () => {
    if (message.trim() && !isBotTyping) {
      const userMessage: ChatMessage = {
        id: Date.now(),
        text: message,
        sender: 'user',
        timestamp: new Date()
      };
      
      const currentMessages = [...messages, userMessage];
      setMessages(currentMessages);
      setMessage('');
      setIsBotTyping(true);

      try {
        const chatHistory = currentMessages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }));

        const res = await fetch('/api/chatbot.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: chatHistory.slice(-6), // Send last 6 messages for context
            }),
        });
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to get response from bot' }));
            throw new Error(errorData.message);
        }

        const data = await res.json();
        
        const botReply: ChatMessage = {
            id: Date.now() + 1,
            text: data.reply || "Sorry, I couldn't process that.",
            sender: 'bot',
            timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botReply]);

      } catch (error: any) {
        console.error("Chatbot error:", error);
        const errorReply: ChatMessage = {
            id: Date.now() + 1,
            text: `Sorry, something went wrong. ${error.message || 'Please try again.'}`,
            sender: 'bot',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorReply]);
      } finally {
        setIsBotTyping(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Desktop: Floating Buttons */}
      <div className="hidden md:block">
        <FloatingButtons onChatbotClick={() => setChatOpen(true)} />
      </div>
      {/* Mobile: Bottom Bar */}
      <nav className="block md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex justify-around items-center h-16 shadow-2xl">
        {/* Chatbot */}
        <button
          onClick={() => setChatOpen(true)}
          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all duration-300"
          aria-label="Open Chatbot"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
        {/* WhatsApp */}
        <button
          onClick={handleWhatsApp}
          className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg transition-all duration-300"
          aria-label="WhatsApp"
        >
          <FaWhatsapp className="h-5 w-5" />
        </button>
        {/* Call */}
        <button
          onClick={handleCall}
          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg transition-all duration-300"
          aria-label="Call"
        >
          <Phone className="h-5 w-5" />
        </button>
      </nav>

      {/* Full Chatbot Widget */}
      {chatOpen && (
        <div className="fixed bottom-20 left-4 z-50 w-80 max-w-[calc(100vw-2rem)]">
          <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden">
            <CardHeader className="bg-blue-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Vizag Taxi Hub</CardTitle>
                    <p className="text-xs text-blue-100">Online now</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-8 w-8"
                  onClick={() => setChatOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Messages */}
              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isBotTyping && (
                   <div className="flex justify-start">
                       <div className="max-w-[80%] p-3 rounded-2xl text-sm bg-gray-100 text-gray-800">
                          <div className="flex items-center space-x-1">
                              <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                              <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                              <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse"></span>
                          </div>
                       </div>
                   </div>
                )}
              </div>
              {/* Input */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isBotTyping}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    className="bg-blue-600 hover:bg-blue-700 rounded-full h-8 w-8"
                    disabled={isBotTyping}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};
