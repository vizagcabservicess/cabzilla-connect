
import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PaymentGateway } from "@/components/PaymentGateway";
import { CheckCircle, Edit2, X, Save } from 'lucide-react';

interface ContactDetails {
  name: string;
  email: string;
  phone: string;
}

interface EditableContactDetailsFormProps {
  onSubmit: (details: ContactDetails) => void;
  totalPrice: number;
  prefillData?: ContactDetails;
}

export function EditableContactDetailsForm({ 
  onSubmit, 
  totalPrice, 
  prefillData 
}: EditableContactDetailsFormProps) {
  const [name, setName] = useState(prefillData?.name || '');
  const [email, setEmail] = useState(prefillData?.email || '');
  const [phone, setPhone] = useState(prefillData?.phone || '');
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [isEditing, setIsEditing] = useState(!prefillData);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  // Load saved contact details from localStorage if available
  useEffect(() => {
    if (!prefillData) {
      const savedDetails = localStorage.getItem('contactDetails');
      if (savedDetails) {
        try {
          const parsedDetails = JSON.parse(savedDetails);
          setName(parsedDetails.name || '');
          setEmail(parsedDetails.email || '');
          setPhone(parsedDetails.phone || '');
        } catch (error) {
          console.error('Error parsing saved contact details:', error);
        }
      }
    }
  }, [prefillData]);

  // Track changes to form fields
  useEffect(() => {
    if (!isEditing) return;
    
    // Check if current values differ from original values
    const originalName = prefillData?.name || '';
    const originalEmail = prefillData?.email || '';
    const originalPhone = prefillData?.phone || '';
    
    setHasUnsavedChanges(
      name !== originalName || 
      email !== originalEmail || 
      phone !== originalPhone
    );
  }, [name, email, phone, prefillData, isEditing]);

  const validateContactDetails = (): boolean => {
    if (!name || !email || !phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return false;
    }

    // Validate phone number format (basic check for 10 digits)
    if (!/^\d{10}$/.test(phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSaveDetails = () => {
    if (!validateContactDetails()) return;

    // Save contact details to localStorage for future use
    const contactDetails = { name, email, phone };
    localStorage.setItem('contactDetails', JSON.stringify(contactDetails));

    setIsEditing(false);
    setHasUnsavedChanges(false);
    
    toast({
      title: "Contact Details Saved",
      description: "Your contact information has been saved successfully.",
    });
  };

  const handleContactDetailsSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateContactDetails()) return;

    // Show payment gateway after contact details validation
    setShowPaymentGateway(true);
  };

  const handlePaymentComplete = () => {
    const contactDetails = { name, email, phone };
    
    // Save contact details to localStorage for future use
    localStorage.setItem('contactDetails', JSON.stringify(contactDetails));
    
    onSubmit(contactDetails);
  };

  const handleCancelEdit = () => {
    if (prefillData) {
      setName(prefillData.name);
      setEmail(prefillData.email);
      setPhone(prefillData.phone);
    } else {
      // If no prefill data, try to reset to saved localStorage data
      const savedDetails = localStorage.getItem('contactDetails');
      if (savedDetails) {
        try {
          const parsedDetails = JSON.parse(savedDetails);
          setName(parsedDetails.name || '');
          setEmail(parsedDetails.email || '');
          setPhone(parsedDetails.phone || '');
        } catch (error) {
          console.error('Error parsing saved contact details:', error);
        }
      }
    }
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  return (
    <div className="space-y-6">
      {!showPaymentGateway ? (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Contact Information</h3>
            {!isEditing && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1"
              >
                <Edit2 size={16} />
                Edit
              </Button>
            )}
          </div>
          
          <form onSubmit={handleContactDetailsSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                type="text"
                id="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                type="email"
                id="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                type="tel"
                id="phone"
                placeholder="Enter your 10-digit phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50" : ""}
              />
            </div>
            
            {isEditing ? (
              <div className="flex justify-between items-center pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1"
                >
                  <X size={16} />
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSaveDetails}
                  className="flex items-center gap-1"
                  disabled={!hasUnsavedChanges}
                >
                  <Save size={16} />
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-2">
                <div>
                  Total: 
                  <span className="font-semibold ml-1">₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                <Button type="submit">Proceed to Payment</Button>
              </div>
            )}
          </form>
        </div>
      ) : (
        <PaymentGateway 
          totalAmount={totalPrice}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
