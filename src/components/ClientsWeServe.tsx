import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plane, Heart, GraduationCap, MapPin, Users, Star, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const clientCategories = [
  {
    id: 1,
    title: "Corporate Clients",
    icon: Building2,
    description: "Leading businesses trust us for their transportation needs",
    count: "500+",
    color: "from-blue-500 to-blue-600",
    clients: ["TCS", "Infosys", "Wipro", "HDFC Bank", "Reliance Industries"]
  },
  {
    id: 2,
    title: "Airport Transfers",
    icon: Plane,
    description: "Premium airport pickup and drop services",
    count: "10,000+",
    color: "from-green-500 to-green-600",
    clients: ["Individual Travelers", "Business Executives", "Tour Groups", "Airline Crew"]
  },
  {
    id: 3,
    title: "Wedding Services",
    icon: Heart,
    description: "Making your special day memorable with luxury transport",
    count: "2,000+",
    color: "from-pink-500 to-pink-600",
    clients: ["Wedding Planners", "Bridal Families", "Groom Parties", "Wedding Guests"]
  },
  {
    id: 4,
    title: "Educational Institutions",
    icon: GraduationCap,
    description: "Safe and reliable transport for students and staff",
    count: "150+",
    color: "from-purple-500 to-purple-600",
    clients: ["GITAM University", "AU College", "VITS", "Private Schools"]
  }
];

const testimonialLogos = [
  { name: "TCS", logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&h=60&fit=crop" },
  { name: "Infosys", logo: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=120&h=60&fit=crop" },
  { name: "GITAM", logo: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=120&h=60&fit=crop" },
  { name: "HDFC", logo: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=120&h=60&fit=crop" },
  { name: "Wipro", logo: "https://images.unsplash.com/photo-1560472355-536de3962603?w=120&h=60&fit=crop" },
  { name: "Reliance", logo: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=120&h=60&fit=crop" }
];

const stats = [
  { label: "Corporate Clients", value: "500+", icon: Building2 },
  { label: "Happy Customers", value: "50,000+", icon: Users },
  { label: "Cities Covered", value: "25+", icon: MapPin },
  { label: "Customer Rating", value: "4.9★", icon: Star }
];

export const ClientsWeServe = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-primary font-medium">Trusted by Industry Leaders</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Clients We Proudly Serve
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            From Fortune 500 companies to individual travelers, we provide exceptional transportation services across various sectors
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-border hover:shadow-xl transition-shadow">
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Client Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {clientCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-xl transition-all duration-300 group border-0 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-foreground">{category.title}</h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                      {category.count}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-4">{category.description}</p>
                  
                  <div className="space-y-2">
                    {category.clients.slice(0, 3).map((client, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <span className="text-muted-foreground">{client}</span>
                      </div>
                    ))}
                    {category.clients.length > 3 && (
                      <div className="text-xs text-primary font-medium">
                        +{category.clients.length - 3} more
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Client Logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl p-8 shadow-lg border border-border"
        >
          <h3 className="text-xl font-bold text-center text-foreground mb-6">
            Trusted by Leading Organizations
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center opacity-60">
            {testimonialLogos.map((logo, index) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300"
              >
                <img 
                  src={logo.logo} 
                  alt={logo.name}
                  className="h-12 w-auto object-contain filter brightness-0"
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Join Our Growing Family of Satisfied Clients</h3>
            <p className="mb-6 opacity-90">
              Experience the difference that professional, reliable transportation makes for your business or personal needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90">
                Get Corporate Quote
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
                View Case Studies
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};