import { CarpoolUserProvider, useCarpoolUserOptional } from '@/providers/CarpoolUserProvider';
import { cn } from '@/lib/utils';
import { CarpoolingNavbar } from './CarpoolingNavbar';
import { CarpoolBottomNav } from './app/CarpoolBottomNav';

type SharedCarpoolPublicLayoutProps = {
  children: React.ReactNode;
  onBookSeat: () => void;
};

function SharedCarpoolPublicLayoutInner({ children, onBookSeat }: SharedCarpoolPublicLayoutProps) {
  const carpoolUser = useCarpoolUserOptional();
  const isLoggedIn = Boolean(carpoolUser?.isPhoneVerified);

  return (
    <>
      <CarpoolingNavbar onBookSeat={onBookSeat} />
      <div className={cn('min-w-0 overflow-x-hidden', isLoggedIn ? 'pb-24 lg:pb-0' : undefined)}>{children}</div>
      {isLoggedIn && (
        <div className="lg:hidden">
          <CarpoolBottomNav />
        </div>
      )}
    </>
  );
}

export function SharedCarpoolPublicLayout({ children, onBookSeat }: SharedCarpoolPublicLayoutProps) {
  return (
    <CarpoolUserProvider>
      <SharedCarpoolPublicLayoutInner onBookSeat={onBookSeat}>{children}</SharedCarpoolPublicLayoutInner>
    </CarpoolUserProvider>
  );
}
