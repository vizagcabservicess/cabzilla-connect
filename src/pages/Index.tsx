
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h5 className="text-cabBlue-600 font-medium text-sm uppercase tracking-wider mb-2">
              Why Choose Us
            </h5>
            <h2 className="text-3xl font-bold text-cabGray-800">
              The Premier Cab Service Experience
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featureItems.map((item, index) => (
              <div 
                key={index}
                className="p-6 bg-white rounded-xl border border-cabGray-100 shadow-card hover:shadow-elevated transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-cabBlue-100 flex items-center justify-center text-cabBlue-600 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-cabGray-800 mb-2">{item.title}</h3>
                <p className="text-cabGray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <footer className="bg-cabGray-100 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cabBlue-500 text-white flex items-center justify-center font-bold text-xl">
                  CC
                </div>
                <span className="font-bold text-xl text-cabBlue-800">
                  CabZilla
                </span>
              </div>
              <p className="text-cabGray-600 max-w-md">
                Book reliable and comfortable cab services for all your travel needs.
                Available 24/7 with transparent pricing and professional drivers.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-semibold text-cabGray-800 mb-3">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">About Us</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Team</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Careers</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Blog</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-cabGray-800 mb-3">Support</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Safety</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">Privacy Policy</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-cabGray-800 mb-3">Contact</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">info@cabzilla.com</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">+1 800 123 4567</a></li>
                  <li><a href="#" className="text-cabGray-600 hover:text-cabBlue-600 transition-colors">123 Travel Street</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-cabGray-200 pt-8 mt-8 text-center text-cabGray-600 text-sm">
            &copy; {new Date().getFullYear()} CabZilla. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

// Feature items
const featureItems = [
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="m12 14 4-4"></path><path d="M3.34 19a10 10 0 1 1 17.32 0"></path></svg>,
    title: "Transparent Pricing",
    description: "No hidden charges or surprises. Our pricing is transparent with all charges clearly mentioned before booking."
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>,
    title: "Safety First",
    description: "All our cabs undergo regular safety checks and our drivers are trained professionals with verified backgrounds."
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    title: "24/7 Availability",
    description: "Our cabs are available round the clock. Book a ride anytime, anywhere with just a few clicks."
  }
];

export default Index;
