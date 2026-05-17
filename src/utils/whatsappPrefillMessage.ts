/**
 * Prefill text for wa.me links by current path (shared with mobile bottom nav and floating actions).
 */
export function getWhatsAppPrefillMessage(pathname: string): string {
  const path = pathname;

  if (path.startsWith('/vehicle/')) {
    const vehicleName = path.split('/vehicle/')[1];
    const readableVehicleName = vehicleName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `Hi Kumar! I would like to know more about the ${readableVehicleName} vehicle`;
  }

  if (path.startsWith('/tours/') && path !== '/tours') {
    const tourId = path.split('/tours/')[1];
    return `Hi Kumar! I would like to know more about tour package ${tourId}`;
  }

  if (path.startsWith('/booking/')) {
    return 'Hi Kumar! I need help with my booking';
  }

  if (path === '/payment') {
    return 'Hi Kumar! I need help with payment';
  }

  const messages: Record<string, string> = {
    '/': 'Hi Kumar! I would like to know more about your taxi services',
    '/hire-driver': 'Hi Kumar! I would like to hire a driver',
    '/tours': 'Hi Kumar! I would like to know more about your tour packages',
    '/fleet': 'Hi Kumar! I would like to know more about your fleet',
    '/careers': 'Hi Kumar! I would like to know more about career opportunities',
    '/our-story': 'Hi Kumar! I would like to know more about your company',
    '/vision-mission': 'Hi Kumar! I would like to know more about your vision and mission',
    '/contact': 'Hi Kumar! I would like to get in touch with you',
    '/about': 'Hi Kumar! I would like to know more about Vizag Taxi Hub',
    '/local-taxi': 'Hi Kumar! I would like to book a local taxi',
    '/outstation-taxi': 'Hi Kumar! I would like to book an outstation taxi',
    '/airport-taxi': 'Hi Kumar! I would like to book an airport transfer',
    '/pooling': 'Hi Kumar! I would like to know more about your car pooling service',
    '/local-carpooling': 'Hi Kumar! I would like to enquire about local carpooling (NAD to IT SEZ route)',
    '/rentals': 'Hi Kumar! I would like to know more about your car rental services',
    '/support': 'Hi Kumar! I need support with my booking',
    '/help-center': 'Hi Kumar! I need help with your services',
    '/contact-us': 'Hi Kumar! I would like to get in touch with you',
    '/terms-conditions': 'Hi Kumar! I have a question about your terms and conditions',
    '/privacy-policy': 'Hi Kumar! I have a question about your privacy policy',
    '/user-agreement': 'Hi Kumar! I have a question about your user agreement',
    '/terms': 'Hi Kumar! I have a question about your terms',
    '/privacy': 'Hi Kumar! I have a question about your privacy policy',
    '/data-deletion': 'Hi Kumar! I would like to request data deletion',
    '/refunds': 'Hi Kumar! I have a question about refunds',
    '/cancellation-refund-policy': 'Hi Kumar! I have a question about cancellation and refund policy',
  };

  return messages[path] || 'Hi Kumar! I would like to know more about your services';
}

export const VIZAG_TAXI_HUB_PHONE_E164 = '919966363662';

export function buildWhatsAppMeUrl(pathname: string): string {
  const text = encodeURIComponent(getWhatsAppPrefillMessage(pathname));
  return `https://wa.me/${VIZAG_TAXI_HUB_PHONE_E164}?text=${text}`;
}
