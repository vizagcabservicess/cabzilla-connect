import React from 'react';
import { Navbar } from "@/components/Navbar";

const RefundsPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-medium mb-8 text-gray-800">Refund Policy</h1>
        
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-6">
            This Refund Policy outlines the guidelines and procedures for refunds of payments made to Vizag Taxi Hub for our taxi services. We strive to provide excellent service, but we understand that sometimes refunds may be necessary.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">1. Booking Cancellations</h2>
          <p className="text-gray-600 mb-4">
            If you need to cancel your booking, the following refund policy applies:
          </p>
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-semibold mb-3 text-gray-800">1.1 Cancellation Time Frame</h3>
            <ul className="list-disc list-inside space-y-3 text-gray-600">
              <li><span className="font-medium">More than 24 hours before pickup:</span> Full refund (100% of the amount paid)</li>
              <li><span className="font-medium">Between 12-24 hours before pickup:</span> 50% refund</li>
              <li><span className="font-medium">Between 4-12 hours before pickup:</span> 25% refund</li>
              <li><span className="font-medium">Less than 4 hours before pickup:</span> No refund</li>
              <li><span className="font-medium">No-show:</span> No refund</li>
            </ul>
          </div>
          
          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">1.2 Special Circumstances</h3>
          <p className="text-gray-600 mb-4">
            We understand that emergencies happen. In the following cases, we may consider full or partial refunds regardless of the cancellation timeframe:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
            <li>Medical emergencies (with supporting documentation)</li>
            <li>Flight cancellations or significant delays (with supporting documentation)</li>
            <li>Natural disasters or severe weather conditions</li>
            <li>Death in the family (with supporting documentation)</li>
          </ul>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">2. Service Issues</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">2.1 Late Arrival</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>If our driver is late by 15-30 minutes: 10% discount on your next booking</li>
            <li>If our driver is late by 30-60 minutes: 20% refund of the booking amount</li>
            <li>If our driver is late by more than 60 minutes: Full refund or free rebooking</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">2.2 Service Quality Issues</h3>
          <p className="text-gray-600 mb-4">
            If you experience any of the following issues with our service, please report them within 24 hours of your trip completion:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>Vehicle cleanliness or maintenance issues</li>
            <li>Driver behavior or professionalism concerns</li>
            <li>Route or navigation problems</li>
            <li>Any other service quality concerns</li>
          </ul>
          <p className="text-gray-600 mb-4">
            We will investigate each reported issue and may offer a partial or full refund based on the severity of the issue and its impact on your experience.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">3. Refund Process</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">3.1 How to Request a Refund</h3>
          <p className="text-gray-600 mb-4">
            To request a refund, please follow these steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-4">
            <li>Contact our customer service team at refunds@vizagtaxihub.com or call +91 9966363662</li>
            <li>Provide your booking reference number</li>
            <li>Explain the reason for your refund request</li>
            <li>Attach any supporting documentation if applicable</li>
          </ol>
          
          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">3.2 Refund Processing Time</h3>
          <p className="text-gray-600 mb-4">
            We aim to process all refund requests within 7 business days. Once approved:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>Credit/Debit Card refunds: 5-10 business days to reflect in your account (depending on your bank)</li>
            <li>Online payment refunds (UPI, wallets): 3-5 business days</li>
            <li>Cash refunds: Can be collected from our office or arranged via bank transfer</li>
          </ul>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">4. Non-Refundable Items</h2>
          <p className="text-gray-600 mb-4">
            The following charges are non-refundable under any circumstances:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>Convenience fees or booking charges</li>
            <li>Additional services that have already been provided</li>
            <li>Toll fees or parking charges already incurred</li>
          </ul>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">5. Special Packages and Promotions</h2>
          <p className="text-gray-600 mb-4">
            Special packages, promotional offers, or discounted rates may have different refund policies. These will be clearly communicated at the time of booking.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">6. Contact Information</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about this Refund Policy, please contact us:
          </p>
          <address className="text-gray-600 mb-8 not-italic">
            Refunds Department<br />
            Vizag Taxi Hub<br />
            44-66-22/4, Singalammapuram, Kailasapuram<br />
            Visakhapatnam - 530024<br />
            Andhra Pradesh, India<br /><br />
            Email: refunds@vizagtaxihub.com<br />
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
  );
};

export default RefundsPage;
