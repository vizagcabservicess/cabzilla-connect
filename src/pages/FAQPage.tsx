
import React, { useState } from 'react';
import { Navbar } from "@/components/Navbar";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/components/ui/use-toast";

const FAQPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    question: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqCategories = [
    {
      id: 'booking',
      name: 'Booking & Reservation',
      faqs: [
        {
          question: 'How do I book a taxi with Vizag Taxi Hub?',
          answer: 'You can book a taxi through our website by filling out the booking form, through our mobile app, or by calling our customer service at +91 9966363662. We recommend booking in advance to ensure availability, especially during peak hours and seasons.'
        },
        {
          question: 'How far in advance should I book my taxi?',
          answer: 'For local trips, we recommend booking at least 2-3 hours in advance. For airport transfers and outstation trips, it\'s best to book 24 hours ahead. During peak seasons and holidays, we suggest booking 2-3 days in advance to ensure availability.'
        },
        {
          question: 'Can I book a taxi for immediate pickup?',
          answer: 'Yes, we offer on-demand taxi services based on availability. However, during peak hours or in remote locations, there might be a waiting time. Using our app or calling our hotline will give you the quickest response for immediate bookings.'
        },
        {
          question: 'How do I cancel my booking?',
          answer: 'You can cancel your booking through our website, app, or by calling our customer service. Please refer to our cancellation policy for applicable charges. Cancellations made 24 hours before the scheduled pickup are eligible for a full refund.'
        }
      ]
    },
    {
      id: 'payments',
      name: 'Payments & Pricing',
      faqs: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept various payment methods including credit/debit cards, online banking, UPI, popular digital wallets, and cash. For advance bookings, we may require a partial payment or full payment depending on the service.'
        },
        {
          question: 'Are there any hidden charges?',
          answer: 'No, we are completely transparent about our pricing. The fare shown at the time of booking includes all base charges. Additional charges may apply for waiting time, night service, extra stops, or toll fees, which will be clearly communicated to you.'
        },
        {
          question: 'How is the fare calculated for outstation trips?',
          answer: 'Outstation trip fares are calculated based on the distance covered, vehicle type, and duration of the trip. These include a base fare, per-kilometer charge, and driver allowance for overnight stays. Toll charges and parking fees are additional and will be added to the final bill.'
        },
        {
          question: 'Do you offer any discounts or loyalty programs?',
          answer: 'Yes, we offer discounts for regular customers through our loyalty program. We also have special rates for corporate clients and occasional promotional offers. Sign up for our newsletter to stay updated on our latest deals and discounts.'
        }
      ]
    },
    {
      id: 'services',
      name: 'Services & Features',
      faqs: [
        {
          question: 'What types of vehicles do you offer?',
          answer: 'We offer a variety of vehicles including economy sedans, premium sedans, SUVs, MUVs like Toyota Innova, and tempo travelers for larger groups. All our vehicles are well-maintained and equipped with modern amenities for a comfortable journey.'
        },
        {
          question: 'Do you provide airport pickup and drop services?',
          answer: 'Yes, we specialize in airport transfers. Our service includes flight tracking, so we can adjust your pickup time in case of flight delays without additional charges. We offer both pickup and drop-off services to and from Visakhapatnam International Airport.'
        },
        {
          question: 'Can I book a taxi for a multi-day trip?',
          answer: 'Absolutely! We offer multi-day packages for outstation trips and tours. These packages include the vehicle, driver, and a specific number of kilometers per day. Additional charges apply for extra kilometers and driver accommodation for overnight stays.'
        },
        {
          question: 'Do you offer tour packages?',
          answer: 'Yes, we offer curated tour packages to popular destinations around Visakhapatnam. These include packages to Araku Valley, Simhachalam, Borra Caves, and other tourist attractions. Our packages can be customized to suit your preferences and schedule.'
        }
      ]
    },
    {
      id: 'drivers',
      name: 'Drivers & Safety',
      faqs: [
        {
          question: 'How do you ensure passenger safety?',
          answer: 'Safety is our top priority. All our drivers undergo thorough background checks, have valid licenses, and receive regular training. Our vehicles are equipped with GPS tracking and undergo regular maintenance checks. We also have a 24/7 customer support team to address any concerns during your journey.'
        },
        {
          question: 'Are your drivers familiar with the local areas?',
          answer: 'Yes, our drivers are local to Visakhapatnam and have extensive knowledge of the city and surrounding areas. They are familiar with the best routes, traffic patterns, and can recommend local attractions and places of interest if requested.'
        },
        {
          question: 'What languages do your drivers speak?',
          answer: 'Most of our drivers speak Telugu, Hindi, and basic English. For international tourists or specific language requirements, please mention this at the time of booking, and we will try to assign a driver who can communicate effectively in your preferred language.'
        },
        {
          question: 'Can I request a specific driver for my trip?',
          answer: 'Yes, if you\'ve had a positive experience with a particular driver, you can request for the same driver when making a new booking. While we cannot guarantee availability, we will make our best effort to accommodate your request.'
        }
      ]
    },
    {
      id: 'policies',
      name: 'Policies & Terms',
      faqs: [
        {
          question: 'What is your cancellation policy?',
          answer: 'Our cancellation policy varies based on the type of service and timing. Generally, cancellations made 24 hours before the scheduled pickup receive a full refund. Cancellations between 12-24 hours incur a 50% charge, and less than 12 hours or no-shows incur a 100% charge. Special circumstances may be considered on a case-by-case basis.'
        },
        {
          question: 'What happens if my flight is delayed?',
          answer: 'For airport pickups, we monitor flight statuses and adjust your pickup time accordingly without additional charge. Our drivers will wait for a reasonable time after the flight lands. For significant delays, we may need to reassign a different vehicle, but we ensure you\'ll be picked up regardless of the delay time.'
        },
        {
          question: 'Can I change my booking details after confirmation?',
          answer: 'Yes, you can modify your booking details such as pickup time, location, or vehicle type subject to availability. Changes should be made at least 4 hours before the scheduled pickup time. Additional charges may apply if you upgrade the vehicle type or extend the trip duration.'
        },
        {
          question: 'Are there any restrictions on luggage?',
          answer: 'The luggage capacity depends on the vehicle type. Sedans can typically accommodate 2 large suitcases and 2 small bags, while SUVs and MUVs can fit 3-4 large suitcases. For excessive or unusually large luggage, please inform us in advance so we can arrange an appropriate vehicle. Extra charges may apply for excessive luggage.'
        }
      ]
    }
  ];
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Question Submitted",
        description: "Thank you for your question. We'll get back to you shortly.",
      });
      setFormData({
        name: '',
        email: '',
        question: ''
      });
      setIsSubmitting(false);
    }, 1500);
  };
  
  const filteredFAQs = searchTerm 
    ? faqCategories.map(category => ({
        ...category,
        faqs: category.faqs.filter(faq => 
          faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
          faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.faqs.length > 0)
    : faqCategories;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="bg-blue-50">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center text-gray-800">Frequently Asked Questions</h1>
          <p className="text-xl text-center text-gray-600 max-w-2xl mx-auto mb-8">
            Find answers to common questions about our services, bookings, and policies
          </p>
          <div className="max-w-lg mx-auto relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search for questions..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            <div className="absolute right-4 top-3.5 text-gray-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        {/* FAQ Categories */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <button 
            className="text-center p-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            All Categories
          </button>
          {faqCategories.map(category => (
            <button 
              key={category.id}
              className="text-center p-2 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
            >
              {category.name}
            </button>
          ))}
        </div>
        
        {/* FAQs */}
        <div className="space-y-8">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-800 mb-2">No results found</h3>
              <p className="text-gray-600">
                We couldn't find any FAQs matching your search. Try a different keyword or ask us your question below.
              </p>
            </div>
          ) : (
            filteredFAQs.map(category => (
              <div key={category.id} className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800">{category.name}</h2>
                </div>
                <div className="p-4">
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${category.id}-${index}`} className="border border-gray-200 rounded-lg px-4">
                        <AccordionTrigger className="text-left font-medium py-4">{faq.question}</AccordionTrigger>
                        <AccordionContent className="pb-4 text-gray-600">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Ask a Question */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Didn't Find Your Answer?</h2>
            <p className="text-gray-600">
              Send us your question and we'll get back to you as soon as possible.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleFormChange}
                required
                placeholder="john@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
                Your Question
              </label>
              <Textarea
                id="question"
                name="question"
                rows={4}
                value={formData.question}
                onChange={handleFormChange}
                required
                placeholder="Type your question here..."
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
                  Submitting...
                </span>
              ) : (
                "Submit Question"
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center text-gray-600 text-sm">
            <p>You can also contact us directly:</p>
            <p className="font-medium mt-1">Email: info@vizagtaxihub.com | Phone: +91 9966363662</p>
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

export default FAQPage;
