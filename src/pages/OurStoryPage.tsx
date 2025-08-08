import { Calendar, Users, MapPin, Award, Heart, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';

const milestones = [
  {
    year: '2020',
    title: 'The Beginning',
    description: 'Started with just 2 vehicles and a dream to provide reliable taxi services in Vizag'
  },
  {
    year: '2021',
    title: 'Fleet Expansion',
    description: 'Expanded the vehicles and introduced outstation services'
  },
  {
    year: '2022',
    title: 'Corporate Engagement',
    description: 'Recognized by corporate clients and began offering event transportation services'
  },
  {
    year: '2023',
    title: 'Service Excellence',
    description: 'Achieved 95% customer satisfaction rate and expanded to airport services'
  },
  {
    year: '2024',
    title: 'Regional Growth',
    description: 'Extended services to neighboring cities and introduced luxury vehicle options'
  },
  {
    year: '2025',
    title: 'Top Rated',
    description: 'Became the leading taxi service provider in Vizag'
  }
];

const values = [
  {
    icon: Heart,
    title: 'Customer First',
    description: 'We prioritize customer satisfaction and comfort in every journey'
  },
  {
    icon: Target,
    title: 'Reliability',
    description: 'Punctual, dependable service that you can count on every time'
  },
  {
    icon: Award,
    title: 'Excellence',
    description: 'Maintaining high standards in service quality and vehicle maintenance'
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Building strong relationships with customers and local communities'
  }
];

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-16">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our Story
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            From humble beginnings to becoming Vizag's most trusted taxi service provider. 
            Discover our journey of growth, commitment, and dedication to excellence.
          </p>
        </div>
      </div>

      {/* Story Content */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none mb-16">
            <h2 className="text-3xl font-bold mb-6">The Journey Begins</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              In 2020, with just two vehicles and an unwavering commitment to providing 
              reliable transportation services, Vizag Taxi Hub was born. Our founder, 
              driven by the vision of transforming the local transportation landscape, 
              started this journey with a simple yet powerful belief: every journey 
              matters, and every customer deserves the best.
            </p>
            
            <p className="text-muted-foreground leading-relaxed mb-6">
              What began as a small family business has now grown into one of Vizag's 
              most trusted and preferred taxi service providers. Our growth story is 
              not just about expanding our fleet or increasing our service areas; 
              it's about the countless smiles, the trust we've earned, and the 
              relationships we've built along the way.
            </p>

            <h3 className="text-2xl font-bold mb-4">Building Trust, One Ride at a Time</h3>
            <p className="text-muted-foreground leading-relaxed">
              From the very beginning, we understood that transportation is not just 
              about getting from point A to point B. It's about safety, comfort, 
              reliability, and the peace of mind that comes with knowing you're in 
              good hands. This understanding has been the cornerstone of our service 
              philosophy and the driving force behind our continuous improvement.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl font-bold text-center mb-12">Our Journey Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {milestones.map((milestone, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Calendar className="h-5 w-5 text-primary mr-2" />
                    <span className="text-xl font-bold text-primary">{milestone.year}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{milestone.title}</h3>
                  <p className="text-muted-foreground text-sm">{milestone.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <value.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-6 sm:px-8 lg:px-12">
          <h2 className="text-3xl font-bold text-center mb-12">Our Impact in Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold mb-2">4.9 ★</div>
              <div className="text-sm opacity-90">Google Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold mb-2">10,000+</div>
              <div className="text-sm opacity-90">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold mb-2">5+</div>
              <div className="text-sm opacity-90">Years of Service</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-4xl font-bold mb-2">24/7</div>
              <div className="text-sm opacity-90">Availability</div>
            </div>
          </div>
        </div>
      </div>

      {/* Future Vision */}
      <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Looking Ahead</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            As we continue to grow and evolve, our commitment remains unchanged: to provide 
            exceptional transportation services that exceed expectations. We're constantly 
            investing in new technologies, expanding our fleet, and training our team to 
            ensure that every journey with us is safe, comfortable, and memorable.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}