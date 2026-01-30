// Reduced to 3 weights (400, 600, 700) for faster load. Loaded async after first paint from main.tsx.
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

export const fontConfig = {
  primary: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  weights: {
    normal: 400,
    semibold: 600,
    bold: 700,
  },
};
