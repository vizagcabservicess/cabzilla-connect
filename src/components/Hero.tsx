
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface HeroProps {
  title?: string;
  subtitle?: string;
}

export function Hero({ 
  title = "Your Journey, Our Priority", 
  subtitle = "Comfortable and reliable transportation across Visakhapatnam"
}: HeroProps) {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          {title}
        </h1>
        <p className="text-xl md:text-2xl mb-8 opacity-90">
          {subtitle}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
            <Link to="/cabs">Book Now</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-600">
            <Link to="/contact">Contact Us</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
