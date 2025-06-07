
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, MessageCircle, Phone, Star } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';

interface Message {
  id: string;
  senderId: number;
  senderName: string;
  senderType: 'guest' | 'provider';
  message: string;
  timestamp: string;
}

interface ProviderChatProps {
  ride: PoolingRide;
  currentUserId: number;
  currentUserName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProviderChat({ 
  ride, 
  currentUserId, 
  currentUserName, 
  isOpen, 
  onClose 
}: ProviderChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages (mock implementation)
  useEffect(() => {
    if (isOpen) {
      // In real implementation, fetch messages from API
      setMessages([
        {
          id: '1',
          senderId: ride.providerId,
          senderName: ride.providerName,
          senderType: 'provider',
          message: 'Hi! Your ride request has been approved. Looking forward to the trip!',
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [isOpen, ride.providerId, ride.providerName]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      const message: Message = {
        id: Date.now().toString(),
        senderId: currentUserId,
        senderName: currentUserName,
        senderType: 'guest',
        message: newMessage.trim(),
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // In real implementation, send to API
      console.log('Sending message:', message);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed inset-x-4 bottom-4 max-w-md ml-auto z-50 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{ride.providerName}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {ride.providerRating?.toFixed(1) || 'N/A'}
                <span>•</span>
                <Phone className="h-3 w-3" />
                <span>Available</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Messages */}
        <div className="h-64 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUserId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="max-w-[80%]">
                <div
                  className={`p-3 rounded-lg ${
                    message.senderId === currentUserId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 px-1">
                  <Badge variant="outline" className="text-xs">
                    {message.senderName}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isLoading || !newMessage.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Chat with your provider for trip coordination
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
