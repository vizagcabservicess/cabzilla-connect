import '@/lib/fonts-poppins';
import { Outlet } from 'react-router-dom';
import { CarpoolUserProvider } from '@/providers/CarpoolUserProvider';
import { CarpoolBottomNav } from './CarpoolBottomNav';

type CarpoolAppShellProps = {
  showBottomNav?: boolean;
};

export function CarpoolAppShell({ showBottomNav = false }: CarpoolAppShellProps) {
  return (
    <CarpoolUserProvider>
      <div
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <Outlet />
        {showBottomNav && <CarpoolBottomNav />}
      </div>
    </CarpoolUserProvider>
  );
}
