import React from 'react';
import { QUOTATION_STATUSES } from '../constants/defaults';
import { QuotationStatus } from '../types/quotation';

const STATUS_STYLE_MAP: Record<QuotationStatus, string> = {
  Draft: 'text-slate-700 bg-slate-100 border-slate-200',
  Sent: 'text-sky-800 bg-sky-50 border-sky-200',
  'Under Discussion': 'text-amber-800 bg-amber-50 border-amber-200',
  Accepted: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  Rejected: 'text-red-800 bg-red-50 border-red-200',
  Expired: 'text-slate-600 bg-slate-100 border-slate-200',
};

export const StatusLabel: React.FC<{ status: QuotationStatus }> = ({ status }) => {
  const style = STATUS_STYLE_MAP[status] || STATUS_STYLE_MAP.Draft;
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap ${style}`}
    >
      {status}
    </span>
  );
};

interface StatusSelectProps {
  value: QuotationStatus;
  onChange: (next: QuotationStatus) => void;
  disabled?: boolean;
}

export const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange, disabled }) => {
  const style = STATUS_STYLE_MAP[value] || STATUS_STYLE_MAP.Draft;
  return (
    <select
      aria-label="Quotation status"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as QuotationStatus)}
      className={`text-xs font-medium rounded border px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F5B51B] transition-colors ${style}`}
    >
      {QUOTATION_STATUSES.map((st) => (
        <option key={st} value={st} className="bg-white text-[#071D36]">
          {st}
        </option>
      ))}
    </select>
  );
};
