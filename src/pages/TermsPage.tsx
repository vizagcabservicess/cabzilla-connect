import React from 'react';
import { Navbar } from "@/components/Navbar";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 pt-16">
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-medium mb-8 text-gray-800">Terms & Conditions</h1>
        
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-6">
            Welcome to Vizag Taxi Hub. Please read these terms and conditions carefully before using our service.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">1. Acceptance of Terms</h2>
          <p className="text-gray-600 mb-4">
            By accessing and using our services, whether through our website, mobile application, or by making a booking via phone, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our services.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">2. Service Description</h2>
          <p className="text-gray-600 mb-4">
            Vizag Taxi Hub provides taxi and car rental services in and around Visakhapatnam. Our services include but are not limited to airport transfers, local taxi services, outstation trips, and tour packages.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">3. Booking and Cancellation</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">3.1 Booking</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>Bookings can be made through our website, mobile application, or by calling our customer service.</li>
            <li>All bookings are subject to availability of vehicles.</li>
            <li>We recommend making advance bookings, especially during peak seasons and for airport transfers.</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">3.2 Cancellation Policy</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>Free cancellation up to 24 hours before the scheduled pickup time.</li>
            <li>50% cancellation fee if canceled between 12-24 hours before pickup.</li>
            <li>75% cancellation fee if canceled between 4-12 hours before pickup.</li>
            <li>100% cancellation fee if canceled less than 4 hours before pickup or in case of no-show.</li>
          </ul>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">4. Pricing and Payment</h2>
          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">4.1 Pricing</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>All prices are indicated in Indian Rupees (INR) and include all applicable taxes unless otherwise stated.</li>
            <li>Additional charges may apply for night service, waiting time, or additional stops.</li>
            <li>For outstation trips, toll charges, parking fees, and driver allowance may apply separately.</li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800">4.2 Payment</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>We accept payments through credit/debit cards, online banking, and various digital payment methods.</li>
            <li>For some services, full or partial advance payment may be required at the time of booking.</li>
            <li>For post-paid services, payment is due at the end of the trip.</li>
          </ul>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">5. User Responsibilities</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 mb-4">
            <li>Provide accurate information during booking.</li>
            <li>Be ready at the designated pickup location at the scheduled time.</li>
            <li>Treat drivers and vehicles with respect.</li>
            <li>Refrain from consuming alcohol, smoking, or engaging in any illegal activities inside the vehicle.</li>
            <li>Pay for any damage caused to the vehicle due to your negligence or misconduct.</li>
          </ul>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">6. Limitation of Liability</h2>
          <p className="text-gray-600 mb-4">
            Vizag Taxi Hub shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from the use of our services. Our liability is limited to the amount paid for the specific service in question.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">7. Force Majeure</h2>
          <p className="text-gray-600 mb-4">
            We shall not be liable for any failure or delay in performing our obligations where such failure or delay results from events beyond our reasonable control, including but not limited to natural disasters, governmental actions, strikes, riots, or civil unrest.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">8. Privacy Policy</h2>
          <p className="text-gray-600 mb-4">
            We collect and use personal information in accordance with our Privacy Policy. By using our services, you consent to our collection and use of personal information as described in our Privacy Policy.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">9. Changes to Terms</h2>
          <p className="text-gray-600 mb-4">
            We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting on our website. It is your responsibility to review these Terms periodically.
          </p>
          
          <h2 className="text-2xl font-medium mt-8 mb-4 text-gray-800">10. Contact Information</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions or concerns about these Terms and Conditions, please contact us at:
          </p>
          <address className="text-gray-600 mb-8 not-italic">
            Vizag Taxi Hub<br />
            44-66-22/4, Singalammapuram, Kailasapuram<br />
            Visakhapatnam - 530024<br />
            Andhra Pradesh, India<br /><br />
            Email: info@vizagtaxihub.com<br />
            Phone: +91 9966363662
          </address>
          
          <p className="text-gray-600 italic">
            Last updated: May 20, 2025
          </p>
        </div>
      </div>
      </main>
      
      <footer className="bg-gray-50 py-12 ">
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

export default TermsPage;
