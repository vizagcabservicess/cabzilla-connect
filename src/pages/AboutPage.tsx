
import React from 'react';
import { Navbar } from "@/components/Navbar";
import { Helmet } from 'react-helmet-async';

const AboutPage = () => {
  return (
    <>
      <Helmet>
        <title>About Us - Vizag Taxi Hub | Leading Taxi Service in Visakhapatnam Since 2012</title>
        <meta name="description" content="Discover Vizag Taxi Hub's journey from 5 cars in 2012 to 50+ vehicles today. Learn about our mission, core values, and commitment to providing safe, reliable transportation services in Visakhapatnam with 95% customer satisfaction." />
        <meta name="keywords" content="about vizag taxi hub, taxi service history vizag, reliable taxi visakhapatnam, trusted cab service" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/about" />
        <meta property="og:title" content="About Us - Vizag Taxi Hub | Leading Taxi Service in Visakhapatnam" />
        <meta property="og:description" content="Learn about Vizag Taxi Hub - a trusted taxi service in Visakhapatnam since 2012. Discover our mission, values, and commitment to providing safe, reliable transportation." />
        <meta property="og:image" content="/og-image.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/about" />
        <meta property="twitter:title" content="About Us - Vizag Taxi Hub | Leading Taxi Service in Visakhapatnam" />
        <meta property="twitter:description" content="Learn about Vizag Taxi Hub - a trusted taxi service in Visakhapatnam since 2012." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/about" />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="flex-1 pt-16">
        
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-800">About Vizag Taxi Hub</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Founded in 2012, Vizag Taxi Hub has been serving the people of Visakhapatnam and tourists with reliable and affordable taxi services. We've grown from a small fleet of just 5 cars to over 50+ vehicles of various types and categories.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                What sets us apart is our commitment to customer satisfaction, punctuality, and safety. We ensure that all our drivers are well-trained, courteous, and knowledgeable about the city and its surroundings.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                We provide services for local trips, outstation journeys, airport pickups and drops, corporate travel, and special tour packages to popular destinations around Vizag.
              </p>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img
                src="/lovable-uploads/f403bba2-a984-4a7c-8f77-04dc15363aa8.png" 
                alt="Vizag Taxi Hub Office" 
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Our Mission</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              To provide safe, reliable, and comfortable transportation solutions at competitive prices, ensuring complete customer satisfaction while maintaining the highest standards of professionalism and service quality.
            </p>
          </div>
          
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Our Values</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-blue-700">Safety First</h3>
                <p className="text-gray-600">We prioritize the safety of our customers above everything else.</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-green-700">Reliability</h3>
                <p className="text-gray-600">Count on us to be there on time, every time.</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-purple-700">Customer Focus</h3>
                <p className="text-gray-600">We go the extra mile to ensure customer satisfaction.</p>
              </div>
              <div className="bg-yellow-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-yellow-700">Transparency</h3>
                <p className="text-gray-600">Clear pricing with no hidden charges or surprises.</p>
              </div>
              <div className="bg-red-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-red-700">Excellence</h3>
                <p className="text-gray-600">Constantly improving our services to exceed expectations.</p>
              </div>
              <div className="bg-indigo-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-indigo-700">Community</h3>
                <p className="text-gray-600">Contributing positively to the local community.</p>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Our Team</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Our team consists of experienced professionals who are passionate about providing excellent service. From our customer support staff to our skilled drivers, everyone at Vizag Taxi Hub is committed to making your journey comfortable and memorable.
            </p>
          </div>
        </div>
        </main>
        
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

export default AboutPage;
