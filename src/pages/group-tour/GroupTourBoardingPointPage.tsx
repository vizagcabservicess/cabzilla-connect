import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

/**
 * Redirect to seat selection - boarding point is now integrated as a slide-in panel.
 * Kept for backwards compatibility with old links.
 */
export default function GroupTourBoardingPointPage() {
  const { tourId } = useParams<{ tourId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pickup = searchParams.get('pickup') || '';
  const dropoff = searchParams.get('dropoff') || '';
  const date = searchParams.get('date') || '';

  useEffect(() => {
    const params = new URLSearchParams();
    if (pickup) params.set('pickup', pickup);
    if (dropoff) params.set('dropoff', dropoff);
    if (date) params.set('date', date);
    const qs = params.toString();
    navigate(`/group-tours/seat-selection/${tourId}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [tourId, pickup, dropoff, date, navigate]);

  return null;
}
