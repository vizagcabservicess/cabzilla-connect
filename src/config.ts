
// API configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://www.vizagtaxihub.com' 
  : 'https://www.vizagtaxihub.com';

// Application configuration
export const APP_CONFIG = {
  appName: 'Vizag Taxi Hub',
  appVersion: '1.0.0',
  appDescription: 'Cab booking service in Vizag',
  currency: '₹',
  defaultLanguage: 'en-IN',
  dateFormat: 'DD-MM-YYYY',
  timezone: 'Asia/Kolkata'
};

export default APP_CONFIG;
