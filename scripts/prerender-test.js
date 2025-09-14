#!/usr/bin/env node

/**
 * Prerender.io Test Script for Vizag Taxi Hub
 * This script tests the pre-rendering functionality and validates SEO content
 */

const https = require('https');
const http = require('http');

// Configuration
const PRERENDER_TOKEN = '8nM46UKKpkXVmwdA3axX';
const BASE_URL = 'https://vizagtaxihub.com';
const PRERENDER_SERVICE = 'https://service.prerender.io';

// Test URLs to validate
const TEST_URLS = [
  '/',
  '/local-taxi',
  '/outstation-taxi',
  '/outstation-taxi/visakhapatnam-to-razam',
  '/outstation-taxi/visakhapatnam-to-araku-valley',
  '/tours',
  '/fleet',
  '/contact-us'
];

// User agents to test
const USER_AGENTS = {
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  twitter: 'Twitterbot/1.0'
};

/**
 * Make HTTP request
 */
function makeRequest(url, userAgent = null) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Test pre-rendering for a specific URL
 */
async function testPrerendering(url, userAgent) {
  console.log(`\n🔍 Testing: ${url}`);
  console.log(`🤖 User Agent: ${userAgent}`);

  try {
    // Test direct access (should show static content)
    console.log('📄 Testing direct access...');
    const directResponse = await makeRequest(`${BASE_URL}${url}`);
    
    // Test pre-rendered access
    console.log('🎭 Testing pre-rendered access...');
    const prerenderUrl = `${PRERENDER_SERVICE}/${BASE_URL}${url}`;
    const prerenderResponse = await makeRequest(prerenderUrl, userAgent);

    // Analyze responses
    const directHasTitle = directResponse.body.includes('<title>');
    const prerenderHasTitle = prerenderResponse.body.includes('<title>');
    
    const directTitle = directResponse.body.match(/<title>(.*?)<\/title>/)?.[1] || 'No title found';
    const prerenderTitle = prerenderResponse.body.match(/<title>(.*?)<\/title>/)?.[1] || 'No title found';

    console.log(`✅ Direct Response: ${directResponse.statusCode}`);
    console.log(`✅ Pre-rendered Response: ${prerenderResponse.statusCode}`);
    console.log(`📝 Direct Title: ${directTitle}`);
    console.log(`📝 Pre-rendered Title: ${prerenderTitle}`);

    // Check if pre-rendering is working
    const isWorking = prerenderTitle !== directTitle && prerenderTitle !== 'No title found';
    console.log(`🎯 Pre-rendering Working: ${isWorking ? '✅ YES' : '❌ NO'}`);

    // Check for dynamic content
    const hasDynamicContent = prerenderResponse.body.includes('80 KM') || 
                             prerenderResponse.body.includes('Razam') ||
                             prerenderResponse.body.includes('Visakhapatnam to Razam');

    console.log(`🎨 Dynamic Content Present: ${hasDynamicContent ? '✅ YES' : '❌ NO'}`);

    return {
      url,
      userAgent,
      directResponse,
      prerenderResponse,
      isWorking,
      hasDynamicContent,
      directTitle,
      prerenderTitle
    };

  } catch (error) {
    console.error(`❌ Error testing ${url}:`, error.message);
    return {
      url,
      userAgent,
      error: error.message,
      isWorking: false,
      hasDynamicContent: false
    };
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Prerender.io Tests for Vizag Taxi Hub');
  console.log('=' .repeat(60));

  const results = [];

  for (const url of TEST_URLS) {
    for (const [botName, userAgent] of Object.entries(USER_AGENTS)) {
      const result = await testPrerendering(url, userAgent);
      results.push(result);
      
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));

  const workingTests = results.filter(r => r.isWorking);
  const dynamicContentTests = results.filter(r => r.hasDynamicContent);

  console.log(`✅ Working Pre-rendering: ${workingTests.length}/${results.length}`);
  console.log(`🎨 Dynamic Content: ${dynamicContentTests.length}/${results.length}`);

  if (workingTests.length > 0) {
    console.log('\n🎉 SUCCESS: Pre-rendering is working!');
    console.log('Search engines will now see dynamic SEO content.');
  } else {
    console.log('\n⚠️  WARNING: Pre-rendering may not be working properly.');
    console.log('Check your server configuration and Prerender.io setup.');
  }

  // Show failed tests
  const failedTests = results.filter(r => !r.isWorking && !r.error);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.url} (${test.userAgent})`);
    });
  }

  console.log('\n🔧 Next Steps:');
  console.log('1. Deploy the updated .htaccess file to your server');
  console.log('2. Verify Prerender.io token is active');
  console.log('3. Test with Google Search Console');
  console.log('4. Monitor SEO audit results');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testPrerendering, runTests };





