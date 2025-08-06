import { Mail, Phone, Linkedin, Award, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const leaders = [
  {
    id: 1,
    name: 'Rajesh Kumar',
    position: 'Founder & CEO',
    experience: '15+ years',
    image: '/placeholder.svg',
    bio: 'With over 15 years of experience in the transportation industry, Rajesh founded Vizag Taxi Hub with a vision to revolutionize local transportation. His leadership has been instrumental in growing the company from a small startup to the leading taxi service in the region.',
    achievements: [
      'Entrepreneur of the Year 2022',
      'Transportation Industry Innovation Award',
      'Community Service Excellence'
    ],
    email: 'rajesh@vizagtaxihub.com',
    phone: '+91 9966363662'
  },
  {
    id: 2,
    name: 'Priya Sharma',
    position: 'Operations Director',
    experience: '12+ years',
    image: '/placeholder.svg',
    bio: 'Priya oversees all operational aspects of our services, ensuring smooth fleet management, driver coordination, and customer service excellence. Her expertise in logistics and operations has been crucial to our growth.',
    achievements: [
      'Operations Excellence Award 2023',
      'Fleet Management Certification',
      'Customer Service Leadership'
    ],
    email: 'priya@vizagtaxihub.com',
    phone: '+91 9966363663'
  },
  {
    id: 3,
    name: 'Arun Reddy',
    position: 'Technology Head',
    experience: '10+ years',
    image: '/placeholder.svg',
    bio: 'Arun leads our technology initiatives, developing innovative solutions for booking, tracking, and customer engagement. His technical expertise has transformed our digital capabilities and customer experience.',
    achievements: [
      'Tech Innovation Award 2023',
      'Digital Transformation Leader',
      'Mobile App Excellence'
    ],
    email: 'arun@vizagtaxihub.com',
    phone: '+91 9966363664'
  },
  {
    id: 4,
    name: 'Sunita Patel',
    position: 'Customer Relations Manager',
    experience: '8+ years',
    image: '/placeholder.svg',
    bio: 'Sunita ensures that every customer interaction exceeds expectations. Her dedication to customer satisfaction has helped us maintain a 95% customer retention rate and build lasting relationships.',
    achievements: [
      'Customer Service Excellence 2023',
      'Team Leadership Award',
      'Communication Excellence'
    ],
    email: 'sunita@vizagtaxihub.com',
    phone: '+91 9966363665'
  }
];

const companyStats = [
  {
    icon: Users,
    value: '150+',
    label: 'Team Members'
  },
  {
    icon: TrendingUp,
    value: '95%',
    label: 'Customer Satisfaction'
  },
  {
    icon: Award,
    value: '10+',
    label: 'Industry Awards'
  }
];

export default function LeadershipPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our Leadership
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Meet the dedicated team of leaders who drive our vision forward and 
            ensure excellence in every aspect of our service.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          {companyStats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="p-6">
                <stat.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Leadership Team */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Meet Our Leaders</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {leaders.map((leader) => (
              <Card key={leader.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="md:flex">
                    <div className="md:w-1/3">
                      <img
                        src={leader.image}
                        alt={leader.name}
                        className="w-full h-64 md:h-full object-cover"
                      />
                    </div>
                    <div className="md:w-2/3 p-6">
                      <div className="mb-4">
                        <h3 className="text-2xl font-bold mb-1">{leader.name}</h3>
                        <p className="text-primary font-semibold mb-1">{leader.position}</p>
                        <p className="text-sm text-muted-foreground">{leader.experience} Experience</p>
                      </div>
                      
                      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                        {leader.bio}
                      </p>
                      
                      <div className="mb-4">
                        <h4 className="font-semibold mb-2">Key Achievements:</h4>
                        <ul className="space-y-1">
                          {leader.achievements.map((achievement, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start">
                              <Award className="h-3 w-3 text-primary mr-2 mt-0.5 flex-shrink-0" />
                              {achievement}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                          <Linkedin className="h-3 w-3 mr-1" />
                          LinkedIn
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Company Culture */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Our Leadership Philosophy</h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            Our leadership team believes in leading by example, fostering innovation, 
            and creating an environment where every team member can thrive and contribute 
            to our collective success.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-3">Collaborative Leadership</h3>
                <p className="text-muted-foreground text-sm">
                  We believe in open communication, shared decision-making, and 
                  empowering every team member to contribute their best.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-3">Innovation Focus</h3>
                <p className="text-muted-foreground text-sm">
                  Our leaders encourage creative thinking, embrace new technologies, 
                  and continuously seek ways to improve our services.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-3">Customer-Centric</h3>
                <p className="text-muted-foreground text-sm">
                  Every decision we make is guided by our commitment to delivering 
                  exceptional value and experience to our customers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Leadership */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Connect with Our Leadership</h2>
          <p className="text-lg mb-8 opacity-90">
            Have questions or feedback? Our leadership team is always available to connect with customers and partners.
          </p>
          <Button variant="secondary" size="lg" className="rounded-full">
            <Mail className="h-4 w-4 mr-2" />
            Contact Leadership Team
          </Button>
        </div>
      </div>
    </div>
  );
}