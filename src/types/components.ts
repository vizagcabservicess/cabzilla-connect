
import { BookingStatus } from './api';
import { Location } from './api';

export interface BookingStatusManagerProps {
  currentStatus: BookingStatus;
  onStatusChange: (newStatus: BookingStatus) => Promise<void>;
  isAdmin: boolean;
  onDelete?: () => Promise<void>;
}

export interface LocationInputProps {
  label?: string;
  placeholder?: string;
  value?: any;
  location?: Location;
  onLocationChange: (location: Location) => void;
  isPickupLocation?: boolean;
  isAirportTransfer?: boolean;
  readOnly?: boolean;
  className?: string;
}

export interface GuestDetailsFormProps {
  onSubmit: (contactDetails: any) => Promise<void>;
  totalPrice: number;
  initialData?: {
    name: string;
    email: string;
    phone: string;
  };
  bookingId?: string;
  isEditing?: boolean;
  isSubmitting?: boolean;
  onBack?: () => void;
  paymentEnabled?: boolean;
}

export interface CabOptionsProps {
  cabTypes: any[];
  selectedCab: any;
  onSelectCab: (cab: any) => void;
  distance: number;
  tripType: string;
  tripMode: string;
  pickupDate?: Date;
  returnDate?: Date;
  hourlyPackage?: any;
  isCalculatingFares: boolean;
}

export interface GoogleMapComponentProps {
  pickupLocation: Location;
  dropLocation: Location;
  onDistanceCalculated: (distance: number, duration: number) => void;
  tripType: string;
}

export interface HeroProps {
  title: string;
  subtitle: string;
}

export interface ReportGeneratorProps {
  reportType: string;
  dateRange: any;
}

export interface PayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayrollAdded: () => void;
  payrollToEdit?: any;
  selectedDriverId?: string | number;
}
