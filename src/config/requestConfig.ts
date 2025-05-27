
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

export const apiBaseUrl = API_BASE_URL;
