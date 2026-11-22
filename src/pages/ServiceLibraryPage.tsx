import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { DEFAULT_UNIT_TYPES } from '../constants/defaults';
import { useAppData } from '../context/AppDataContext';
import { ServiceTemplate } from '../types/quotation';
import { formatINR } from '../utils/formatters';

export const ServiceLibraryPage: React.FC = () => {
  const { services, addServiceTemplate, updateServiceTemplate, deleteServiceTemplate, pushToast } =
    useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [unitType, setUnitType] = useState('Per Job');
  const [scopePoints, setScopePoints] = useState<string[]>(['']);

  const [deleteTarget, setDeleteTarget] = useState<ServiceTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.scopePoints.some((p) => p.toLowerCase().includes(q))
    );
  }, [services, searchQuery]);

  const openCreateModal = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setDefaultPrice(0);
    setUnitType('Per Job');
    setScopePoints(['']);
    setModalOpen(true);
  };

  const openEditModal = (svc: ServiceTemplate) => {
    setEditing(svc);
    setName(svc.name);
    setDescription(svc.description);
    setDefaultPrice(svc.defaultPrice);
    setUnitType(svc.unitType || 'Per Job');
    setScopePoints(svc.scopePoints.length > 0 ? [...svc.scopePoints] : ['']);
    setModalOpen(true);
  };

  const handleDuplicate = async (svc: ServiceTemplate) => {
    try {
      await addServiceTemplate({
        name: `${svc.name} (Copy)`,
        description: svc.description,
        scopePoints: [...svc.scopePoints],
        defaultPrice: svc.defaultPrice,
        unitType: svc.unitType,
      });
      pushToast({
        type: 'success',
        title: 'Service duplicated',
        description: `Created a reusable copy of ${svc.name}.`,
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'Duplicate failed',
        description: 'Could not duplicate service template.',
      });
    }
  };

  const movePoint = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= scopePoints.length) return;
    const next = [...scopePoints];
    [next[index], next[target]] = [next[target], next[index]];
    setScopePoints(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        defaultPrice: Math.max(0, Number(defaultPrice) || 0),
        unitType: unitType.trim() || 'Per Job',
        scopePoints: scopePoints.map((p) => p.trim()).filter(Boolean),
      };
      if (editing) {
        await updateServiceTemplate(editing.id, payload);
        pushToast({
          type: 'success',
          title: 'Service updated',
          description: `${payload.name} template saved.`,
        });
      } else {
        await addServiceTemplate(payload);
        pushToast({
          type: 'success',
          title: 'Service added',
          description: `${payload.name} is now available in quotation builder.`,
        });
      }
      setModalOpen(false);
    } catch {
      pushToast({
        type: 'error',
        title: 'Save failed',
        description: 'Could not save service template.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteServiceTemplate(deleteTarget.id);
      pushToast({
        type: 'success',
        title: 'Service deleted',
        description: `${deleteTarget.name} removed from Service Library.`,
      });
      setDeleteTarget(null);
    } catch {
      pushToast({
        type: 'error',
        title: 'Delete failed',
        description: 'Could not delete service template.',
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
          <h1 className="text-2xl font-bold text-[#071D36] tracking-tight">Service Library</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Reusable technical scopes of work and standard rates. Editing a service inside a
            quotation never alters these master templates.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#F5B51B]" />
          Add Service Template
        </button>
      </div>

      {/* Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services or scope of work..."
            className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
          />
        </div>
      </div>

      {/* Grid of Service Templates */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-base font-semibold text-[#071D36]">No service templates found</p>
          <p className="text-sm text-slate-500 mt-1">
            Add reusable industrial service descriptions to speed up quotation preparation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((svc, idx) => (
            <div
              key={svc.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-400">
                      {String(idx + 1).padStart(2, '0')} · {svc.unitType} ·{' '}
                      {svc.defaultPrice > 0 ? formatINR(svc.defaultPrice) : 'Rate on request'}
                    </p>
                    <h2 className="text-base font-bold text-[#071D36] mt-1">{svc.name}</h2>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Edit template"
                      onClick={() => openEditModal(svc)}
                      className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Duplicate template"
                      onClick={() => void handleDuplicate(svc)}
                      className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete template"
                      onClick={() => setDeleteTarget(svc)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {svc.description && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{svc.description}</p>
                )}

                <div className="mt-4 pt-3.5 border-t border-slate-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Scope of Work ({svc.scopePoints.length} points)
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {svc.scopePoints.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-[#F5B51B] mt-1.5 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071D36]/55 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#071D36]">
                {editing ? 'Edit Service Template' : 'Add Service Template'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Vibration Analysis"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Service Description
                </label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short technical overview of this service"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Default Price (₹) — Optional
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Default Unit Type
                  </label>
                  <input
                    list="service-unit-types"
                    type="text"
                    maxLength={50}
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    placeholder="Per Day / Per Job"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                  />
                  <datalist id="service-unit-types">
                    {DEFAULT_UNIT_TYPES.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Scope of Work Bullet Points
                  </label>
                  <button
                    type="button"
                    onClick={() => setScopePoints((prev) => [...prev, ''])}
                    className="text-xs font-semibold text-[#071D36] hover:underline cursor-pointer"
                  >
                    + Add Point
                  </button>
                </div>

                <div className="space-y-2">
                  {scopePoints.map((pt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        maxLength={500}
                        value={pt}
                        onChange={(e) => {
                          const next = [...scopePoints];
                          next[idx] = e.target.value;
                          setScopePoints(next);
                        }}
                        placeholder="Describe scope deliverable..."
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                      />
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => movePoint(idx, -1)}
                        className="p-1.5 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === scopePoints.length - 1}
                        onClick={() => movePoint(idx, 1)}
                        className="p-1.5 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setScopePoints((prev) =>
                            prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Remove point"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editing ? 'Update Service' : 'Save to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Service Template?"
        description={`Remove "${deleteTarget?.name || ''}" from the Service Library? Saved quotations using this service will not be affected.`}
        confirmLabel="Delete Template"
        loading={deleting}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
