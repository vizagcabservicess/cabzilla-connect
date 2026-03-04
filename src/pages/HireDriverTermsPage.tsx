import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Shield, AlertCircle, Users } from 'lucide-react';
import { MobileNavigation } from '@/components/MobileNavigation';

interface TermSection {
  title: string;
  content: React.ReactNode;
}

export function HireDriverTermsPage() {
  const sections: TermSection[] = [
    {
      title: "1. DEFINITIONS",
      content: (
        <>
          <p className="mb-3"><strong>1.1 Company</strong><br />Refers to Vizag Taxi Hub, a transportation service provider operating from Visakhapatnam, Andhra Pradesh.</p>
          <p className="mb-3"><strong>1.2 Customer</strong><br />Any individual or entity that books or uses the Hire-a-Driver service.</p>
          <p className="mb-3"><strong>1.3 Driver</strong><br />An independent third-party service provider assigned by Vizag Taxi Hub to operate the Customer's vehicle.</p>
          <p className="mb-3"><strong>1.4 Service</strong><br />The Hire-a-Driver service where a professional driver is assigned to drive the Customer's vehicle for local travel, airport transfers, or outstation trips.</p>
          <p><strong>1.5 Booking</strong><br />A confirmed request for a driver made through Vizag Taxi Hub.</p>
        </>
      ),
    },
    {
      title: "2. SERVICE NATURE",
      content: (
        <>
          <p className="mb-3">2.1 Vizag Taxi Hub operates as a <strong>driver aggregation and facilitation platform</strong> connecting customers with independent drivers.</p>
          <p className="mb-3">2.2 Drivers are <strong>independent service providers</strong> and not employees of Vizag Taxi Hub.</p>
          <p>2.3 Vizag Taxi Hub will make reasonable efforts to provide a driver, but <strong>driver availability is not guaranteed</strong> at all times.</p>
        </>
      ),
    },
    {
      title: "3. ELIGIBILITY",
      content: (
        <>
          <p className="mb-3">3.1 Customers must be <strong>18 years or older</strong> to use the service.</p>
          <p className="mb-3">3.2 Customers must have the <strong>legal right to operate or authorize the use of the vehicle</strong>.</p>
          <p>3.3 The vehicle must have:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Valid Registration Certificate</li>
            <li>Valid Motor Insurance</li>
            <li>Valid Pollution Certificate</li>
            <li>Roadworthy mechanical condition.</li>
          </ul>
        </>
      ),
    },
    {
      title: "4. BOOKINGS AND CONFIRMATION",
      content: (
        <>
          <p className="mb-3">4.1 Bookings can be made through:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>Phone call</li>
            <li>WhatsApp</li>
            <li>Website</li>
            <li>Social media platforms</li>
            <li>Any official Vizag Taxi Hub communication channel.</li>
          </ul>
          <p className="mb-3">4.2 A booking is confirmed only after <strong>driver availability is confirmed by Vizag Taxi Hub</strong>.</p>
          <p>4.3 Vizag Taxi Hub reserves the right to <strong>accept or reject bookings at its discretion</strong>.</p>
        </>
      ),
    },
    {
      title: "5. SERVICE CHARGES",
      content: (
        <>
          <p className="mb-3">Service charges may include:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>Minimum base fare</li>
            <li>Hourly driver charges</li>
            <li>Daily driver charges</li>
            <li>Night charges</li>
            <li>Waiting charges</li>
            <li>Extra hour charges</li>
            <li>Outstation driver allowance</li>
            <li>Driver food allowance</li>
            <li>Toll charges</li>
            <li>Parking charges</li>
            <li>Interstate taxes</li>
            <li>Government taxes (if applicable)</li>
          </ul>
          <p>Fare estimates are <strong>approximate and may vary depending on trip conditions</strong>.</p>
        </>
      ),
    },
    {
      title: "6. PAYMENT TERMS",
      content: (
        <>
          <p className="mb-3">Payments may be made through:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>Cash</li>
            <li>UPI</li>
            <li>Bank transfer</li>
            <li>Digital payment platforms.</li>
          </ul>
          <p className="mb-3">Payment must be completed <strong>immediately after the completion of the service</strong>, unless otherwise agreed.</p>
          <p>Failure to pay may result in:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Suspension from future bookings</li>
            <li>Legal recovery of outstanding dues.</li>
          </ul>
        </>
      ),
    },
    {
      title: "7. DRIVER FOOD AND ACCOMMODATION",
      content: (
        <>
          <p className="mb-3">For trips exceeding <strong>8 hours or involving outstation travel</strong>:</p>
          <p className="mb-3">Customers must either:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>Provide food for the driver, or</li>
            <li>Pay a driver food allowance.</li>
          </ul>
          <p>For overnight trips, <strong>driver accommodation must be arranged or compensated by the customer</strong>.</p>
        </>
      ),
    },
    {
      title: "8. CANCELLATION POLICY",
      content: (
        <>
          <p className="mb-3">Cancellation charges may apply as follows:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>Cancellation more than <strong>2 hours before pickup</strong> – No charge</li>
            <li>Cancellation within <strong>2 hours of pickup</strong> – Cancellation fee may apply</li>
            <li>If the driver reaches the pickup location – <strong>Minimum fare will be charged</strong></li>
          </ul>
          <p>Repeated cancellations may lead to <strong>temporary suspension from booking services</strong>.</p>
        </>
      ),
    },
    {
      title: "9. WAITING CHARGES",
      content: (
        <>
          <p className="mb-3">Drivers will wait for <strong>up to 15 minutes</strong> at the pickup location.</p>
          <p>After this time, <strong>waiting charges may apply</strong>.</p>
        </>
      ),
    },
    {
      title: "10. CUSTOMER RESPONSIBILITIES",
      content: (
        <>
          <p className="mb-3">Customers must:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>Treat drivers respectfully</li>
            <li>Ensure vehicle documents are valid</li>
            <li>Ensure the vehicle is safe and roadworthy</li>
            <li>Follow all traffic laws</li>
          </ul>
          <p className="mb-3">Customers must not:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>Force drivers to break traffic rules</li>
            <li>Engage in illegal activities</li>
            <li>Harass or threaten drivers</li>
          </ul>
          <p>Vizag Taxi Hub reserves the right to <strong>terminate the service immediately in such cases</strong>.</p>
        </>
      ),
    },
    {
      title: "11. CUSTOMER MUST REMAIN IN VEHICLE CLAUSE",
      content: (
        <>
          <p className="mb-3">11.1 The Customer must <strong>remain present in the vehicle during the entire service period</strong> unless otherwise agreed.</p>
          <p className="mb-3">11.2 The Customer must <strong>not leave the vehicle unattended with the driver</strong>.</p>
          <p>11.3 If the Customer chooses to leave the vehicle with the driver, it will be <strong>entirely at the Customer's own risk</strong>, and Vizag Taxi Hub shall not be responsible for any loss, theft, or misuse.</p>
        </>
      ),
    },
    {
      title: "12. VEHICLE CONDITION",
      content: (
        <>
          <p className="mb-3">The Customer is solely responsible for the condition of the vehicle.</p>
          <p>Vizag Taxi Hub and the assigned driver shall <strong>not be responsible for mechanical failures, electrical faults, or breakdowns</strong>.</p>
        </>
      ),
    },
    {
      title: "13. ACCIDENT LIABILITY PROTECTION",
      content: (
        <>
          <p className="mb-3">13.1 In the event of any accident or traffic incident:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>The Customer or vehicle owner shall be <strong>solely responsible for all legal and financial liabilities</strong>.</li>
          </ul>
          <p className="mb-3">13.2 Vizag Taxi Hub shall not be responsible for:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>Vehicle damage</li>
            <li>Third-party damage</li>
            <li>Personal injury</li>
            <li>Insurance claims</li>
          </ul>
          <p>13.3 Any insurance claims must be handled through the <strong>vehicle owner's insurance provider</strong>.</p>
        </>
      ),
    },
    {
      title: "14. DRIVER MISUSE / THEFT CLAUSE",
      content: (
        <>
          <p className="mb-3">14.1 Drivers are verified to the extent reasonably possible; however, Vizag Taxi Hub <strong>does not guarantee driver conduct</strong>.</p>
          <p className="mb-3">14.2 If any misuse, theft, or illegal activity occurs, the Customer must file a complaint with the <strong>local police authorities</strong>.</p>
          <p className="mb-3">14.3 Vizag Taxi Hub will provide driver details and booking records when legally required.</p>
          <p>14.4 Vizag Taxi Hub shall <strong>not be liable for financial losses or damages caused by a driver</strong>.</p>
        </>
      ),
    },
    {
      title: "15. COMMERCIAL VEHICLE CLAUSE",
      content: (
        <>
          <p className="mb-3">15.1 The Hire-a-Driver service is intended primarily for <strong>private vehicles</strong>.</p>
          <p className="mb-3">15.2 If used for <strong>commercial vehicles</strong> including:</p>
          <ul className="list-disc ml-6 mb-3 space-y-1">
            <li>Taxi vehicles</li>
            <li>Tourist vehicles</li>
            <li>Yellow board vehicles</li>
            <li>Transport vehicles</li>
          </ul>
          <p className="mb-3">the Customer must ensure compliance with all <strong>transport regulations and permits</strong>.</p>
          <p>15.3 Vizag Taxi Hub shall not be responsible for:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Permit violations</li>
            <li>Government penalties</li>
            <li>Traffic fines</li>
            <li>Regulatory issues.</li>
          </ul>
        </>
      ),
    },
    {
      title: "16. LOSS OF PERSONAL BELONGINGS",
      content: (
        <>
          <p className="mb-3">Customers are responsible for their personal belongings.</p>
          <p>Vizag Taxi Hub may assist in locating lost items on a <strong>best-effort basis</strong>, but recovery is not guaranteed.</p>
        </>
      ),
    },
    {
      title: "17. FORCE MAJEURE",
      content: (
        <>
          <p className="mb-3">Vizag Taxi Hub shall not be liable for delays or failure of service due to circumstances beyond reasonable control including:</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>Traffic conditions</li>
            <li>Weather disruptions</li>
            <li>Natural disasters</li>
            <li>Government restrictions</li>
            <li>Strikes</li>
            <li>Vehicle breakdowns.</li>
          </ul>
        </>
      ),
    },
    {
      title: "18. LIMITATION OF LIABILITY",
      content: (
        <>
          <p className="mb-3">To the maximum extent permitted by law, Vizag Taxi Hub's liability shall not exceed <strong>₹1,000 or the total service fee paid for the booking, whichever is lower</strong>.</p>
          <p>Vizag Taxi Hub shall not be liable for:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Indirect damages</li>
            <li>Loss of income</li>
            <li>Business interruption</li>
            <li>Consequential damages.</li>
          </ul>
        </>
      ),
    },
    {
      title: "19. TERMINATION OF SERVICE",
      content: (
        <>
          <p>Vizag Taxi Hub may terminate or suspend service if the Customer:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Violates these Terms</li>
            <li>Engages in unlawful activities</li>
            <li>Fails to make payment</li>
            <li>Misuses the service.</li>
          </ul>
        </>
      ),
    },
    {
      title: "20. INTELLECTUAL PROPERTY",
      content: (
        <p>All trademarks, logos, and brand names associated with Vizag Taxi Hub remain the property of the Company and may not be used without permission.</p>
      ),
    },
    {
      title: "21. GOVERNING LAW",
      content: (
        <>
          <p className="mb-3">These Terms shall be governed by the <strong>laws of India</strong>.</p>
          <p>Any disputes shall fall under the jurisdiction of courts located in:</p>
          <p className="mt-2 font-medium">📍 <strong>Visakhapatnam, Andhra Pradesh</strong></p>
        </>
      ),
    },
    {
      title: "22. CONTACT INFORMATION",
      content: (
        <>
          <p className="mb-2"><strong>Service Provider:</strong><br />Vizag Taxi Hub</p>
          <p className="mb-2"><strong>Customer Support:</strong><br />📞 +91 9966363662</p>
          <p><strong>Location:</strong><br />Visakhapatnam, Andhra Pradesh</p>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Navbar />
      <Helmet>
        <title>Hire-a-Driver Terms & Conditions - Vizag Taxi Hub</title>
        <meta name="description" content="Read the terms and conditions for Vizag Taxi Hub's Hire-a-Driver service. Important information about bookings, payments, cancellations, and service policies." />
        <meta name="keywords" content="hire driver terms conditions vizag taxi hub, driver service terms, hire a driver vizag, driver booking policies" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/hire-driver-terms" />
        <meta property="og:title" content="Hire-a-Driver Terms & Conditions - Vizag Taxi Hub" />
        <meta property="og:description" content="Read the terms and conditions for Vizag Taxi Hub's Hire-a-Driver service." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/hire-driver-terms" />
        <meta property="twitter:title" content="Hire-a-Driver Terms & Conditions - Vizag Taxi Hub" />
        <meta property="twitter:description" content="Read the terms and conditions for Vizag Taxi Hub's Hire-a-Driver service." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/hire-driver-terms" />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-white pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <FileText className="w-4 h-4 mr-2" />
              Legal Information
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Hire-a-Driver <span className="text-blue-600">Terms & Conditions</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Please read these terms carefully before using our Hire-a-Driver service.
            </p>
            <div className="text-sm text-gray-500">
              Last updated: 04 March 2026
            </div>
          </motion.div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-8 bg-blue-50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start">
                  <AlertCircle className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2">Important Notice</h3>
                    <p className="text-blue-800 leading-relaxed">
                      These Terms and Conditions constitute a legally binding agreement between you and Vizag Taxi Hub governing the use of the Hire-a-Driver services.
                      By booking, requesting, or using our services through phone, WhatsApp, website, social media platforms, or any other communication channel, you confirm that you have read, understood, and agreed to these Terms.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
                    <div className="text-gray-700 leading-relaxed space-y-2">{section.content}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Information */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Additional Information</h2>
            <p className="text-lg text-gray-600">Important details about our Hire-a-Driver service</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Safety First</h3>
                  <p className="text-gray-600">All drivers are verified. Ensure your vehicle documents are valid and the vehicle is roadworthy.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Transparent Pricing</h3>
                  <p className="text-gray-600">Service charges include base fare, hourly/daily rates, and applicable allowances. Fare estimates may vary.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">24/7 Support</h3>
                  <p className="text-gray-600">Round-the-clock customer support for all your Hire-a-Driver queries and assistance.</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">Questions About Hire-a-Driver Terms?</h2>
            <p className="text-xl text-gray-300 mb-8">
              If you have any questions about these Terms and Conditions, please contact us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <span className="text-gray-300">Call us at:</span>
              <a href="tel:+919966363662" className="text-white font-bold text-lg hover:text-blue-300">+91 9966363662</a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <MobileNavigation />
    </div>
  );
}
