import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { groupTourAPI } from '@/services/api/groupTourAPI';

const STORAGE_KEY = 'group-tour-popup-dismissed';
const SHOW_AFTER_MS = 1500; // Show after 1.5s on homepage

export function GroupTourPromoPopup() {
  const [open, setOpen] = useState(false);
  const [lowestPrice, setLowestPrice] = useState<number | null>(null);

  useEffect(() => {
    groupTourAPI.getRoutes().then((routes) => {
      const prices = routes
        .map((r) => r.price_from)
        .filter((p): p is number => p != null && p > 0);
      const min = prices.length > 0 ? Math.min(...prices) : null;
      setLowestPrice(min);
    });
  }, []);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setOpen(true);
    }, SHOW_AFTER_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }
    setOpen(isOpen);
  };

  const priceText =
    lowestPrice != null
      ? `₹${lowestPrice.toLocaleString('en-IN')}`
      : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <span className="text-2xl font-bold text-blue-600">Group Tours</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Discover & save on group tours
          </DialogTitle>
          {priceText && (
            <p className="text-lg font-semibold text-slate-800">
              Fares starting from {priceText}
            </p>
          )}
          <DialogDescription className="text-slate-600 text-base">
            Explore popular destinations with shared travel. Save up to{' '}
            <strong className="text-slate-900">60%</strong> on Araku Valley,
            Lambasingi, temples & more!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 h-11">
            <Link
              to="/group-tours"
              onClick={() => handleClose(false)}
              className="flex items-center justify-center"
            >
              Explore Group Tours
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
