import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D36]/50 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    variant === 'danger'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 id="confirm-modal-title" className="text-base font-bold text-[#071D36]">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close modal"
                className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">{description}</p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                  variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-[#071D36] text-white hover:bg-[#0E2B4D]'
                }`}
              >
                {loading ? 'Processing...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
