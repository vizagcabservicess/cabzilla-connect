import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone } from 'lucide-react';
import { motion } from 'framer-motion';

interface StickyHeaderProps {
  logo?: string;
  contactNumber?: string;
}

export function StickyHeader({ 
  logo = "Vizag Taxi Hub", 
  contactNumber = "+91-9966363662" 
}: StickyHeaderProps) {
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-bold text-xl text-primary"
          >
            {logo}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
              onClick={() => window.open(`tel:${contactNumber}`)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Now
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}