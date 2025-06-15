
export interface TripDetails {
    tripType: 'outstation' | 'local' | 'airport' | 'tour';
    from: string;
    to: string;
    pickupDate: string;
    pickupTime: string;
    returnDate: string;
    tripMode?: 'one-way' | 'round-trip';
    hourlyPackage?: string;
    distance?: number;
}

export interface GuestDetails {
    name: string;
    phone: string;
    email: string;
    specialRequest?: string;
}
