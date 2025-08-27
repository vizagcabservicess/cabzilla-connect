import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MessageCircle, AlertTriangle, Shield, Clock, Trash2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DataDeletionPage() {
  const handleEmailDeletion = () => {
    const subject = encodeURIComponent('Delete My Account');
    const body = encodeURIComponent(`Hello VizagTaxiHub Support Team,

I would like to request the deletion of my account and all associated data from VizagTaxiHub.

Please include the following information in your request:
- Your registered email address
- Your name (if different from email)
- Reason for deletion (optional)

Thank you.`);
    
    window.open(`mailto:support@vizagtaxihub.com?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSupportContact = () => {
    // Navigate to support/contact page if it exists, otherwise show contact info
    window.open('/contact', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar />
      <Helmet>
        <title>Data Deletion - Vizag Taxi Hub | Account Deletion Request</title>
        <meta name="description" content="Request account deletion from Vizag Taxi Hub. Learn how to delete your data and understand our deletion process for privacy compliance." />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <link rel="canonical" href="https://vizagtaxihub.com/data-deletion" />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-white pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-red-100 text-red-700 text-sm font-medium mb-6">
              <FileText className="w-4 h-4 mr-2" />
              Privacy & Data Rights
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Data <span className="text-red-600">Deletion</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              We respect your privacy and provide easy ways to delete your account data from VizagTaxiHub.
            </p>
            <div className="text-sm text-gray-500">
              Last updated: January 2024
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid gap-8">
            {/* Primary Deletion Method */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-2 border-blue-100 bg-blue-50/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Mail className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-blue-900">Email Deletion Request</CardTitle>
                      <CardDescription className="text-blue-700">
                        Recommended method for account deletion
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-2">How to request deletion:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>Send an email to <span className="font-mono text-blue-600">support@vizagtaxihub.com</span></li>
                      <li>Use the subject line: <span className="font-mono bg-gray-100 px-2 py-1 rounded">"Delete My Account"</span></li>
                      <li>Include your registered email address in the email</li>
                      <li>We will process your request within 7 days</li>
                    </ol>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleEmailDeletion}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Deletion Email
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => navigator.clipboard.writeText('support@vizagtaxihub.com')}
                    >
                      Copy Email Address
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Alternative Methods */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <CardTitle>Alternative Contact Methods</CardTitle>
                      <CardDescription>
                        Other ways to request account deletion
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold">In-App Support</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Contact us through our app's support section
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSupportContact}
                      >
                        Go to Support
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="h-5 w-5 text-purple-600" />
                        <h4 className="font-semibold">Phone Support</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Call our customer support team
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open('tel:+91-9966363662')}
                      >
                        Call Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* What Gets Deleted */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-6 w-6 text-red-600" />
                    <div>
                      <CardTitle>What Gets Deleted</CardTitle>
                      <CardDescription>
                        Information that will be permanently removed
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Account Information</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Personal profile data
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Contact information
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Login credentials
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Social login connections
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Service Data</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Booking history
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Payment information
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Trip preferences
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Support tickets
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Important Notes */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                    <div>
                      <CardTitle className="text-amber-900">Important Information</CardTitle>
                      <CardDescription className="text-amber-700">
                        Please read before requesting deletion
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-900">Processing Time</h4>
                          <p className="text-sm text-amber-700">
                            Account deletion requests are processed within 7 business days
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-900">Data Retention</h4>
                          <p className="text-sm text-amber-700">
                            Some data may be retained for legal or regulatory purposes
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="destructive" className="mt-0.5">Permanent</Badge>
                        <div>
                          <h4 className="font-semibold text-amber-900">Irreversible Action</h4>
                          <p className="text-sm text-amber-700">
                            Account deletion is permanent and cannot be undone
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-0.5">Required</Badge>
                        <div>
                          <h4 className="font-semibold text-amber-900">Verification</h4>
                          <p className="text-sm text-amber-700">
                            We may need to verify your identity before processing
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Social Login Specific */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="border-purple-200 bg-purple-50/30">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">G</div>
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">f</div>
                    </div>
                    <div>
                      <CardTitle className="text-purple-900">Social Login Users</CardTitle>
                      <CardDescription className="text-purple-700">
                        Special instructions for Google and Facebook users
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-700 mb-3">
                      If you signed up using Google or Facebook, please note:
                    </p>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <span>We will delete your VizagTaxiHub account data, but your Google/Facebook account remains unaffected</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <span>You may need to revoke app permissions from your Google/Facebook account settings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                        <span>Include your social login email address in the deletion request</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      

      <Footer />
    </div>
  );
}
