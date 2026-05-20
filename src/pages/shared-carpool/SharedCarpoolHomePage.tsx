import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, Search, ShieldCheck } from 'lucide-react';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { CarpoolBottomNav } from '@/components/shared-carpooling/app/CarpoolBottomNav';
import { BRAND_GREEN, POPULAR_ROUTES } from '@/components/shared-carpooling/constants';
import { getProfileVerificationPath, hasSubmittedProfileVerification } from '@/components/shared-carpooling/verificationRoutes';
import { useCarpoolUser } from '@/providers/CarpoolUserProvider';

export default function SharedCarpoolHomePage() {
  const { user, isProfileVerified } = useCarpoolUser();
  const name = user?.fullName?.split(' ')[0] ?? 'Commuter';
  const verificationPath = getProfileVerificationPath(user);
  const needsProfileForm =
    user?.verificationStatus === 'none'
    || user?.verificationStatus === 'rejected'
    || (user?.verificationStatus === 'pending' && !hasSubmittedProfileVerification(user));
  const awaitingReview = user?.verificationStatus === 'pending' && hasSubmittedProfileVerification(user);

  return (
    <>
      <Helmet><title>Home | Vizag Taxi Hub Carpooling</title></Helmet>
      <CarpoolAppHeader showLogo />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-6">
        <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${BRAND_GREEN} 0%, #006b36 100%)` }}>
          <p className="text-sm text-white/80">Welcome back,</p>
          <h1 className="text-2xl font-bold">{name}!</h1>
          {isProfileVerified ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified {user?.userRole === 'student' ? 'Student' : 'Employee'}
            </span>
          ) : awaitingReview ? (
            <Link
              to={verificationPath}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-3 py-1 text-xs font-bold uppercase text-amber-950 transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Verification Pending
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : needsProfileForm ? (
            <Link
              to={verificationPath}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase text-amber-950 shadow-sm transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              Complete Verification
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        <Link
          to="/shared-carpooling/find"
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl py-5 text-base font-semibold text-white shadow-lg"
          style={{ backgroundColor: BRAND_GREEN }}
        >
          <Search className="h-5 w-5" />
          Find a Ride
        </Link>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-gray-900">Popular Routes Today</h2>
          <div className="mt-3 space-y-2">
            {POPULAR_ROUTES.slice(0, 4).map((r) => (
              <Link
                key={`${r.from}-${r.to}`}
                to="/shared-carpooling/find"
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.from} → {r.to}</p>
                  <p className="text-xs text-gray-500">{r.ridesToday} rides today</p>
                </div>
                <span className="text-xs font-semibold capitalize" style={{ color: BRAND_GREEN }}>
                  {r.demand} demand
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <CarpoolBottomNav />
    </>
  );
}
