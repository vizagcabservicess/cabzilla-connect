import { Outlet } from 'react-router-dom';
import { SmartBudgetVendorAuthProvider } from '@/providers/SmartBudgetVendorAuthProvider';

/** Shared auth shell for /smart-budget/vendor/* so login → dashboard keeps the same session. */
export default function SmartBudgetVendorAuthLayout() {
  return (
    <SmartBudgetVendorAuthProvider>
      <Outlet />
    </SmartBudgetVendorAuthProvider>
  );
}
