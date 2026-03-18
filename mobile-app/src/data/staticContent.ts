/**
 * Static content for native Support and Legal screens
 * Mirrors content from web app pages
 */
export type ContentKey = 'terms' | 'privacy' | 'refund';

export interface ContentSection {
  title: string;
  content: string;
}

export const STATIC_CONTENT: Record<ContentKey, { title: string; sections: ContentSection[] }> = {
  terms: {
    title: 'Terms & Conditions',
    sections: [
      { title: '1. Acceptance of Terms', content: 'By using Vizag Taxi Hub services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.' },
      { title: '2. Service Description', content: 'Vizag Taxi Hub provides taxi booking and transportation services including local rides, outstation trips, and airport transfers. We connect passengers with professional drivers through our booking platform.' },
      { title: '3. Booking and Reservations', content: 'Bookings can be made via phone, website, or WhatsApp. All bookings are subject to availability. We reserve the right to refuse service at our discretion. Advance bookings are recommended for outstation and airport trips.' },
      { title: '4. Payment Terms', content: 'Payment can be made via cash, UPI, credit/debit cards, or digital wallets. For outstation trips, advance payment may be required. All fares are inclusive of applicable taxes unless otherwise specified.' },
      { title: '5. Cancellation Policy', content: 'Cancellations must be made by calling our support team at +91-9966363662. Cancellation charges may apply. Refer to our Cancellation Refund Policy for more details.' },
      { title: '6. Driver and Vehicle Standards', content: 'All our drivers are licensed and verified. Vehicles are regularly maintained and inspected. We strive to provide clean, safe, and comfortable transportation.' },
      { title: '7. Passenger Responsibilities', content: 'Passengers must provide accurate pickup locations and contact information. Disruptive behavior, damage to vehicles, or illegal activities will result in immediate termination of service and potential legal action.' },
      { title: '8. Liability and Insurance', content: 'While we maintain comprehensive insurance coverage, passengers are advised to have their own travel insurance. Our liability is limited to the fare amount paid for the specific trip.' },
      { title: '9. Privacy and Data Protection', content: 'We collect and use personal information as outlined in our Privacy Policy. Your data is protected and will not be shared with third parties without consent, except as required by law.' },
      { title: '10. Force Majeure', content: 'We are not liable for delays or cancellations due to circumstances beyond our control including weather, traffic, road conditions, or government restrictions.' },
      { title: '11. Dispute Resolution', content: 'Any disputes will be resolved through negotiation. If unresolved, disputes will be subject to the jurisdiction of courts in Visakhapatnam, Andhra Pradesh.' },
      { title: '12. Changes to Terms', content: 'We reserve the right to modify these terms at any time. Updated terms will be posted on our website. Continued use of our services constitutes acceptance of revised terms.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      { title: '1. Information We Collect', content: 'We collect information you provide directly (name, phone number, email, pickup/drop locations), automatically when using our services (device information, location data, usage patterns), and from third parties when necessary for service delivery.' },
      { title: '2. How We Use Your Information', content: 'Your information is used to provide taxi services, process bookings and payments, communicate about your trips, improve our services, ensure safety and security, comply with legal obligations, and send important updates.' },
      { title: '3. Information Sharing', content: 'We share your information only when necessary: with drivers for trip coordination, with payment processors for transactions, with authorities when legally required, and with service providers who help us operate under strict confidentiality.' },
      { title: '4. Data Security', content: 'We implement industry-standard security measures including encryption of sensitive data, secure data transmission, regular security audits, access controls, and secure data storage practices.' },
      { title: '5. Location Information', content: 'We collect location data to provide pickup services, optimize routes, and ensure driver and passenger safety. Location tracking is only active during active bookings and can be controlled through your device settings.' },
      { title: '6. Data Retention', content: 'We retain your personal information for as long as necessary to provide services, comply with legal obligations, resolve disputes, and enforce agreements. Trip data is typically retained for 3 years for safety and legal compliance.' },
      { title: '7. Your Rights', content: 'You have the right to access your personal information, correct inaccurate data, request deletion of your data, object to processing, request data portability, and withdraw consent. Contact us to exercise these rights.' },
      { title: '8. Third-Party Services', content: 'We may use third-party services like Google Maps, payment gateways, and analytics tools. These services have their own privacy policies, and we encourage you to review them.' },
      { title: '9. Children\'s Privacy', content: 'Our services are not intended for children under 13. We do not knowingly collect personal information from children.' },
      { title: '10. Changes to This Policy', content: 'We may update this Privacy Policy periodically. We will notify you of significant changes via email or website notice. Your continued use of our services constitutes acceptance of the updated policy.' },
    ],
  },
  refund: {
    title: 'Cancellation & Refund Policy',
    sections: [
      { title: '1. Definitions', content: 'Cab – Includes sedans, hatchbacks, SUVs, MUVs, and any other passenger transport vehicles. Cab Operator – Drivers or operators providing vehicles with drivers, including Vizag Taxi Hub\'s own fleet and associated partner vehicles.' },
      { title: '2. Types of Cab Bookings', content: 'Vizag Taxi Hub facilitates Outstation Cab (travel between cities using AITP vehicles), Car Rental (hourly or full-day exclusive rentals), and Airport Transfer (pickup and drop services to and from the airport within city limits).' },
      { title: '3. Role & Limitation of Liability', content: 'Vizag Taxi Hub operates both its own vehicles and partner-operated vehicles. For partner bookings, we act as a facilitator. Cab operators are responsible for valid licenses, permits, insurance, and vehicle condition. We are not liable for delays, breakdowns, cancellations, or lost baggage.' },
      { title: '4. Payments & Additional Charges', content: 'Payment Models: Prepaid (full fare at booking) or Part Payment (advance at booking, balance to driver). Not included in base fare: tolls, permits, parking, interstate taxes, entry fees, driver\'s food allowance. Final fare is based on actual garage-to-garage kilometers and hours.' },
      { title: '5. User Responsibilities', content: 'Carry valid government-issued photo ID. Be at pickup point on time; late arrivals may result in cancellation without refund. No post-booking changes to pickup, drop, or timing. Trips must be for personal/tourism purposes. You are responsible for your luggage safety.' },
      { title: '6. Cancellation & Refund', content: 'You may cancel bookings by calling +91-9966363662 or emailing info@vizagtaxihub.com from your registered email. Cancellation charges apply based on timing. Full refund for cancellations made within the policy window. Please contact support for specific refund timelines.' },
    ],
  },
};

export interface FAQItem {
  category: string;
  question: string;
  answer: string;
}

export const HELP_FAQS: FAQItem[] = [
  { category: 'Booking', question: 'How do I book a taxi?', answer: 'You can book a taxi by calling +91-9966363662, using our website booking form, or through WhatsApp. Simply provide your pickup location, destination, date, and time.' },
  { category: 'Booking', question: 'Can I book a ride in advance?', answer: 'Yes, you can book rides up to 30 days in advance. This is especially useful for airport transfers and outstation trips.' },
  { category: 'Booking', question: 'How do I cancel my booking?', answer: 'You can cancel your booking by calling our support team at +91-9966363662. Cancellation charges may apply based on the timing of cancellation.' },
  { category: 'Payment', question: 'What payment methods do you accept?', answer: 'We accept cash, UPI, credit/debit cards, and digital wallets. Payment can be made directly to the driver or through our online payment system.' },
  { category: 'Payment', question: 'How is the fare calculated?', answer: 'Fares are calculated based on distance, time, vehicle type, and service type (local/outstation/airport). All rates are transparent with no hidden charges.' },
  { category: 'Service', question: 'Do you provide 24/7 service?', answer: 'Yes, we provide 24/7 taxi services for all types of trips including local rides, outstation journeys, and airport transfers.' },
  { category: 'Service', question: 'Can I track my driver?', answer: "Once your booking is confirmed, you'll receive driver details including phone number. You can call the driver directly for real-time location updates." },
  { category: 'Service', question: 'What if my driver is late?', answer: "If your driver is running late, please call our support team immediately. We'll either update you on the driver's location or arrange an alternative vehicle." },
];
