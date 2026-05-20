import { Outlet } from 'react-router-dom';
import { CarpoolUserProvider } from '@/providers/CarpoolUserProvider';

export default function CarpoolUserLayout() {
  return (
    <CarpoolUserProvider>
      <Outlet />
    </CarpoolUserProvider>
  );
}
