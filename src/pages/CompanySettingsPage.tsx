import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Database,
  ExternalLink,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { DEFAULT_LOGO_PATH, DEFAULT_TERMS } from '../constants/defaults';
import { useAppData } from '../context/AppDataContext';
import { firebaseProjectInfo } from '../lib/firebase';
import { CompanySettings } from '../types/quotation';
import { buildQuotationNumber } from '../utils/formatters';

export const CompanySettingsPage: React.FC = () => {
  const { settings, saveCompanySettings, uploadCompanyLogo, pushToast } = useAppData();

  const [form, setForm] = useState<CompanySettings>(settings);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast({
        type: 'error',
        title: 'Invalid file type',
        description: 'Please upload a PNG, JPG, or WebP logo image.',
      });
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadCompanyLogo(file);
      setForm((prev) => ({ ...prev, logoUrl: url }));
      pushToast({
        type: 'success',
        title: 'Logo uploaded',
        description: 'Click Save Settings to persist your updated company logo.',
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'Logo upload failed',
        description: 'Could not process the selected logo image.',
      });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const moveTerm = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= form.defaultTerms.length) return;
    const next = [...form.defaultTerms];
    [next[idx], next[target]] = [next[target], next[idx]];
    setForm({ ...form, defaultTerms: next });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveCompanySettings(form);
      pushToast({
        type: 'success',
        title: 'Company settings saved',
        description: 'All future quotations and PDFs will use your updated settings.',
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'Save failed',
        description: 'Could not save company settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const previewQuoteNo = buildQuotationNumber(
    form.quotationPrefix,
    form.financialYear,
    form.nextSerialNumber
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#071D36] tracking-tight">Company Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure TM Industrial Solution branding, numbering sequence, GST defaults, bank
            details, and sample terms.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
        >
          <Save className="w-4 h-4 text-[#F5B51B]" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Company Logo & Identity */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-[#071D36]">Company Branding &amp; Contact</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Appears on the letterhead of every generated quotation PDF.
          </p>
        </div>

        {/* Logo Upload Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 bg-[#F4F6F9] border border-slate-200 rounded-xl">
          <div className="bg-[#071D36] px-5 py-3.5 rounded-lg flex items-center justify-center min-w-[180px] min-h-[68px]">
            <img
              src={form.logoUrl || DEFAULT_LOGO_PATH}
              alt="Company Logo Preview"
              referrerPolicy="no-referrer"
              className="h-10 w-auto max-w-[160px] object-contain"
            />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs font-semibold text-[#071D36]">Company Logo</p>
            <p className="text-xs text-slate-500">
              Transparent PNG recommended for best contrast on the Navy letterhead banner.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingLogo}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#071D36] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, logoUrl: DEFAULT_LOGO_PATH })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-[#071D36] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Default TM Logo
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tagline</label>
            <input
              type="text"
              maxLength={200}
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Contact Person
            </label>
            <input
              type="text"
              maxLength={120}
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              maxLength={40}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              maxLength={150}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Website</label>
            <input
              type="url"
              maxLength={200}
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Google Maps URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                maxLength={300}
                value={form.googleMapsUrl}
                onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
                className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
              {form.googleMapsUrl && (
                <a
                  href={form.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open Google Maps link"
                  className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:text-[#071D36] flex items-center"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Company GSTIN (Enter when ready)
            </label>
            <input
              type="text"
              maxLength={30}
              value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              placeholder="Leave blank if not applicable"
              className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Company Address (Enter your registered office / workshop address)
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Enter complete company address to display on quotations..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
        </div>
      </section>

      {/* Numbering & Tax Defaults */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#071D36]">
              Quotation Numbering &amp; Tax Defaults
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Controls auto-generated quotation numbers, GST rate, and validity window.
            </p>
          </div>
          <div className="px-3 py-1.5 bg-[#F4F6F9] border border-slate-200 rounded-lg text-xs">
            Next Number:{' '}
            <span className="font-mono font-bold text-[#071D36]">{previewQuoteNo}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prefix</label>
            <input
              type="text"
              required
              maxLength={20}
              value={form.quotationPrefix}
              onChange={(e) => setForm({ ...form, quotationPrefix: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Financial Year
            </label>
            <input
              type="text"
              required
              maxLength={20}
              value={form.financialYear}
              onChange={(e) => setForm({ ...form, financialYear: e.target.value })}
              placeholder="2026-27"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Next Serial No.
            </label>
            <input
              type="number"
              min="1"
              max="999999"
              required
              value={form.nextSerialNumber}
              onChange={(e) =>
                setForm({ ...form, nextSerialNumber: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default GST (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              required
              value={form.defaultGstRate}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultGstRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Validity (Days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              required
              value={form.defaultValidityDays}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultValidityDays: Math.min(365, Math.max(1, Number(e.target.value) || 30)),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
        </div>
      </section>

      {/* Default Company Introduction */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div>
          <h2 className="text-base font-bold text-[#071D36]">Default Company Introduction</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatically inserted into new quotations and editable per quotation.
          </p>
        </div>
        <textarea
          rows={5}
          maxLength={3000}
          value={form.defaultCompanyIntro}
          onChange={(e) => setForm({ ...form, defaultCompanyIntro: e.target.value })}
          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] leading-relaxed"
        />
      </section>

      {/* Default Terms & Conditions */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#071D36]">Default Terms &amp; Conditions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Editable sample terms pre-loaded into every new quotation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, defaultTerms: [...DEFAULT_TERMS] })}
              className="text-xs font-medium text-slate-500 hover:text-[#071D36] cursor-pointer"
            >
              Restore Samples
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, defaultTerms: [...form.defaultTerms, ''] })}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#071D36] bg-[#F4F6F9] hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Term
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {form.defaultTerms.map((term, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 w-6 text-right shrink-0">
                {idx + 1}.
              </span>
              <input
                type="text"
                maxLength={500}
                value={term}
                onChange={(e) => {
                  const next = [...form.defaultTerms];
                  next[idx] = e.target.value;
                  setForm({ ...form, defaultTerms: next });
                }}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => moveTerm(idx, -1)}
                className="p-1.5 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                title="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === form.defaultTerms.length - 1}
                onClick={() => moveTerm(idx, 1)}
                className="p-1.5 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                title="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    defaultTerms: form.defaultTerms.filter((_, i) => i !== idx),
                  })
                }
                className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                title="Remove term"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Authorized Signatory & Payment / Bank Details */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-[#071D36]">
            Signatory, Payment Terms &amp; Bank Details
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter your company bank account details only if you want remittance instructions printed
            on quotations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Authorized Signatory Name
            </label>
            <input
              type="text"
              maxLength={120}
              value={form.signatoryName}
              onChange={(e) => setForm({ ...form, signatoryName: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Signatory Title / Designation
            </label>
            <input
              type="text"
              maxLength={120}
              value={form.signatoryTitle}
              onChange={(e) => setForm({ ...form, signatoryTitle: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default Payment Terms
            </label>
            <textarea
              rows={2}
              maxLength={1000}
              value={form.defaultPaymentTerms}
              onChange={(e) => setForm({ ...form, defaultPaymentTerms: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Bank Account Details (Optional)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Account Name</label>
              <input
                type="text"
                maxLength={150}
                value={form.bankDetails.accountName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    bankDetails: { ...form.bankDetails, accountName: e.target.value },
                  })
                }
                placeholder="TM Industrial Solution"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                maxLength={120}
                value={form.bankDetails.bankName}
                onChange={(e) =>
                  setForm({
                    ...form,
                    bankDetails: { ...form.bankDetails, bankName: e.target.value },
                  })
                }
                placeholder="e.g., HDFC Bank"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                maxLength={50}
                value={form.bankDetails.accountNumber}
                onChange={(e) =>
                  setForm({
                    ...form,
                    bankDetails: { ...form.bankDetails, accountNumber: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                maxLength={30}
                value={form.bankDetails.ifscCode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    bankDetails: { ...form.bankDetails, ifscCode: e.target.value.toUpperCase() },
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
              <input
                type="text"
                maxLength={150}
                value={form.bankDetails.branch}
                onChange={(e) =>
                  setForm({
                    ...form,
                    bankDetails: { ...form.bankDetails, branch: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">UPI ID</label>
              <input
                type="text"
                maxLength={100}
                value={form.bankDetails.upiId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    bankDetails: { ...form.bankDetails, upiId: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Firebase Cloud Database Info */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#071D36] text-[#F5B51B] flex items-center justify-center shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <h2 className="text-sm font-bold text-[#071D36]">
              Permanent Cloud Storage (Firebase Firestore)
            </h2>
            <p>
              All quotations, customers, service templates, and company settings are permanently
              persisted in Google Cloud Firestore and synchronized across refreshes and devices.
            </p>
            <p className="font-mono text-[11px] text-slate-500 pt-1">
              Project: {firebaseProjectInfo.projectId} · Database: {firebaseProjectInfo.databaseId}
            </p>
          </div>
        </div>
      </section>
    </form>
  );
};
