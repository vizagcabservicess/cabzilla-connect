
import React from 'react';
import { Navbar } from "@/components/Navbar";
import { Car, Clock, MapPin, Plane, Calendar, Shield, Award, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const ServicesPage = () => {
  const services = [
    {
      id: 'airport',
      title: 'Airport Transfer',
      description: 'Reliable airport pickup and drop services with flight tracking and waiting time. No charges for flight delays.',
      icon: <Plane className="h-10 w-10 text-blue-600" />,
      color: 'bg-blue-50',
      features: [
        'Flight tracking',
        'Meet & greet service',
        'Waiting time included',
        '24/7 availability',
        'Fixed rates'
      ],
      link: '/cabs/airport'
    },
    {
      id: 'local',
      title: 'Local Packages',
      description: 'Hourly taxi packages for local travel within Visakhapatnam. Choose from 4hrs, 8hrs, or 12hrs packages.',
      icon: <Clock className="h-10 w-10 text-green-600" />,
      color: 'bg-green-50',
      features: [
        'Multiple duration options',
        'Fixed kilometer limits',
        'Professional drivers',
        'Clean and sanitized vehicles',
        'Multiple stops allowed'
      ],
      link: '/cabs/local'
    },
    {
      id: 'outstation',
      title: 'Outstation Trips',
      description: 'Intercity travel services for trips from Visakhapatnam to nearby cities and tourist destinations.',
      icon: <MapPin className="h-10 w-10 text-red-600" />,
      color: 'bg-red-50',
      features: [
        'One-way & round trip options',
        'Experienced highway drivers',
        'Multi-day bookings',
        'Free stops en route',
        'All-inclusive pricing'
      ],
      link: '/cabs/outstation'
    },
    {
      id: 'rentals',
      title: 'Car Rentals',
      description: 'Flexible car rental options with or without drivers. Daily, weekly, and monthly rental plans available.',
      icon: <Car className="h-10 w-10 text-purple-600" />,
      color: 'bg-purple-50',
      features: [
        'Various vehicle options',
        'Flexible rental periods',
        'Well-maintained fleet',
        'Transparent pricing',
        'Corporate accounts'
      ],
      link: '/cabs/local'
    },
    {
      id: 'tours',
      title: 'Tour Packages',
      description: 'Curated tour packages to explore Visakhapatnam and surrounding tourist attractions with experienced guides.',
      icon: <Calendar className="h-10 w-10 text-yellow-600" />,
      color: 'bg-yellow-50',
      features: [
        'Customizable itineraries',
        'Tourist guide (optional)',
        'Group discounts',
        'Hotel recommendations',
        'All major attractions covered'
      ],
      link: '/tours'
    },
    {
      id: 'corporate',
      title: 'Corporate Services',
      description: 'Dedicated transportation solutions for businesses with transparent billing and prioritized service.',
      icon: <Users className="h-10 w-10 text-indigo-600" />,
      color: 'bg-indigo-50',
      features: [
        'Corporate accounts',
        'Centralized billing',
        'Employee pickup & drop',
        'Event transportation',
        'Bulk booking discounts'
      ],
      link: '/contact'
    }
  ];
  
  const benefits = [
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: 'Safe & Secure',
      description: 'All our drivers are verified and vehicles regularly serviced for safety'
    },
    {
      icon: <Clock className="h-8 w-8 text-green-600" />,
      title: 'Punctual Service',
      description: 'We pride ourselves on being on time, every time'
    },
    {
      icon: <Award className="h-8 w-8 text-yellow-600" />,
      title: 'Experienced Drivers',
      description: 'Our drivers are experts with extensive knowledge of all routes'
    },
    {
      icon: <Users className="h-8 w-8 text-red-600" />,
      title: 'Customer Support',
      description: '24/7 customer service to assist you anytime you need'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h1>
          <p className="text-xl opacity-90 max-w-2xl">
            Comprehensive transportation solutions for every need - from airport transfers to multi-day tours
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white shadow-md rounded-lg p-6 flex items-start space-x-4">
              <div className="bg-gray-100 rounded-full p-3">{benefit.icon}</div>
              <div>
                <h3 className="font-bold text-lg mb-1">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Transportation Services We Offer</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Whether you're traveling for business or leisure, our comprehensive range of transportation services ensures a comfortable and convenient journey.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div key={service.id} className={`rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-all hover:shadow-md ${service.color}`}>
              <div className="p-6">
                <div className="bg-white p-3 rounded-full inline-block mb-4">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <svg className="h-4 w-4 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to={service.link}>
                  <Button className="w-full">Book Now</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Need a Custom Solution?</h2>
            <p className="text-gray-600">Contact us for tailored transportation services designed for your specific requirements.</p>
          </div>
          
          <div className="flex justify-center">
            <Link to="/contact">
              <Button variant="outline" size="lg">Get in Touch</Button>
            </Link>
          </div>
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

export default ServicesPage;
