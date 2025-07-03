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
    faq: { question: string; answer: string }[];
    extraContent: string;
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
      keywords: 'visakhapatnam to araku valley taxi, vizag to araku cabs, araku valley tour package',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Araku Valley?', answer: 'The distance is approximately 120 KM by road.' },
        { question: 'How long does it take to reach Araku Valley from Vizag?', answer: 'It usually takes about 3-4 hours depending on traffic and weather conditions.' },
        { question: 'Are there sightseeing stops on the way?', answer: 'Yes, you can visit Borra Caves, coffee plantations, and Padmapuram Gardens en route.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> The best time to visit Araku Valley is from October to March for pleasant weather and lush green views. Don\'t forget to try the local coffee and tribal cuisine!</p>'
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
    description: 'Visit the temple town of Annavaram, famous for the Satyanarayana Swamy Temple.',
    image: '',
    fares: { sedan: '₹3,000', suv: '₹4,000' },
    seo: {
      title: 'Visakhapatnam to Annavaram Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Annavaram. Enjoy a comfortable journey to the temple town, famous for the Satyanarayana Swamy Temple.',
      keywords: 'visakhapatnam to annavaram taxi, vizag to annavaram cabs, annavaram travel',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Annavaram?', answer: 'The distance is approximately 125 KM by road.' },
        { question: 'How long does it take to reach Annavaram from Vizag?', answer: 'It usually takes about 3 hours depending on traffic and road conditions.' },
        { question: 'What is Annavaram famous for?', answer: 'Annavaram is renowned for the Satyanarayana Swamy Temple.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> The best time to visit Annavaram is during the temple festivals for a spiritual experience.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Annavaram, a spiritual destination in Andhra Pradesh. Our taxi service ensures a safe and comfortable ride to the famous Satyanarayana Swamy Temple, located on Ratnagiri hill.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Kakinada',
    distance: '160 KM',
    time: '3-4 Hours',
    description: 'Explore the beautiful port city of Kakinada, known for its beaches and culture.',
    image: '',
    fares: { sedan: '₹3,800', suv: '₹5,000' },
    seo: {
      title: 'Visakhapatnam to Kakinada Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Kakinada. Enjoy a comfortable journey to the port city, famous for its beaches and delicious cuisine.',
      keywords: 'visakhapatnam to kakinada taxi, vizag to kakinada cabs, kakinada travel',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Kakinada?', answer: 'The distance is approximately 160 KM by road.' },
        { question: 'How long does it take to reach Kakinada from Vizag?', answer: 'It usually takes about 3-4 hours depending on traffic and road conditions.' },
        { question: 'What is Kakinada famous for?', answer: 'Kakinada is known for its port, beaches, and the famous Kakinada Kaja sweet.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> Visit Coringa Wildlife Sanctuary and enjoy the local seafood in Kakinada.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Kakinada, a vibrant port city on the east coast. Our taxi service ensures a safe and comfortable ride. Explore the beaches, try the local cuisine, and visit the Coringa Wildlife Sanctuary.</p>`
  },
   {
    from: 'Visakhapatnam',
    to: 'Rajahmundry',
    distance: '200 KM',
    time: '4-5 Hours',
    description: 'Experience culture on the banks of Godavari.',
    image: '',
    fares: { sedan: '₹4,500', suv: '₹5,800' },
    seo: {
      title: 'Visakhapatnam to Rajahmundry Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Rajahmundry. Enjoy a comfortable journey to the cultural capital of Andhra Pradesh on the banks of the Godavari river.',
      keywords: 'visakhapatnam to rajahmundry taxi, vizag to rajahmundry cabs, godavari tour',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Rajahmundry?', answer: 'The distance is approximately 200 KM by road.' },
        { question: 'How long does it take to reach Rajahmundry from Vizag?', answer: 'It usually takes about 4-5 hours depending on traffic and road conditions.' },
        { question: 'What is Rajahmundry famous for?', answer: 'Rajahmundry is known for the Godavari river, ISKCON temple, and cultural heritage.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> Take a boat ride on the Godavari and visit the ISKCON temple in Rajahmundry.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Rajahmundry, the cultural heart of Andhra Pradesh. Our taxi service ensures a safe and comfortable ride along scenic highways. Explore the Godavari river, visit temples, and enjoy the local food scene in Rajahmundry.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Vijayawada',
    distance: '350 KM',
    time: '7-8 Hours',
    description: 'Explore the bustling city on the banks of Krishna, home to Kanaka Durga Temple.',
    image: '',
    fares: { sedan: '₹7,000', suv: '₹9,000' },
    seo: {
      title: 'Visakhapatnam to Vijayawada Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Vijayawada. Enjoy a comfortable journey to the business and cultural hub of Andhra Pradesh.',
      keywords: 'visakhapatnam to vijayawada taxi, vizag to vijayawada cabs, vijayawada travel',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Vijayawada?', answer: 'The distance is approximately 350 KM by road.' },
        { question: 'How long does it take to reach Vijayawada from Vizag?', answer: 'It usually takes about 7-8 hours depending on traffic and road conditions.' },
        { question: 'What is Vijayawada famous for?', answer: 'Vijayawada is known for the Kanaka Durga Temple, Undavalli Caves, and the Krishna river.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> Visit the Kanaka Durga Temple and try the local Andhra cuisine in Vijayawada.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Vijayawada, a major city on the banks of the Krishna river. Our taxi service ensures a safe and comfortable ride. Explore temples, caves, and the vibrant city life in Vijayawada.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Hyderabad',
    distance: '620 KM',
    time: '11-12 Hours',
    description: 'Discover the City of Pearls, with its iconic Charminar and delicious biryani.',
    image: '',
    fares: { sedan: '₹12,000', suv: '₹15,000' },
    seo: {
      title: 'Visakhapatnam to Hyderabad Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Hyderabad. Enjoy a comfortable journey to the City of Pearls, famous for its history, culture, and cuisine.',
      keywords: 'visakhapatnam to hyderabad taxi, vizag to hyderabad cabs, hyderabad travel',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Hyderabad?', answer: 'The distance is approximately 620 KM by road.' },
        { question: 'How long does it take to reach Hyderabad from Vizag?', answer: 'It usually takes about 11-12 hours depending on traffic and road conditions.' },
        { question: 'What is Hyderabad famous for?', answer: 'Hyderabad is known for Charminar, Golconda Fort, and Hyderabadi biryani.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> Visit Charminar, try Hyderabadi biryani, and explore the old city in Hyderabad.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Hyderabad, the capital city of Telangana. Our taxi service ensures a safe and comfortable ride. Explore historical sites, taste the famous biryani, and enjoy the vibrant city life in Hyderabad.</p>`
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
    distance: '370 KM',
    time: '7-8 Hours',
    description: 'Travel to the heart of Andhra Pradesh, known for its rich history and spicy cuisine.',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&h=300&fit=crop',
    fares: { sedan: '₹7,500', suv: '₹9,500' },
    seo: {
      title: 'Visakhapatnam to Guntur Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Guntur. Enjoy a comfortable journey to the heart of Andhra Pradesh, famous for its history, culture, and cuisine.',
      keywords: 'visakhapatnam to guntur taxi, vizag to guntur cabs, guntur travel',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Guntur?', answer: 'The distance is approximately 370 KM by road.' },
        { question: 'How long does it take to reach Guntur from Vizag?', answer: 'It usually takes about 7-8 hours depending on traffic and road conditions.' },
        { question: 'What are some attractions in Guntur?', answer: 'Guntur is known for Amaravati, Kondaveedu Fort, Uppalapadu Bird Sanctuary, and its spicy cuisine.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> Guntur is famous for its chillies and delicious Andhra meals. The best time to visit is between November and February for pleasant weather.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Guntur, a vibrant city in Andhra Pradesh known for its rich history, educational institutions, and spicy cuisine. Our taxi service ensures a safe and comfortable ride through scenic highways. Explore Amaravati, visit ancient temples, and enjoy the local food scene in Guntur.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Chennai',
    distance: '800 KM',
    time: '14-15 Hours',
    description: 'Travel to the capital of Tamil Nadu, known for its beaches and culture.',
    image: '',
    fares: { sedan: '₹15,000', suv: '₹18,000' },
    seo: {
      title: 'Visakhapatnam to Chennai Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Chennai. Enjoy a comfortable journey to the capital city, famous for Marina Beach and rich heritage.',
      keywords: 'visakhapatnam to chennai taxi, vizag to chennai cabs, chennai travel',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Chennai?', answer: 'The distance is approximately 800 KM by road.' },
        { question: 'How long does it take to reach Chennai from Vizag?', answer: 'It usually takes about 14-15 hours depending on traffic and road conditions.' },
        { question: 'What is Chennai famous for?', answer: 'Chennai is known for Marina Beach, temples, and South Indian cuisine.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> Visit Marina Beach and try authentic South Indian filter coffee in Chennai.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Chennai, the capital city of Tamil Nadu. Our taxi service ensures a safe and comfortable ride. Explore beaches, temples, and the vibrant city life in Chennai.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Bangalore',
    distance: '1000 KM',
    time: '18-20 Hours',
    description: 'Visit the Garden City, known for its parks, IT industry, and pleasant climate.',
    image: '',
    fares: { sedan: '₹18,000', suv: '₹22,000' },
    seo: {
      title: 'Visakhapatnam to Bangalore Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Bangalore. Enjoy a comfortable journey to the Garden City, famous for its parks and tech industry.',
      keywords: 'visakhapatnam to bangalore taxi, vizag to bangalore cabs, bangalore travel',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Bangalore?', answer: 'The distance is approximately 1000 KM by road.' },
        { question: 'How long does it take to reach Bangalore from Vizag?', answer: 'It usually takes about 18-20 hours depending on traffic and road conditions.' },
        { question: 'What is Bangalore famous for?', answer: 'Bangalore is known for its gardens, IT industry, and pleasant weather.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> Visit Lalbagh Botanical Garden and enjoy the cool evenings in Bangalore.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Bangalore, the IT capital of India. Our taxi service ensures a safe and comfortable ride. Explore parks, cafes, and the cosmopolitan culture of Bangalore.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Tirupati',
    distance: '760 KM',
    time: '13-14 Hours',
    description: 'Visit the holy city of Tirupati, home to the famous Venkateswara Temple.',
    image: '',
    fares: { sedan: '₹14,000', suv: '₹17,000' },
    seo: {
      title: 'Visakhapatnam to Tirupati Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Tirupati. Enjoy a comfortable journey to the holy city, famous for the Venkateswara Temple.',
      keywords: 'visakhapatnam to tirupati taxi, vizag to tirupati cabs, tirupati travel',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Tirupati?', answer: 'The distance is approximately 760 KM by road.' },
        { question: 'How long does it take to reach Tirupati from Vizag?', answer: 'It usually takes about 13-14 hours depending on traffic and road conditions.' },
        { question: 'What is Tirupati famous for?', answer: 'Tirupati is known for the Venkateswara Temple, one of the most visited pilgrimage sites in India.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> Book your darshan tickets in advance for a smooth pilgrimage experience in Tirupati.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Tirupati, a major pilgrimage city in Andhra Pradesh. Our taxi service ensures a safe and comfortable ride. Visit the famous Venkateswara Temple and explore the spiritual atmosphere of Tirupati.</p>`
  },
  {
    from: 'Visakhapatnam',
    to: 'Nellore',
    distance: '700 KM',
    time: '12-13 Hours',
    description: 'Visit Nellore, known for its agriculture, temples, and delicious seafood.',
    image: '',
    fares: { sedan: '₹13,000', suv: '₹16,000' },
    seo: {
      title: 'Visakhapatnam to Nellore Taxi | Book Cabs at Best Fares',
      description: 'Book a taxi from Visakhapatnam to Nellore. Enjoy a comfortable journey to the city, famous for its agriculture and temples.',
      keywords: 'visakhapatnam to nellore taxi, vizag to nellore cabs, nellore travel',
      faq: [
        { question: 'What is the distance from Visakhapatnam to Nellore?', answer: 'The distance is approximately 700 KM by road.' },
        { question: 'How long does it take to reach Nellore from Vizag?', answer: 'It usually takes about 12-13 hours depending on traffic and road conditions.' },
        { question: 'What is Nellore famous for?', answer: 'Nellore is known for its agriculture, temples, and seafood.' }
      ],
      extraContent: '<p><strong>Travel Tip:</strong> Try the local Nellore fish curry and visit the Ranganatha Temple.</p>'
    },
    content: `<p>Travel from Visakhapatnam to Nellore, a city in Andhra Pradesh known for its agriculture and temples. Our taxi service ensures a safe and comfortable ride. Explore temples, try the local cuisine, and enjoy the hospitality of Nellore.</p>`
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
