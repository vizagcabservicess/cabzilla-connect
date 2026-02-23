import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { groupTourAPI } from '@/services/api/groupTourAPI';
import { CheckCircle2, MapPin, Calendar, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';

interface ConfirmationData {
  booking_number: string;
  pickup_location: string;
  dropoff_location: string;
  travel_date: string;
  seats: string[];
  total_amount: number;
  customer_name: string;
  customer_phone: string;
  boarding_point_name?: string | null;
  boarding_point_time?: string | null;
  drop_point_name?: string | null;
}

export default function GroupTourConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [data, setData] = useState<ConfirmationData | null>(null);
  const [waUrl, setWaUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    const stored = sessionStorage.getItem(`groupTourBooking_${bookingId}`);
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (_) {}
    }
    groupTourAPI
      .getBookingDetails(bookingId)
      .then((b) =>
        setData((prev) => prev ?? {
          booking_number: b.booking_number,
          pickup_location: b.pickup_location,
          dropoff_location: b.dropoff_location,
          travel_date: b.travel_date,
          seats: b.seats,
          total_amount: b.total_amount,
          customer_name: b.customer_name,
          customer_phone: b.customer_phone,
          boarding_point_name: b.boarding_point_name,
          boarding_point_time: b.boarding_point_time,
          drop_point_name: b.drop_point_name,
        })
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    if (!data || !data.customer_phone) return;
    const p = data.customer_phone.replace(/\D/g, '');
    const num = p.length === 10 ? '91' + p : p;
    const msg = `🚐 *Vizag Taxi Hub - Tempo Traveller Booking Confirmed*

Hello ${data.customer_name || 'Customer'}!

Your seat-sharing booking has been confirmed.

*Booking ID:* ${data.booking_number}
*Pickup:* ${data.pickup_location}
*Drop:* ${data.dropoff_location}
*Travel Date:* ${data.travel_date}
*Seats:* ${(data.seats || []).join(', ')}
${data.boarding_point_name ? `*Boarding:* ${data.boarding_point_name}${data.boarding_point_time ? ` (${data.boarding_point_time})` : ''}\n` : ''}${data.drop_point_name ? `*Drop:* ${data.drop_point_name}\n` : ''}
*Total Amount:* ₹${(data.total_amount || 0).toLocaleString('en-IN')}

Thank you for choosing Vizag Taxi Hub. Have a safe journey! 🙏`;
    setWaUrl(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div
          className="rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/50 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-slate-600 mb-6">
            Your Tempo Traveller seat-sharing booking with Vizag Taxi Hub is confirmed.
          </p>
          {data && (
            <div className="text-left bg-slate-50/80 rounded-xl p-4 mb-6 space-y-2">
              <p className="font-semibold text-slate-800">Booking ID: {data.booking_number}</p>
              <p className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4" />
                {data.pickup_location} → {data.dropoff_location}
              </p>
              <p className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4" />
                {data.travel_date}
              </p>
              {data.seats?.length ? (
                <p className="text-slate-600">Seats: {data.seats.join(', ')}</p>
              ) : null}
              {data.boarding_point_name ? (
                <p className="text-slate-600">Boarding: {data.boarding_point_name}{data.boarding_point_time ? ` (${data.boarding_point_time})` : ''}</p>
              ) : null}
              {data.drop_point_name && data.drop_point_name !== data.boarding_point_name ? (
                <p className="text-slate-600">Drop: {data.drop_point_name}</p>
              ) : data.drop_point_name ? (
                <p className="text-slate-600">Drop: {data.drop_point_name} (same as boarding)</p>
              ) : null}
              {data.total_amount ? (
                <p className="font-medium text-slate-800">Total: ₹{data.total_amount.toLocaleString('en-IN')}</p>
              ) : null}
            </div>
          )}
          {waUrl && (
            <Button
              asChild
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 mb-4"
            >
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                Send WhatsApp Confirmation
              </a>
            </Button>
          )}
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/group-tours">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Group Tours
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Go to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
      <Footer />
    </>
  );
}
