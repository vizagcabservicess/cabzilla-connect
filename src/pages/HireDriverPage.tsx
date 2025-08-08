import { useState } from 'react';
import { Clock, MapPin, Star, Phone, CheckCircle, Users, Calendar, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';

const services = [
  {
    id: 1,
    title: 'Personal Driver - Local',
    duration: '8 hours',
    price: '₹1,000/day',
    features: ['Professional driver', 'Your own vehicle', 'Flexible timing', 'Local area coverage', 'Transport Excluded'],
    popular: true
  },
  {
    id: 2,
    title: 'Outstation Driver',
    duration: '12 hours',
    price: '₹1,500/day',
    features: ['Experienced in long drives', 'Route planning', 'Overnight stays not covered', 'Interstate expertise', 'Transport Excluded','Upto 200 kms limit'],
    popular: false
  },

  {
    id: 4,
    title: 'Event Driver',
    duration: 'Special occasions',
    price: '₹1,500/event',
    features: ['Wedding ceremonies', 'Special events', 'Formal attire', 'Punctual service', 'Transport Excluded'],
    popular: false
  }
];

const benefits = [
  {
    icon: Shield,
    title: 'Verified Drivers',
    description: 'All drivers are background verified and licensed'
  },
  {
    icon: Star,
    title: 'Experienced Professionals',
    description: '5+ years average driving experience'
  },
  {
    icon: Clock,
    title: 'Flexible Timing',
    description: 'Available 24/7 for your convenience'
  },
  {
    icon: Users,
    title: 'Customer Support',
    description: 'Dedicated support team for any assistance'
  }
];

export default function HireDriverPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    serviceType: '',
    duration: '',
    requirements: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Handle form submission
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-16">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Hire a Professional Driver
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            Need a reliable driver for your personal vehicle? Our experienced, verified drivers 
            are ready to serve you with professionalism and safety.
          </p>
          <Button size="lg" className="rounded-full">
            <Phone className="h-4 w-4 mr-2" />
            Call Now: +91 9966363662
          </Button>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Drivers?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <benefit.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl font-bold text-center mb-12">Our Driver Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="relative hover:shadow-lg transition-shadow">
                {service.popular && (
                  <Badge className="absolute -top-2 right-4 bg-primary">Most Popular</Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{service.price}</span>
                    <span className="text-sm text-muted-foreground">{service.duration}</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                 
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Book Your Driver</CardTitle>
              <p className="text-muted-foreground text-center">
                Fill out the form below and we'll get back to you within 30 minutes
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Service Type *</Label>
                    <Select onValueChange={(value) => setFormData({...formData, serviceType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Personal Driver - Daily</SelectItem>
                        <SelectItem value="outstation">Outstation Driver</SelectItem>
                        <SelectItem value="corporate">Corporate Driver</SelectItem>
                        <SelectItem value="event">Event Driver</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Duration *</Label>
                    <Select onValueChange={(value) => setFormData({...formData, duration: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="half-day">Half Day (4 hours)</SelectItem>
                        <SelectItem value="full-day">Full Day (8-12 hours)</SelectItem>
                        <SelectItem value="multi-day">Multi Day</SelectItem>
                        <SelectItem value="monthly">Monthly Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="requirements">Special Requirements</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Any specific requirements or additional information..."
                    value={formData.requirements}
                    onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                    rows={4}
                  />
                </div>
                
                <Button type="submit" size="lg" className="w-full rounded-full">
                  Request Driver
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Process Section */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Submit Request</h3>
              <p className="text-muted-foreground">Fill out the booking form with your requirements</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Driver Assignment</h3>
              <p className="text-muted-foreground">We assign a verified driver based on your needs</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Confirmation</h3>
              <p className="text-muted-foreground">Receive driver details and service confirmation</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-semibold mb-2">Service Begins</h3>
              <p className="text-muted-foreground">Your professional driver arrives at scheduled time</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Need Immediate Assistance?</h2>
          <p className="text-lg mb-8 opacity-90">
            Our customer support team is available 24/7 to help you find the perfect driver
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="rounded-full">
              <Phone className="h-4 w-4 mr-2" />
              Call: +91 9966363662
            </Button>
            <Button variant="outline" size="lg" className="rounded-full bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule a Call
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}