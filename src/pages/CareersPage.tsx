import { Clock, MapPin, DollarSign, Users, Phone, Mail, CheckCircle, Upload, Calendar, User, FileText, Car, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useState } from 'react';
import { toast } from 'sonner';

const jobPositions = [
  { value: 'professional-driver', label: 'Professional Driver - Full Time' },
  { value: 'part-time-driver', label: 'Part-Time Driver - Weekend' },
  { value: 'outstation-driver', label: 'Outstation Driver' },
  { value: 'luxury-car-driver', label: 'Luxury Car Driver' },
  { value: 'tour-driver', label: 'Tour Driver' }
];

const experienceLevels = [
  { value: '0-1', label: '0-1 years' },
  { value: '1-3', label: '1-3 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10+', label: '10+ years' }
];

const vehicleTypes = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'luxury', label: 'Luxury Car' },
  { value: 'tempo', label: 'Tempo Traveller' },
  { value: 'all', label: 'All Types' }
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
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    experience: '',
    vehicleType: '',
    licenseNumber: '',
    licenseExpiry: '',
    address: '',
    city: '',
    pincode: '',
    emergencyContact: '',
    emergencyPhone: '',
    education: '',
    previousExperience: '',
    whyJoin: '',
    availability: '',
    ownVehicle: false,
    agreeTerms: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'position', 'licenseNumber'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      toast.error('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    if (!formData.agreeTerms) {
      toast.error('Please agree to the terms and conditions');
      setIsSubmitting(false);
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Application submitted successfully! We will contact you soon.');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        position: '',
        experience: '',
        vehicleType: '',
        licenseNumber: '',
        licenseExpiry: '',
        address: '',
        city: '',
        pincode: '',
        emergencyContact: '',
        emergencyPhone: '',
        education: '',
        previousExperience: '',
        whyJoin: '',
        availability: '',
        ownVehicle: false,
        agreeTerms: false
      });
    } catch (error) {
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background page-container">
      <Navbar />
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

      {/* Job Application Form */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Job Application Form</h2>
              <p className="text-muted-foreground">
                Fill out the form below to apply for a driver position with our company
              </p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Driver Application Form
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6 relative form-container">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Personal Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          placeholder="Enter your first name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          placeholder="Enter your last name"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="Enter your phone number"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Job Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Label htmlFor="position">Position Applied For *</Label>
                        <div className="relative">
                          <Select value={formData.position} onValueChange={(value) => handleInputChange('position', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select position" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              {jobPositions.map((position) => (
                                <SelectItem key={position.value} value={position.value}>
                                  {position.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="relative">
                        <Label htmlFor="experience">Years of Experience</Label>
                        <div className="relative">
                          <Select value={formData.experience} onValueChange={(value) => handleInputChange('experience', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              {experienceLevels.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <Label htmlFor="vehicleType">Preferred Vehicle Type</Label>
                        <div className="relative">
                          <Select value={formData.vehicleType} onValueChange={(value) => handleInputChange('vehicleType', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle type" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              {vehicleTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="relative">
                        <Label htmlFor="availability">Availability</Label>
                        <div className="relative">
                          <Select value={formData.availability} onValueChange={(value) => handleInputChange('availability', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select availability" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              <SelectItem value="full-time">Full Time</SelectItem>
                              <SelectItem value="part-time">Part Time</SelectItem>
                              <SelectItem value="weekend">Weekend Only</SelectItem>
                              <SelectItem value="flexible">Flexible</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* License Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      License Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="licenseNumber">Driving License Number *</Label>
                        <Input
                          id="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                          placeholder="Enter license number"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="licenseExpiry">License Expiry Date</Label>
                        <Input
                          id="licenseExpiry"
                          type="date"
                          value={formData.licenseExpiry}
                          onChange={(e) => handleInputChange('licenseExpiry', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address Information
                    </h3>
                    
                    <div>
                      <Label htmlFor="address">Full Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Enter your complete address"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                          placeholder="Enter pincode"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Emergency Contact
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                        <Input
                          id="emergencyContact"
                          value={formData.emergencyContact}
                          onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                          placeholder="Enter emergency contact name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                        <Input
                          id="emergencyPhone"
                          value={formData.emergencyPhone}
                          onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                          placeholder="Enter emergency contact phone"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Additional Information
                    </h3>
                    
                    <div>
                      <Label htmlFor="education">Education</Label>
                      <Input
                        id="education"
                        value={formData.education}
                        onChange={(e) => handleInputChange('education', e.target.value)}
                        placeholder="Enter your education details"
                      />
                    </div>

                    <div>
                      <Label htmlFor="previousExperience">Previous Experience</Label>
                      <Textarea
                        id="previousExperience"
                        value={formData.previousExperience}
                        onChange={(e) => handleInputChange('previousExperience', e.target.value)}
                        placeholder="Describe your previous driving experience"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="whyJoin">Why do you want to join our company?</Label>
                      <Textarea
                        id="whyJoin"
                        value={formData.whyJoin}
                        onChange={(e) => handleInputChange('whyJoin', e.target.value)}
                        placeholder="Tell us why you want to work with us"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Additional Options */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ownVehicle"
                        checked={formData.ownVehicle}
                        onCheckedChange={(checked) => handleInputChange('ownVehicle', checked as boolean)}
                      />
                      <Label htmlFor="ownVehicle">Do you own a vehicle?</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="agreeTerms"
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) => handleInputChange('agreeTerms', checked as boolean)}
                        required
                      />
                      <Label htmlFor="agreeTerms" className="text-sm">
                        I agree to the terms and conditions and confirm that all information provided is accurate *
                      </Label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-center pt-6">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="rounded-full px-8"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Submit Application
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
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
            <p className="text-muted-foreground">Fill out the form above with your details</p>
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
          <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
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
      <Footer />
    </div>
  );
}