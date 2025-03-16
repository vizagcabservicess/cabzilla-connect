
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundaryClass from './components/ErrorBoundary';

// Setup global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Setup global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Render app with error boundary
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundaryClass>
    <App />
  </ErrorBoundaryClass>
);
