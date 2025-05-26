
import axios from 'axios';

export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const createRequestConfig = (additionalHeaders = {}) => ({
  headers: {
    ...defaultHeaders,
    ...additionalHeaders,
  },
});

export const getForcedRequestConfig = (additionalHeaders = {}) => ({
  headers: {
    ...defaultHeaders,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...additionalHeaders,
  },
});

export const getBypassHeaders = () => ({
  'X-Bypass-Cache': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
});

export const formatDataForMultipart = (data: any) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  });
  return formData;
};

export const safeFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...getBypassHeaders(),
        ...options.headers,
      },
    });
    return response;
  } catch (error) {
    console.error('Safe fetch error:', error);
    throw error;
  }
};

export default axios;
