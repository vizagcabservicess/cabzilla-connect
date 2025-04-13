
// Request configuration helpers

// Headers to bypass cache for API requests
export const getBypassHeaders = () => ({
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'X-Requested-With': 'XMLHttpRequest'
});

// Configuration for forced requests
export const getForcedRequestConfig = () => ({
  headers: getBypassHeaders(),
  cache: 'no-store' as const
});

// Headers for administrative actions
export const getAdminHeaders = () => ({
  ...getBypassHeaders(),
  'X-Admin-Mode': 'true'
});

// Format data for multipart form submission
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  
  return formData;
};
