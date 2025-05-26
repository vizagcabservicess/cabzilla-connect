
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const forceRefreshHeaders = {
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
