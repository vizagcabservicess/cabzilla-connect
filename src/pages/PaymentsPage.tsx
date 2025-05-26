
import { PaymentsList } from "@/components/admin/payment/PaymentsList";

export default function PaymentsPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Payments</h1>
      <PaymentsList payments={[]} onUpdatePaymentStatus={() => {}} onSendReminder={() => {}} isLoading={false} />
    </div>
  );
} 
