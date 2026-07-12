export const BRAND_BLUE = '#0066FF';

export const TRUST_STATS = [
  { id: 'rating', label: 'Google Rating', value: 4.9, suffix: '/5', decimals: 1 },
  { id: 'customers', label: 'Happy Customers', value: 10000, suffix: '+', decimals: 0 },
  { id: 'corporate', label: 'Corporate Clients', value: 120, suffix: '+', decimals: 0 },
  { id: 'drivers', label: 'Verified Drivers', value: 50, suffix: '+', decimals: 0 },
  { id: 'trips', label: 'Trips Completed', value: 25000, suffix: '+', decimals: 0 },
] as const;

export const WHY_CHOOSE_FEATURES = [
  { title: '24×7 Support', description: 'Round-the-clock assistance for bookings, changes, and emergencies.', icon: 'headphones' as const },
  { title: 'GPS Tracking', description: 'Live cab tracking for safety and accurate ETAs on every trip.', icon: 'map' as const },
  { title: 'Verified Drivers', description: 'Background-checked, trained drivers with clean driving records.', icon: 'shield' as const },
  { title: 'Transparent Pricing', description: 'Upfront fares with no hidden charges — what you see is what you pay.', icon: 'credit' as const },
  { title: 'Sanitized Vehicles', description: 'Regularly cleaned and maintained AC fleet for comfortable travel.', icon: 'sparkles' as const },
  { title: 'Instant Booking', description: 'Book in seconds with real-time availability and quick confirmation.', icon: 'zap' as const },
] as const;

export const POPULAR_TOURS = [
  { slug: 'araku-valley-tour', name: 'Araku Valley', duration: '1–2 Days', price: '₹4,999', image: '/images/tours/araku.jpg', fallback: 'from-blue-50 to-blue-100' },
  { slug: 'lambasingi-tour', name: 'Lambasingi', duration: '1 Day', price: '₹3,499', image: '/images/tours/lambasingi.jpg', fallback: 'from-sky-50 to-blue-50' },
  { slug: 'vizag-north-city-tour', name: 'Vizag City Tour', duration: '8 Hours', price: '₹2,499', image: '/images/tours/vizag-city.jpg', fallback: 'from-amber-50 to-blue-50' },
  { slug: 'vanajangi-tour', name: 'Vanajangi', duration: '1 Day', price: '₹3,999', image: '/images/tours/lambasingi.jpg', fallback: 'from-slate-50 to-blue-50' },
  { slug: 'arasavalli-srikurmam-tour', name: 'Arasavalli Temple Tour', duration: '1 Day', price: '₹2,499', image: '/images/tours/temple.jpg', fallback: 'from-amber-50 to-blue-50' },
  { slug: 'araku-vizag-3d-2n', name: 'Araku & Vizag 3D/2N', duration: '3 Days', price: '₹12,999', image: '/images/tours/araku.jpg', fallback: 'from-blue-50 to-white' },
] as const;

export const SERVICE_HIGHLIGHTS = [
  {
    title: 'Corporate Travel',
    description: 'Dedicated fleet, invoicing, and SLA-backed transport for businesses across Vizag.',
    href: '/corporate-tempo-traveller-vizag',
    icon: 'briefcase' as const,
  },
  {
    title: 'Wedding Transportation',
    description: 'Decorated vehicles, guest shuttles, and premium convoy management.',
    href: '/wedding-tempo-traveller-vizag',
    icon: 'heart' as const,
  },
  {
    title: 'Airport Services',
    description: 'On-time airport pickups and drops with flight tracking and fixed fares.',
    href: '/airport-taxi',
    icon: 'plane' as const,
  },
] as const;

export const HOME_FEATURES = [
  { title: 'AI Trip Planner', description: 'Smart itineraries across Andhra Pradesh', status: 'coming-soon' as const },
  { title: 'Fare Estimator', description: 'Instant outstation fare quotes', status: 'live' as const, href: '/outstation-taxi' },
  { title: 'Live Cab Tracking', description: 'Track your ride in real time', status: 'live' as const, href: '/dashboard' },
  { title: 'Driver Profiles', description: 'Verified driver details & ratings', status: 'coming-soon' as const },
  { title: 'Price Calculator', description: 'Compare trip costs by vehicle', status: 'live' as const, href: '/fleet' },
  { title: 'Package Comparison', description: 'Side-by-side tour packages', status: 'live' as const, href: '/tours' },
  { title: 'Saved Trips', description: 'Quick rebook from history', status: 'live' as const, href: '/dashboard' },
  { title: 'Loyalty Program', description: 'Earn rewards on every ride', status: 'coming-soon' as const },
  { title: 'Referral Rewards', description: 'Invite friends, earn credits', status: 'coming-soon' as const },
  { title: 'EMI Payments', description: 'Flexible payment options', status: 'coming-soon' as const },
  { title: 'Corporate Dashboard', description: 'Manage team travel at scale', status: 'live' as const, href: '/corporate-tempo-traveller-vizag' },
  { title: 'Wallet', description: 'Fast checkout with stored balance', status: 'coming-soon' as const },
  { title: 'Coupon Engine', description: 'Apply promo codes at checkout', status: 'live' as const, href: '/signup' },
  { title: 'Route Recommendations', description: 'Popular scenic routes from Vizag', status: 'live' as const, href: '/outstation-taxi' },
  { title: 'Nearby Attractions', description: 'Discover places along your route', status: 'live' as const, href: '/tours' },
] as const;

export const FAQ_ITEMS = [
  { q: 'How do I book a cab in Visakhapatnam?', a: 'Use the booking widget on our homepage — select trip type, enter pickup/drop, choose date, and search available vehicles. You can also call us at 9966363662.' },
  { q: 'Do you offer airport transfer services?', a: 'Yes. We provide 24/7 airport pickup and drop with fixed fares, flight tracking, and professional drivers.' },
  { q: 'What vehicles are available?', a: 'Our fleet includes Sedan, Ertiga, Innova Crysta, Toyota Glanza, Tempo Traveller, and Urbania — suitable for solo travellers to large groups.' },
  { q: 'Are fares transparent?', a: 'Absolutely. We show upfront pricing with no hidden charges. Outstation fares are per km; local packages are hourly with km limits.' },
  { q: 'Can I book for corporate or wedding events?', a: 'Yes. We offer dedicated corporate transport and wedding convoy services with bulk booking and invoicing support.' },
  { q: 'What is your cancellation policy?', a: 'Cancellation terms vary by trip type. Please see our Cancellation & Refund Policy page for full details.' },
] as const;

export const PARTNERS = ['IT Parks', 'Hotels', 'Event Planners', 'Travel Agents', 'Corporate HR', 'Wedding Venues'] as const;

export const AWARDS = [
  { title: 'Trusted Local Operator', year: '2024' },
  { title: 'Top Rated on Google', year: '2025' },
  { title: 'Verified Fleet Partner', year: '2024' },
] as const;

export const BLOG_POSTS = [
  { title: 'Best Time to Visit Araku Valley', excerpt: 'Plan your perfect hill-station getaway from Vizag.', date: 'Mar 2026', href: '/help-center' },
  { title: 'Vizag Airport Taxi Guide', excerpt: 'Everything you need for smooth airport transfers.', date: 'Feb 2026', href: '/airport-taxi' },
  { title: 'Top 5 Outstation Routes from Vizag', excerpt: 'Hyderabad, Araku, Lambasingi and more.', date: 'Jan 2026', href: '/outstation-taxi' },
] as const;
