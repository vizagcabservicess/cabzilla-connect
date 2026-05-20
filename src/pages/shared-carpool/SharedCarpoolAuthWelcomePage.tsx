import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Helmet } from 'react-helmet-async';

import { Car, LogIn, UserPlus } from 'lucide-react';

import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';

import { BRAND_GREEN } from '@/components/shared-carpooling/constants';

import { carpoolLoginPath, carpoolSignupPath } from '@/components/shared-carpooling/carpoolAuthRoutes';



export default function SharedCarpoolAuthWelcomePage() {

  const navigate = useNavigate();

  const [params] = useSearchParams();

  const returnTo = params.get('return') || '/shared-carpooling/home';



  return (

    <>

      <Helmet>

        <title>Sign In | Vizag Taxi Hub Carpooling</title>

      </Helmet>

      <CarpoolAppHeader showBack />

      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-lg flex-col px-4 py-8">

        <div className="flex flex-1 flex-col items-center justify-center text-center">

          <div

            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"

            style={{ backgroundColor: `${BRAND_GREEN}15` }}

          >

            <Car className="h-10 w-10" style={{ color: BRAND_GREEN }} />

          </div>

          <h1 className="text-2xl font-bold text-gray-900">Welcome to Vizag Taxi Hub</h1>

          <p className="mt-2 max-w-xs text-sm text-gray-500">

            Log in with email to book seats and track your daily commute

          </p>



          <div className="mt-10 w-full space-y-3">

            <button

              type="button"

              onClick={() => navigate(carpoolLoginPath(returnTo))}

              className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white shadow-lg"

              style={{ backgroundColor: BRAND_GREEN }}

            >

              <LogIn className="h-5 w-5" />

              Login with Email

            </button>

            <Link

              to={carpoolSignupPath(returnTo)}

              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"

            >

              <UserPlus className="h-5 w-5" style={{ color: BRAND_GREEN }} />

              Create Account

            </Link>

          </div>

        </div>



        <p className="text-center text-xs text-gray-500">

          New users verify WhatsApp once during sign up. Returning users sign in with email &amp; password.

        </p>

      </main>

    </>

  );

}

