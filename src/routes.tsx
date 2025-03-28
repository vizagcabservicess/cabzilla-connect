
import { createBrowserRouter } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import BookingConfirmationPage from "./pages/BookingConfirmationPage";
import DashboardPage from "./pages/DashboardPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import BookingEditPage from "./pages/BookingEditPage";
import ReceiptPage from "./pages/ReceiptPage";
import CabsPage from "./pages/CabsPage";
import ToursPage from "./pages/ToursPage";
import AdminDatabasePage from "./pages/AdminDatabasePage";
import VehiclesListPage from "./pages/admin/VehiclesListPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
    errorElement: <NotFound />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/booking-confirmation",
    element: <BookingConfirmationPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardPage />,
  },
  {
    path: "/booking/edit/:id",
    element: <BookingEditPage />,
  },
  {
    path: "/receipt/:id",
    element: <ReceiptPage />,
  },
  {
    path: "/cabs",
    element: <CabsPage />,
  },
  {
    path: "/tours",
    element: <ToursPage />,
  },
  {
    path: "/admin",
    element: <AdminDashboardPage />,
  },
  {
    path: "/admin/vehicles",
    element: <VehiclesListPage />,
  },
  {
    path: "/admin/database",
    element: <AdminDatabasePage />,
  },
]);

export default router;
