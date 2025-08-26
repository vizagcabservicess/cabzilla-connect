// Prerender Configuration for Vizag Taxi Hub
// This file can be used with Prerender.io, Rendertron, or similar services

module.exports = {
  // User agents that should receive prerendered content
  userAgents: [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'telegrambot',
    'skypeuripreview',
    'slackbot',
    'discordbot',
    'ahrefsbot',
    'semrushbot',
    'mozbot',
    'rogerbot',
    'dotbot',
    'ia_archiver',
    'archive.org_bot',
    'ia_archiver-web.archive.org'
  ],

  // URLs that should be prerendered
  urls: [
    '/',
    '/local-taxi',
    '/outstation-taxi',
    '/airport-taxi',
    '/tours',
    '/fleet',
    '/rentals',
    '/hire-driver',
    '/about',
    '/our-story',
    '/vision-mission',
    '/contact-us',
    '/help-center',
    '/support',
    '/terms-conditions',
    '/privacy-policy',
    '/cancellation-refund-policy',
    '/careers'
  ],

  // Tour pages (these would be dynamically generated)
  tourPatterns: [
    '/tour/*',
    '/tours/*'
  ],

  // Route pages (these would be dynamically generated)
  routePatterns: [
    '/outstation-taxi/*',
    '/local-taxi/*',
    '/airport-taxi/*'
  ],

  // Vehicle pages (these would be dynamically generated)
  vehiclePatterns: [
    '/vehicle/*',
    '/fleet/*'
  ],

  // Prerender service configuration
  prerenderService: {
    // For Prerender.io
    token: process.env.PRERENDER_TOKEN || '',
    serviceUrl: 'https://service.prerender.io/',
    
    // For Rendertron
    rendertronUrl: process.env.RENDERTRON_URL || 'http://localhost:3000/render/',
    
    // Timeout for prerender requests
    timeout: 10000,
    
    // Wait for JavaScript to execute
    waitForSelector: '#root',
    waitForTimeout: 2000
  },

  // Cache configuration
  cache: {
    // Cache prerendered pages for 1 hour
    ttl: 3600,
    
    // Cache directory
    directory: './prerender-cache'
  },

  // Headers to add to prerendered responses
  headers: {
    'X-Prerender': 'true',
    'Cache-Control': 'public, max-age=3600'
  }
};

