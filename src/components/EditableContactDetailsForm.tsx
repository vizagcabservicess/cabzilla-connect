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
  initialData?: ContactDetails;
  isReadOnly?: boolean;
  isSaving?: boolean;
}

export function EditableContactDetailsForm({ 
  onSubmit, 
  totalPrice, 
  prefillData,
  initialData,
  isReadOnly = false,
  isSaving = false
}: EditableContactDetailsFormProps) {
  const contactData = initialData || prefillData;
  
  const [name, setName] = useState(contactData?.name || '');
  const [email, setEmail] = useState(contactData?.email || '');
  const [phone, setPhone] = useState(contactData?.phone || '');
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [isEditing, setIsEditing] = useState(!contactData && !isReadOnly);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!contactData) {
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
  }, [contactData]);

  useEffect(() => {
    if (!isEditing) return;
    
    const originalName = contactData?.name || '';
    const originalEmail = contactData?.email || '';
    const originalPhone = contactData?.phone || '';
    
    setHasUnsavedChanges(
      name !== originalName || 
      email !== originalEmail || 
      phone !== originalPhone
    );
  }, [name, email, phone, contactData, isEditing]);

  const validateContactDetails = (): boolean => {
    if (!name || !email || !phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return false;
    }

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

    setShowPaymentGateway(true);
  };

  const handlePaymentComplete = () => {
    const contactDetails = { name, email, phone };
    
    localStorage.setItem('contactDetails', JSON.stringify(contactDetails));
    
    onSubmit(contactDetails);
  };

  const handleCancelEdit = () => {
    if (contactData) {
      setName(contactData.name);
      setEmail(contactData.email);
      setPhone(contactData.phone);
    } else {
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
