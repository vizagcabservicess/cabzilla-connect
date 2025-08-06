import { Clock, MapPin, DollarSign, Users, Phone, Mail, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const jobOpenings = [
  {
    id: 1,
    title: 'Professional Driver - Full Time',
    location: 'Vizag',
    type: 'Full Time',
    salary: '₹25,000 - ₹35,000',
    experience: '3+ years',
    requirements: [
      'Valid driving license (minimum 3 years)',
      'Clean driving record',
      'Local area knowledge',
      'Professional appearance',
      'Good communication skills'
    ],
    posted: '2 days ago'
  },
  {
    id: 2,
    title: 'Part-Time Driver - Weekend',
    location: 'Vizag',
    type: 'Part Time',
    salary: '₹15,000 - ₹20,000',
    experience: '2+ years',
    requirements: [
      'Valid driving license',
      'Weekend availability',
      'Flexible timing',
      'Own vehicle preferred',
      'Customer service oriented'
    ],
    posted: '5 days ago'
  },
  {
    id: 3,
    title: 'Outstation Driver',
    location: 'Multiple Cities',
    type: 'Full Time',
    salary: '₹30,000 - ₹40,000',
    experience: '5+ years',
    requirements: [
      'Long distance driving experience',
      'Interstate driving license',
      'Highway driving expertise',
      'Physical fitness',
      'Tour planning knowledge'
    ],
    posted: '1 week ago'
  }
];

const benefits = [
  {
    icon: DollarSign,
    title: 'Competitive Salary',
    description: 'Attractive salary packages with performance bonuses'
  },
  {
    icon: Users,
    title: 'Training Programs',
    description: 'Regular training sessions and skill development programs'
  },
  {
    icon: CheckCircle,
    title: 'Job Security',
    description: 'Stable employment with growth opportunities'
  },
  {
    icon: Clock,
    title: 'Flexible Hours',
    description: 'Flexible working hours and shift options'
  }
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Join Our Team
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Build your career with us. We're looking for professional drivers who are passionate about providing excellent service
          </p>
          <Button size="lg" className="rounded-full">
            <Phone className="h-4 w-4 mr-2" />
            Call HR: +91 9966363662
          </Button>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Work With Us?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {benefits.map((benefit, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <benefit.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Job Openings */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Current Openings</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {jobOpenings.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl">{job.title}</CardTitle>
                    <Badge variant="secondary">{job.type}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span>{job.salary}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Experience: {job.experience}</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Requirements:</h4>
                    <ul className="space-y-1">
                      {job.requirements.map((req, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start">
                          <CheckCircle className="h-3 w-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Posted {job.posted}</span>
                    <Button className="rounded-full">Apply Now</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Application Process */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Application Process</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Submit Application</h3>
            <p className="text-muted-foreground">Call us or visit our office with your documents</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Interview & Test</h3>
            <p className="text-muted-foreground">Driving test and personal interview</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Join Our Team</h3>
            <p className="text-muted-foreground">Complete documentation and start working</p>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Apply?</h2>
          <p className="text-lg mb-8 opacity-90">
            Contact our HR team for more information about career opportunities
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="rounded-full">
              <Phone className="h-4 w-4 mr-2" />
              Call: +91 9966363662
            </Button>
            <Button variant="outline" size="lg" className="rounded-full bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              <Mail className="h-4 w-4 mr-2" />
              Email: careers@vizagtaxihub.com
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}