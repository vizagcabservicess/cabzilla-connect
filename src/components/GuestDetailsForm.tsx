
import { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EditableContactDetailsForm } from "@/components/EditableContactDetailsForm";
import { ArrowLeft } from 'lucide-react';

interface GuestDetailsFormProps {
  onSubmit: (details: any) => void;
  totalPrice: number;
  onBack?: () => void;
}

export function GuestDetailsForm({ onSubmit, totalPrice, onBack }: GuestDetailsFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  return (
    <div ref={formRef} className="transition-all duration-300 rounded-lg">
      {onBack && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          className="flex items-center gap-1 mb-4"
        >
          <ArrowLeft size={16} /> Back
        </Button>
      )}
      <EditableContactDetailsForm 
        onSubmit={onSubmit}
        totalPrice={totalPrice}
      />
    </div>
  );
}
