import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Lock, Eye, Database, UserCheck, AlertTriangle } from 'lucide-react';

export function PrivacyPolicyPage() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide directly (name, phone number, email, pickup/drop locations), automatically when using our services (device information, location data, usage patterns), and from third parties (payment processors, mapping services) when necessary for service delivery."
    },
    {
      title: "2. How We Use Your Information",
      content: "Your information is used to provide taxi services, process bookings and payments, communicate about your trips, improve our services, ensure safety and security, comply with legal obligations, and send important updates about our services."
    },
    {
      title: "3. Information Sharing",
      content: "We share your information only when necessary: with drivers for trip coordination, with payment processors for transactions, with authorities when legally required, and with service providers who help us operate (always under strict confidentiality agreements)."
    },
    {
      title: "4. Data Security",
      content: "We implement industry-standard security measures including encryption of sensitive data, secure data transmission, regular security audits, access controls and authentication, and secure data storage practices to protect your personal information."
    },
    {
      title: "5. Location Information",
      content: "We collect location data to provide pickup services, optimize routes, ensure driver and passenger safety, and improve service quality. Location tracking is only active during active bookings and can be controlled through your device settings."
    },
    {
      title: "6. Data Retention",
      content: "We retain your personal information for as long as necessary to provide services, comply with legal obligations, resolve disputes, and enforce agreements. Trip data is typically retained for 3 years for safety and legal compliance."
    },
    {
      title: "7. Your Rights",
      content: "You have the right to access your personal information, correct inaccurate data, request deletion of your data, object to processing, request data portability, and withdraw consent. Contact us to exercise these rights."
    },
    {
      title: "8. Cookies and Tracking",
      content: "Our website uses cookies to improve user experience, remember preferences, analyze website traffic, and provide personalized content. You can control cookie settings through your browser preferences."
    },
    {
      title: "9. Third-Party Services",
      content: "We may use third-party services like Google Maps, payment gateways, and analytics tools. These services have their own privacy policies, and we encourage you to review them."
    },
    {
      title: "10. Children's Privacy",
      content: "Our services are not intended for children under 13. We do not knowingly collect personal information from children. If we become aware of such collection, we will delete the information immediately."
    },
    {
      title: "11. International Transfers",
      content: "Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during international transfers."
    },
    {
      title: "12. Changes to This Policy",
      content: "We may update this Privacy Policy periodically. We will notify you of significant changes via email or website notice. Your continued use of our services constitutes acceptance of the updated policy."
    }
  ];

  const dataTypes = [
    {
      icon: <UserCheck className="w-6 h-6" />,
      title: "Personal Information",
      description: "Name, phone number, email address",
      color: "bg-blue-500"
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "Trip Data",
      description: "Pickup/drop locations, trip history, preferences",
      color: "bg-green-500"
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Usage Information",
      description: "App usage patterns, device information",
      color: "bg-purple-500"
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Payment Data",
      description: "Payment method information (securely processed)",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 pt-16">
      <Helmet>
        <title>Privacy Policy - Vizag Taxi Hub | Data Protection & Privacy</title>
        <meta name="description" content="Learn how Vizag Taxi Hub protects your personal information and privacy. Comprehensive privacy policy covering data collection, usage, and your rights." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-white pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
              <Shield className="w-4 h-4 mr-2" />
              Data Protection
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Privacy <span className="text-green-600">Policy</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Your privacy is important to us. Learn how we collect, use, and protect your personal information.
            </p>
            <div className="text-sm text-gray-500">
              Last updated: January 2024
            </div>
          </motion.div>
        </div>
      </section>

      {/* Privacy Commitment */}
      <section className="py-8 bg-green-50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-green-200">
              <CardContent className="p-6">
                <div className="flex items-start">
                  <Shield className="w-6 h-6 text-green-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-green-900 mb-2">Our Privacy Commitment</h3>
                    <p className="text-green-800 leading-relaxed">
                      At Vizag Taxi Hub, we are committed to protecting your privacy and personal information. 
                      We only collect information necessary to provide excellent taxi services and never sell your data to third parties.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Data We Collect */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Information We Collect</h2>
            <p className="text-lg text-gray-600">Types of data we collect to provide our services</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {dataTypes.map((type, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6 text-center">
                    <div className={`w-12 h-12 ${type.color} rounded-xl flex items-center justify-center mb-4 mx-auto text-white`}>
                      {type.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{type.title}</h3>
                    <p className="text-gray-600 text-sm">{type.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-16 bg-gray-50">
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

      {/* Security Measures */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How We Protect Your Data</h2>
            <p className="text-lg text-gray-600">Security measures we implement</p>
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
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Data Encryption</h3>
                  <p className="text-gray-600">All sensitive data is encrypted in transit and at rest using industry-standard protocols.</p>
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
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Access Controls</h3>
                  <p className="text-gray-600">Strict access controls ensure only authorized personnel can access your information.</p>
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
                    <Database className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Secure Storage</h3>
                  <p className="text-gray-600">Data is stored in secure, monitored facilities with regular backups and disaster recovery.</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-8 bg-yellow-50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-yellow-900 mb-2">Your Rights</h3>
                    <p className="text-yellow-800 leading-relaxed">
                      You have the right to access, correct, or delete your personal information at any time. 
                      You can also object to processing or request data portability. Contact us at +91-9966363662 to exercise these rights.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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
            <h2 className="text-3xl font-bold mb-6">Questions About Your Privacy?</h2>
            <p className="text-xl text-gray-300 mb-8">
              If you have any questions about this Privacy Policy or how we handle your data, please contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <span className="text-gray-300">Privacy inquiries:</span>
              <span className="text-white font-bold text-lg">+91-9966363662</span>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
    </div>
  );
}