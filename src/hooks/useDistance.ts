
import { useState, useEffect } from 'react';

// This is a mock. In a real app, this would use Google Maps Distance Matrix API
const calculateMockDistance = (from: string, to: string): number => {
    if (!from || !to) return 0;
    // Simple logic for mock distances based on names
    if (from.toLowerCase().includes('visakhapatnam')) {
        if (to.toLowerCase().includes('araku')) return 120;
        if (to.toLowerCase().includes('narsipatnam')) return 80;
        if (to.toLowerCase().includes('annavaram')) return 125;
        if (to.toLowerCase().includes('kakinada')) return 160;
        if (to.toLowerCase().includes('rajahmundry')) return 200;
        if (to.toLowerCase().includes('vijayawada')) return 350;
    }
    return (from.length + to.length) * 5; // fallback mock
};

export const useDistance = (from: string, to: string) => {
    const [distance, setDistance] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (from && to) {
            setLoading(true);
            // Simulate API call
            setTimeout(() => {
                const dist = calculateMockDistance(from, to);
                setDistance(dist);
                setLoading(false);
            }, 500);
        } else {
            setDistance(0);
        }
    }, [from, to]);

    return { distance, loading };
};
