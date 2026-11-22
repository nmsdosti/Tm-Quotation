import React, { useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  Eye,
  FilePlus2,
  FileSpreadsheet,
  History,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { StatusLabel } from '../components/StatusBadge';
import { useAppData } from '../context/AppDataContext';
import { Customer, Quotation } from '../types/quotation';
import { exportCustomersToExcel } from '../utils/excelExport';
import { formatDateDisplay, formatINR } from '../utils/formatters';
import { downloadQuotationPdf } from '../utils/pdfGenerator';

interface CustomersPageProps {
  onViewQuotation: (q: Quotation) => void;
  onCreateQuotationForCustomer: (customer: Customer) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  onViewQuotation,
  onCreateQuotationForCustomer,
}) => {
  const {
    customers,
    quotations,
    settings,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    pushToast,
  } = useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

  const customerMetrics = useMemo(() => {
    const map = new Map<string, { quotes: Quotation[]; acceptedValue: number }>();
    customers.forEach((c) => {
      const matching = quotations.filter(
        (q) =>
          (q.customerId && q.customerId === c.id) ||
          q.customer.companyName.trim().toLowerCase() === c.companyName.trim().toLowerCase()
      );
      const acceptedValue = matching
        .filter((q) => q.status === 'Accepted')
        .reduce((sum, q) => sum + (q.grandTotal || 0), 0);
      map.set(c.id, { quotes: matching, acceptedValue });
    });
    return map;
  }, [customers, quotations]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.gstin.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const handleSave = async (
    data: Omit<Customer, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => {
    setSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, data);
        pushToast({
          type: 'success',
          title: 'Customer updated',
          description: `${data.companyName} details saved.`,
        });
      } else {
        await addCustomer(data);
        pushToast({
          type: 'success',
          title: 'Customer added',
          description: `${data.companyName} added to your customer database.`,
        });
      }
      setFormOpen(false);
      setEditingCustomer(null);
    } catch {
      pushToast({
        type: 'error',
        title: 'Save failed',
        description: 'Could not save customer details.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomer(deleteTarget.id);
      pushToast({
        type: 'success',
        title: 'Customer deleted',
        description: `${deleteTarget.companyName} removed from customer directory.`,
      });
      setDeleteTarget(null);
    } catch {
      pushToast({
        type: 'error',
        title: 'Delete failed',
        description: 'Could not delete customer.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const historyQuotes = historyCustomer ? customerMetrics.get(historyCustomer.id)?.quotes || [] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#071D36] tracking-tight">Customer Database</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {customers.length} industrial client{customers.length === 1 ? '' : 's'} registered
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={customers.length === 0}
            onClick={() => {
              exportCustomersToExcel(customers, quotations);
              pushToast({
                type: 'success',
                title: 'Customers exported',
                description: 'Saved TM_Customer_Database.xlsx.',
              });
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#071D36] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#F5B51B]" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, contact person, phone, GSTIN, or state..."
            className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-[#071D36]">
              {customers.length === 0 ? 'No customers added yet' : 'No matching customers found'}
            </p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Save client details once to auto-populate future quotations and track accepted
              business per industrial plant.
            </p>
            {customers.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setEditingCustomer(null);
                  setFormOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#071D36] rounded-lg hover:bg-[#0E2B4D] cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#F5B51B]" />
                Add First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone / Email</th>
                  <th className="py-3 px-4">GSTIN / State</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Quotations</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Accepted Value</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCustomers.map((c) => {
                  const metric = customerMetrics.get(c.id) || { quotes: [], acceptedValue: 0 };
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#071D36]">{c.companyName}</p>
                        {c.address && (
                          <p className="text-xs text-slate-500 truncate max-w-[240px]">
                            {c.address}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-slate-800">{c.contactPerson || '—'}</p>
                        {c.designation && (
                          <p className="text-xs text-slate-500">{c.designation}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <p>{c.phone || '—'}</p>
                        <p className="text-slate-500">{c.email || ''}</p>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <p className="font-mono text-slate-700">{c.gstin || '—'}</p>
                        <p className="text-slate-500">{c.state || ''}</p>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold tabular-nums text-[#071D36]">
                        {metric.quotes.length}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-bold tabular-nums text-emerald-700 whitespace-nowrap">
                        {formatINR(metric.acceptedValue)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Create quotation for customer"
                            onClick={() => onCreateQuotationForCustomer(c)}
                            className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <FilePlus2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="View quotation history"
                            onClick={() => setHistoryCustomer(c)}
                            className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Edit customer"
                            onClick={() => {
                              setEditingCustomer(c);
                              setFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete customer"
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <CustomerFormModal
        open={formOpen}
        initialCustomer={editingCustomer}
        saving={saving}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingCustomer(null);
        }}
      />

      {/* Delete Customer Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Customer?"
        description={`Remove ${deleteTarget?.companyName || ''} from your customer directory? Existing saved quotations for this customer will remain intact.`}
        confirmLabel="Delete Customer"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Customer Quotation History Modal */}
      {historyCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D36]/55 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#071D36]">{historyCustomer.companyName}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quotation history · {historyQuotes.length} record
                  {historyQuotes.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = historyCustomer;
                    setHistoryCustomer(null);
                    onCreateQuotationForCustomer(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer"
                >
                  <FilePlus2 className="w-3.5 h-3.5 text-[#F5B51B]" />
                  New Quote
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryCustomer(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {historyQuotes.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No quotations have been raised for this customer yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#F4F6F9] border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-2.5 px-3">Quotation No.</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {historyQuotes.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#071D36] whitespace-nowrap">
                            {q.quotationNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                            {formatDateDisplay(q.quotationDate)}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-700 max-w-[200px] truncate">
                            {q.subject}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs font-bold tabular-nums whitespace-nowrap">
                            {formatINR(q.grandTotal)}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusLabel status={q.status} />
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              title="View"
                              onClick={() => {
                                setHistoryCustomer(null);
                                onViewQuotation(q);
                              }}
                              className="p-1 text-slate-500 hover:text-[#071D36] cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              title="Download PDF"
                              onClick={() => void downloadQuotationPdf(q, settings)}
                              className="p-1 text-slate-500 hover:text-[#071D36] ml-1 cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
