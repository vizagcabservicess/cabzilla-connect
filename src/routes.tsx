
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import PaymentsManagementPage from './pages/PaymentsManagementPage';
import DashboardPage from './pages/AdminDashboardPage'; // Using existing page
import ExpensesPage from './pages/ExpensesPage'; // Using existing page
import LedgerPage from './pages/LedgerPage'; // Using existing page
import LoginPage from './pages/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: '', element: <PaymentsManagementPage /> },
    ],
  },
  {
    path: '/admin',
    element: <App />,
    children: [
      { path: '', element: <DashboardPage /> },
      { path: 'payments', element: <PaymentsManagementPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'ledger', element: <LedgerPage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
]);
