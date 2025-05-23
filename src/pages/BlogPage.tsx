
import React from 'react';
import { Navbar } from "@/components/Navbar";
import { Button } from '@/components/ui/button';

const BlogPage = () => {
  const blogPosts = [
    {
      id: 1,
      title: "Top 10 Tourist Places to Visit in Visakhapatnam",
      excerpt: "Discover the most beautiful and must-visit tourist attractions in Vizag, from beaches to hilltop views.",
      image: "/lovable-uploads/a7c4aa76-7528-425a-8dcc-2168607d3fe2.png",
      author: "Raj Kumar",
      date: "May 15, 2025",
      category: "Travel",
      readTime: "6 min read"
    },
    {
      id: 2,
      title: "How to Choose the Right Cab for Your Group Size",
      excerpt: "From sedans to tempo travelers, find out which vehicle is best suited for your group size and travel needs.",
      image: "/lovable-uploads/63c26b4c-04c7-432a-ba0a-2195cb7068e5.png",
      author: "Priya Singh",
      date: "May 10, 2025",
      category: "Tips",
      readTime: "4 min read"
    },
    {
      id: 3,
      title: "Budget-Friendly Weekend Getaways from Visakhapatnam",
      excerpt: "Explore these nearby destinations that are perfect for a quick weekend escape without breaking the bank.",
      image: "/lovable-uploads/a7c4aa76-7528-425a-8dcc-2168607d3fe2.png",
      author: "Arun Patel",
      date: "May 5, 2025",
      category: "Travel",
      readTime: "5 min read"
    },
    {
      id: 4,
      title: "Safety Tips for Traveling in Taxis During Monsoon Season",
      excerpt: "Stay safe while traveling during the rainy season with these essential tips and precautions.",
      image: "/lovable-uploads/63c26b4c-04c7-432a-ba0a-2195cb7068e5.png",
      author: "Meera Nair",
      date: "April 28, 2025",
      category: "Safety",
      readTime: "3 min read"
    },
    {
      id: 5,
      title: "The Ultimate Guide to Araku Valley: What to See and Do",
      excerpt: "Plan your perfect trip to the beautiful Araku Valley with this comprehensive guide to attractions, activities, and accommodations.",
      image: "/lovable-uploads/a7c4aa76-7528-425a-8dcc-2168607d3fe2.png",
      author: "Vishal Reddy",
      date: "April 20, 2025",
      category: "Destinations",
      readTime: "8 min read"
    },
    {
      id: 6,
      title: "Corporate Travel: How to Manage Transportation for Business Events",
      excerpt: "Tips for event planners and HR professionals on efficiently managing transportation for corporate events and team outings.",
      image: "/lovable-uploads/63c26b4c-04c7-432a-ba0a-2195cb7068e5.png",
      author: "Sanjay Mehta",
      date: "April 15, 2025",
      category: "Business",
      readTime: "5 min read"
    }
  ];
  
  const categories = [
    { name: "All", count: 24 },
    { name: "Travel", count: 10 },
    { name: "Tips", count: 6 },
    { name: "Destinations", count: 5 },
    { name: "Safety", count: 4 },
    { name: "Business", count: 3 }
  ];
  
  const recentPosts = [
    { title: "Best Time to Visit Vizag: Season Guide", date: "May 18, 2025" },
    { title: "5 Hidden Beaches Near Visakhapatnam", date: "May 12, 2025" },
    { title: "How to Plan a Corporate Retreat in Vizag", date: "May 8, 2025" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-800">Vizag Taxi Hub Blog</h1>
          <p className="text-gray-600 max-w-2xl">
            Travel tips, local insights, and helpful advice for navigating Visakhapatnam and nearby destinations.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {blogPosts.map((post) => (
                <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <img 
                    src={post.image} 
                    alt={post.title} 
                    className="w-full h-56 object-cover"
                  />
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {post.category}
                      </span>
                      <span className="text-gray-500 text-xs">{post.readTime}</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">{post.title}</h2>
                    <p className="text-gray-600 mb-4">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 mr-2"></div>
                        <span className="text-sm text-gray-700">{post.author}</span>
                      </div>
                      <span className="text-sm text-gray-500">{post.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="flex justify-center mt-12">
              <nav className="flex items-center space-x-2">
                <Button variant="outline" size="icon">
                  <span className="sr-only">Previous page</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <Button variant="outline" size="default" className="w-10">1</Button>
                <Button variant="outline" size="default" className="w-10 bg-blue-50 text-blue-600 border-blue-200">2</Button>
                <Button variant="outline" size="default" className="w-10">3</Button>
                <span className="px-2">...</span>
                <Button variant="outline" size="default" className="w-10">8</Button>
                <Button variant="outline" size="icon">
                  <span className="sr-only">Next page</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </nav>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="md:w-80">
            {/* Search */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
              <h3 className="text-lg font-semibold mb-4">Search</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search articles..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="absolute right-3 top-2.5">
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Categories */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
              <h3 className="text-lg font-semibold mb-4">Categories</h3>
              <ul className="space-y-2">
                {categories.map((category, index) => (
                  <li key={index}>
                    <a href="#" className="flex justify-between text-gray-700 hover:text-blue-600">
                      <span>{category.name}</span>
                      <span className="bg-gray-100 text-gray-600 rounded-full px-2 text-xs flex items-center justify-center">
                        {category.count}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Recent Posts */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
              <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>
              <ul className="space-y-4">
                {recentPosts.map((post, index) => (
                  <li key={index} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <a href="#" className="block hover:text-blue-600">
                      <h4 className="font-medium text-gray-800">{post.title}</h4>
                      <span className="text-sm text-gray-500">{post.date}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Subscribe */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Subscribe to Our Newsletter</h3>
              <p className="text-gray-700 text-sm mb-4">Get the latest travel tips and news directly in your inbox.</p>
              <input
                type="email"
                placeholder="Your email address"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button className="w-full">Subscribe</Button>
            </div>
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

export default BlogPage;
