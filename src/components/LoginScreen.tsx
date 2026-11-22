import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileCheck2, Lock, ShieldCheck } from 'lucide-react';
import { DEFAULT_LOGO_PATH } from '../constants/defaults';
import { useAppData } from '../context/AppDataContext';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle } = useAppData();
  const [signingIn, setSigningIn] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleLogin = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      // Toast handled in context
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col lg:flex-row">
      {/* Left Brand Panel */}
      <div className="lg:w-[52%] bg-[#071D36] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Industrial Yellow Geometric Bar Motif matching Brochure */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 right-0 h-1.5 bg-[#F5B51B]"
        />
        <div
          aria-hidden="true"
          className="hidden lg:flex gap-3 absolute -bottom-8 -right-6 opacity-15 pointer-events-none"
        >
          <div className="w-12 h-48 bg-[#F5B51B] skew-x-[-24deg]" />
          <div className="w-6 h-48 bg-[#F5B51B] skew-x-[-24deg]" />
          <div className="w-4 h-48 bg-white skew-x-[-24deg]" />
        </div>

        <div>
          <div className="mb-10">
            {!logoError ? (
              <img
                src={DEFAULT_LOGO_PATH}
                alt="TM Industrial Solution Logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="text-2xl font-extrabold tracking-tight text-white">
                TM <span className="text-[#F5B51B]">INDUSTRIAL SOLUTION</span>
              </div>
            )}
          </div>

          <p className="text-xs font-semibold tracking-widest text-[#F5B51B] uppercase mb-3">
            Internal Commercial Platform
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.15] text-white max-w-lg [text-wrap:balance]">
            TM Quotation Manager
          </h1>
          <p className="mt-4 text-base text-slate-300 max-w-md leading-relaxed">
            The intelligence behind reliable machines. Draft multi-service technical proposals,
            manage industrial client records, and export print-ready A4 quotations backed by
            permanent cloud storage.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-semibold text-white">A4 Proposal PDFs</p>
            <p className="text-xs text-slate-400 mt-1">
              Multi-page technical scopes & GST commercial tables
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Reusable Service Library</p>
            <p className="text-xs text-slate-400 mt-1">
              Vibration, laser alignment, balancing, oil & thermography
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Cloud Persistence</p>
            <p className="text-xs text-slate-400 mt-1">
              Firebase Authentication & Cloud Firestore sync
            </p>
          </div>
        </div>
      </div>

      {/* Right Sign-In Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 sm:p-10"
        >
          <div className="w-11 h-11 rounded-lg bg-[#071D36] text-[#F5B51B] flex items-center justify-center mb-6">
            <FileCheck2 className="w-6 h-6" />
          </div>

          <h2 className="text-2xl font-bold text-[#071D36] tracking-tight">
            Sign in to workspace
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Access TM Industrial Solution&apos;s quotation database, customer directory, and
            service templates using your authorized Google account.
          </p>

          <button
            type="button"
            disabled={signingIn}
            onClick={handleLogin}
            className="mt-7 w-full flex items-center justify-center gap-3 px-5 py-3 bg-[#071D36] text-white font-semibold text-sm rounded-lg hover:bg-[#0E2B4D] focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:ring-offset-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#FFFFFF"
                d="M21.35 11.1h-9.18v2.92h5.27c-.23 1.24-.92 2.29-1.97 2.99v2.48h3.19c1.86-1.71 2.94-4.24 2.94-7.24 0-.4-.04-.78-.25-1.15z"
              />
              <path
                fill="#F5B51B"
                d="M12.17 21.5c2.65 0 4.88-.88 6.51-2.38l-3.19-2.48c-.88.59-2.01.94-3.32.94-2.55 0-4.72-1.72-5.49-4.04H3.38v2.56c1.62 3.22 4.95 5.4 8.79 5.4z"
              />
              <path
                fill="#CBD5E1"
                d="M6.68 13.54a5.76 5.76 0 0 1 0-3.71V7.27H3.38a9.83 9.83 0 0 0 0 8.83l3.3-2.56z"
              />
              <path
                fill="#FFFFFF"
                d="M12.17 5.79c1.44 0 2.74.5 3.76 1.47l2.82-2.82C17.04 2.86 14.82 1.87 12.17 1.87c-3.84 0-7.17 2.18-8.79 5.4l3.3 2.56c.77-2.32 2.94-4.04 5.49-4.04z"
              />
            </svg>
            {signingIn ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="mt-7 pt-6 border-t border-slate-200 space-y-3 text-xs text-slate-500">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#071D36] shrink-0 mt-0.5" />
              <span>
                Records are isolated per authenticated account with hardened Firestore security
                rules.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#071D36] shrink-0 mt-0.5" />
              <span>
                Standalone internal application for TM Industrial Solution — Rinkesh Patel.
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
