import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_DEFAULT_API_KEY";

const GoogleMapComponent = ({ pickupLocation, dropLocation }) => {
  const mapContainerStyle = {
    width: "10%",
    height: "400px", // ✅ Ensure fixed height
  };

  const defaultCenter = { lat: 17.6868, lng: 83.2185 }; // Visakhapatnam

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <GoogleMap mapContainerStyle={mapContainerStyle} center={defaultCenter} zoom={12}>
        {pickupLocation && <Marker position={{ lat: pickupLocation.lat, lng: pickupLocation.lng }} />}
        {dropLocation && <Marker position={{ lat: dropLocation.lat, lng: dropLocation.lng }} />}
      </GoogleMap>
    </LoadScript>
  );
};

export default GoogleMapComponent;
