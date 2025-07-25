import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Users, Sparkles, Gift } from "lucide-react";
import { motion } from "framer-motion";

const events = [
  {
    id: 1,
    title: "Wedding Season Special",
    description: "Luxury transportation for your special day with decorated vehicles and professional chauffeurs",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=250&fit=crop",
    discount: "25% OFF",
    validUntil: "March 31, 2024",
    features: ["Decorated Vehicles", "Professional Chauffeur", "Red Carpet Service", "Complimentary Refreshments"],
    category: "Wedding",
    gradient: "from-pink-500 to-rose-600"
  },
  {
    id: 2,
    title: "Corporate Events Package",
    description: "Premium fleet solutions for corporate events, conferences, and business meetings",
    image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=250&fit=crop",
    discount: "20% OFF",
    validUntil: "April 15, 2024",
    features: ["Executive Vehicles", "Airport Pickup", "Flexible Timing", "Corporate Billing"],
    category: "Corporate",
    gradient: "from-blue-500 to-indigo-600"
  },
  {
    id: 3,
    title: "Festival Tourism Special",
    description: "Explore Vizag's festivals and cultural events with our special tourism packages",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=250&fit=crop",
    discount: "30% OFF",
    validUntil: "December 31, 2024",
    features: ["Cultural Tours", "Festival Bookings", "Local Guide", "Photography Stops"],
    category: "Tourism",
    gradient: "from-orange-500 to-red-600"
  }
];

export const EventsPromotion = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-background via-background/50 to-primary/5">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Special Events & Promotions</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Exclusive Offers for Every Occasion
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Make your special moments unforgettable with our premium transportation services and exclusive event packages
          </p>
        </motion.div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-0 bg-white/80 backdrop-blur-sm">
                <div className="relative">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className={`absolute top-4 left-4 bg-gradient-to-r ${event.gradient} text-white px-3 py-1 rounded-full font-semibold text-sm`}>
                    {event.discount}
                  </div>
                  <Badge variant="secondary" className="absolute top-4 right-4 bg-white/90 text-foreground">
                    {event.category}
                  </Badge>
                </div>
                
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">{event.title}</h3>
                  <p className="text-muted-foreground mb-4">{event.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    {event.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Valid until {event.validUntil}</span>
                    </div>
                    <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                      Book Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-center text-white"
        >
          <Gift className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h3 className="text-2xl font-bold mb-2">Custom Event Packages Available</h3>
          <p className="mb-6 opacity-90">
            Planning a special event? Contact us for customized transportation solutions and exclusive pricing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
              Request Custom Quote
            </Button>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <Calendar className="w-4 h-4" />
              <span>Available 24/7 for event bookings</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};