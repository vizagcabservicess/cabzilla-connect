/**
 * Main Visitor Analytics admin page.
 * Lazy-load: `lazy(() => import('@/pages/admin/visitor-analytics/VisitorAnalyticsPage'))`
 */
export { VisitorAnalyticsLayout } from './VisitorAnalyticsLayout';
export { default as SessionsPage } from './SessionsPage';
export { LiveChatWidget } from '@/components/visitor-analytics/chat/LiveChatWidget';

import VisitorAnalyticsLayout from './VisitorAnalyticsLayout';

export default VisitorAnalyticsLayout;
