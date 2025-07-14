import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { OutstationHero } from '@/components/OutstationHero';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, Shield, Star, Phone, Car, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FleetShowcase } from '@/components/FleetShowcase';
import { popularRoutes } from '@/lib/routeData';
import { slugify } from '@/lib/utils';
import { OutstationHeroWidget } from "@/components/OutstationHeroWidget";

export function OutstationTaxiPage() {
  const features = [
    { icon: <Star />, title: 'Transparent Pricing', description: 'No hidden charges. Pay for what you see.' },
    { icon: <Car />, title: 'Wide Range of Cars', description: 'Choose from Sedans, SUVs, and more.' },
    { icon: <Shield />, title: 'Safe & Secure Trips', description: 'Verified drivers and 24/7 support.' },
    { icon: <Map />, title: 'All India Permit', description: 'Travel anywhere across the country.' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <OutstationHeroWidget />
      {/* A footer could be added here if needed */}
    </div>
  );
}
