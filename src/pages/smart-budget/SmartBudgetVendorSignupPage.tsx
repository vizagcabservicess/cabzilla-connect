import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import { uploadSmartBudgetVendorFile } from '@/lib/smartBudgetUpload';

const VEHICLE_TYPES = [
  'Swift Dzire',
  'Toyota Glanza',
  'Honda Amaze',
  'Ertiga',
  'Innova Crysta',
  'Tempo Traveller',
  'Urbania',
  'Sedan',
  'SUV',
];

const SIGNUP_DRAFT_KEY = 'sb_vendor_signup_draft';

export default function SmartBudgetVendorSignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [acceptAnyVehicleType, setAcceptAnyVehicleType] = useState(false);
  const [profileUrl, setProfileUrl] = useState('');
  const [profilePreview, setProfilePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const onProfileFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file for your profile photo');
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setProfilePreview(localPreview);
    setUploading(true);
    try {
      const url = await uploadSmartBudgetVendorFile(file, 'sb-vendor-profile');
      setProfileUrl(url);
      toast.success('Profile photo uploaded');
    } catch (err) {
      setProfileUrl('');
      setProfilePreview('');
      URL.revokeObjectURL(localPreview);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async (e: FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      toast.error('Enter a valid 10-digit WhatsApp number');
      return;
    }
    if (!name.trim() || password.length < 6 || !vehicleType || !vehicleNumber.trim() || !profileUrl) {
      toast.error('Fill all mandatory fields including profile photo and vehicle details');
      return;
    }
    setLoading(true);
    try {
      const { dev_otp } = await smartBudgetAPI.vendor.sendSignupOtp(digits);
      sessionStorage.setItem(
        SIGNUP_DRAFT_KEY,
        JSON.stringify({
          phone: digits,
          name: name.trim(),
          email: email.trim(),
          password,
          vehicleType,
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          acceptAnyVehicleType,
          profileUrl,
        })
      );
      toast.success('OTP sent to your WhatsApp');
      // Only when server APP_DEBUG is on (same as carpool) — never expected in production.
      if (dev_otp) toast.message(`Debug OTP: ${dev_otp}`);
      navigate(`/smart-budget/vendor/verify-otp?phone=${digits}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <form
        onSubmit={(e) => void handleContinue(e)}
        className="w-full max-w-lg space-y-3 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
            Vizag Taxi Hub
          </p>
          <h1 className="text-lg font-bold">Vendor signup</h1>
          <p className="text-xs text-muted-foreground">
            OTP on WhatsApp · live only after admin verifies your documents
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Full name *</Label>
            <Input className="h-9 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">WhatsApp phone *</Label>
            <Input
              className="h-9 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              inputMode="tel"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input className="h-9 text-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Password *</Label>
            <Input
              className="h-9 text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vehicle type *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              required
            >
              <option value="">Select</option>
              {VEHICLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vehicle number *</Label>
            <Input
              className="h-9 text-sm uppercase"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              required
              placeholder="AP31AB1234"
            />
          </div>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium">Trip matching</p>
          <p className="text-[11px] text-muted-foreground">
            You can change this anytime after login from Vehicles or Profile.
          </p>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              className="mt-1"
              name="signup-trip-match"
              checked={!acceptAnyVehicleType}
              onChange={() => setAcceptAnyVehicleType(false)}
            />
            <span className="text-xs">
              <span className="font-medium">Only my vehicle type</span>
              <span className="block text-muted-foreground">Default — match your cab only</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              className="mt-1"
              name="signup-trip-match"
              checked={acceptAnyVehicleType}
              onChange={() => setAcceptAnyVehicleType(true)}
            />
            <span className="text-xs">
              <span className="font-medium">Any vehicle type</span>
              <span className="block text-muted-foreground">Receive every open trip</span>
            </span>
          </label>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Profile photo *</Label>
          <div className="flex items-center gap-3">
            {profilePreview || profileUrl ? (
              <img
                src={profilePreview || profileUrl}
                alt=""
                className="h-14 w-14 rounded-full border object-cover bg-slate-50"
                onError={(e) => {
                  // Fall back to placeholder if remote URL fails after blob cleared
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-slate-50 text-[10px] text-muted-foreground">
                Photo
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Upload photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => void onProfileFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={loading || uploading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue with WhatsApp OTP
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Already registered?{' '}
          <Link className="text-emerald-800 underline" to="/smart-budget/vendor/login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

export { SIGNUP_DRAFT_KEY };
