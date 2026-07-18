import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import { uploadSmartBudgetVendorFile } from '@/lib/smartBudgetUpload';
import { useSmartBudgetVendorAuth } from '@/providers/SmartBudgetVendorAuthProvider';
import { SmartBudgetMediaViewLink } from '@/components/smart-budget/SmartBudgetMediaImage';
import type { SmartBudgetVendor } from '@/types/smartBudget';

const DOC_FIELDS = [
  { key: 'pan', label: 'PAN card' },
  { key: 'aadhaar', label: 'Aadhaar card' },
  { key: 'rc', label: 'RC (Registration)' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'dl', label: 'Driving licence' },
  { key: 'pollution', label: 'Pollution (PUC)' },
  { key: 'permit', label: 'Permit' },
] as const;

type DocKey = (typeof DOC_FIELDS)[number]['key'];

export default function SmartBudgetVendorOnboardingPage() {
  const navigate = useNavigate();
  const { vendor, isAuthenticated, isLoading, refreshVendor } = useSmartBudgetVendorAuth();
  const [profile, setProfile] = useState<SmartBudgetVendor | null>(vendor);
  const [docs, setDocs] = useState<Partial<Record<DocKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    void smartBudgetAPI.vendor.me().then((me) => {
      setProfile(me);
      refreshVendor(me);
      setDocs({
        pan: me.documents?.pan || undefined,
        aadhaar: me.documents?.aadhaar || undefined,
        rc: me.documents?.rc || undefined,
        insurance: me.documents?.insurance || undefined,
        dl: me.documents?.dl || undefined,
        pollution: me.documents?.pollution || undefined,
        permit: me.documents?.permit || undefined,
      });
    });
  }, [isAuthenticated, refreshVendor]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/smart-budget/vendor/signup" replace />;
  }

  if (profile?.verification_status === 'approved') {
    return <Navigate to="/smart-budget/vendor" replace />;
  }

  const uploadDoc = async (key: DocKey, file: File | null) => {
    if (!file) return;
    setUploading(key);
    try {
      const url = await uploadSmartBudgetVendorFile(file, `sb-vendor-${key}`);
      setDocs((d) => ({ ...d, [key]: url }));
      toast.success(`${key.toUpperCase()} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const updated = await smartBudgetAPI.vendor.updateOnboarding({
        documents: docs,
        submit_for_review: true,
      });
      refreshVendor(updated);
      setProfile(updated);
      toast.success('Documents submitted — admin will verify before go-live');
      navigate('/smart-budget/vendor', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
          Vendor onboarding
        </p>
        <h1 className="text-lg font-bold">Upload KYC documents</h1>
        <p className="text-xs text-muted-foreground">
          Hello {profile?.name}. Upload all documents below. Admin is notified on submit — your
          profile goes live only after approval.
        </p>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Required documents</CardTitle>
          <CardDescription className="text-xs">
            PAN, Aadhaar, RC, Insurance, DL, Pollution, Permit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DOC_FIELDS.map((doc) => {
            const review = profile?.document_reviews?.[doc.key];
            const canUpload = review?.can_upload ?? !docs[doc.key];
            return (
              <div
                key={doc.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div>
                  <Label className="text-xs font-medium">{doc.label} *</Label>
                  <p className="text-[11px] capitalize text-muted-foreground">
                    {(review?.status || (docs[doc.key] ? 'uploaded' : 'missing')).replace('_', ' ')}
                    {review?.locked ? ' · locked' : ''}
                  </p>
                  {review?.reason && (
                    <p className="text-[11px] text-amber-800 mt-0.5">{review.reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {docs[doc.key] && <SmartBudgetMediaViewLink url={docs[doc.key]!} />}
                  {canUpload ? (
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1.5 text-[11px]">
                      <Upload className="h-3 w-3" />
                      {uploading === doc.key ? '…' : docs[doc.key] ? 'Re-upload' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={Boolean(uploading)}
                        onChange={(e) => void uploadDoc(doc.key, e.target.files?.[0] ?? null)}
                      />
                    </label>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Read-only</span>
                  )}
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            className="w-full bg-emerald-700 hover:bg-emerald-800"
            disabled={saving || Boolean(uploading)}
            onClick={() => void submit()}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit for admin verification
          </Button>
          <Button asChild variant="ghost" className="w-full text-xs">
            <Link to="/smart-budget/vendor">Skip for now (profile stays offline)</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
