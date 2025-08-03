import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Shield, AlertCircle, Users } from 'lucide-react';

export function TermsConditionsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By using Vizag Taxi Hub services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services."
    },
    {
      title: "2. Service Description",
      content: "Vizag Taxi Hub provides taxi booking and transportation services including local rides, outstation trips, and airport transfers. We connect passengers with professional drivers through our booking platform."
    },
    {
      title: "3. Booking and Reservations",
      content: "Bookings can be made via phone, website, or WhatsApp. All bookings are subject to availability. We reserve the right to refuse service at our discretion. Advance bookings are recommended for outstation and airport trips."
    },
    {
      title: "4. Payment Terms",
      content: "Payment can be made via cash, UPI, credit/debit cards, or digital wallets. For outstation trips, advance payment may be required. All fares are inclusive of applicable taxes unless otherwise specified."
    },
    {
      title: "5. Cancellation Policy",
      content: "Cancellations must be made by calling our support team. Cancellation charges may apply: Free cancellation up to 1 hour before pickup for local rides, up to 4 hours for outstation trips. Late cancellations may incur charges up to 25% of the fare."
    },
    {
      title: "6. Driver and Vehicle Standards",
      content: "All our drivers are licensed and verified. Vehicles are regularly maintained and inspected. We strive to provide clean, safe, and comfortable transportation. However, we are not liable for minor inconveniences."
    },
    {
      title: "7. Passenger Responsibilities",
      content: "Passengers must provide accurate pickup locations and contact information. Disruptive behavior, damage to vehicles, or illegal activities will result in immediate termination of service and potential legal action."
    },
    {
      title: "8. Liability and Insurance",
      content: "While we maintain comprehensive insurance coverage, passengers are advised to have their own travel insurance. Our liability is limited to the fare amount paid for the specific trip."
    },
    {
      title: "9. Privacy and Data Protection",
      content: "We collect and use personal information as outlined in our Privacy Policy. Your data is protected and will not be shared with third parties without consent, except as required by law."
    },
    {
      title: "10. Force Majeure",
      content: "We are not liable for delays or cancellations due to circumstances beyond our control including weather, traffic, road conditions, or government restrictions."
    },
    {
      title: "11. Dispute Resolution",
      content: "Any disputes will be resolved through negotiation. If unresolved, disputes will be subject to the jurisdiction of courts in Visakhapatnam, Andhra Pradesh."
    },
    {
      title: "12. Changes to Terms",
      content: "We reserve the right to modify these terms at any time. Updated terms will be posted on our website. Continued use of our services constitutes acceptance of revised terms."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Helmet>
        <title>Terms & Conditions - Vizag Taxi Hub | Service Agreement</title>
        <meta name="description" content="Read the terms and conditions for using Vizag Taxi Hub services. Important information about bookings, payments, cancellations, and service policies." />
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
              <FileText className="w-4 h-4 mr-2" />
              Legal Information
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Terms & <span className="text-blue-600">Conditions</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Please read these terms carefully before using our taxi services.
            </p>
            <div className="text-sm text-gray-500">
              Last updated: January 2024
            </div>
          </motion.div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-8 bg-blue-50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start">
                  <AlertCircle className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2">Important Notice</h3>
                    <p className="text-blue-800 leading-relaxed">
                      These Terms and Conditions constitute a legal agreement between you and Vizag Taxi Hub. 
                      By using our services, you acknowledge that you have read, understood, and agree to be bound by these terms.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
                    <p className="text-gray-700 leading-relaxed">{section.content}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Information */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Additional Information</h2>
            <p className="text-lg text-gray-600">Important details about our service</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Safety First</h3>
                  <p className="text-gray-600">All drivers are verified and vehicles are regularly inspected for your safety.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Transparent Pricing</h3>
                  <p className="text-gray-600">No hidden charges. All fares are calculated transparently with clear breakdown.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">24/7 Support</h3>
                  <p className="text-gray-600">Round-the-clock customer support for all your queries and assistance.</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">Questions About These Terms?</h2>
            <p className="text-xl text-gray-300 mb-8">
              If you have any questions about these Terms and Conditions, please contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <span className="text-gray-300">Call us at:</span>
              <span className="text-white font-bold text-lg">+91-9966363662</span>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}