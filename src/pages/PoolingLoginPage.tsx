import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PoolingAuthForm } from '@/components/pooling/PoolingAuthForm';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';

export default function PoolingLoginPage() {
  const navigate = useNavigate();
  const { user } = usePoolingAuth();

  React.useEffect(() => {
    if (user) {
      // Redirect based on user role
      switch (user.role) {
        case 'admin':
          navigate('/pooling/admin');
          break;
        case 'provider':
          navigate('/pooling/provider');
          break;
        case 'guest':
          navigate('/pooling/guest');
          break;
        default:
          navigate('/pooling');
          break;
      }
    }
  }, [user, navigate]);

  const handleSuccess = () => {
    // Navigation will be handled by the useEffect above
  };

  return <PoolingAuthForm onSuccess={handleSuccess} />;
}
