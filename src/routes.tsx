
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import PaymentsManagementPage from './pages/PaymentsManagementPage';
import DashboardPage from './pages/AdminDashboardPage'; 
import ExpensesPage from './pages/ExpensesPage'; 
import LedgerPage from './pages/LedgerPage'; 
import LoginPage from './pages/LoginPage';
import Index from './pages/Index';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '', element: <Index /> },
      { path: 'admin/payments', element: <PaymentsManagementPage /> },
      { path: 'admin', element: <DashboardPage /> },
      { path: 'admin/expenses', element: <ExpensesPage /> },
      { path: 'admin/ledger', element: <LedgerPage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
]);
