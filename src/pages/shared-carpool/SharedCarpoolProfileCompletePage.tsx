import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  BadgeCheck,
  Building2,
  Calendar,
  Clock,
  GraduationCap,
  IdCard,
  Loader2,
  Lock,
  Mail,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/config/api';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { VerificationStepper } from '@/components/shared-carpooling/app/VerificationStepper';
import { CompanySearchSelect } from '@/components/shared-carpooling/app/CompanySearchSelect';
import {
  BRAND_GREEN,
  BRAND_GREEN_LIGHT,
  VERIFICATION_COLLEGES,
  VERIFICATION_COMPANIES,
} from '@/components/shared-carpooling/constants';
import { carpoolLoginPath } from '@/components/shared-carpooling/carpoolAuthRoutes';
import { sharedCarpoolUserAPI } from '@/services/api/sharedCarpoolAPI';
import { useCarpoolUser } from '@/providers/CarpoolUserProvider';
import { hasSubmittedProfileVerification } from '@/components/shared-carpooling/verificationRoutes';

const MAX_ID_FILE_BYTES = 5 * 1024 * 1024;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SharedCarpoolProfileCompletePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('return') || '/shared-carpooling/home';
  const { user, refreshProfile, loading: sessionLoading } = useCarpoolUser();

  const [role, setRole] = useState<'employee' | 'student'>(user?.userRole ?? 'employee');
  const [company, setCompany] = useState(user?.company ?? '');
  const [employeeEmail, setEmployeeEmail] = useState(user?.employeeEmail ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ?? '');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fullName = user?.fullName?.trim() ?? '';

  if (!sessionLoading && hasSubmittedProfileVerification(user) && user?.verificationStatus === 'pending') {
    return <Navigate to="/shared-carpooling/profile/pending" replace />;
  }

  if (!sessionLoading && user?.verificationStatus === 'approved') {
    return <Navigate to="/shared-carpooling/home" replace />;
  }

  const whyVerify =
    role === 'employee'
      ? ([
          'Build trust in the community',
          'Access verified employee rides',
          'Priority support & safer rides',
        ] as const)
      : ([
          'Build trust in the community',
          'Access verified student rides',
          'Priority support & safer rides',
        ] as const);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setIdFile(null);
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Please upload JPG, PNG, or WEBP');
      return;
    }
    if (file.size > MAX_ID_FILE_BYTES) {
      toast.error('File must be 5MB or smaller');
      return;
    }
    setIdFile(file);
  };

  const uploadIdCard = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    form.append('category', 'carpool-id');
    const { data } = await axios.post(getApiUrl('/api/upload-image.php'), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (data.error || !data.url) throw new Error(data.error || 'Upload failed');
    return data.url as string;
  };

  const handleSubmit = async () => {
    if (!user?.phone) {
      toast.error('Please sign in first');
      navigate(carpoolLoginPath('/shared-carpooling/profile/complete'));
      return;
    }
    if (!fullName) {
      toast.error('Your name is missing — please sign in again');
      return;
    }
    if (!company.trim()) {
      toast.error(role === 'employee' ? 'Please select your company' : 'Please select your college');
      return;
    }
    if (!dateOfBirth) {
      toast.error('Please enter your date of birth');
      return;
    }
    if (!employeeEmail.trim()) {
      toast.error('Please enter your official email');
      return;
    }
    if (!isValidEmail(employeeEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!idFile) {
      toast.error('Please upload your ID card photo');
      return;
    }

    setSubmitting(true);
    try {
      const idCardUrl = await uploadIdCard(idFile);

      await sharedCarpoolUserAPI.submitProfile({
        phone: user.phone,
        full_name: fullName,
        user_role: role,
        company: company.trim(),
        employee_email: employeeEmail.trim(),
        id_card_url: idCardUrl,
        date_of_birth: dateOfBirth,
      });
      await refreshProfile();
      toast.success('Submitted for verification', {
        description: 'Check your official email and click the verification link.',
      });
      navigate('/shared-carpooling/profile/pending');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const orgLabel = role === 'employee' ? 'Company / Organisation' : 'College / University';
  const orgPlaceholder =
    role === 'employee' ? 'Select or search your company' : 'Select or search your college';
  const orgOptions = role === 'employee' ? VERIFICATION_COMPANIES : VERIFICATION_COLLEGES;
  const emailLabel =
    role === 'employee' ? 'Employee Email ID (Official)' : 'Student Email ID (Official)';
  const idLabel = role === 'employee' ? 'Employee ID Card Upload' : 'Student ID Card Upload';

  return (
    <>
      <Helmet>
        <title>Verify Your Account | Vizag Taxi Hub</title>
      </Helmet>

      <CarpoolAppHeader
        variant="branded"
        showBack
        backTo={returnTo}
        title="Verify Your Account"
        logoSubtitle="Carpooling for Employees & Students"
      />
      <VerificationStepper currentStep={2} />

      <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
        <p className="text-sm font-medium text-gray-700">Verify as</p>
        <p className="mt-1 text-sm text-gray-500">Help us serve you better by verifying your profile.</p>
        <div className="mt-2 flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          {([
            { id: 'employee' as const, label: 'Employee', Icon: Building2 },
            { id: 'student' as const, label: 'Student', Icon: GraduationCap },
          ]).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setRole(id);
                setCompany('');
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors',
                role === id
                  ? 'border border-green-200 bg-white text-green-800 shadow-sm'
                  : 'text-gray-500',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          <CompanySearchSelect
            label={orgLabel}
            required
            value={company}
            onChange={setCompany}
            options={orgOptions}
            placeholder={orgPlaceholder}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Date of Birth
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {emailLabel}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                placeholder="Enter your official email ID"
                required
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {idLabel}
              <span className="ml-0.5 text-red-500">*</span>
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white px-4 py-8 transition-colors hover:border-green-400 hover:bg-green-50/30">
              {idFile ? (
                <>
                  <IdCard className="h-10 w-10 text-green-600" />
                  <span className="mt-2 text-sm font-semibold text-gray-800">{idFile.name}</span>
                  <span className="mt-1 text-xs text-gray-500">Tap to change file</span>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Upload className="h-6 w-6 text-gray-500" />
                  </div>
                  <span
                    className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: BRAND_GREEN }}
                  >
                    Upload ID Card
                  </span>
                  <span className="mt-2 text-center text-xs text-gray-500">
                    Upload clear photo of your ID card
                  </span>
                  <span className="mt-0.5 text-center text-xs text-gray-400">
                    JPG, PNG or WEBP (Max 5MB)
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>

        <div
          className="mt-6 flex gap-4 rounded-2xl border border-green-100 p-4"
          style={{ backgroundColor: BRAND_GREEN_LIGHT }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">Why verify?</p>
            <ul className="mt-3 space-y-2">
              {whyVerify.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_GREEN }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative hidden w-24 shrink-0 sm:block">
            <div className="rounded-lg border-2 border-green-200 bg-white p-2 shadow-sm">
              <div className="h-16 rounded bg-gradient-to-br from-green-100 to-green-50" />
              <div className="mt-1 h-1.5 w-3/4 rounded bg-gray-200" />
              <div className="mt-1 h-1.5 w-1/2 rounded bg-gray-100" />
            </div>
            <div
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-white shadow"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              <BadgeCheck className="h-4 w-4" />
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          style={{ backgroundColor: BRAND_GREEN }}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit for Verification
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <Lock className="h-3.5 w-3.5" />
          Your information is secure and encrypted
        </p>

        <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-900">
            Verification usually takes 5–10 minutes. You&apos;ll get notified on WhatsApp once verified.
          </p>
        </div>
      </main>
    </>
  );
}
