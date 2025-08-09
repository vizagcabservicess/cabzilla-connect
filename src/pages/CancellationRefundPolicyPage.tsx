import React from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, AlertCircle, Shield, Users } from 'lucide-react';

const CancellationRefundPolicyPage = () => {
  const sections: { title: string; content: React.ReactNode }[] = [
    {
      title: '1. Definitions',
      content: (
        <div className="space-y-2 text-gray-700">
          <p><strong>Cab</strong> – Includes sedans, hatchbacks, SUVs, MUVs, and any other passenger transport vehicles.</p>
          <p><strong>Cab Operator</strong> – Drivers or operators providing vehicles with drivers, including Vizag Taxi Hub’s own fleet and associated partner vehicles.</p>
        </div>
      ),
    },
    {
      title: '2. Types of Cab Bookings',
      content: (
        <div className="space-y-2">
          <p>Vizag Taxi Hub facilitates the following booking options:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Outstation Cab</strong> – Travel between two cities using All India Tourist Permit (AITP) vehicles, fulfilled by our own or partner fleet.</li>
            <li><strong>Car Rental (Intracity & Intercity)</strong> – Hourly or full-day exclusive rentals within or outside the city.</li>
            <li><strong>Airport Transfer</strong> – Pickup and drop services to and from the airport within city limits.</li>
          </ul>
        </div>
      ),
    },
    {
      title: '3. Role of Vizag Taxi Hub & Limitation of Liability',
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li>Vizag Taxi Hub operates both its own vehicles and partner-operated vehicles.</li>
          <li>For partner-operated bookings, Vizag Taxi Hub acts as a facilitator connecting customers with cab operators.</li>
          <li>Cab operators (including partners) are responsible for valid licenses, permits, insurance, and vehicle condition.</li>
          <li>Vizag Taxi Hub is not liable for delays, breakdowns, cancellations, lost baggage, or changes in vehicle type.</li>
          <li>In case of breakdown with no replacement, proportionate fare will be refunded for unused distance.</li>
        </ul>
      ),
    },
    {
      title: '4. Payments & Additional Charges',
      content: (
        <div className="space-y-2">
          <p className="font-semibold">Payment Models:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Prepaid</strong> – Full fare paid at booking (includes base fare, taxes, and service charges).</li>
            <li><strong>Part Payment</strong> – Advance paid at booking, balance paid to the driver.</li>
          </ul>
          <p><strong>Not Included in Base Fare</strong> (paid directly to the driver): tolls, permits, parking, interstate taxes, entry fees, driver’s food allowance, and applicable government levies.</p>
          <p>Final fare is based on actual garage-to-garage kilometers and hours.</p>
        </div>
      ),
    },
    {
      title: '5. User Responsibilities',
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li>Carry valid government-issued photo ID.</li>
          <li>Be at pickup point on time; late arrivals may result in cancellation without refund.</li>
          <li>No post-booking changes to pickup, drop, or timing.</li>
          <li>Trips must be for personal/tourism purposes, not resale.</li>
          <li>You are responsible for your luggage safety.</li>
        </ul>
      ),
    },
    {
      title: '6. Do’s',
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li>Arrive on time.</li>
          <li>Be respectful to drivers.</li>
          <li>Confirm luggage space before starting.</li>
          <li>Check odometer reading before departure.</li>
        </ul>
      ),
    },
    {
      title: '7. Don’ts',
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li>Ask the driver to break traffic laws.</li>
          <li>Overload luggage.</li>
          <li>Use cab for unlawful purposes.</li>
          <li>Demand unscheduled drop-off points.</li>
          <li>Board if intoxicated or under drugs.</li>
        </ul>
      ),
    },
    {
      title: '8. Cancellation & Refund Policy',
      content: (
        <p>
          You may cancel bookings by calling <a href="tel:+919966363662" className="text-blue-600">+91 9966363662</a> or emailing
          <a className="text-blue-600" href="mailto:info@vizagtaxihub.com"> info@vizagtaxihub.com</a> from your registered email ID.
        </p>
      ),
    },
    {
      title: '8.1. Outstation, One-Way Rentals, Local Rentals & Airport Transfers',
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Within 4 hours of pickup</strong> – Treated as No-Show, no refund.</li>
          <li><strong>Between 4–24 hours before pickup</strong> – Cancellation charge applies; balance refunded within 21 days.</li>
        </ul>
      ),
    },
    {
      title: '8.2. Taxi/Tour/Holiday Packages',
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li><strong>30+ days before tour</strong> – 100% refund.</li>
          <li><strong>16–30 days before tour</strong> – 25% deduction, balance refunded within 21 days.</li>
          <li><strong>7–15 days before tour</strong> – 50% deduction.</li>
          <li><strong>2–6 days before tour</strong> – 75% deduction.</li>
          <li><strong>1–48 hours before arrival</strong> – No refund.</li>
          <li><strong>After driver/vendor details are shared</strong> – No refund.</li>
        </ul>
      ),
    },
    {
      title: '8.3. Mid-Journey Cancellations',
      content: <p>Full booking amount must be paid if trip is canceled mid-journey.</p>,
    },
    {
      title: '8.4. Special Conditions',
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li>No cancellation/refund on peak festival dates (Dussehra, Pongal, Diwali, Christmas, New Year, Holi).</li>
          <li>If customer confirms revised fare during peak demand and later cancels after driver details are shared – No refund.</li>
          <li>Driver/vendor delay may waive cancellation charges.</li>
          <li>No-show after 30 minutes of pickup time without contact – No refund.</li>
          <li>Full refund if driver/vendor cancels without valid reason at last hour.</li>
          <li>Full refund for unavoidable force majeure events (epidemics, floods, strikes, riots, etc.).</li>
          <li>No refund for delays or cancellations due to natural disasters, heavy traffic, roadblocks, or lockdowns.</li>
          <li>Vizag Taxi Hub reserves the right to change assigned vehicle/driver for operational reasons; such change does not qualify for cancellation refund.</li>
        </ul>
      ),
    },
    {
      title: '8.5. Refund Timeline',
      content: <p>Eligible refunds will be processed to the customer’s bank account within 21 working days.</p>,
    },
    {
      title: '9. Dispute Resolution',
      content: (
        <ul className="list-disc list-inside space-y-1">
          <li>Issues should be reported immediately to Vizag Taxi Hub.</li>
          <li>For partner-operated rides, certain matters may require coordination with the operator.</li>
        </ul>
      ),
    },
    {
      title: '10. Contact Information',
      content: (
        <address className="not-italic space-y-1">
          Vizag Taxi Hub<br />
          Visakhapatnam, Andhra Pradesh, India<br />
          Phone: <a className="text-blue-600" href="tel:+919966363662">+91 9966363662</a><br />
          Email: <a className="text-blue-600" href="mailto:info@vizagtaxihub.com">info@vizagtaxihub.com</a><br />
          Website: <a className="text-blue-600" href="https://www.vizagtaxihub.com" target="_blank" rel="noreferrer">www.vizagtaxihub.com</a>
        </address>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Helmet>
        <title>Cancellation & Refund Policy - Vizag Taxi Hub</title>
        <meta
          name="description"
          content="Read Vizag Taxi Hub's cancellation and refund policy covering booking types, payments, user responsibilities, and refund timelines."
        />
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
              Cancellation & Refund <span className="text-blue-600">Policy</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Please read this policy carefully to understand our cancellation rules and refund process.
            </p>
            <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</div>
          </motion.div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="py-8 bg-blue-50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start">
                  <AlertCircle className="w-6 h-6 text-blue-600 mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2">Important Notice</h3>
                    <p className="text-blue-800 leading-relaxed">
                      This policy applies to all bookings made with Vizag Taxi Hub, including outstation cabs, rentals, airport transfers, and tour packages.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
                    <div className="text-gray-700 leading-relaxed">{section.content}</div>
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
            <p className="text-lg text-gray-600">Key service assurances</p>
          </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <Card className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Safety First</h3>
                  <p className="text-gray-600">All drivers are verified and vehicles are regularly inspected for your safety.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
              <Card className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Transparent Policies</h3>
                  <p className="text-gray-600">Clear cancellation rules and timely refunds within 21 working days when applicable.</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}>
              <Card className="h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4 mx-auto text-white">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">24/7 Support</h3>
                  <p className="text-gray-600">Round-the-clock customer support for your booking and refund queries.</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold mb-6">Questions About This Policy?</h2>
            <p className="text-xl text-gray-300 mb-8">If you have any questions about cancellations or refunds, please contact us.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <span className="text-gray-300">Call us at:</span>
              <span className="text-white font-bold text-lg">+91-9966363662</span>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CancellationRefundPolicyPage;


