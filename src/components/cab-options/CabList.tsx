
import React, { useEffect, useState, useCallback } from 'react';
import { CabType } from '@/types/cab';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  cabErrors?: Record<string, string>;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
  tripType?: string;
  hourlyPackage?: string;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  cabFares,
  isCalculatingFares,
  cabErrors = {},
  handleSelectCab,
  getFareDetails,
  tripType,
  hourlyPackage
}) => {
  const [localFares, setLocalFares] = useState<Record<string, number>>(cabFares);
  const [lastFareUpdate, setLastFareUpdate] = useState<number>(Date.now());
  const [currentPackage, setCurrentPackage] = useState<string | undefined>(hourlyPackage);
  
  // Listen for package changes specifically
  useEffect(() => {
    const handleHourlyPackageSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId) {
        const { packageId } = customEvent.detail;
        console.log(`CabList: Detected package change to ${packageId}`);
        
        // Update our current package
        setCurrentPackage(packageId);
        
        // Clear all fare caches for the previous package to avoid confusion
        try {
          if (hourlyPackage && hourlyPackage !== packageId) {
            console.log(`CabList: Clearing fare caches for previous package ${hourlyPackage}`);
            
            const localStorageKeys = Object.keys(localStorage);
            for (const key of localStorageKeys) {
              if (key.includes(hourlyPackage)) {
                localStorage.removeItem(key);
                console.log(`CabList: Cleared ${key} due to package change`);
              }
            }
            
            // Force reload fares for all cabs with the new package
            setTimeout(() => {
              cabTypes.forEach(cab => {
                const normalizedCabId = cab.id.toLowerCase().replace(/\s+/g, '_');
                fetchFareFromDatabase(normalizedCabId, packageId)
                  .then(price => {
                    if (price && price > 0) {
                      setLocalFares(prev => ({
                        ...prev,
                        [normalizedCabId]: price
                      }));
                      
                      // Save the selected fare in localStorage
                      localStorage.setItem(`selected_fare_${normalizedCabId}_${packageId}`, price.toString());
                      localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
                      
                      // Also update currently selected cab if any
                      if (selectedCabId && normalizedCabId === selectedCabId.toLowerCase().replace(/\s+/g, '_')) {
                        // Dispatch event to update booking summary
                        window.dispatchEvent(new CustomEvent('global-fare-update', {
                          detail: {
                            cabId: normalizedCabId,
                            cabName: cab.name,
                            tripType: 'local',
                            packageId: packageId,
                            fare: price,
                            source: 'cablist-package-change',
                            timestamp: Date.now()
                          }
                        }));
                      }
                    }
                  });
              });
            }, 200);
          }
        } catch (error) {
          console.error('Error clearing fare caches:', error);
        }
      }
    };
    
    const handleBookingPackageChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId) {
        const { packageId } = customEvent.detail;
        console.log(`CabList: Detected booking-package-changed event for ${packageId}`);
        
        // Update our current package
        setCurrentPackage(packageId);
        
        // If we have a selected cab, dispatch fare events for it
        if (selectedCabId) {
          const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
          const selectedFareKey = `selected_fare_${normalizedCabId}_${packageId}`;
          const selectedFare = localStorage.getItem(selectedFareKey);
          
          if (selectedFare) {
            const parsedFare = parseFloat(selectedFare);
            if (!isNaN(parsedFare) && parsedFare > 0) {
              // Dispatch event to update booking summary
              window.dispatchEvent(new CustomEvent('global-fare-update', {
                detail: {
                  cabId: normalizedCabId,
                  tripType: 'local',
                  packageId: packageId,
                  fare: parsedFare,
                  source: 'cablist-package-change-cached',
                  timestamp: Date.now()
                }
              }));
            } else {
              // Try to fetch from database
              fetchFareFromDatabase(normalizedCabId, packageId)
                .then(price => {
                  if (price && price > 0) {
                    // Dispatch event to update booking summary
                    window.dispatchEvent(new CustomEvent('global-fare-update', {
                      detail: {
                        cabId: normalizedCabId,
                        tripType: 'local',
                        packageId: packageId,
                        fare: price,
                        source: 'cablist-package-change-fetched',
                        timestamp: Date.now()
                      }
                    }));
                  }
                });
            }
          } else {
            // Try to fetch from database
            fetchFareFromDatabase(normalizedCabId, packageId)
              .then(price => {
                if (price && price > 0) {
                  // Dispatch event to update booking summary
                  window.dispatchEvent(new CustomEvent('global-fare-update', {
                    detail: {
                      cabId: normalizedCabId,
                      tripType: 'local',
                      packageId: packageId,
                      fare: price,
                      source: 'cablist-package-change-fetched',
                      timestamp: Date.now()
                    }
                  }));
                }
              });
          }
        }
      }
    };
    
    window.addEventListener('hourly-package-selected', handleHourlyPackageSelected as EventListener);
    window.addEventListener('booking-package-changed', handleBookingPackageChanged as EventListener);
    
    return () => {
      window.removeEventListener('hourly-package-selected', handleHourlyPackageSelected as EventListener);
      window.removeEventListener('booking-package-changed', handleBookingPackageChanged as EventListener);
    };
  }, [cabTypes, selectedCabId, hourlyPackage]);
  
  // This ensures that currentPackage is updated when hourlyPackage prop changes
  useEffect(() => {
    if (hourlyPackage && hourlyPackage !== currentPackage) {
      setCurrentPackage(hourlyPackage);
    }
  }, [hourlyPackage, currentPackage]);
  
  const fetchFareFromDatabase = useCallback(async (cabId: string, packageId?: string) => {
    if (!tripType || tripType !== 'local' || !packageId) return null;
    
    // Use the package from state if it's more current
    const packageToUse = currentPackage || packageId;
    
    try {
      // First try with direct-booking-data.php - MUST match requestConfig.fetchLocalPackageFares order
      const normalizedCabId = cabId.toLowerCase().replace(/\s+/g, '_');
      const apiUrl = getApiUrl(`api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedCabId}&package_id=${packageToUse}`);
      
      console.log(`CabList: Fetching fare from primary API for ${normalizedCabId} - ${packageToUse}`);
      const response = await axios.get(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.status === 'success' && response.data.price) {
        const price = Number(response.data.price);
        if (price > 0) {
          console.log(`CabList: Retrieved fare from primary API: ₹${price} for ${normalizedCabId} - ${packageToUse}`);
          
          // Broadcast the source of this fare for debugging and consistency tracking
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: packageToUse,
              fare: price,
              source: 'direct-booking-data',
              apiUrl: apiUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${packageToUse}`, price.toString());
          localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
          
          return price;
        }
      } else if (response.data && response.data.data) {
        // Handle alternative response format
        const data = response.data.data;
        let price = 0;
        
        if (packageToUse.includes('4hrs-40km') && data.price4hrs40km) {
          price = Number(data.price4hrs40km);
        } else if (packageToUse.includes('8hrs-80km') && data.price8hrs80km) {
          price = Number(data.price8hrs80km);
        } else if (packageToUse.includes('10hrs-100km') && data.price10hrs100km) {
          price = Number(data.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`CabList: Retrieved fare from alternate format: ₹${price} for ${normalizedCabId} - ${packageToUse}`);
          
          // Broadcast the source of this fare
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: packageToUse,
              fare: price,
              source: 'direct-booking-data-alternate',
              apiUrl: apiUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${packageToUse}`, price.toString());
          localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
          
          return price;
        }
      }
      
      // If primary API fails, try local-package-fares.php
      const localFaresUrl = getApiUrl(`api/local-package-fares.php?vehicle_id=${normalizedCabId}&package_id=${packageToUse}`);
      
      console.log(`CabList: Trying local-package-fares API for ${normalizedCabId} - ${packageToUse}`);
      const localFaresResponse = await axios.get(localFaresUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (localFaresResponse.data && localFaresResponse.data.status === 'success' && localFaresResponse.data.price) {
        const price = Number(localFaresResponse.data.price);
        if (price > 0) {
          console.log(`CabList: Retrieved fare from local-package-fares API: ₹${price} for ${normalizedCabId} - ${packageToUse}`);
          
          // Broadcast the source of this fare
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: packageToUse,
              fare: price,
              source: 'local-package-fares',
              apiUrl: localFaresUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${packageToUse}`, price.toString());
          localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
          
          return price;
        }
      }
      
      // If that fails too, try fallback API
      const fallbackApiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
      
      console.log(`CabList: Trying fallback API for ${normalizedCabId}`);
      const fallbackResponse = await axios.get(fallbackApiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (fallbackResponse.data && fallbackResponse.data.fares && fallbackResponse.data.fares[normalizedCabId]) {
        const fareData = fallbackResponse.data.fares[normalizedCabId];
        
        let price = 0;
        if (packageToUse.includes('4hrs-40km')) {
          price = Number(fareData.price4hrs40km || 0);
        } else if (packageToUse.includes('8hrs-80km')) {
          price = Number(fareData.price8hrs80km || 0);
        } else if (packageToUse.includes('10hrs-100km')) {
          price = Number(fareData.price10hrs100km || 0);
        }
        
        if (price > 0) {
          console.log(`CabList: Retrieved fare from fallback API: ₹${price} for ${normalizedCabId}`);
          
          // Broadcast the source of this fare
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: packageToUse,
              fare: price,
              source: 'direct-local-fares',
              apiUrl: fallbackApiUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${packageToUse}`, price.toString());
          localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
          
          return price;
        }
      }
      
      // If all API attempts fail, use dynamic calculation
      // Base prices for different vehicle types (IDENTICAL to BookingSummaryHelper's fallback)
      const basePrices: Record<string, Record<string, number>> = {
        'sedan': {
          '4hrs-40km': 2400,
          '8hrs-80km': 3000,
          '10hrs-100km': 3500
        },
        'ertiga': {
          '4hrs-40km': 2800,
          '8hrs-80km': 3500,
          '10hrs-100km': 4000
        },
        'innova_crysta': {
          '4hrs-40km': 3200,
          '8hrs-80km': 4000,
          '10hrs-100km': 4500
        },
        'innova_hycross': {
          '4hrs-40km': 3600,
          '8hrs-80km': 4500,
          '10hrs-100km': 5000
        },
        'mpv': {
          '4hrs-40km': 3600,
          '8hrs-80km': 4500,
          '10hrs-100km': 5000
        },
        'dzire_cng': {
          '4hrs-40km': 2400,
          '8hrs-80km': 3000,
          '10hrs-100km': 3500
        },
        'tempo_traveller': {
          '4hrs-40km': 4000,
          '8hrs-80km': 5500,
          '10hrs-100km': 7000
        }
      };
      
      // Find appropriate category
      let vehicleCategory = normalizedCabId;
      
      if (!basePrices[vehicleCategory]) {
        if (vehicleCategory.includes('ertiga')) {
          vehicleCategory = 'ertiga';
        } else if (vehicleCategory.includes('innova')) {
          if (vehicleCategory.includes('hycross') || vehicleCategory.includes('mpv')) {
            vehicleCategory = 'innova_hycross';
          } else {
            vehicleCategory = 'innova_crysta';
          }
        } else if (vehicleCategory.includes('cng') || vehicleCategory.includes('dzire')) {
          vehicleCategory = 'dzire_cng';
        } else if (vehicleCategory.includes('tempo') || vehicleCategory.includes('traveller')) {
          vehicleCategory = 'tempo_traveller';
        } else if (vehicleCategory.includes('mpv')) {
          vehicleCategory = 'mpv';
        } else {
          vehicleCategory = 'sedan'; // default
        }
      }
      
      // Get price for the package
      let packageKey = '';
      if (packageToUse.includes('4hrs-40km')) {
        packageKey = '4hrs-40km';
      } else if (packageToUse.includes('8hrs-80km')) {
        packageKey = '8hrs-80km';
      } else if (packageToUse.includes('10hrs-100km')) {
        packageKey = '10hrs-100km';
      }
      
      if (basePrices[vehicleCategory] && basePrices[vehicleCategory][packageKey]) {
        const price = basePrices[vehicleCategory][packageKey];
        console.log(`CabList: Using dynamic calculation: ₹${price} for ${normalizedCabId}`);
        
        // Broadcast the source of this fare
        window.dispatchEvent(new CustomEvent('fare-source-update', {
          detail: {
            cabId: normalizedCabId,
            packageId: packageToUse,
            fare: price,
            source: 'dynamic-calculation',
            timestamp: Date.now()
          }
        }));
        
        // Save the selected fare in localStorage for consistency
        localStorage.setItem(`selected_fare_${normalizedCabId}_${packageToUse}`, price.toString());
        localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
        
        return price;
      }
      
      return null;
    } catch (error) {
      console.error(`CabList: Error fetching fare for ${cabId}:`, error);
      return null;
    }
  }, [tripType, currentPackage]);
  
  useEffect(() => {
    if (selectedCabId && tripType === 'local') {
      // Use the most current package info
      const packageToUse = currentPackage || hourlyPackage;
      
      if (packageToUse) {
        // First check if there's a cached fare in localStorage
        const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
        const selectedFareKey = `selected_fare_${normalizedCabId}_${packageToUse}`;
        const cachedFare = localStorage.getItem(selectedFareKey);
        
        if (cachedFare) {
          const parsedFare = parseFloat(cachedFare);
          if (!isNaN(parsedFare) && parsedFare > 0) {
            console.log(`CabList: Using cached fare from localStorage: ${parsedFare} for ${normalizedCabId}`);
            
            setLocalFares(prev => ({
              ...prev,
              [normalizedCabId]: parsedFare
            }));
            
            // Broadcast the price to ensure consistency
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                calculated: true,
                fare: parsedFare,
                packageId: packageToUse,
                source: 'localstorage-cached',
                timestamp: Date.now()
              }
            }));
            
            // Also send a global fare update
            window.dispatchEvent(new CustomEvent('global-fare-update', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                packageId: packageToUse,
                fare: parsedFare,
                source: 'localstorage-cached',
                timestamp: Date.now()
              }
            }));
            
            return;
          }
        }
        
        // If no valid cached fare, fetch from database
        fetchFareFromDatabase(selectedCabId, packageToUse)
          .then(price => {
            if (price && price > 0) {
              const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
              
              setLocalFares(prev => ({
                ...prev,
                [normalizedCabId]: price
              }));
              
              // Save to localStorage for the BookingSummary to use
              localStorage.setItem(`selected_fare_${normalizedCabId}_${packageToUse}`, price.toString());
              localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
              
              // Broadcast to ensure other components use the same price
              window.dispatchEvent(new CustomEvent('fare-calculated', {
                detail: {
                  cabId: normalizedCabId,
                  tripType: 'local',
                  calculated: true,
                  fare: price,
                  packageId: packageToUse,
                  source: 'database-direct-cablist',
                  timestamp: Date.now()
                }
              }));
              
              // Also send a global fare update for all components
              window.dispatchEvent(new CustomEvent('global-fare-update', {
                detail: {
                  cabId: normalizedCabId,
                  tripType: 'local',
                  packageId: packageToUse,
                  fare: price,
                  source: 'database-direct-cablist',
                  timestamp: Date.now()
                }
              }));
            }
          });
      }
    }
  }, [selectedCabId, tripType, hourlyPackage, fetchFareFromDatabase, currentPackage]);
  
  useEffect(() => {
    const handleFareCalculated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, source, packageId } = customEvent.detail;
        
        if (customEvent.detail.tripType === tripType) {
          console.log(`CabList: Updating fare for ${cabId} to ${fare} from event (source: ${source || 'unknown'})`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: fare
          }));
          
          // Save to localStorage for the BookingSummary to use
          if (packageId) {
            localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fare.toString());
            localStorage.setItem(`fare_local_${cabId}`, fare.toString());
          }
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    const handleGlobalFareUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, source, packageId } = customEvent.detail;
        
        if (!customEvent.detail.tripType || customEvent.detail.tripType === tripType) {
          console.log(`CabList: Received global fare update: ${fare} for ${cabId} (source: ${source || 'unknown'})`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: fare
          }));
          
          // Save to localStorage for the BookingSummary to use
          if (packageId) {
            localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fare.toString());
            localStorage.setItem(`fare_local_${cabId}`, fare.toString());
          }
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    const handleFareSyncRequired = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.databaseFare) {
        const { cabId, databaseFare, tripType: eventTripType, packageId } = customEvent.detail;
        
        if (eventTripType === tripType) {
          console.log(`CabList: Synchronizing fare for ${cabId} to database value: ${databaseFare}`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: databaseFare
          }));
          
          // Save to localStorage for the BookingSummary to use
          if (packageId) {
            localStorage.setItem(`selected_fare_${cabId}_${packageId}`, databaseFare.toString());
            localStorage.setItem(`fare_local_${cabId}`, databaseFare.toString());
          }
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    const handleBookingSummaryFareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, tripType: eventTripType, packageId } = customEvent.detail;
        
        if (eventTripType === tripType) {
          console.log(`CabList: Updating fare from booking summary for ${cabId}: ${fare}`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: fare
          }));
          
          // Save to localStorage for consistency across components
          if (packageId) {
            localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fare.toString());
            localStorage.setItem(`fare_local_${cabId}`, fare.toString());
          }
          
          setLastFareUpdate(Date.now());
          
          // If we're getting frequent price updates for a cab that's different from what we had,
          // inform the user
          if (cabId === selectedCabId?.toLowerCase().replace(/\s+/g, '_')) {
            const selectedCabFare = cabFares[cabId];
            if (Math.abs(selectedCabFare - fare) > 100) {
              toast.info(`Price updated: ₹${fare}`, {
                id: `price-update-${cabId}`,
                duration: 3000
              });
            }
          }
        }
      }
    };
    
    const handleBookingSummaryPackageUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId) {
        const { packageId } = customEvent.detail;
        console.log(`CabList: Detected package update from booking summary: ${packageId}`);
        
        // Update our current package
        setCurrentPackage(packageId);
      }
    };
    
    const handleCabSelection = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, packageId } = customEvent.detail;
        
        if (tripType === 'local' && packageId) {
          console.log(`CabList: Saving selected fare for ${cabId} with package ${packageId}: ₹${fare}`);
          
          // Save the selected fare in localStorage
          localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fare.toString());
          localStorage.setItem(`fare_local_${cabId}`, fare.toString());
        }
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('global-fare-update', handleGlobalFareUpdate as EventListener);
    window.addEventListener('fare-sync-required', handleFareSyncRequired as EventListener);
    window.addEventListener('booking-summary-update', handleBookingSummaryFareUpdated as EventListener);
    window.addEventListener('booking-summary-fare-updated', handleBookingSummaryFareUpdated as EventListener);
    window.addEventListener('booking-summary-package-update', handleBookingSummaryPackageUpdate as EventListener);
    window.addEventListener('cab-selected', handleCabSelection as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('global-fare-update', handleGlobalFareUpdate as EventListener);
      window.removeEventListener('fare-sync-required', handleFareSyncRequired as EventListener);
      window.removeEventListener('booking-summary-update', handleBookingSummaryFareUpdated as EventListener);
      window.removeEventListener('booking-summary-fare-updated', handleBookingSummaryFareUpdated as EventListener);
      window.removeEventListener('booking-summary-package-update', handleBookingSummaryPackageUpdate as EventListener);
      window.removeEventListener('cab-selected', handleCabSelection as EventListener);
    };
  }, [tripType, selectedCabId, cabFares]);
  
  useEffect(() => {
    setLocalFares(cabFares);
  }, [cabFares]);
  
  useEffect(() => {
    if (tripType === 'local') {
      // Use the most current package
      const packageToUse = currentPackage || hourlyPackage;
      
      if (packageToUse) {
        const fetchAllFares = async () => {
          console.log(`CabList: Pre-fetching fares for all cabs with package ${packageToUse}`);
          
          for (const cab of cabTypes) {
            try {
              // First check if there's a cached fare in localStorage
              const normalizedCabId = cab.id.toLowerCase().replace(/\s+/g, '_');
              const selectedFareKey = `selected_fare_${normalizedCabId}_${packageToUse}`;
              const cachedFare = localStorage.getItem(selectedFareKey);
              
              if (cachedFare) {
                const parsedFare = parseFloat(cachedFare);
                if (!isNaN(parsedFare) && parsedFare > 0) {
                  console.log(`CabList: Using cached fare for ${normalizedCabId}: ${parsedFare}`);
                  
                  setLocalFares(prev => ({
                    ...prev,
                    [normalizedCabId]: parsedFare
                  }));
                  
                  // Broadcast the price to ensure consistency
                  window.dispatchEvent(new CustomEvent('global-fare-update', {
                    detail: {
                      cabId: normalizedCabId,
                      tripType: 'local',
                      packageId: packageToUse,
                      fare: parsedFare,
                      source: 'localstorage-prefetch',
                      timestamp: Date.now()
                    }
                  }));
                  
                  continue; // Skip API fetch
                }
              }
              
              // If no valid cached fare, fetch from database
              const price = await fetchFareFromDatabase(cab.id, packageToUse);
              if (price && price > 0) {
                const normalizedCabId = cab.id.toLowerCase().replace(/\s+/g, '_');
                
                setLocalFares(prev => ({
                  ...prev,
                  [normalizedCabId]: price
                }));
                
                // Save the selected fare in localStorage
                localStorage.setItem(`selected_fare_${normalizedCabId}_${packageToUse}`, price.toString());
                localStorage.setItem(`fare_local_${normalizedCabId}`, price.toString());
                
                // Broadcast the prices to ensure consistency across components
                window.dispatchEvent(new CustomEvent('global-fare-update', {
                  detail: {
                    cabId: normalizedCabId,
                    tripType: 'local',
                    packageId: packageToUse,
                    fare: price,
                    source: 'database-direct-cablist-prefetch',
                    timestamp: Date.now()
                  }
                }));
              }
            } catch (error) {
              console.error(`Error pre-fetching fare for ${cab.id}:`, error);
            }
          }
        };
        
        fetchAllFares();
      }
    }
  }, [tripType, currentPackage, hourlyPackage, cabTypes, fetchFareFromDatabase]);
  
  const formatPrice = (price?: number) => {
    if (!price && price !== 0) return "Price unavailable";
    return `₹${price.toLocaleString('en-IN')}`;
  };

  if (cabTypes.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-lg font-semibold">No vehicles available</p>
        <p className="text-muted-foreground">Please try selecting a different trip type.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cabTypes.map((cab) => {
        const isSelected = selectedCabId === cab.id;
        const cabId = cab.id.toLowerCase().replace(/\s+/g, '_');
        const cabFare = localFares[cabId] || localFares[cab.id] || cabFares[cabId] || cabFares[cab.id] || 0;
        const hasError = cabErrors[cab.id];
        
        return (
          <Card
            key={cab.id}
            className={`relative border overflow-hidden transition-all duration-200 h-full ${
              isSelected
                ? "border-primary shadow-md ring-1 ring-primary"
                : "hover:border-primary/50 hover:shadow-sm"
            }`}
          >
            <CardContent className="p-4 h-full flex flex-col">
              <div className="relative mb-4 pb-[56.25%] overflow-hidden rounded-md bg-muted">
                <img
                  src={cab.image || "/cars/sedan.png"}
                  alt={cab.name}
                  className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                />
              </div>

              <h3 className="text-lg font-semibold leading-tight">{cab.name}</h3>
              <p className="text-muted-foreground text-sm mb-2">
                {getFareDetails(cab)}
              </p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-secondary/40 rounded px-2 py-1">
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="font-medium">{cab.capacity} People</p>
                </div>
                <div className="bg-secondary/40 rounded px-2 py-1">
                  <p className="text-xs text-muted-foreground">Luggage</p>
                  <p className="font-medium">{cab.luggageCapacity} Bags</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-auto mb-3">
                {cab.amenities?.slice(0, 3).map((amenity, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-secondary/40 rounded-full"
                  >
                    {amenity}
                  </span>
                ))}
                {cab.amenities && cab.amenities.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-secondary/40 rounded-full">
                    +{cab.amenities.length - 3} more
                  </span>
                )}
              </div>

              <div
                onClick={() => {
                  if (!isCalculatingFares) {
                    // Store the fare before selection
                    const normalizedCabId = cab.id.toLowerCase().replace(/\s+/g, '_');
                    
                    // Use the most current package
                    const packageToUse = currentPackage || hourlyPackage;
                    
                    if (tripType === 'local' && packageToUse && cabFare > 0) {
                      console.log(`CabList: Saving selected fare for ${normalizedCabId}: ₹${cabFare}`);
                      
                      // Save in both formats for maximum compatibility
                      localStorage.setItem(`selected_fare_${normalizedCabId}_${packageToUse}`, cabFare.toString());
                      localStorage.setItem(`fare_local_${normalizedCabId}`, cabFare.toString());
                      
                      // Dispatch an event to notify other components of the selection
                      window.dispatchEvent(new CustomEvent('cab-selected', {
                        detail: {
                          cabId: normalizedCabId,
                          cabName: cab.name,
                          tripType: tripType,
                          packageId: packageToUse,
                          fare: cabFare,
                          timestamp: Date.now()
                        }
                      }));
                      
                      // Also send a global update
                      window.dispatchEvent(new CustomEvent('global-fare-update', {
                        detail: {
                          cabId: normalizedCabId,
                          tripType: tripType,
                          packageId: packageToUse,
                          fare: cabFare,
                          source: 'cab-selection',
                          timestamp: Date.now()
                        }
                      }));
                      
                      // Dispatch an event specifically for booking summary
                      window.dispatchEvent(new CustomEvent('booking-summary-update', {
                        detail: {
                          cabId: normalizedCabId,
                          cabName: cab.name,
                          tripType: tripType,
                          packageId: packageToUse,
                          fare: cabFare,
                          source: 'cab-selection-direct',
                          timestamp: Date.now() + 1
                        }
                      }));
                    }
                    
                    // Then call the parent handler
                    handleSelectCab(cab);
                  }
                }}
                className={`flex items-center justify-between p-3 mt-auto w-full rounded-md cursor-pointer transition-colors font-medium ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <span>
                  {isSelected ? "Selected" : "Select"}
                </span>
                <span className="font-semibold">
                  {isCalculatingFares ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasError ? (
                    <span className="text-xs text-destructive">{hasError}</span>
                  ) : cabFare > 0 ? (
                    formatPrice(cabFare)
                  ) : (
                    <span className="text-xs">Getting price...</span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
