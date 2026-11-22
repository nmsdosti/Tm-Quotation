import React, { useMemo, useState } from 'react';
import {
  Copy,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  FileSpreadsheet,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { StatusSelect } from '../components/StatusBadge';
import { QUOTATION_STATUSES } from '../constants/defaults';
import { useAppData } from '../context/AppDataContext';
import { Quotation, QuotationStatus } from '../types/quotation';
import { exportQuotationsToExcel } from '../utils/excelExport';
import { formatDateDisplay, formatINR, formatTimestampDisplay } from '../utils/formatters';
import { downloadQuotationPdf } from '../utils/pdfGenerator';

interface AllQuotationsPageProps {
  onCreateNew: () => void;
  onViewQuotation: (q: Quotation) => void;
  onEditQuotation: (q: Quotation) => void;
}

export const AllQuotationsPage: React.FC<AllQuotationsPageProps> = ({
  onCreateNew,
  onViewQuotation,
  onEditQuotation,
}) => {
  const {
    quotations,
    settings,
    updateQuotationStatus,
    duplicateQuotation,
    deleteQuotation,
    pushToast,
  } = useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'amount_desc' | 'amount_asc'>('latest');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredQuotations = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    const minAmt = minAmount !== '' ? Number(minAmount) : null;
    const maxAmt = maxAmount !== '' ? Number(maxAmount) : null;

    const list = quotations.filter((q) => {
      if (qLower) {
        const matchesNum = q.quotationNumber.toLowerCase().includes(qLower);
        const matchesCustomer = q.customer.companyName.toLowerCase().includes(qLower);
        const matchesSubject = q.subject.toLowerCase().includes(qLower);
        if (!matchesNum && !matchesCustomer && !matchesSubject) return false;
      }
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
      if (dateFrom && q.quotationDate < dateFrom) return false;
      if (dateTo && q.quotationDate > dateTo) return false;
      if (minAmt !== null && !Number.isNaN(minAmt) && q.grandTotal < minAmt) return false;
      if (maxAmt !== null && !Number.isNaN(maxAmt) && q.grandTotal > maxAmt) return false;
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'amount_desc') return b.grandTotal - a.grandTotal;
      if (sortBy === 'amount_asc') return a.grandTotal - b.grandTotal;
      const dateCmp = (a.quotationDate || '').localeCompare(b.quotationDate || '');
      const timeA = a.updatedAt?.getTime() || a.createdAt?.getTime() || 0;
      const timeB = b.updatedAt?.getTime() || b.createdAt?.getTime() || 0;
      if (sortBy === 'oldest') return dateCmp !== 0 ? dateCmp : timeA - timeB;
      return dateCmp !== 0 ? -dateCmp : timeB - timeA;
    });
  }, [quotations, searchQuery, statusFilter, dateFrom, dateTo, minAmount, maxAmount, sortBy]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    statusFilter !== 'ALL' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(minAmount) ||
    Boolean(maxAmount);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('latest');
  };

  const handleStatusChange = async (q: Quotation, status: QuotationStatus) => {
    setBusyId(q.id);
    try {
      await updateQuotationStatus(q.id, status);
      pushToast({
        type: 'success',
        title: 'Status updated',
        description: `${q.quotationNumber} changed to ${status}.`,
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'Update failed',
        description: 'Could not change quotation status.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (q: Quotation) => {
    setBusyId(q.id);
    try {
      const created = await duplicateQuotation(q);
      pushToast({
        type: 'success',
        title: 'Quotation duplicated',
        description: `New quotation ${created.quotationNumber} created from ${q.quotationNumber}.`,
      });
      onEditQuotation(created);
    } catch {
      pushToast({
        type: 'error',
        title: 'Duplicate failed',
        description: 'Could not duplicate quotation.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuotation(deleteTarget.id);
      pushToast({
        type: 'success',
        title: 'Quotation deleted',
        description: `${deleteTarget.quotationNumber} has been permanently removed.`,
      });
      setDeleteTarget(null);
    } catch {
      pushToast({
        type: 'error',
        title: 'Delete failed',
        description: 'Could not delete quotation.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#071D36] tracking-tight">All Quotations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filteredQuotations.length} of {quotations.length} quotation
            {quotations.length === 1 ? '' : 's'} shown
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={filteredQuotations.length === 0}
            onClick={() => {
              exportQuotationsToExcel(filteredQuotations);
              pushToast({
                type: 'success',
                title: 'Quotations exported',
                description: `Exported ${filteredQuotations.length} record(s) to Excel.`,
              });
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#071D36] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer whitespace-nowrap"
          >
            <FilePlus2 className="w-4 h-4 text-[#F5B51B]" />
            New Quotation
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by quotation no., customer name, or subject..."
              className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            >
              <option value="ALL">All Statuses</option>
              {QUOTATION_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <select
              aria-label="Sort quotations"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'latest' | 'oldest' | 'amount_desc' | 'amount_asc')
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            >
              <option value="latest">Sort: Latest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="amount_desc">Sort: Highest Amount</option>
              <option value="amount_asc">Sort: Lowest Amount</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 items-end">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Min Amount (₹)</label>
            <input
              type="number"
              min="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0"
              className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Max Amount (₹)</label>
            <input
              type="number"
              min="0"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="Any"
              className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex justify-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-[#071D36] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredQuotations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-[#071D36]">
              {quotations.length === 0 ? 'No quotations saved yet' : 'No matching quotations found'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {quotations.length === 0
                ? 'Create a quotation to build your permanent commercial archive.'
                : 'Try adjusting your search query, date range, or status filters.'}
            </p>
            {quotations.length === 0 ? (
              <button
                type="button"
                onClick={onCreateNew}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#071D36] rounded-lg hover:bg-[#0E2B4D] cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4 text-[#F5B51B]" />
                Create Quotation
              </button>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 px-4 py-2 text-xs font-semibold text-[#071D36] bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Quotation No.</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Total Amount</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Last Updated</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#071D36] whitespace-nowrap">
                      {q.quotationNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-[190px] truncate">
                      {q.customer.companyName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[230px] truncate">{q.subject}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {formatDateDisplay(q.quotationDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-bold tabular-nums text-[#071D36] whitespace-nowrap">
                      {formatINR(q.grandTotal)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusSelect
                        value={q.status}
                        disabled={busyId === q.id}
                        onChange={(st) => void handleStatusChange(q, st)}
                      />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {formatTimestampDisplay(q.updatedAt || q.createdAt)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="View Quotation"
                          onClick={() => onViewQuotation(q)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit Quotation"
                          onClick={() => onEditQuotation(q)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Duplicate Quotation"
                          disabled={busyId === q.id}
                          onClick={() => void handleDuplicate(q)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Download PDF"
                          disabled={busyId === q.id}
                          onClick={() => void downloadQuotationPdf(q, settings)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete Quotation"
                          onClick={() => setDeleteTarget(q)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Quotation?"
        description={`Are you sure you want to permanently delete quotation ${
          deleteTarget?.quotationNumber || ''
        } for ${deleteTarget?.customer.companyName || ''}? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        loading={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
