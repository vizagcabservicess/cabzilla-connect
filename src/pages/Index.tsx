
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hide Tour Package Tab with maximum specificity */
        .trip-tab[data-value="tour"],
        .trip-tab[value="tour"],
        [role="tab"][value="tour"],
        div[data-state="tour"],
        .trip-tabs [value="tour"],
        [data-radix-collection-item][value="tour"],
        [data-orientation="horizontal"] [value="tour"],
        [data-state="inactive"][value="tour"],
        [data-orientation] [data-value="tour"],
        [data-radix-collection-item][data-value="tour"],
        [data-state] [value="tour"],
        button[value="tour"],
        *[data-value="tour"],
        .tour-packages,
        [data-tab="tour"],
        div[role="tabpanel"][data-value="tour"],
        div[aria-labelledby*="tour"],
        *[class*="tour-package"],
        *[id*="tour-package"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          width: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
          clip: rect(0 0 0 0) !important;
          margin: -1px !important;
          padding: 0 !important;
        }
      `}} />
      
      <footer className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Company Description */}
            <div className="md:col-span-4">
              <div className="mb-6">
                <img src="/lovable-uploads/f403bba2-a984-4a7c-8f77-04dc15363aa8.png" alt="Vizag Taxi Hub" className="h-12 mb-4" />
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Vizag Taxi Hub provides you with the most comfortable and affordable outstation, local & hourly taxi services in Visakhapatnam. We place a high priority on customer satisfaction, which makes us unique in our approach. We are committed to providing our customers with on-time pick-ups and drop-offs.
              </p>
              <p className="text-gray-600 text-sm">
                <span className="font-semibold">Monday - Sunday:</span> <span className="text-blue-600 font-semibold">24hrs</span>
              </p>
            </div>

            {/* Helpful Links */}
            <div className="md:col-span-2 md:ml-auto">
              <h3 className="text-gray-800 font-semibold mb-4">Helpful links</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Terms & Conditions</a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Refunds Policy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Privacy Policy</a></li>
              </ul>
            </div>

            {/* Contact Info */}
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

            {/* Google Map */}
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
              <a href="#" className="text-gray-600 hover:text-blue-600">Terms & Conditions</a>
              <a href="#" className="text-gray-600 hover:text-blue-600">Refunds Policy</a>
              <a href="#" className="text-gray-600 hover:text-blue-600">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
