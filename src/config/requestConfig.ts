
import { getApiUrl, API_BASE_URL } from './api';

export const getBypassHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

export const getForcedRequestConfig = () => ({
  headers: getBypassHeaders(),
  timeout: 30000,
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

export const safeFetch = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getBypassHeaders(),
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

export const apiBaseUrl = API_BASE_URL;
