import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Edit3,
  Layers,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import {
  DEFAULT_CUSTOMER_ARRANGEMENTS,
  DEFAULT_DELIVERABLES,
  DEFAULT_UNIT_TYPES,
} from '../constants/defaults';
import { useAppData } from '../context/AppDataContext';
import { ServiceScopeStage, ServiceTemplate } from '../types/quotation';
import { formatINR, generateSafeId } from '../utils/formatters';

interface ServiceTemplateManagerProps {
  embedded?: boolean;
}

function createBlankStage(): ServiceScopeStage {
  return {
    id: generateSafeId('stage'),
    title: '',
    description: '',
    scopePoints: [''],
  };
}

export const ServiceTemplateManager: React.FC<ServiceTemplateManagerProps> = ({
  embedded = false,
}) => {
  const { services, addServiceTemplate, updateServiceTemplate, deleteServiceTemplate, pushToast } =
    useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [unitType, setUnitType] = useState('Per Day');
  const [stages, setStages] = useState<ServiceScopeStage[]>([createBlankStage()]);
  const [deliverables, setDeliverables] = useState<string[]>([...DEFAULT_DELIVERABLES]);
  const [customerArrangements, setCustomerArrangements] = useState<string[]>([
    ...DEFAULT_CUSTOMER_ARRANGEMENTS,
  ]);

  const [deleteTarget, setDeleteTarget] = useState<ServiceTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.stages.some(
          (st) =>
            st.title.toLowerCase().includes(q) ||
            st.description.toLowerCase().includes(q) ||
            st.scopePoints.some((p) => p.toLowerCase().includes(q))
        )
    );
  }, [services, searchQuery]);

  const openCreateModal = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setDefaultPrice(0);
    setUnitType('Per Day');
    setStages([createBlankStage()]);
    setDeliverables([...DEFAULT_DELIVERABLES]);
    setCustomerArrangements([...DEFAULT_CUSTOMER_ARRANGEMENTS]);
    setModalOpen(true);
  };

  const openEditModal = (svc: ServiceTemplate) => {
    setEditing(svc);
    setName(svc.name);
    setDescription(svc.description);
    setDefaultPrice(svc.defaultPrice);
    setUnitType(svc.unitType || 'Per Job');
    setStages(
      svc.stages && svc.stages.length > 0
        ? svc.stages.map((st) => ({
            id: st.id || generateSafeId('stage'),
            title: st.title,
            description: st.description || '',
            scopePoints: st.scopePoints.length > 0 ? [...st.scopePoints] : [''],
          }))
        : [
            {
              id: generateSafeId('stage'),
              title: svc.name,
              description: svc.description || '',
              scopePoints: svc.scopePoints.length > 0 ? [...svc.scopePoints] : [''],
            },
          ]
    );
    setDeliverables(
      svc.deliverables && svc.deliverables.length > 0
        ? [...svc.deliverables]
        : [...DEFAULT_DELIVERABLES]
    );
    setCustomerArrangements(
      svc.customerArrangements && svc.customerArrangements.length > 0
        ? [...svc.customerArrangements]
        : [...DEFAULT_CUSTOMER_ARRANGEMENTS]
    );
    setModalOpen(true);
  };

  const handleDuplicate = async (svc: ServiceTemplate) => {
    try {
      await addServiceTemplate({
        name: `${svc.name} (Copy)`,
        description: svc.description,
        stages: svc.stages.map((st) => ({
          id: generateSafeId('stage'),
          title: st.title,
          description: st.description,
          scopePoints: [...st.scopePoints],
        })),
        deliverables: [...(svc.deliverables || [])],
        customerArrangements: [...(svc.customerArrangements || [])],
        scopePoints: [...svc.scopePoints],
        defaultPrice: svc.defaultPrice,
        unitType: svc.unitType,
      });
      pushToast({
        type: 'success',
        title: 'Service duplicated',
        description: `Created a reusable structured copy of ${svc.name}.`,
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'Duplicate failed',
        description: 'Could not duplicate service template.',
      });
    }
  };

  const addStage = () => {
    if (stages.length >= 20) {
      pushToast({
        type: 'info',
        title: 'Maximum 20 stages reached',
        description: 'A service template supports up to 20 structured stages.',
      });
      return;
    }
    setStages((prev) => [...prev, createBlankStage()]);
  };

  const duplicateStage = (idx: number) => {
    if (stages.length >= 20) return;
    const src = stages[idx];
    const copy: ServiceScopeStage = {
      id: generateSafeId('stage'),
      title: `${src.title} (Copy)`,
      description: src.description,
      scopePoints: [...src.scopePoints],
    };
    const next = [...stages];
    next.splice(idx + 1, 0, copy);
    setStages(next);
  };

  const moveStage = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    [next[idx], next[target]] = [next[target], next[idx]];
    setStages(next);
  };

  const movePoint = (stageIdx: number, ptIdx: number, delta: number) => {
    const st = stages[stageIdx];
    const target = ptIdx + delta;
    if (target < 0 || target >= st.scopePoints.length) return;
    const nextPts = [...st.scopePoints];
    [nextPts[ptIdx], nextPts[target]] = [nextPts[target], nextPts[ptIdx]];
    const next = [...stages];
    next[stageIdx] = { ...st, scopePoints: nextPts };
    setStages(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanedStages: ServiceScopeStage[] = stages
      .map((st, idx) => ({
        id: st.id || generateSafeId('stage'),
        title: st.title.trim() || `Stage ${idx + 1}`,
        description: st.description.trim(),
        scopePoints: st.scopePoints.map((p) => p.trim()).filter(Boolean),
      }))
      .filter((st) => st.title || st.description || st.scopePoints.length > 0);

    if (cleanedStages.length === 0) {
      pushToast({
        type: 'error',
        title: 'Add at least one stage',
        description: 'Each service template requires at least one structured scope stage.',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        stages: cleanedStages,
        deliverables: deliverables.map((d) => d.trim()).filter(Boolean),
        customerArrangements: customerArrangements.map((c) => c.trim()).filter(Boolean),
        scopePoints: cleanedStages.flatMap((st) => st.scopePoints),
        defaultPrice: Math.max(0, Number(defaultPrice) || 0),
        unitType: unitType.trim() || 'Per Job',
      };
      if (editing) {
        await updateServiceTemplate(editing.id, payload);
        pushToast({
          type: 'success',
          title: 'Service scope updated',
          description: `${payload.name} (${cleanedStages.length} stage${
            cleanedStages.length === 1 ? '' : 's'
          }) saved.`,
        });
      } else {
        await addServiceTemplate(payload);
        pushToast({
          type: 'success',
          title: 'Service scope added',
          description: `${payload.name} (${cleanedStages.length} stage${
            cleanedStages.length === 1 ? '' : 's'
          }) is now selectable in Create Quotation.`,
        });
      }
      setModalOpen(false);
    } catch {
      pushToast({
        type: 'error',
        title: 'Save failed',
        description: 'Could not save structured service template.',
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

  const cardsContent = (
    <>
      {/* Search Bar */}
      <div className={embedded ? 'flex flex-col sm:flex-row gap-3 justify-between' : 'bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between'}>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services, stage headings, or scope points..."
            className="w-full pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] focus:border-[#071D36]"
          />
        </div>
        <p className="text-xs text-slate-500">
          {services.length} configured service{services.length === 1 ? '' : 's'} · Unlimited stages
          per service
        </p>
      </div>

      {/* Grid of Structured Service Templates */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
          <p className="text-base font-semibold text-[#071D36]">No service templates found</p>
          <p className="text-sm text-slate-500 mt-1">
            Add structured multi-stage service scopes so selecting a service in Create Quotation
            loads all stages automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((svc, idx) => (
            <div
              key={svc.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-400">
                      {String(idx + 1).padStart(2, '0')} · {svc.stages.length}{' '}
                      {svc.stages.length === 1 ? 'Stage' : 'Stages'} · {svc.unitType} ·{' '}
                      {svc.defaultPrice > 0 ? formatINR(svc.defaultPrice) : 'Rate on request'}
                    </p>
                    <h3 className="text-base font-bold text-[#071D36] mt-1">{svc.name}</h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Edit structured scope stages"
                      onClick={() => openEditModal(svc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#071D36] bg-[#F4F6F9] hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Stages
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

                {/* Structured Stages Preview */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Structured Scope Stages ({svc.stages.length})
                  </p>
                  <div className="space-y-2">
                    {svc.stages.map((st, sIdx) => (
                      <div
                        key={st.id || sIdx}
                        className="border border-slate-200 rounded-lg bg-[#F8FAFC] overflow-hidden relative pl-3 pr-3 py-2"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F5B51B]" />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] font-extrabold text-[#F5B51B] bg-[#071D36] px-1.5 py-0.5 rounded shrink-0">
                              {String(sIdx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-xs font-bold text-[#071D36] uppercase truncate">
                              {st.title}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                            {st.scopePoints.length} pts
                          </span>
                        </div>
                        {st.description && (
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            {st.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Deliverables: <strong className="text-[#071D36]">{svc.deliverables?.length || 0}</strong>
                </span>
                <span>
                  Customer Arrangements:{' '}
                  <strong className="text-[#071D36]">{svc.customerArrangements?.length || 0}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {embedded ? (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#071D36] text-[#F5B51B] flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#071D36]">
                  Service Scope Templates (Structured Multi-Stage Scopes)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Design each service with as many numbered stages (01, 02, 03, 04, 05...) as
                  needed, plus default deliverables &amp; customer arrangements. Selecting a service
                  in Create Quotation loads its complete structured scope automatically.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 text-[#F5B51B]" />
              Add New Service Scope
            </button>
          </div>
          {cardsContent}
        </section>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#071D36] tracking-tight">Service Library</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Design reusable multi-stage technical scopes of work, deliverables, and standard
                rates. Add any number of stages per service; editing a service inside a quotation
                never alters these master templates.
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
          {cardsContent}
        </div>
      )}

      {/* Multi-Stage Service Scope Editor Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#071D36]/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#071D36] text-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold">
                  {editing ? `Edit Service Scope: ${editing.name}` : 'Create Structured Service Scope'}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Configure overview, any number of numbered stages (01, 02, 03...), deliverables,
                  and customer-side arrangements.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {/* Basic Service Info */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-6">
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
                    className="w-full px-3.5 py-2 text-sm font-semibold text-[#071D36] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Default Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Default Unit Type
                  </label>
                  <input
                    list="service-template-unit-types"
                    type="text"
                    maxLength={50}
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    placeholder="Per Day / Per Job"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                  />
                  <datalist id="service-template-unit-types">
                    {DEFAULT_UNIT_TYPES.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>

                <div className="sm:col-span-12">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Scope Overview / Technical Introduction
                  </label>
                  <textarea
                    rows={2}
                    maxLength={1500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Appears directly under the 'Scope of Work' heading in the quotation PDF..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                  />
                </div>
              </div>

              {/* Structured Scope Stages Builder (Unlimited) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-[#071D36]">
                      Structured Scope Stages ({stages.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Add as many stages as this service needs (2, 4, 6, 8+ stages). Each stage
                      renders as a numbered card with a gold accent bar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addStage}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F5B51B]" />
                    Add Stage
                  </button>
                </div>

                <div className="space-y-4">
                  {stages.map((st, stIdx) => {
                    const numStr = String(stIdx + 1).padStart(2, '0');
                    return (
                      <div
                        key={st.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white relative"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F5B51B]" />

                        {/* Stage Header */}
                        <div className="bg-[#F4F6F9] border-b border-slate-200 pl-4 pr-3 py-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-[#F5B51B] bg-[#071D36] px-2 py-0.5 rounded">
                              {numStr}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                              {st.title || `Stage ${numStr}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Duplicate stage"
                              onClick={() => duplicateStage(stIdx)}
                              className="p-1 text-slate-500 hover:text-[#071D36] hover:bg-slate-200/70 rounded cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={stIdx === 0}
                              title="Move stage up"
                              onClick={() => moveStage(stIdx, -1)}
                              className="p-1 text-slate-500 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={stIdx === stages.length - 1}
                              title="Move stage down"
                              onClick={() => moveStage(stIdx, 1)}
                              className="p-1 text-slate-500 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Delete stage"
                              onClick={() =>
                                setStages((prev) =>
                                  prev.length > 1
                                    ? prev.filter((_, i) => i !== stIdx)
                                    : [createBlankStage()]
                                )
                              }
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 pl-5 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                            <div className="md:col-span-5">
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Stage Heading <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                maxLength={150}
                                value={st.title}
                                onChange={(e) => {
                                  const next = [...stages];
                                  next[stIdx] = { ...st, title: e.target.value };
                                  setStages(next);
                                }}
                                placeholder="e.g., Pre-Job Review & Site Coordination"
                                className="w-full px-3 py-1.5 text-sm font-semibold text-[#071D36] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                              />
                            </div>
                            <div className="md:col-span-7">
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                Stage Summary Paragraph
                              </label>
                              <input
                                type="text"
                                maxLength={600}
                                value={st.description}
                                onChange={(e) => {
                                  const next = [...stages];
                                  next[stIdx] = { ...st, description: e.target.value };
                                  setStages(next);
                                }}
                                placeholder="Short technical summary for this stage..."
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                              />
                            </div>
                          </div>

                          {/* Stage Bullet Points */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Bullet Points ({st.scopePoints.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...stages];
                                  next[stIdx] = {
                                    ...st,
                                    scopePoints: [...st.scopePoints, ''],
                                  };
                                  setStages(next);
                                }}
                                className="text-xs font-semibold text-[#071D36] hover:underline cursor-pointer"
                              >
                                + Add Bullet Point
                              </button>
                            </div>
                            {st.scopePoints.map((pt, ptIdx) => (
                              <div key={ptIdx} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#071D36] shrink-0" />
                                <input
                                  type="text"
                                  maxLength={500}
                                  value={pt}
                                  onChange={(e) => {
                                    const next = [...stages];
                                    const pts = [...st.scopePoints];
                                    pts[ptIdx] = e.target.value;
                                    next[stIdx] = { ...st, scopePoints: pts };
                                    setStages(next);
                                  }}
                                  placeholder="Enter detailed scope activity..."
                                  className="flex-1 px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                                />
                                <button
                                  type="button"
                                  disabled={ptIdx === 0}
                                  onClick={() => movePoint(stIdx, ptIdx, -1)}
                                  className="p-1 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                                  title="Move up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={ptIdx === st.scopePoints.length - 1}
                                  onClick={() => movePoint(stIdx, ptIdx, 1)}
                                  className="p-1 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                                  title="Move down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...stages];
                                    const pts = st.scopePoints.filter((_, i) => i !== ptIdx);
                                    next[stIdx] = {
                                      ...st,
                                      scopePoints: pts.length > 0 ? pts : [''],
                                    };
                                    setStages(next);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                  title="Remove point"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addStage}
                  className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-[#071D36] hover:bg-[#F4F6F9] hover:border-[#071D36] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#F5B51B]" />
                  Add Another Stage (Stage {String(stages.length + 1).padStart(2, '0')})
                </button>
              </div>

              {/* Default Deliverables & Customer-Side Arrangements */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                      Default Deliverables
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeliverables((prev) => [...prev, ''])}
                      className="text-xs font-semibold text-[#071D36] hover:underline cursor-pointer"
                    >
                      + Add Deliverable
                    </button>
                  </div>
                  {deliverables.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={500}
                        value={item}
                        onChange={(e) => {
                          const next = [...deliverables];
                          next[idx] = e.target.value;
                          setDeliverables(next);
                        }}
                        placeholder="Deliverable item..."
                        className="flex-1 px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                      />
                      <button
                        type="button"
                        onClick={() => setDeliverables((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                      Default Customer-Side Arrangements
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomerArrangements((prev) => [...prev, ''])}
                      className="text-xs font-semibold text-[#071D36] hover:underline cursor-pointer"
                    >
                      + Add Arrangement
                    </button>
                  </div>
                  {customerArrangements.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={500}
                        value={item}
                        onChange={(e) => {
                          const next = [...customerArrangements];
                          next[idx] = e.target.value;
                          setCustomerArrangements(next);
                        }}
                        placeholder="Customer requirement / site readiness..."
                        className="flex-1 px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCustomerArrangements((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-1">
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
                  {saving ? 'Saving...' : editing ? 'Save Service Scope' : 'Save to Service Library'}
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
    </>
  );
};
