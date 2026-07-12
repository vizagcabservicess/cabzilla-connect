import React from 'react';
import { Button } from '@/components/ui/button';
import { Car, Phone, Calendar, MapPin, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';

export function EnhancedCTA() {
  const features = [
    { icon: Shield, text: 'Verified Drivers' },
    { icon: Car, text: 'Clean Vehicles' },
    { icon: MapPin, text: 'GPS Tracking' },
    { icon: Calendar, text: '24/7 Service' },
  ];

  return (
    <section className="relative overflow-hidden home-section-band--soft py-8 md:py-10">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 h-64 w-64 -translate-x-32 -translate-y-32 rounded-full bg-blue-100/60 blur-2xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-48 translate-y-48 rounded-full bg-slate-100/70 blur-2xl" />
      </div>

      <div className="home-page-container relative z-10">
        <motion.div
          className="text-center text-slate-900"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl lg:text-[1.75rem]">
            Ready to Book Your Ride?
          </h2>
          <p className="mx-auto mb-6 max-w-xl px-4 text-sm leading-relaxed text-slate-500 md:text-[0.9375rem]">
            Experience hassle-free travel with Vizag Taxi Hub. Professional service guaranteed.
          </p>

          <div className="mb-6 flex flex-wrap justify-center gap-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.text}
                className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2 shadow-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                viewport={{ once: true }}
              >
                <feature.icon className="h-4 w-4 text-[#0066FF]" />
                <span className="text-sm font-medium text-slate-700">{feature.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="rounded-2xl bg-[#0066FF] px-10 py-3 text-base font-semibold text-white shadow-sm transition-all duration-300 hover:bg-[#0052CC] hover:shadow-md"
              onClick={() => {
                window.location.href = '/outstation-taxi';
              }}
            >
              <Car className="mr-2 h-5 w-5" />
              Book Your Taxi Now
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => window.open('tel:+919966363662', '_self')}
              >
                <Phone className="mr-2 h-5 w-5" />
                Call Now
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-2xl border-2 border-emerald-600 bg-emerald-600 px-6 py-3 font-semibold text-white transition-all duration-300 hover:border-emerald-700 hover:bg-emerald-700"
                onClick={() =>
                  window.open(
                    'https://wa.me/919966363662?text=Hi Kumar! I would like to know more about your taxi services',
                    '_blank',
                  )
                }
              >
                <FaWhatsapp className="mr-2 h-5 w-5" />
                WhatsApp
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
