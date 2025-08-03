import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, BookOpen, CreditCard, Car, MapPin, PhoneCall, Clock } from 'lucide-react';

export function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Booking Help",
      description: "How to book, modify, and cancel rides",
      color: "bg-blue-500"
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Payment & Billing",
      description: "Payment methods, receipts, and refunds",
      color: "bg-green-500"
    },
    {
      icon: <Car className="w-6 h-6" />,
      title: "During Your Ride",
      description: "Driver contact, tracking, and safety",
      color: "bg-purple-500"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Service Areas",
      description: "Where we operate and coverage areas",
      color: "bg-orange-500"
    }
  ];

  const faqs = [
    {
      category: "Booking",
      question: "How do I book a taxi?",
      answer: "You can book a taxi by calling +91-9966363662, using our website booking form, or through WhatsApp. Simply provide your pickup location, destination, date, and time."
    },
    {
      category: "Booking",
      question: "Can I book a ride in advance?",
      answer: "Yes, you can book rides up to 30 days in advance. This is especially useful for airport transfers and outstation trips."
    },
    {
      category: "Booking",
      question: "How do I cancel my booking?",
      answer: "You can cancel your booking by calling our support team at +91-9966363662. Cancellation charges may apply based on the timing of cancellation."
    },
    {
      category: "Payment",
      question: "What payment methods do you accept?",
      answer: "We accept cash, UPI, credit/debit cards, and digital wallets. Payment can be made directly to the driver or through our online payment system."
    },
    {
      category: "Payment",
      question: "How is the fare calculated?",
      answer: "Fares are calculated based on distance, time, vehicle type, and service type (local/outstation/airport). All rates are transparent with no hidden charges."
    },
    {
      category: "Service",
      question: "Do you provide 24/7 service?",
      answer: "Yes, we provide 24/7 taxi services for all types of trips including local rides, outstation journeys, and airport transfers."
    },
    {
      category: "Service",
      question: "Can I track my driver?",
      answer: "Yes, once your booking is confirmed, you'll receive driver details including phone number. You can call the driver directly for real-time location updates."
    },
    {
      category: "Service",
      question: "What if my driver is late?",
      answer: "If your driver is running late, please call our support team immediately. We'll either update you on the driver's location or arrange an alternative vehicle."
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Helmet>
        <title>Help Center - Vizag Taxi Hub | FAQs & Support Guide</title>
        <meta name="description" content="Find answers to common questions about taxi booking, payments, and services. Complete help guide for Vizag Taxi Hub customers." />
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
              <BookOpen className="w-4 h-4 mr-2" />
              Help Center
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              How Can We <span className="text-blue-600">Help?</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Find answers to your questions and get the help you need.
            </p>
            
            {/* Search Box */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for help..."
                className="pl-12 pr-4 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-lg text-gray-600">Find the help you need quickly</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {helpCategories.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center mb-4 mx-auto text-white`}>
                      {category.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{category.title}</h3>
                    <p className="text-gray-600 text-sm">{category.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">Quick answers to common questions</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="bg-gray-50 rounded-lg px-6">
                  <AccordionTrigger className="text-left hover:no-underline py-6">
                    <span className="font-semibold text-gray-900">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

          {filteredFaqs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No results found. Try a different search term.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">Still Need Help?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center text-gray-300">
                <PhoneCall className="w-5 h-5 mr-2" />
                <span>+91-9966363662</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Clock className="w-5 h-5 mr-2" />
                <span>Available 24/7</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}