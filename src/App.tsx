import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster } from './components/ui/toaster';
import { ThemeProvider } from './providers/ThemeProvider';

function App() {
  useEffect(() => {
    // Set page title
    document.title = 'Vizag Cabs - Book Cabs in Visakhapatnam';
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vizag-cabs-theme">
      <GoogleMapsProvider>
        <RouterProvider router={router} />
        <Toaster />
      </GoogleMapsProvider>
    </ThemeProvider>
  );
}

export default App;
