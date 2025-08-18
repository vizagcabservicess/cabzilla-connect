import React, { useEffect } from 'react';
import { getApiUrl } from '@/config/api';

export function DomainTest() {
  useEffect(() => {
    // Test what domain the frontend is actually using
    const testUrl = getApiUrl('/api/test-domain');
    console.log('🔍 DOMAIN TEST - getApiUrl result:', testUrl);
    
    // Test direct API call
    fetch(testUrl)
      .then(response => {
        console.log('🔍 DOMAIN TEST - Response status:', response.status);
        console.log('🔍 DOMAIN TEST - Response URL:', response.url);
        return response.text();
      })
      .then(text => {
        console.log('🔍 DOMAIN TEST - Response text:', text);
      })
      .catch(error => {
        console.log('🔍 DOMAIN TEST - Error:', error);
      });
  }, []);

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
      <h3 className="font-bold text-yellow-800">Domain Test Component</h3>
      <p className="text-yellow-700">Check browser console for domain test results</p>
    </div>
  );
}
