
export interface CancellationPolicy {
  id: number;
  type: 'customer' | 'provider';
  hoursBeforeDeparture: number;
  refundPercentage: number;
  penaltyAmount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Commission {
  id: number;
  bookingId: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  driverPayout: number;
  status: 'pending' | 'paid' | 'disputed';
  payoutDate?: string;
  createdAt: string;
}

export interface Dispute {
  id: number;
  bookingId: number;
  customerId: number;
  providerId: number;
  type: 'service_quality' | 'payment' | 'cancellation' | 'behavior' | 'other';
  subject: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution?: string;
  compensationAmount?: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderKYC {
  id: number;
  providerId: number;
  documentType: 'driving_license' | 'vehicle_registration' | 'insurance' | 'identity_proof';
  documentNumber: string;
  documentUrl: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  expiryDate?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface ProviderRating {
  id: number;
  providerId: number;
  customerId: number;
  bookingId: number;
  rating: number;
  review?: string;
  serviceAspects: {
    punctuality: number;
    vehicleCondition: number;
    behavior: number;
    safety: number;
  };
  createdAt: string;
}

export interface Wallet {
  id: number;
  userId: number;
  userType: 'customer' | 'provider';
  balance: number;
  lockedAmount: number;
  totalEarnings?: number;
  totalSpent?: number;
  lastTransactionAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: number;
  walletId: number;
  type: 'credit' | 'debit' | 'lock' | 'unlock';
  amount: number;
  purpose: 'booking_payment' | 'refund' | 'commission' | 'penalty' | 'compensation' | 'withdrawal';
  referenceId?: number;
  description: string;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface EnhancedPoolingRide extends PoolingRide {
  cancellationPolicy?: CancellationPolicy;
  providerRating?: number;
  totalReviews?: number;
  isKYCVerified?: boolean;
  lastCancellationDate?: string;
  cancellationCount?: number;
}

export interface EnhancedPoolingBooking extends PoolingBooking {
  cancellationReason?: string;
  cancellationDate?: string;
  refundAmount?: number;
  commissionDetails?: Commission;
  walletTransactionId?: number;
  disputeId?: number;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export interface PoolingAnalytics {
  totalRides: number;
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  commissionEarned: number;
  averageRating: number;
  totalProviders: number;
  verifiedProviders: number;
  activeDisputes: number;
  refundsProcessed: number;
  cancellationRate: number;
  monthlyGrowth: number;
  revenueByType: {
    carpool: number;
    bus: number;
    sharedTaxi: number;
  };
  topRoutes: Array<{
    route: string;
    bookings: number;
    revenue: number;
  }>;
}

export interface TermsAndConditions {
  id: number;
  version: string;
  type: 'customer' | 'provider' | 'general';
  title: string;
  content: string;
  isActive: boolean;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}
