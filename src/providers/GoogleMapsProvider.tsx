import { GoogleMap, LoadScript } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_DEFAULT_API_KEY"; 

const GoogleMapComponent = ({ pickupLocation, dropLocation }) => {
  const mapContainerStyle = {
    width: "100%",
    height: "400px",
  };

  const defaultCenter = { lat: 17.6868, lng: 83.2185 }; // Visakhapatnam

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={12} />
    </LoadScript>
  );
};

export default GoogleMapComponent;
