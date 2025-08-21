import React from 'react';
import { Navbar } from "@/components/Navbar";
import { Helmet } from 'react-helmet-async';

const PrivacyPage = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Vizag Taxi Hub | Data Protection & Privacy</title>
        <meta name="description" content="Learn how Vizag Taxi Hub protects your personal information and privacy. Comprehensive privacy policy covering data collection, usage, and your rights." />
        <meta name="keywords" content="privacy policy vizag taxi hub, data protection, personal information, privacy rights" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/privacy" />
        <meta property="og:title" content="Privacy Policy - Vizag Taxi Hub | Data Protection & Privacy" />
        <meta property="og:description" content="Learn how Vizag Taxi Hub protects your personal information and privacy." />
        <meta property="og:image" content="/og-image.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/privacy" />
        <meta property="twitter:title" content="Privacy Policy - Vizag Taxi Hub | Data Protection & Privacy" />
        <meta property="twitter:description" content="Learn how Vizag Taxi Hub protects your personal information and privacy." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/privacy" />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        <Navbar />
        
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-medium mb-8 text-gray-800">Privacy Policy</h1>
          
          <div className="prose max-w-none">
            <p className="text-gray-600 mb-6">
              At Vizag Taxi Hub, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.
            </p>
            
            <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">1. Information We Collect</h2>
            <p className="text-gray-600 mb-4">
              We collect information that you provide directly to us when using our services:
            </p>
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">1.1 Personal Information</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
              <li>Contact information (name, email address, phone number)</li>
              <li>Profile information (username and password)</li>
              <li>Billing information (credit card details, billing address)</li>
              <li>Location data (pickup and drop locations)</li>
              <li>Travel preferences and details of your bookings</li>
            </ul>
            
            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">1.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
              <li>Device information (device type, operating system)</li>
              <li>Log data (IP address, browser type, pages visited)</li>
              <li>Location data (with your permission)</li>
              <li>Cookie and similar technologies data</li>
            </ul>
            
            <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">2. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">
              We use the information we collect for various purposes, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
              <li>Providing and maintaining our services</li>
              <li>Processing and completing your bookings</li>
              <li>Communicating with you about your bookings and our services</li>
              <li>Improving and personalizing our services</li>
              <li>Sending you marketing and promotional communications (with your consent)</li>
              <li>Monitoring and analyzing usage and trends</li>
              <li>Detecting, preventing, and addressing technical issues and fraudulent activities</li>
            </ul>
            
            <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">3. Disclosure of Your Information</h2>
            <p className="text-gray-600 mb-4">
              We may share your information with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
              <li>Our drivers and service providers to fulfill your booking</li>
              <li>Payment processors to complete your transactions</li>
              <li>Service providers who assist us in operating our website and conducting our business</li>
              <li>Law enforcement agencies or government bodies when required by law</li>
              <li>Business partners with your consent</li>
            </ul>
            <p className="text-gray-600 mb-4">
              We do not sell your personal information to third parties.
            </p>
            
            <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">4. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, please be aware that no method of transmission over the internet or electronic storage is 100% secure.
            </p>
            
            <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">5. Your Data Protection Rights</h2>
            <p className="text-gray-600 mb-4">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
              <li>Right to access your personal information</li>
              <li>Right to correct inaccurate information</li>
              <li>Right to delete your information (subject to certain exceptions)</li>
              <li>Right to restrict processing of your information</li>
              <li>Right to object to processing of your information</li>
              <li>Right to data portability</li>
              <li>Right to withdraw consent at any time</li>
            </ul>
            
            <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">6. Children's Privacy</h2>
            <p className="text-gray-600 mb-4">
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If we learn that we have collected personal information from a child under 18, we will take steps to delete that information as soon as possible.
            </p>
            
            <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">7. Changes to This Privacy Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
            
            <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">8. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <address className="text-gray-600 mb-8 not-italic">
              Vizag Taxi Hub<br />
              44-66-22/4, Singalammapuram, Kailasapuram<br />
              Visakhapatnam - 530024<br />
              Andhra Pradesh, India<br /><br />
              Email: privacy@vizagtaxihub.com<br />
              Phone: +91 9966363662
            </address>
            
            <p className="text-gray-600 italic">
              Last updated: May 20, 2025
            </p>
          </div>
        </div>
        
        <footer className="bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Footer content similar to Index.tsx */}
              <div className="md:col-span-4">
                <div className="mb-6">
                  <img src="/lovable-uploads/f403bba2-a984-4a7c-8f77-04dc15363aa8.png" alt="Vizag Taxi Hub" className="h-12 mb-4" />
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  Vizag Taxi Hub provides you with the most comfortable and affordable outstation, local & hourly taxi services in Visakhapatnam.
                </p>
                <p className="text-gray-600 text-sm">
                  <span className="font-semibold">Monday - Sunday:</span> <span className="text-blue-600 font-semibold">24hrs</span>
                </p>
              </div>

              <div className="md:col-span-2 md:ml-auto">
                <h3 className="text-gray-800 font-semibold mb-4">Helpful links</h3>
                <ul className="space-y-2">
                  <li><a href="/terms" className="text-gray-600 hover:text-blue-600 text-sm">Terms & Conditions</a></li>
                  <li><a href="/refunds" className="text-gray-600 hover:text-blue-600 text-sm">Refunds Policy</a></li>
                  <li><a href="/privacy" className="text-gray-600 hover:text-blue-600 text-sm">Privacy Policy</a></li>
                </ul>
              </div>

              <div className="md:col-span-3">
                <h3 className="text-gray-800 font-semibold mb-4">Contacts Info</h3>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <span className="text-gray-600 text-sm">Mail:</span>
                    <a href="mailto:info@vizagtaxihub.com" className="text-gray-600 hover:text-blue-600 text-sm">info@vizagtaxihub.com</a>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-gray-600 text-sm">Address:</span>
                    <span className="text-gray-600 text-sm">44-66-22/4, Singalammapuram, Kailasapuram, Visakhapatnam - 530024</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-gray-600 text-sm">Phone:</span>
                    <a href="tel:+919966363662" className="text-gray-600 hover:text-blue-600 text-sm">+91 9966363662</a>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-3">
                <h3 className="text-gray-800 font-semibold mb-4">Our Location</h3>
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3800.3270296460007!2d83.2983!3d17.7384!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a39431389e6973f%3A0x92d9c20395498b86!2sVizag%20Taxi%20Hub!5e0!3m2!1sen!2sin!4v1650123456789!5m2!1sen!2sin"
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="rounded-lg"
                ></iframe>
              </div>
            </div>
            
            <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-600 text-sm">
                © Vizag Taxi Hub {new Date().getFullYear()} - {new Date().getFullYear() + 1}. All rights reserved.
              </p>
              <div className="flex space-x-4 mt-4 md:mt-0">
                <a href="/terms" className="text-gray-600 hover:text-blue-600">Terms & Conditions</a>
                <a href="/refunds" className="text-gray-600 hover:text-blue-600">Refunds Policy</a>
                <a href="/privacy" className="text-gray-600 hover:text-blue-600">Privacy Policy</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PrivacyPage;
