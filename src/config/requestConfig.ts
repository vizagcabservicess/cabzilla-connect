
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

export default axios;
