import React, { useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { CompanySettings, Quotation } from '../types/quotation';
import { downloadQuotationPdf, printQuotationPdf } from '../utils/pdfGenerator';
import { QuotationDocumentView } from './QuotationDocumentView';

interface QuotationPreviewModalProps {
  quotation: Quotation | null;
  settings: CompanySettings;
  onClose: () => void;
  onEdit?: (quotation: Quotation) => void;
}

export const QuotationPreviewModal: React.FC<QuotationPreviewModalProps> = ({
  quotation,
  settings,
  onClose,
  onEdit,
}) => {
  const [downloading, setDownloading] = useState(false);

  if (!quotation) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadQuotationPdf(quotation, settings);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    await printQuotationPdf(quotation, settings);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#071D36]/65 backdrop-blur-[2px] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Quotation preview"
    >
      {/* Modal Action Bar */}
      <div className="bg-[#071D36] text-white px-4 sm:px-6 py-3 flex items-center justify-between gap-4 border-b border-white/10 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">
            {quotation.quotationNumber} · {quotation.customer.companyName || 'Draft Preview'}
          </p>
          <p className="text-xs text-slate-300 truncate">{quotation.subject}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(quotation);
              }}
              className="px-3.5 py-2 text-xs font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Edit Quotation
            </button>
          )}
          <button
            type="button"
            onClick={() => void handlePrint()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={() => void handleDownload()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#F5B51B] hover:bg-[#E0A20F] text-[#071D36] rounded-lg transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable A4 Document Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#E8ECF2]">
        <QuotationDocumentView quotation={quotation} settings={settings} />
      </div>
    </div>
  );
};
