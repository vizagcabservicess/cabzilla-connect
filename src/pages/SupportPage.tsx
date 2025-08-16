import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Clock, CheckCircle, Headphones } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

export function SupportPage() {
  const supportChannels = [
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Call Support",
      description: "Speak directly with our support team",
      action: "Call +91-9966363662",
      available: "24/7 Available",
      color: "bg-green-500",
      link: "tel:+91-9966363662"
    },
    {
      icon: <FaWhatsapp className="w-6 h-6" />,
      title: "WhatsApp Chat",
      description: "Quick responses via WhatsApp",
      action: "Chat Now",
      available: "Response in < 5 mins",
      color: "bg-green-600",
      link: "https://wa.me/919966363662?text=Hi! I need help with my taxi booking."
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Support",
      description: "Detailed support via email",
      action: "Send Email",
      available: "Response in < 2 hours",
      color: "bg-blue-500",
      link: "mailto:support@vizagtaxihub.com"
    }
  ];

  const commonIssues = [
    "How to book a taxi?",
    "Cancellation policy",
    "Payment methods",
    "Driver tracking",
    "Fare calculation",
    "Special requests"
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar />
      <Helmet>
        <title>Support - Vizag Taxi Hub | 24/7 Customer Support</title>
        <meta name="description" content="Get instant support for your taxi bookings. Available 24/7 via phone, WhatsApp, and email. Quick resolution for all your queries." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-white pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <Headphones className="w-4 h-4 mr-2" />
              24/7 Customer Support
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              We're Here to <span className="text-blue-600">Help</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Get instant support for your taxi bookings, payments, and any questions you may have.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Support Channels */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Support Channel</h2>
            <p className="text-lg text-gray-600">Multiple ways to reach us instantly</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {supportChannels.map((channel, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-8 text-center">
                    <div className={`w-16 h-16 ${channel.color} rounded-2xl flex items-center justify-center mb-6 mx-auto text-white`}>
                      {channel.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{channel.title}</h3>
                    <p className="text-gray-600 mb-4">{channel.description}</p>
                    <div className="flex items-center justify-center text-sm text-green-600 mb-6">
                      <Clock className="w-4 h-4 mr-2" />
                      {channel.available}
                    </div>
                    <Button 
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                      onClick={() => window.open(channel.link, '_blank')}
                    >
                      {channel.action}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Issues */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Help</h2>
            <p className="text-lg text-gray-600">Common questions and instant answers</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {commonIssues.map((issue, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-gray-700">{issue}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">Still Need Help?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Our support team is available 24/7 to assist you with any questions or concerns.
            </p>
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4"
              onClick={() => window.open(`tel:+91-9966363662`)}
            >
              <Phone className="w-5 h-5 mr-2" />
              Call Support Now
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}