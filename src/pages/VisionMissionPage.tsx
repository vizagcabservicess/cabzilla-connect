import React from 'react';
import { Eye, Target, Compass, Lightbulb, Shield, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';

const goals = [
  {
    icon: Zap,
    title: 'Innovation',
    description: 'Continuously adopt new technologies to enhance customer experience'
  },
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Maintain the highest safety standards in all our operations'
  },
  {
    icon: Target,
    title: 'Excellence',
    description: 'Deliver exceptional service that exceeds customer expectations'
  },
  {
    icon: Compass,
    title: 'Expansion',
    description: 'Grow our services to reach more cities and communities'
  }
];

const principles = [
  'Customer satisfaction is our top priority',
  'Safety and reliability in every journey',
  'Transparent and fair pricing',
  'Professional and courteous service',
  'Environmental responsibility',
  'Continuous improvement and innovation'
];

const VisionMissionPage = () => {
  return (
    <>
      <Helmet>
        <title>Vision & Mission - Vizag Taxi Hub | Our Goals and Values</title>
        <meta name="description" content="Explore Vizag Taxi Hub's vision to become Visakhapatnam's most trusted transportation provider and our mission to deliver safe, reliable, and comfortable journeys. Learn about our core values and commitment to excellence." />
        <meta name="keywords" content="vision mission vizag taxi hub, company goals, taxi service values, transportation vision, service quality commitment" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/vision-mission" />
        <meta property="og:title" content="Vision & Mission - Vizag Taxi Hub | Our Goals and Values" />
        <meta property="og:description" content="Learn about Vizag Taxi Hub's vision and mission. We are committed to providing safe, reliable, and comfortable transportation solutions." />
        <meta property="og:image" content="/og-image.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/vision-mission" />
        <meta property="twitter:title" content="Vision & Mission - Vizag Taxi Hub | Our Goals and Values" />
        <meta property="twitter:description" content="Learn about Vizag Taxi Hub's vision and mission. We are committed to providing safe, reliable transportation solutions." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/vision-mission" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 pt-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 pt-16 via-primary/5 to-background py-8">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Vision & Mission
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto  mb-8">
            Our commitment to excellence and customer satisfaction drives everything we do
          </p>
        </div>
      </div>

      {/* Vision & Mission Cards */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Vision Card */}
          <Card className="h-full">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <Eye className="h-12 w-12 text-primary mr-4" />
                <h2 className="text-3xl font-bold">Our Vision</h2>
              </div>
              <div className="space-y-4">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  To become the most trusted and preferred transportation service provider 
                  in Visakhapatnam, setting new standards for reliability, safety, and 
                  customer satisfaction.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We envision a future where every journey is seamless, every customer 
                  feels valued, and every ride contributes to building stronger, more 
                  connected communities. Our goal is to be the bridge that connects 
                  people to their destinations, dreams, and opportunities.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mission Card */}
          <Card className="h-full">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <Target className="h-12 w-12 text-primary mr-4" />
                <h2 className="text-3xl font-bold">Our Mission</h2>
              </div>
              <div className="space-y-4">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  To provide safe, reliable, and comfortable transportation services 
                  while maintaining the highest standards of professionalism and 
                  customer care.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We are committed to leveraging technology and innovation to make 
                  transportation accessible, affordable, and enjoyable for everyone. 
                  Through our dedicated team and modern fleet, we strive to exceed 
                  expectations and create lasting relationships with our customers.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Strategic Goals */}
      <div className="bg-muted/30 py-8">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl font-bold text-center mb-12">Our Strategic Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {goals.map((goal, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <goal.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">{goal.title}</h3>
                  <p className="text-muted-foreground text-sm">{goal.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Core Principles */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Lightbulb className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Our Core Principles</h2>
            <p className="text-muted-foreground">
              The fundamental beliefs that guide our decisions and shape our culture
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {principles.map((principle, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">{principle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commitment Section */}
      <div className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h2 className="text-3xl font-bold mb-6">Our Commitment</h2>
          <div className="max-w-4xl mx-auto space-y-6">
            <p className="text-lg opacity-90">
              We are committed to being more than just a transportation service. 
              We are your partners in every journey, ensuring that each trip is 
              not just about reaching your destination, but about the experience along the way.
            </p>
            <p className="opacity-90">
              Our promise is to continuously evolve, adapt, and improve, always keeping 
              our customers' needs at the heart of everything we do. Together, we're 
              not just moving people; we're moving communities forward.
            </p>
          </div>
        </div>
      </div>

      {/* Future Outlook */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Looking Forward</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            As we move into the future, our vision and mission continue to evolve, 
            but our core commitment remains constant: to serve our customers with 
            integrity, innovation, and excellence.
          </p>
        
        </div>
      </div>
      <Footer />
    </main>
    </div>
    </>
  );
}

export default VisionMissionPage;