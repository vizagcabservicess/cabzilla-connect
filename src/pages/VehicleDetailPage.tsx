import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Car, Users, Fuel, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import ImageGallery from '@/components/vehicle/ImageGallery';
import RateCardPanel from '@/components/vehicle/RateCardPanel';
import VehicleTabs from '@/components/vehicle/VehicleTabs';
import RateCard from '@/components/vehicle/RateCard';
import SimilarVehicles from '@/components/vehicle/SimilarVehicles';
import VehicleTours from '@/components/vehicle/VehicleTours';
import { getVehicleData } from '@/services/vehicleDataService';
import { GalleryItem } from '@/types/cab';
import { vehicleGalleryAPI } from '@/services/api/vehicleGalleryAPI';
import { Helmet } from 'react-helmet-async';

interface VehicleData {
  id: string;
  name: string;
  capacity: number;
  fuelType?: string;
  image?: string;
  gallery?: GalleryItem[];
  tags?: string[];
  overview?: string;
  specs?: {
    seatingCapacity?: string;
    fuelType?: string;
    transmission?: string;
    luggage?: string;
    airConditioning?: string;
  };
  inclusions?: string[];
  exclusions?: string[];
  features?: string[];
}

const VehicleDetailPage = () => {
  const { vehicleId } = useParams();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarVehicles, setSimilarVehicles] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);

  useEffect(() => {
    const loadVehicleData = async () => {
      if (!vehicleId) {
        setError('Vehicle ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const allVehicles = await getVehicleData(true, true);
        
        const foundVehicle = allVehicles.find(v => 
          v.id === vehicleId || 
          v.vehicleId === vehicleId ||
          v.name?.toLowerCase().replace(/\s+/g, '_') === vehicleId
        );

        if (!foundVehicle) {
          setError(`Vehicle with ID "${vehicleId}" not found`);
          setLoading(false);
          return;
        }

        const vehicleData: VehicleData = {
          id: foundVehicle.id || vehicleId,
          name: foundVehicle.name,
          capacity: foundVehicle.capacity,
          fuelType: foundVehicle.fuelType,
          tags: ['Comfort Ride', foundVehicle.ac ? 'AC' : 'Non-AC', foundVehicle.capacity > 4 ? 'Family Friendly' : 'Compact'],
          overview: foundVehicle.description,
          inclusions: foundVehicle.inclusions || foundVehicle.amenities || ['Driver', 'Fuel', foundVehicle.ac ? 'AC' : 'Non-AC', 'Tolls', 'Parking'],
          exclusions: foundVehicle.exclusions || ['Personal expenses', 'Extra meals', 'Additional sightseeing', 'Shopping expenses'],
          features: foundVehicle.amenities || [foundVehicle.ac ? 'AC' : 'Non-AC', 'Music System', 'Charging Point']
        };

        setVehicle(vehicleData);

        // Load gallery images from database
        const gallery = await vehicleGalleryAPI.getGallery(vehicleData.id);
        console.log('Loaded gallery for vehicle details:', gallery);
        
        // If no gallery images found, use the main vehicle image as fallback
        if (gallery.length === 0 && foundVehicle.image) {
          setGalleryImages([{ url: foundVehicle.image, alt: foundVehicle.name }]);
        } else {
          setGalleryImages(gallery);
        }

        const similar = allVehicles
          .filter(v => v.id !== vehicleId && v.isActive !== false)
          .slice(0, 3)
          .map(v => ({
            id: v.id,
            name: v.name,
            capacity: `${v.capacity} Passengers`,
            price: `₹${v.pricePerKm || 12}/km`,
            image: v.image || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&h=200&fit=crop"
          }));
        
        setSimilarVehicles(similar);

      } catch (err) {
        console.error('Error loading vehicle data:', err);
        setError('Failed to load vehicle details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadVehicleData();
  }, [vehicleId]);

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Loading Vehicle Details - Vizag Taxi Hub</title>
          <meta name="description" content="Loading vehicle details and information..." />
        </Helmet>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
          <MobileNavigation />
        </div>
      </>
    );
  }
  
  if (error) {
    return (
      <>
        <Helmet>
          <title>Vehicle Not Found - Vizag Taxi Hub</title>
          <meta name="description" content="The requested vehicle could not be found. Browse our available vehicles in Visakhapatnam." />
        </Helmet>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{error}</p>
              <Link to="/" className="text-blue-600 hover:underline">← Back to Vehicles</Link>
            </div>
          </div>
          <MobileNavigation />
        </div>
      </>
    );
  }
  
  if (!vehicle) {
    return (
      <>
        <Helmet>
          <title>Vehicle Not Found - Vizag Taxi Hub</title>
          <meta name="description" content="The requested vehicle could not be found. Browse our available vehicles in Visakhapatnam." />
        </Helmet>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Vehicle not found</p>
              <Link to="/" className="text-blue-600 hover:underline">← Back to Vehicles</Link>
            </div>
          </div>
          <MobileNavigation />
        </div>
      </>
    );
  }

  // Generate SEO-friendly content based on vehicle data
  const vehicleType = vehicle.capacity > 12 ? 'mini bus' : vehicle.capacity > 6 ? 'SUV' : 'sedan';
  const vehicleTypeForTitle = vehicle.capacity > 12 ? 'Mini Bus' : vehicle.capacity > 6 ? 'SUV' : 'Sedan';
  
  // Create unique descriptions based on vehicle type and capacity
  const getUniqueDescription = () => {
    if (vehicle.capacity > 12) {
      return `${vehicle.name} - ${vehicle.capacity} seater mini bus service in Visakhapatnam. Perfect for group travel, corporate events, and family trips. Spacious and comfortable mini bus with professional driver. Book now for reliable transportation.`;
    } else if (vehicle.capacity > 6) {
      return `${vehicle.name} - ${vehicle.capacity} seater SUV taxi service in Visakhapatnam. Ideal for family trips and group travel. Comfortable SUV with ample space and modern amenities. Professional driver included.`;
    } else {
      return `${vehicle.name} - ${vehicle.capacity} seater sedan taxi service in Visakhapatnam. Perfect for business travel and small groups. Comfortable sedan with AC and professional driver. Best rates guaranteed.`;
    }
  };
  
  const seoTitle = `${vehicle.name} - ${vehicle.capacity} Seater ${vehicleTypeForTitle} Service in Visakhapatnam | Vizag Taxi Hub`;
  const seoDescription = getUniqueDescription();
  const seoKeywords = `${vehicle.name.toLowerCase()}, ${vehicle.capacity} seater ${vehicleType}, ${vehicleType} service vizag, taxi service visakhapatnam, ${vehicle.tags?.join(', ').toLowerCase() || 'taxi service'}, vizag taxi hub vehicles`;
  const vehicleImage = galleryImages?.[0]?.url || vehicle.image || '/og-image.png';
  const vehicleUrl = `https://vizagtaxihub.com/vehicle/${vehicle.id}`;

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={vehicleUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={vehicleImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={vehicleUrl} />
        <meta property="twitter:title" content={seoTitle} />
        <meta property="twitter:description" content={seoDescription} />
        <meta property="twitter:image" content={vehicleImage} />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={vehicleUrl} />
        
                 {/* Vehicle-specific structured data */}
         <script type="application/ld+json">
           {JSON.stringify({
             "@context": "https://schema.org",
             "@type": "Service",
             "serviceType": "Taxi Service",
             "name": `${vehicle.name} Taxi Service`,
             "description": vehicle.overview || `${vehicle.name} - ${vehicle.capacity} seater taxi service in Visakhapatnam`,
             "image": vehicleImage,
             "url": vehicleUrl,
             "provider": {
               "@type": "Organization",
               "name": "Vizag Taxi Hub",
               "url": "https://vizagtaxihub.com",
               "description": "Professional taxi service in Visakhapatnam"
             },
             "areaServed": {
               "@type": "City",
               "name": "Visakhapatnam",
               "addressRegion": "Andhra Pradesh",
               "addressCountry": "IN"
             },
             "location": {
               "@type": "Place",
               "address": {
                 "@type": "PostalAddress",
                 "streetAddress": "44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram",
                 "addressLocality": "Visakhapatnam",
                 "addressRegion": "Andhra Pradesh",
                 "postalCode": "530024",
                 "addressCountry": "IN"
               }
             },
             "hasOfferCatalog": {
               "@type": "OfferCatalog",
               "name": "Taxi Services",
               "itemListElement": {
                 "@type": "Offer",
                                   "itemOffered": {
                    "@type": "Service",
                    "name": `${vehicle.name} ${vehicle.capacity > 12 ? 'Mini Bus' : vehicle.capacity > 6 ? 'SUV' : 'Sedan'} Service`,
                    "description": `${vehicle.capacity} seater ${vehicle.capacity > 12 ? 'mini bus' : vehicle.capacity > 6 ? 'SUV' : 'sedan'} service in Visakhapatnam`
                  }
               }
             }
           })}
         </script>
      </Helmet>
      
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Link 
            to="/" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Vehicles
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <ImageGallery images={galleryImages} vehicleName={vehicle.name} />

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{vehicle.name}</h1>
                    
                    {/* Vehicle Tags displayed prominently next to vehicle name */}
                    {vehicle.tags && vehicle.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {vehicle.tags.map((tag: string, idx: number) => (
                          <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-gray-600">
                  <div className="flex items-center">
                    <Fuel className="h-4 w-4 mr-2" />
                    <span>{vehicle.fuelType}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{vehicle.capacity} Passengers</span>
                  </div>
                </div>
              </div>

              <VehicleTabs 
                overview={vehicle.overview} 
                inclusions={vehicle.inclusions}
                exclusions={vehicle.exclusions}
                features={vehicle.features}
                tags={[]} // Empty array since tags are now displayed at the top
              />

              <RateCard vehicleId={vehicle.id} />

              <VehicleTours vehicleId={vehicle.id} vehicleName={vehicle.name} />
            </div>

            <div className="lg:col-span-1 space-y-6">
              <RateCardPanel vehicleId={vehicle.id} vehicleName={vehicle.name} />
              
              <SimilarVehicles vehicles={similarVehicles} />
            </div>
          </div>
        </div>
        
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default VehicleDetailPage;
