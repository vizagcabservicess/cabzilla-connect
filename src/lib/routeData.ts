import { slugify } from '@/lib/utils';

export interface RouteInfo {
  from: string;
  to: string;
  distance: string;
  time: string;
  description: string;
  image: string;
  fares: {
    sedan: string;
    suv: string;
    tempo?: string;
    luxury?: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  content: string;
}

export const popularRoutes: RouteInfo[] = [
  // Existing & New Routes
  {
    from: 'Visakhapatnam',
    to: 'Araku Valley',
    distance: '120 KM',
    time: '3-4 Hours',
    description: 'Explore the serene hills and coffee plantations of Araku.',
    image: 'https://images.unsplash.com/photo-1594774591439-ed8e4fe33400?w=500&h=300&fit=crop',
    fares: { sedan: '₹3,500', suv: '₹4,500' },
    seo: {
      title: 'Visakhapatnam to Araku Valley Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Araku Valley. Enjoy a comfortable journey to explore serene hills and coffee plantations. Safe, reliable, and affordable cabs.',
      keywords: 'visakhapatnam to araku valley taxi, vizag to araku cabs, araku valley tour package'
    },
    content: `<p>Embark on a scenic journey from Visakhapatnam to the breathtaking Araku Valley. Our reliable taxi service ensures a comfortable and memorable trip through winding ghat roads, lush green landscapes, and mesmerizing coffee plantations. Araku Valley is a perfect getaway for nature lovers, offering attractions like the Borra Caves, Padmapuram Gardens, and tribal museums.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Narsipatnam',
    distance: '80 KM',
    time: '2 Hours',
    description: 'Discover lush landscapes and nearby waterfalls, a perfect nature escape.',
    image: 'https://images.unsplash.com/photo-1505144808419-1957a94ca61e?w=500&h=300&fit=crop',
    fares: { sedan: '₹2,000', suv: '₹2,800' },
    seo: {
        title: 'Visakhapatnam to Narsipatnam Taxi | Affordable Cabs',
        description: 'Travel from Visakhapatnam to Narsipatnam with our trusted taxi service. Explore waterfalls and natural attractions. Book your comfortable ride today!',
        keywords: 'visakhapatnam to narsipatnam taxi, cabs to narsipatnam, narsipatnam trip'
    },
    content: `<p>Journey from Visakhapatnam to Narsipatnam, a town celebrated for its proximity to stunning waterfalls and verdant landscapes. It's an ideal destination for those seeking a quick and refreshing escape into nature. Our cab service provides a smooth and safe ride, allowing you to relax and enjoy the scenery.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Annavaram',
    distance: '125 KM',
    time: '3 Hours',
    description: 'Embark on a spiritual journey to the famed Satyanarayana Swamy Temple.',
    image: 'https://images.unsplash.com/photo-1605613136450-13a89191a783?w=500&h=300&fit=crop',
    fares: { sedan: '₹3,000', suv: '₹4,000' },
    seo: {
        title: 'Visakhapatnam to Annavaram Taxi | Temple Darshan Cabs',
        description: 'Book a taxi from Visakhapatnam to Annavaram for a divine pilgrimage to the Satyanarayana Swamy Temple. We offer reliable and comfortable rides for your spiritual journey.',
        keywords: 'visakhapatnam to annavaram taxi, annavaram temple cabs, vizag to annavaram'
    },
    content: `<p>Take a spiritual trip from Visakhapatnam to Annavaram, home to the renowned Sri Veera Venkata Satyanarayanaswamy Vari Devasthanam. Our taxi service offers a peaceful and comfortable journey for your pilgrimage. The temple, situated on Ratnagiri hill, is a significant spiritual center in Andhra Pradesh.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Kakinada',
    distance: '160 KM',
    time: '3-4 Hours',
    description: 'Explore the "Fertilizer City" with its beautiful coastline and rich culture.',
    image: 'https://images.unsplash.com/photo-1621945235317-b749a0a0ab3a?w=500&h=300&fit=crop',
    fares: { sedan: '₹3,800', suv: '₹5,000' },
    seo: {
        title: 'Visakhapatnam to Kakinada Taxi | Coastal Ride Cabs',
        description: 'Book your cab from Visakhapatnam to Kakinada. Discover its beautiful coastline, rich culture, and delicious local cuisine with our reliable taxi service.',
        keywords: 'visakhapatnam to kakinada taxi, vizag to kakinada cabs, kakinada travel'
    },
    content: `<p>Travel from Visakhapatnam to Kakinada, a major port city known as the "Fertilizer City." Enjoy its serene beaches like Uppada, explore the Coringa Wildlife Sanctuary, and savor the famous Kakinada Kaja. Our cabs ensure a comfortable ride along the scenic coastal route.</p>`
  },
   {
    from: 'Visakhapatnam',
    to: 'Rajahmundry',
    distance: '200 KM',
    time: '4-5 Hours',
    description: 'Experience culture on the banks of Godavari.',
    image: 'https://images.unsplash.com/photo-1629822359420-554199d2b27a?w=500&h=300&fit=crop',
    fares: { sedan: '₹4,500', suv: '₹5,800' },
    seo: {
        title: 'Visakhapatnam to Rajahmundry Taxi | Godavari Bank Cabs',
        description: 'Book a taxi from Visakhapatnam to Rajahmundry and explore the cultural capital of Andhra Pradesh on the banks of the Godavari river. Comfortable and safe journey guaranteed.',
        keywords: 'visakhapatnam to rajahmundry taxi, vizag to rajahmundry cabs, godavari tour'
    },
    content: `<p>Journey to Rajahmundry, the cultural heart of Andhra Pradesh, situated on the banks of the mighty Godavari River. Visit the ISKCON temple, take a boat ride on the Godavari, and walk across the iconic Godavari Arch Bridge. Our taxi service provides a comfortable and scenic drive from Visakhapatnam.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Vijayawada',
    distance: '350 KM',
    time: '7-8 Hours',
    description: 'Explore the bustling city on the banks of Krishna, home to Kanaka Durga Temple.',
    image: 'https://images.unsplash.com/photo-1593365463032-05a9193b4e6?w=500&h=300&fit=crop',
    fares: { sedan: '₹7,000', suv: '₹9,000' },
    seo: {
        title: 'Visakhapatnam to Vijayawada Taxi | Business & Leisure Cabs',
        description: 'Book a reliable taxi from Visakhapatnam to Vijayawada. Visit the Kanaka Durga Temple, explore Undavalli Caves, and enjoy the vibrant city life with our comfortable cabs.',
        keywords: 'visakhapatnam to vijayawada taxi, vizag to vijayawada cabs, bezawada taxi'
    },
    content: `<p>Travel from Visakhapatnam to the bustling city of Vijayawada, a major commercial hub on the banks of the Krishna River. Seek blessings at the Kanaka Durga Temple, explore the ancient Undavalli Caves, and enjoy the city's dynamic atmosphere. Our long-distance cabs make the journey comfortable and convenient.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Hyderabad',
    distance: '620 KM',
    time: '11-12 Hours',
    description: 'Discover the City of Pearls, with its iconic Charminar and delicious biryani.',
    image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&h=300&fit=crop',
    fares: { sedan: '₹12,000', suv: '₹15,000' },
    seo: {
        title: 'Visakhapatnam to Hyderabad Taxi | City of Pearls Cabs',
        description: 'Book a one-way or round trip taxi from Visakhapatnam to Hyderabad. Explore Charminar, Golconda Fort, and taste the world-famous Hyderabadi biryani. Safe and comfortable cabs.',
        keywords: 'visakhapatnam to hyderabad taxi, vizag to hyderabad cabs, hyderabad trip'
    },
    content: `<p>Plan your trip from Visakhapatnam to Hyderabad, the vibrant "City of Pearls." Our comfortable outstation taxis are perfect for this long journey. Discover iconic landmarks like the Charminar, Golconda Fort, and Ramoji Film City. Don't forget to indulge in the legendary Hyderabadi biryani. We ensure your travel is smooth and enjoyable.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Puri (Odisha)',
    distance: '450 KM',
    time: '9-10 Hours',
    description: 'A holy city famous for the Jagannath Temple and its beautiful coastline.',
    image: 'https://images.unsplash.com/photo-1599432868243-55d8f6f5e85d?w=500&h=300&fit=crop',
    fares: { sedan: '₹9,500', suv: '₹12,000' },
    seo: {
        title: 'Visakhapatnam to Puri Taxi | Jagannath Dham Yatra Cabs',
        description: 'Book a taxi from Visakhapatnam to Puri for a pilgrimage to the Jagannath Temple. Enjoy the beautiful Golden Beach and other attractions with our reliable cab service.',
        keywords: 'visakhapatnam to puri taxi, vizag to puri cabs, jagannath temple yatra'
    },
    content: `<p>Embark on a spiritual journey from Visakhapatnam to the holy city of Puri in Odisha. Our outstation taxi service provides a safe and comfortable ride to the abode of Lord Jagannath. Besides the main temple, you can relax at the Golden Beach, visit the Konark Sun Temple nearby, and explore local crafts. Book your divine trip with us.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Guntur',
    distance: '410 KM',
    time: '6-7 Hours',
    description: 'Explore the vibrant commercial city known for its spicy cuisine and rich culture.',
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=500&h=300&fit=crop',
    fares: { sedan: '₹6,100', suv: '₹7,800' },
    seo: {
        title: 'Visakhapatnam to Guntur Taxi | Commercial Hub Cabs',
        description: 'Book a reliable taxi from Visakhapatnam to Guntur. Explore the bustling commercial city known for spicy cuisine and vibrant culture. Premium outstation services available.',
        keywords: 'visakhapatnam to guntur taxi, vizag to guntur cabs, guntur outstation travel'
    },
    content: `<p>Travel from Visakhapatnam to Guntur, a bustling commercial city in Andhra Pradesh, known for its vibrant culture and spicy cuisine. The 410 KM journey takes around 6–7 hours. Whether you're visiting for business or leisure, enjoy a premium travel experience with our professional drivers and all-inclusive pricing.</p>`
  }
  // More routes can be added here following the same structure.
];

// Helper to find a route for the detail page
export const getRouteBySlug = (fromSlug?: string, toSlug?: string) => {
  if (!fromSlug || !toSlug) return undefined;
  return popularRoutes.find(
    r => slugify(r.from) === fromSlug && slugify(r.to) === toSlug
  );
};
