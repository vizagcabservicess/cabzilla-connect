
// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`;
};

export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
