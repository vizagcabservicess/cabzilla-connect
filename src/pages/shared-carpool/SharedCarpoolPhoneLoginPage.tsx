import { useEffect } from 'react';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { Helmet } from 'react-helmet-async';

import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';

import { carpoolLoginPath } from '@/components/shared-carpooling/carpoolAuthRoutes';



/** Legacy route — phone-only login is no longer used; redirect to email login. */

export default function SharedCarpoolPhoneLoginPage() {

  const navigate = useNavigate();

  const [params] = useSearchParams();

  const returnTo = params.get('return') || '/shared-carpooling/home';



  useEffect(() => {

    navigate(carpoolLoginPath(returnTo), { replace: true });

  }, [navigate, returnTo]);



  return (

    <>

      <Helmet><title>Login | Vizag Taxi Hub</title></Helmet>

      <CarpoolAppHeader showBack title="Login" />

    </>

  );

}

