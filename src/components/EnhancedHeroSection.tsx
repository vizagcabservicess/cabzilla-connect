import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, Phone, MessageCircle, Star, Clock, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EnhancedHeroSection() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const stats = [
    { number: "10K+", label: "Happy Customers", icon: Users },
    { number: "24/7", label: "Available", icon: Clock },
    { number: "5+", label: "Years Experience", icon: Star },
    { number: "100%", label: "Safe Travel", icon: Shield }
  ];

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 overflow-hidden flex items-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Gradient Mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/90 to-indigo-900/90">
          {/* Floating geometric shapes */}
          <motion.div 
            className="absolute top-20 left-20 w-32 h-32 bg-white/5 rounded-full"
            animate={{ 
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute top-60 right-32 w-24 h-24 bg-blue-400/10 rounded-lg rotate-45"
            animate={{ 
              rotate: [45, 135, 45],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-40 left-1/4 w-16 h-16 bg-purple-400/10 rounded-full"
            animate={{ 
              x: [0, 30, 0],
              y: [0, -15, 0],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{ 
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-32 right-1/3 w-20 h-20 bg-white/5 rounded-lg rotate-12"
            animate={{ 
              rotate: [12, 72, 12],
              scale: [1, 1.15, 1]
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Animated grid pattern */}
          <motion.div 
            className="absolute inset-0 opacity-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ duration: 2 }}
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>
        
        {/* Large blur circles for depth */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen py-20">
          {/* Left Content */}
          <motion.div 
            className="text-white space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Badge */}
            <motion.div 
              className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3 rounded-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Car className="h-5 w-5 text-blue-300 animate-pulse" />
              <span className="text-sm font-semibold text-blue-200 tracking-wide">PREMIUM TAXI SERVICE</span>
            </motion.div>

            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  Your Journey
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                  Starts Here
                </span>
              </h1>
            </motion.div>

            {/* Description */}
            <motion.p 
              className="text-xl md:text-2xl text-blue-100 leading-relaxed max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              Experience premium transportation in Visakhapatnam with our reliable, comfortable, and affordable taxi services.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
            >
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300">
                <Car className="h-5 w-5 mr-2" />
                Book Your Ride
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-4 rounded-full text-lg font-semibold">
                <Phone className="h-5 w-5 mr-2" />
                Call Now
              </Button>
            </motion.div>

            {/* Quick Contact */}
            <motion.div 
              className="flex items-center gap-6 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-400" />
                <span className="text-lg font-semibold text-green-300">+91 9966363662</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-400" />
                <span className="text-green-300">WhatsApp</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Content - Stats & Visual */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            {/* Floating Car Visual */}
            <motion.div 
              className="relative"
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-80 h-80 mx-auto relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
                <div className="absolute inset-8 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 flex items-center justify-center">
                  <Car className="h-32 w-32 text-white/80" />
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 text-center hover:bg-white/15 transition-all duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.4 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <stat.icon className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white mb-1">{stat.number}</div>
                  <div className="text-sm text-blue-200">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 2.0 }}
      >
        <motion.div 
          className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
          animate={{ 
            y: [0, 10, 0],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <motion.div 
            className="w-1 h-3 bg-white/60 rounded-full mt-2"
            animate={{ 
              scaleY: [1, 0.5, 1],
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}