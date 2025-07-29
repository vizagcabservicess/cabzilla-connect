import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FareData } from '@/hooks/useFareData';

interface FareTableProps {
  fareData: FareData[];
  loading: boolean;
  error: string | null;
  serviceType: 'outstation' | 'local' | 'airport';
}

export function FareTable({ fareData, loading, error, serviceType }: FareTableProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-8 w-1/2 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">{error}</div>
        <p className="text-gray-600">Please try again later or contact support.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {fareData.map((fare, index) => (
        <motion.div
          key={fare.vehicleType}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-full -translate-y-16 translate-x-16" />
              
              <h3 className="font-semibold text-lg mb-3 text-gray-900">{fare.vehicleType}</h3>
              
              <div className="space-y-3">
                {serviceType === 'airport' && fare.baseFare ? (
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-primary">₹{fare.baseFare}</span>
                    <Badge variant="secondary" className="text-xs">Fixed Rate</Badge>
                  </div>
                ) : (
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-primary">₹{fare.perKmRate}</span>
                    <span className="text-gray-600">/km</span>
                  </div>
                )}
                
                {fare.waitingCharges && (
                  <p className="text-sm">
                    <strong>Waiting:</strong> ₹{fare.waitingCharges}/min
                  </p>
                )}
                
                {fare.minFare && (
                  <p className="text-sm">
                    <strong>Minimum:</strong> ₹{fare.minFare}
                  </p>
                )}
                
                <p className="text-sm">
                  <strong>Capacity:</strong> {fare.capacity}
                </p>
                
                <p className="text-sm text-gray-600">
                  <strong>Features:</strong> {fare.features}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}