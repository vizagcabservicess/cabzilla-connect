import { Outlet } from 'react-router-dom';
import { SmartBudgetCustomerAuthProvider } from '@/providers/SmartBudgetCustomerAuthProvider';

export default function SmartBudgetCustomerAuthLayout() {
  return (
    <SmartBudgetCustomerAuthProvider>
      <Outlet />
    </SmartBudgetCustomerAuthProvider>
  );
}
