import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { INDIAN_STATES } from '../constants/defaults';
import { Customer } from '../types/quotation';

interface CustomerFormModalProps {
  open: boolean;
  initialCustomer?: Customer | null;
  saving?: boolean;
  onSave: (data: Omit<Customer, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}

const EMPTY_FORM = {
  companyName: '',
  address: '',
  contactPerson: '',
  designation: '',
  phone: '',
  email: '',
  gstin: '',
  state: '',
};

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  open,
  initialCustomer,
  saving = false,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      if (initialCustomer) {
        setForm({
          companyName: initialCustomer.companyName || '',
          address: initialCustomer.address || '',
          contactPerson: initialCustomer.contactPerson || '',
          designation: initialCustomer.designation || '',
          phone: initialCustomer.phone || '',
          email: initialCustomer.email || '',
          gstin: initialCustomer.gstin || '',
          state: initialCustomer.state || '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, initialCustomer]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setError('Company / Customer Name is required.');
      return;
    }
    setError('');
    await onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D36]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="customer-modal-title" className="text-lg font-bold text-[#071D36]">
              {initialCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Saved directly to TM Industrial Solution&apos;s customer database.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customer form"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Company / Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="e.g., Gujarat Heavy Chemicals Ltd."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer Address
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Plant / Office address, GIDC / Industrial Area, City, PIN"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contact Person Name
              </label>
              <input
                type="text"
                maxLength={150}
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="e.g., Rajesh Sharma"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Designation / Department
              </label>
              <input
                type="text"
                maxLength={150}
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g., Maintenance Manager"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
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
                placeholder="+91 98XXXXXXXX"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
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
                placeholder="maintenance@company.com"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                maxLength={30}
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                placeholder="24XXXXX0000X1Z5"
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                State (Optional)
              </label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving...' : initialCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
