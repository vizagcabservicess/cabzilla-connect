export const forceEnableFallbackMode = () => {
  localStorage.setItem('fallbackMode', 'true');
  localStorage.setItem('fallbackExpiry', new Date(Date.now() + 1000 * 60 * 60).toISOString()); // 1 hour
  console.warn('Fallback mode ENABLED. API requests will be mocked.');
};

export const disableFallbackMode = () => {
  localStorage.removeItem('fallbackMode');
  localStorage.removeItem('fallbackExpiry');
  console.warn('Fallback mode DISABLED. API requests will be attempted.');
};

export const isFallbackModeEnabled = () => {
  const fallbackMode = localStorage.getItem('fallbackMode');
  const fallbackExpiry = localStorage.getItem('fallbackExpiry');
  
  if (fallbackMode === 'true' && fallbackExpiry) {
    const expiry = new Date(fallbackExpiry);
    if (expiry > new Date()) {
      console.warn('Fallback mode is ENABLED.');
      return true;
    } else {
      console.warn('Fallback mode is EXPIRED.');
      localStorage.removeItem('fallbackMode');
      localStorage.removeItem('fallbackExpiry');
      return false;
    }
  }
  
  return false;
};

export const getFallbackExpiry = () => {
  return localStorage.getItem('fallbackExpiry') || null;
};

export const getSystemStatus = () => {
  return {
    fallbackMode: isFallbackModeEnabled(),
    fallbackExpiry: getFallbackExpiry(),
    apiErrorCount: 0, // TODO: Implement error tracking
    databaseStatus: 'ok', // TODO: Implement database status check
    serverStatus: 'ok', // TODO: Implement server status check
    isPreview: import.meta.env.MODE === 'development',
  };
};

export const fixDatabaseTables = async () => {
  console.log('Attempting to fix database tables...');
  
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const timestamp = Date.now();
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-System-Repair': 'true',
        'Cache-Control': 'no-cache'
      }
    };
    
    // Try to fix database issues
    const response = await fetch(`${baseUrl}/api/admin/fix-database.php?_t=${timestamp}`, options);
    
    if (!response.ok) {
      console.error('Database fix failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('Database fix response:', data);
    return data.success === true;
  } catch (error) {
    console.error('Error during database fix:', error);
    return false;
  }
};

// Add the missing function
export const autoFixDatabaseIssues = async () => {
  console.log('Attempting to auto-fix database issues...');
  
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const timestamp = Date.now();
    const options = {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-System-Repair': 'true',
        'Cache-Control': 'no-cache'
      }
    };
    
    // Try to fix database issues
    const response = await fetch(`${baseUrl}/api/admin/fix-database.php?_t=${timestamp}`, options);
    
    if (!response.ok) {
      console.error('Database auto-fix failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('Database auto-fix response:', data);
    return data.success === true;
  } catch (error) {
    console.error('Error during database auto-fix:', error);
    return false;
  }
};
