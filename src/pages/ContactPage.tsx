import React, { useState } from 'react';
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Send } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message Sent",
        description: "We've received your message and will get back to you shortly.",
      });
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="flex-1 pt-16">
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-medium mb-2 text-gray-800">Contact Us</h1>
        <p className="text-gray-600 mb-8">We'd love to hear from you. Please fill out the form below or reach out directly.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Contact Information */}
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-medium mb-4 text-gray-800">Get in Touch</h2>
              <p className="text-gray-600 mb-6">
                Have questions about our services? Need a custom quote? Our team is ready to assist you 24/7.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Phone</h3>
                  <p className="text-gray-600">+91 9966363662</p>
                  <p className="text-gray-600">+91 9866363662</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Email</h3>
                  <p className="text-gray-600">info@vizagtaxihub.com</p>
                  <p className="text-gray-600">bookings@vizagtaxihub.com</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <MapPin className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Address</h3>
                  <p className="text-gray-600">
                    44-66-22/4, Singalammapuram, 
                    <br />Kailasapuram, Visakhapatnam - 530024
                    <br />Andhra Pradesh, India
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="font-semibold text-gray-800 mb-4">Our Location</h3>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3800.3270296460007!2d83.2983!3d17.7384!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a39431389e6973f%3A0x92d9c20395498b86!2sVizag%20Taxi%20Hub!5e0!3m2!1sen!2sin!4v1650123456789!5m2!1sen!2sin"
                width="100%"
                height="250"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="rounded-lg"
              ></iframe>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
            <h2 className="text-2xl font-medium mb-6 text-gray-800">Send a Message</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="Booking Inquiry"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    placeholder="Please provide details about your inquiry..."
                    className="resize-none"
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
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
  );
};

export default ContactPage;
