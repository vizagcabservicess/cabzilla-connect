import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Shield, AlertCircle, Users, Handshake } from 'lucide-react';
import { MobileNavigation } from '@/components/MobileNavigation';

export function UserAgreementPage() {
  const sections = [
    {
      title: "1. Applicability",
      content: "This User Agreement, together with our Terms of Service, governs your use of services offered by Vizag Taxi Hub (\"VTH\") through its website, mobile app, call centers, and other sales channels. By accessing or using our services, you (\"User\") agree to be bound by this Agreement. If you disagree with any part of it, please do not use our services."
    },
    {
      title: "2. Eligibility to Use",
      content: "Users must be at least 18 years old and legally capable of entering agreements. Minors may use our services only through a legal guardian."
    },
    {
      title: "3. Content Ownership",
      content: "All content—text, images, logos, icons, software—provided by \"VTH\" is our property or licensed to us, and is protected by intellectual property laws. You may use this content only for its intended purpose; any other use is prohibited."
    },
    {
      title: "4. Website & App Use",
      content: "You are granted a limited, non-transferable, non-exclusive right to access our digital platforms. Unauthorized use, including modification, distribution, or commercial exploitation, is not permitted. Any information you share must be true and accurate to the best of your knowledge."
    },
    {
      title: "5. Services & Bookings",
      content: "\"VTH\" acts as a service facilitator—we connect you with local taxi operators. The actual transportation service is provided by third-party drivers/operators. Once a booking is confirmed, the contract of service exists between you and the operator, not \"VTH\". We are not liable for issues arising during your ride."
    },
    {
      title: "6. Fees and Payments",
      content: "You agree to pay all applicable service charges, taxes, and processing fees. Payments must be completed before ride confirmation. Any unpaid bookings may be canceled."
    },
    {
      title: "7. User Responsibilities",
      content: "You must: Provide accurate contact and pickup/drop-off details. Use the service lawfully. Not misuse or tamper with the platform (e.g., bypassing security or engaging in illegal behavior)."
    },
    {
      title: "8. Security & Account Information",
      content: "You are responsible for maintaining confidentiality of your account credentials. Any activity from your account is your responsibility. Report unauthorized access promptly."
    },
    {
      title: "9. Cancellation & Refunds",
      content: "Cancellation policies vary by operator. Cancellation charges may apply. Refunds—if eligible—will be processed as per the relevant operator's policy."
    },
    {
      title: "10. Force Majeure",
      content: "\"VTH\" is not liable for failure to perform due to events beyond our reasonable control (e.g., natural disasters, government orders)."
    },
    {
      title: "11. Right to Refuse Service",
      content: "We reserve the right to refuse service without explanation—for non-compliance, suspicious behavior, or breach of these terms."
    },
    {
      title: "12. Indemnification",
      content: "You agree to indemnify and hold \"VTH\" harmless from any claims, damages, or losses arising from your use of our services or breach of this Agreement."
    },
    {
      title: "13. Updates to Agreement",
      content: "We may modify this Agreement at any time. Continued use of \"VTH\" services constitutes your acceptance of the updated terms. We encourage you to review the Agreement periodically."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Navbar />
      <Helmet>
        <title>User Agreement - Vizag Taxi Hub | Service Terms</title>
        <meta name="description" content="Read the user agreement for Vizag Taxi Hub services. Important information about eligibility, user responsibilities, and service terms." />
        <meta name="keywords" content="user agreement vizag taxi hub, service terms, user responsibilities, eligibility" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/user-agreement" />
        <meta property="og:title" content="User Agreement - Vizag Taxi Hub | Service Terms" />
        <meta property="og:description" content="Read the user agreement for Vizag Taxi Hub services." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/user-agreement" />
        <meta property="twitter:title" content="User Agreement - Vizag Taxi Hub | Service Terms" />
        <meta property="twitter:description" content="Read the user agreement for Vizag Taxi Hub services." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/user-agreement" />
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
              <Handshake className="w-4 h-4 mr-2" />
              Legal Agreement
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              User <span className="text-blue-600">Agreement</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Please read this agreement carefully before using our taxi services.
            </p>
            <div className="text-sm text-gray-500">
              Last updated: August 2025
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
                      This User Agreement constitutes a legal contract between you and Vizag Taxi Hub. 
                      By using our services, you acknowledge that you have read, understood, and agree to be bound by this agreement.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Agreement Content */}
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
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Key Points</h2>
            <p className="text-lg text-gray-600">Important aspects of our user agreement</p>
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
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Service Facilitation</h3>
                  <p className="text-gray-600">We connect you with verified taxi operators. The actual service is provided by third-party drivers.</p>
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
                  <h3 className="text-lg font-bold text-gray-900 mb-3">User Responsibilities</h3>
                  <p className="text-gray-600">Provide accurate information, use services lawfully, and maintain account security.</p>
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
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Age Requirement</h3>
                  <p className="text-gray-600">Users must be at least 18 years old. Minors may use services through legal guardians.</p>
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
            <h2 className="text-3xl font-bold mb-6">Questions About This Agreement?</h2>
            <p className="text-xl text-gray-300 mb-8">
              If you have any questions about this User Agreement, please contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <span className="text-gray-300">Call us at:</span>
              <span className="text-white font-bold text-lg">+91-9966363662</span>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <MobileNavigation />
    </div>
  );
}
