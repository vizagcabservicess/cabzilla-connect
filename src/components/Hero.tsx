
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const Hero: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Welcome to Pooling
        </h1>
        <p className="text-xl md:text-2xl mb-8">
          Share rides, reduce costs, make connections
        </p>
        <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-blue-600">
          Get Started
        </Button>
      </div>
    </div>
  );
};
