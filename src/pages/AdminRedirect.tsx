
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from "@/components/ui/spinner";

const AdminRedirect = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user has admin privileges
    const isAdmin = localStorage.getItem('userRole') === 'admin';
    
    if (isAdmin) {
      // Redirect to admin dashboard
      navigate('/admin');
    } else {
      // Redirect to login page
      navigate('/login');
    }
  }, [navigate]);
  
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" />
      <p className="ml-2 text-lg">Redirecting...</p>
    </div>
  );
};

export default AdminRedirect;
