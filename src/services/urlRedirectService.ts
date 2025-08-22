export interface RedirectRule {
  from: string;
  to: string;
  type: 'permanent' | 'temporary';
  statusCode?: 301 | 302;
}

export class URLRedirectService {
  private static redirects: RedirectRule[] = [
    // Old vehicle pages (now redirected to fleet)
    { from: '/sedan', to: '/fleet', type: 'permanent', statusCode: 301 },
    { from: '/suv', to: '/fleet', type: 'permanent', statusCode: 301 },
    { from: '/tempotraveller', to: '/fleet', type: 'permanent', statusCode: 301 },
    { from: '/tempo-traveller', to: '/fleet', type: 'permanent', statusCode: 301 },
    { from: '/tempo_traveller', to: '/fleet', type: 'permanent', statusCode: 301 },
    
    // Old service pages
    { from: '/rentals', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/car-rental', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/taxi-rental', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/cab-rental', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    
    // Old tour pages
    { from: '/tour', to: '/tours', type: 'permanent', statusCode: 301 },
    { from: '/tour-packages', to: '/tours', type: 'permanent', statusCode: 301 },
    { from: '/packages', to: '/tours', type: 'permanent', statusCode: 301 },
    
    // Old contact pages
    { from: '/contact', to: '/contact-us', type: 'permanent', statusCode: 301 },
    { from: '/get-in-touch', to: '/contact-us', type: 'permanent', statusCode: 301 },
    { from: '/reach-us', to: '/contact-us', type: 'permanent', statusCode: 301 },
    
    // Old about pages
    { from: '/about', to: '/our-story', type: 'permanent', statusCode: 301 },
    { from: '/about-us', to: '/our-story', type: 'permanent', statusCode: 301 },
    { from: '/company', to: '/our-story', type: 'permanent', statusCode: 301 },
    
    // Old terms pages
    { from: '/terms', to: '/terms-conditions', type: 'permanent', statusCode: 301 },
    { from: '/terms-of-service', to: '/terms-conditions', type: 'permanent', statusCode: 301 },
    { from: '/terms-and-conditions', to: '/terms-conditions', type: 'permanent', statusCode: 301 },
    
    // Old privacy pages
    { from: '/privacy', to: '/privacy-policy', type: 'permanent', statusCode: 301 },
    { from: '/privacy-policy', to: '/privacy-policy', type: 'permanent', statusCode: 301 },
    
    // Old FAQ pages
    { from: '/faqs', to: '/faq', type: 'permanent', statusCode: 301 },
    { from: '/frequently-asked-questions', to: '/faq', type: 'permanent', statusCode: 301 },
    
    // Old booking pages
    { from: '/book', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/book-now', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/booking', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    
    // Old location-specific pages
    { from: '/vizag-taxi', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/visakhapatnam-taxi', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/vizag-cabs', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/visakhapatnam-cabs', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    
    // Old airport pages
    { from: '/airport', to: '/airport-taxi', type: 'permanent', statusCode: 301 },
    { from: '/airport-transfer', to: '/airport-taxi', type: 'permanent', statusCode: 301 },
    { from: '/airport-pickup', to: '/airport-taxi', type: 'permanent', statusCode: 301 },
    { from: '/airport-drop', to: '/airport-taxi', type: 'permanent', statusCode: 301 },
    
    // Old outstation pages
    { from: '/outstation', to: '/outstation-taxi', type: 'permanent', statusCode: 301 },
    { from: '/intercity', to: '/outstation-taxi', type: 'permanent', statusCode: 301 },
    { from: '/long-distance', to: '/outstation-taxi', type: 'permanent', statusCode: 301 },
    
    // Old driver pages
    { from: '/hire', to: '/hire-driver', type: 'permanent', statusCode: 301 },
    { from: '/driver-hire', to: '/hire-driver', type: 'permanent', statusCode: 301 },
    { from: '/hire-a-driver', to: '/hire-driver', type: 'permanent', statusCode: 301 },
    
    // Old support pages
    { from: '/help', to: '/help-center', type: 'permanent', statusCode: 301 },
    { from: '/support-center', to: '/support', type: 'permanent', statusCode: 301 },
    { from: '/customer-support', to: '/support', type: 'permanent', statusCode: 301 },
    
    // Old refund pages
    { from: '/refund', to: '/cancellation-refund-policy', type: 'permanent', statusCode: 301 },
    { from: '/refund-policy', to: '/cancellation-refund-policy', type: 'permanent', statusCode: 301 },
    { from: '/cancellation', to: '/cancellation-refund-policy', type: 'permanent', statusCode: 301 },
    
    // Old career pages
    { from: '/career', to: '/careers', type: 'permanent', statusCode: 301 },
    { from: '/jobs', to: '/careers', type: 'permanent', statusCode: 301 },
    { from: '/employment', to: '/careers', type: 'permanent', statusCode: 301 },
    
    // Old vision pages
    { from: '/vision', to: '/vision-mission', type: 'permanent', statusCode: 301 },
    { from: '/mission', to: '/vision-mission', type: 'permanent', statusCode: 301 },
    
    // Common misspellings and variations
    { from: '/taxi', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/cab', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/cabs', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/taxi-service', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/cab-service', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    
    // Old blog or news pages (if any)
    { from: '/blog', to: '/our-story', type: 'permanent', statusCode: 301 },
    { from: '/news', to: '/our-story', type: 'permanent', statusCode: 301 },
    { from: '/updates', to: '/our-story', type: 'permanent', statusCode: 301 },
    
    // Old pricing pages
    { from: '/pricing', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/rates', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/tariff', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/fare', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    { from: '/fares', to: '/local-taxi', type: 'permanent', statusCode: 301 },
    
    // Old testimonial pages
    { from: '/testimonials', to: '/', type: 'permanent', statusCode: 301 },
    { from: '/reviews', to: '/', type: 'permanent', statusCode: 301 },
    { from: '/feedback', to: '/', type: 'permanent', statusCode: 301 },
    
    // Old gallery pages
    { from: '/gallery', to: '/fleet', type: 'permanent', statusCode: 301 },
    { from: '/photos', to: '/fleet', type: 'permanent', statusCode: 301 },
    { from: '/images', to: '/fleet', type: 'permanent', statusCode: 301 },
    
    // Old sitemap pages
    { from: '/sitemap', to: '/sitemap.xml', type: 'permanent', statusCode: 301 },
    { from: '/sitemap.html', to: '/sitemap.xml', type: 'permanent', statusCode: 301 },
    
    // Old login/register pages
    { from: '/register', to: '/signup', type: 'permanent', statusCode: 301 },
    { from: '/sign-up', to: '/signup', type: 'permanent', statusCode: 301 },
    { from: '/signin', to: '/login', type: 'permanent', statusCode: 301 },
    { from: '/sign-in', to: '/login', type: 'permanent', statusCode: 301 },
    
    // Old dashboard pages
    { from: '/profile', to: '/dashboard', type: 'permanent', statusCode: 301 },
    { from: '/account', to: '/dashboard', type: 'permanent', statusCode: 301 },
    { from: '/my-account', to: '/dashboard', type: 'permanent', statusCode: 301 },
    
    // Old payment pages
    { from: '/pay', to: '/payment', type: 'permanent', statusCode: 301 },
    { from: '/payment-gateway', to: '/payment', type: 'permanent', statusCode: 301 },
    { from: '/checkout', to: '/payment', type: 'permanent', statusCode: 301 },
    
    // Old confirmation pages
    { from: '/confirmation', to: '/booking-confirmation', type: 'permanent', statusCode: 301 },
    { from: '/booking-confirmed', to: '/booking-confirmation', type: 'permanent', statusCode: 301 },
    { from: '/success', to: '/booking-confirmation', type: 'permanent', statusCode: 301 },
    
    // Old receipt pages
    { from: '/invoice', to: '/receipt', type: 'permanent', statusCode: 301 },
    { from: '/bill', to: '/receipt', type: 'permanent', statusCode: 301 },
    
    // Old pooling pages (if any)
    { from: '/carpool', to: '/pooling', type: 'permanent', statusCode: 301 },
    { from: '/carpooling', to: '/pooling', type: 'permanent', statusCode: 301 },
    { from: '/ride-sharing', to: '/pooling', type: 'permanent', statusCode: 301 },
    
    // Old location-specific outstation routes (common patterns)
    { from: '/vizag-to-hyderabad', to: '/outstation-taxi/visakhapatnam-to-hyderabad', type: 'permanent', statusCode: 301 },
    { from: '/vizag-to-chennai', to: '/outstation-taxi/visakhapatnam-to-chennai', type: 'permanent', statusCode: 301 },
    { from: '/vizag-to-bangalore', to: '/outstation-taxi/visakhapatnam-to-bangalore', type: 'permanent', statusCode: 301 },
    { from: '/vizag-to-araku', to: '/outstation-taxi/visakhapatnam-to-araku-valley', type: 'permanent', statusCode: 301 },
    { from: '/vizag-to-tirupati', to: '/outstation-taxi/visakhapatnam-to-tirupati', type: 'permanent', statusCode: 301 },
    { from: '/vizag-to-vijayawada', to: '/outstation-taxi/visakhapatnam-to-vijayawada', type: 'permanent', statusCode: 301 },
    { from: '/vizag-to-bhubaneswar', to: '/outstation-taxi/visakhapatnam-to-bhubaneswar', type: 'permanent', statusCode: 301 },
    { from: '/vizag-to-kolkata', to: '/outstation-taxi/visakhapatnam-to-kolkata', type: 'permanent', statusCode: 301 },
    { from: '/vizag-to-raipur', to: '/outstation-taxi/visakhapatnam-to-raipur', type: 'permanent', statusCode: 301 },
    
    // Old tour-specific routes
    { from: '/araku-tour', to: '/tours/araku-valley-tour', type: 'permanent', statusCode: 301 },
    { from: '/araku-valley', to: '/tours/araku-valley-tour', type: 'permanent', statusCode: 301 },
    { from: '/lambasingi-tour', to: '/tours/lambasingi-tour', type: 'permanent', statusCode: 301 },
    { from: '/lambasingi', to: '/tours/lambasingi-tour', type: 'permanent', statusCode: 301 },
    { from: '/vizag-city-tour', to: '/tours/vizag-north-city-tour', type: 'permanent', statusCode: 301 },
    { from: '/city-tour', to: '/tours/vizag-north-city-tour', type: 'permanent', statusCode: 301 },
    
    // Old vehicle-specific routes
    { from: '/swift-dzire', to: '/vehicle/swift-dzire', type: 'permanent', statusCode: 301 },
    { from: '/ertiga', to: '/vehicle/ertiga', type: 'permanent', statusCode: 301 },
    { from: '/innova', to: '/vehicle/innova-crysta', type: 'permanent', statusCode: 301 },
    { from: '/innova-crysta', to: '/vehicle/innova-crysta', type: 'permanent', statusCode: 301 },
    { from: '/toyota-glanza', to: '/vehicle/toyota-glanza', type: 'permanent', statusCode: 301 },
    { from: '/tempo-traveller', to: '/vehicle/tempo_traveller', type: 'permanent', statusCode: 301 },
    { from: '/honda-amaze', to: '/vehicle/amaze', type: 'permanent', statusCode: 301 },
    { from: '/amaze', to: '/vehicle/amaze', type: 'permanent', statusCode: 301 },
  ];

  static checkRedirect(pathname: string): RedirectRule | null {
    const normalizedPath = pathname.toLowerCase().replace(/\/$/, '');
    
    // Exact match first
    const exactMatch = this.redirects.find(redirect => 
      redirect.from.toLowerCase() === normalizedPath
    );
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // Pattern matching for dynamic routes
    for (const redirect of this.redirects) {
      const fromPattern = redirect.from.toLowerCase();
      
      // Handle wildcard patterns
      if (fromPattern.includes('*')) {
        const regex = new RegExp(fromPattern.replace(/\*/g, '.*'));
        if (regex.test(normalizedPath)) {
          return redirect;
        }
      }
      
      // Handle parameterized routes
      if (fromPattern.includes(':')) {
        const regex = new RegExp(fromPattern.replace(/:[^/]+/g, '[^/]+'));
        if (regex.test(normalizedPath)) {
          return redirect;
        }
      }
    }
    
    return null;
  }

  static getAllRedirects(): RedirectRule[] {
    return [...this.redirects];
  }

  static addRedirectRule(rule: RedirectRule): void {
    this.redirects.push(rule);
  }

  static removeRedirectRule(from: string): void {
    this.redirects = this.redirects.filter(redirect => redirect.from !== from);
  }

  static generateHtaccessRules(): string {
    let rules = '# URL Redirects for Old URLs\n';
    rules += '# Generated automatically - Do not edit manually\n\n';
    
    this.redirects.forEach(redirect => {
      const statusCode = redirect.statusCode || (redirect.type === 'permanent' ? 301 : 302);
      rules += `RewriteRule ^${redirect.from.replace(/^\//, '')}$ ${redirect.to} [R=${statusCode},L]\n`;
    });
    
    return rules;
  }

  static generateSitemapRedirects(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    this.redirects.forEach(redirect => {
      xml += '  <url>\n';
      xml += `    <loc>https://vizagtaxihub.com${redirect.from}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += '    <changefreq>never</changefreq>\n';
      xml += '    <priority>0.1</priority>\n';
      xml += '  </url>\n';
    });
    
    xml += '</urlset>';
    return xml;
  }
}
