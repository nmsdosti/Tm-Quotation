import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  Layers,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Send,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { QuotationDocumentView } from '../components/QuotationDocumentView';
import { QuotationPreviewModal } from '../components/QuotationPreviewModal';
import {
  DEFAULT_CUSTOMER_ARRANGEMENTS,
  DEFAULT_DELIVERABLES,
  DEFAULT_UNIT_TYPES,
  INDIAN_STATES,
  STRUCTURED_VIBRATION_SCOPE_PRESET,
} from '../constants/defaults';
import { useAppData } from '../context/AppDataContext';
import {
  Customer,
  PricingItem,
  Quotation,
  QuotationServiceItem,
  QuotationStatus,
  ServiceTemplate,
} from '../types/quotation';
import {
  addDaysISO,
  buildQuotationNumber,
  calculatePricingItem,
  calculateQuotationTotals,
  formatINR,
  generateSafeId,
  getTodayISO,
  numberToIndianWords,
} from '../utils/formatters';
import { downloadQuotationPdf, printQuotationPdf } from '../utils/pdfGenerator';

const DRAFT_STORAGE_KEY = 'tm_quotation_manager_autosave_draft_v1';

interface CreateQuotationPageProps {
  editingQuotation: Quotation | null;
  preselectedCustomer: Customer | null;
  onSaved: () => void;
  onClearEditing: () => void;
}

export const CreateQuotationPage: React.FC<CreateQuotationPageProps> = ({
  editingQuotation,
  preselectedCustomer,
  onSaved,
  onClearEditing,
}) => {
  const {
    settings,
    customers,
    services: serviceLibrary,
    addCustomer,
    addServiceTemplate,
    saveQuotation,
    pushToast,
  } = useAppData();

  const bottomPreviewRef = useRef<HTMLElement | null>(null);

  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate, setQuotationDate] = useState(getTodayISO());
  const [validUntil, setValidUntil] = useState(
    addDaysISO(getTodayISO(), settings.defaultValidityDays || 30)
  );
  const [subject, setSubject] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [preparedBy, setPreparedBy] = useState(settings.contactPerson || 'Rinkesh Patel');
  const [status, setStatus] = useState<QuotationStatus>('Draft');

  const [customerId, setCustomerId] = useState('');
  const [customer, setCustomer] = useState({
    companyName: '',
    address: '',
    contactPerson: '',
    designation: '',
    phone: '',
    email: '',
    gstin: '',
    state: '',
  });

  const [companyIntro, setCompanyIntro] = useState(settings.defaultCompanyIntro);
  const [scopeOverview, setScopeOverview] = useState('');
  const [quoteServices, setQuoteServices] = useState<QuotationServiceItem[]>([]);
  const [deliverables, setDeliverables] = useState<string[]>([...DEFAULT_DELIVERABLES]);
  const [customerArrangements, setCustomerArrangements] = useState<string[]>([
    ...DEFAULT_CUSTOMER_ARRANGEMENTS,
  ]);
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [terms, setTerms] = useState<string[]>([...settings.defaultTerms]);
  const [paymentTerms, setPaymentTerms] = useState(settings.defaultPaymentTerms);
  const [commercialNotes, setCommercialNotes] = useState('');

  const [selectedLibraryServiceId, setSelectedLibraryServiceId] = useState('');
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [savingQuote, setSavingQuote] = useState(false);
  const [pendingOverwriteStatus, setPendingOverwriteStatus] = useState<QuotationStatus | null>(
    null
  );
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string>('');
  const [hasSavedLocalDraft, setHasSavedLocalDraft] = useState(false);

  // Initialize form
  useEffect(() => {
    if (editingQuotation) {
      setQuotationNumber(editingQuotation.quotationNumber);
      setQuotationDate(editingQuotation.quotationDate);
      setValidUntil(editingQuotation.validUntil);
      setSubject(editingQuotation.subject);
      setReferenceNumber(editingQuotation.referenceNumber || '');
      setPreparedBy(editingQuotation.preparedBy || settings.contactPerson || 'Rinkesh Patel');
      setStatus(editingQuotation.status);
      setCustomerId(editingQuotation.customerId || '');
      setCustomer({ ...editingQuotation.customer });
      setCompanyIntro(editingQuotation.companyIntro || settings.defaultCompanyIntro);
      setScopeOverview(editingQuotation.scopeOverview || '');
      setQuoteServices(
        editingQuotation.services.map((s) => ({ ...s, scopePoints: [...s.scopePoints] }))
      );
      setDeliverables(
        editingQuotation.deliverables && editingQuotation.deliverables.length > 0
          ? [...editingQuotation.deliverables]
          : [...DEFAULT_DELIVERABLES]
      );
      setCustomerArrangements(
        editingQuotation.customerArrangements && editingQuotation.customerArrangements.length > 0
          ? [...editingQuotation.customerArrangements]
          : [...DEFAULT_CUSTOMER_ARRANGEMENTS]
      );
      setPricingItems(editingQuotation.pricingItems.map((p) => ({ ...p })));
      setGstEnabled(editingQuotation.gstEnabled);
      setAdvanceAmount(editingQuotation.advanceAmount || 0);
      setTerms(
        editingQuotation.terms.length > 0
          ? [...editingQuotation.terms]
          : [...settings.defaultTerms]
      );
      setPaymentTerms(editingQuotation.paymentTerms || settings.defaultPaymentTerms);
      setCommercialNotes(editingQuotation.commercialNotes || '');
      setHasSavedLocalDraft(false);
      return;
    }

    const today = getTodayISO();
    setQuotationNumber(
      buildQuotationNumber(
        settings.quotationPrefix,
        settings.financialYear,
        settings.nextSerialNumber || 1
      )
    );
    setQuotationDate(today);
    setValidUntil(addDaysISO(today, settings.defaultValidityDays || 30));
    setSubject('');
    setReferenceNumber('');
    setPreparedBy(settings.contactPerson || 'Rinkesh Patel');
    setStatus('Draft');
    setCompanyIntro(settings.defaultCompanyIntro);
    setScopeOverview('');
    setQuoteServices([]);
    setDeliverables([...DEFAULT_DELIVERABLES]);
    setCustomerArrangements([...DEFAULT_CUSTOMER_ARRANGEMENTS]);
    setPricingItems([
      calculatePricingItem(
        {
          id: generateSafeId('price'),
          description: '',
          unitPrice: 0,
          quantity: 1,
          unitType: 'Per Day',
          gstRate: settings.defaultGstRate ?? 18,
        },
        true
      ),
    ]);
    setGstEnabled(true);
    setAdvanceAmount(0);
    setTerms([...settings.defaultTerms]);
    setPaymentTerms(settings.defaultPaymentTerms);
    setCommercialNotes('');

    if (preselectedCustomer) {
      setCustomerId(preselectedCustomer.id);
      setCustomer({
        companyName: preselectedCustomer.companyName,
        address: preselectedCustomer.address,
        contactPerson: preselectedCustomer.contactPerson,
        designation: preselectedCustomer.designation,
        phone: preselectedCustomer.phone,
        email: preselectedCustomer.email,
        gstin: preselectedCustomer.gstin,
        state: preselectedCustomer.state,
      });
    } else {
      setCustomerId('');
      setCustomer({
        companyName: '',
        address: '',
        contactPerson: '',
        designation: '',
        phone: '',
        email: '',
        gstin: '',
        state: '',
      });
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) setHasSavedLocalDraft(true);
      } catch {
        // ignore
      }
    }
  }, [
    editingQuotation,
    preselectedCustomer,
    settings.quotationPrefix,
    settings.financialYear,
    settings.nextSerialNumber,
    settings.defaultValidityDays,
    settings.contactPerson,
    settings.defaultCompanyIntro,
    settings.defaultGstRate,
    settings.defaultTerms,
    settings.defaultPaymentTerms,
  ]);

  // Live computed totals (never double-counts GST)
  const totals = useMemo(
    () => calculateQuotationTotals(pricingItems, gstEnabled, advanceAmount),
    [pricingItems, gstEnabled, advanceAmount]
  );

  // Build live quotation object
  const draftQuotation: Quotation = useMemo(
    () => ({
      id: editingQuotation?.id || 'live_preview',
      ownerId: editingQuotation?.ownerId || settings.ownerId,
      quotationNumber,
      quotationDate,
      validUntil,
      subject,
      referenceNumber,
      preparedBy,
      status,
      customerId,
      customer,
      companyIntro,
      scopeOverview,
      services: quoteServices,
      deliverables,
      customerArrangements,
      pricingItems: totals.items,
      gstEnabled,
      subtotal: totals.subtotal,
      totalGst: totals.totalGst,
      grandTotal: totals.grandTotal,
      advanceAmount: totals.advanceAmount,
      balanceAmount: totals.balanceAmount,
      terms,
      paymentTerms,
      commercialNotes,
    }),
    [
      editingQuotation,
      settings.ownerId,
      quotationNumber,
      quotationDate,
      validUntil,
      subject,
      referenceNumber,
      preparedBy,
      status,
      customerId,
      customer,
      companyIntro,
      scopeOverview,
      quoteServices,
      deliverables,
      customerArrangements,
      totals,
      gstEnabled,
      terms,
      paymentTerms,
      commercialNotes,
    ]
  );

  // Auto-save unsaved new quotation drafts
  useEffect(() => {
    if (editingQuotation) return;
    const hasContent =
      Boolean(subject.trim()) ||
      Boolean(customer.companyName.trim()) ||
      quoteServices.length > 0 ||
      totals.grandTotal > 0;
    if (!hasContent) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            subject,
            referenceNumber,
            preparedBy,
            customerId,
            customer,
            companyIntro,
            scopeOverview,
            quoteServices,
            deliverables,
            customerArrangements,
            pricingItems: totals.items,
            gstEnabled,
            advanceAmount,
            terms,
            paymentTerms,
            commercialNotes,
          })
        );
        setLastAutosavedAt(
          new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        );
      } catch {
        // ignore storage quota errors
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    editingQuotation,
    subject,
    referenceNumber,
    preparedBy,
    customerId,
    customer,
    companyIntro,
    scopeOverview,
    quoteServices,
    deliverables,
    customerArrangements,
    totals,
    gstEnabled,
    advanceAmount,
    terms,
    paymentTerms,
    commercialNotes,
  ]);

  const restoreLocalDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.subject !== undefined) setSubject(parsed.subject);
      if (parsed.referenceNumber !== undefined) setReferenceNumber(parsed.referenceNumber);
      if (parsed.preparedBy !== undefined) setPreparedBy(parsed.preparedBy);
      if (parsed.customerId !== undefined) setCustomerId(parsed.customerId);
      if (parsed.customer) setCustomer(parsed.customer);
      if (parsed.companyIntro !== undefined) setCompanyIntro(parsed.companyIntro);
      if (parsed.scopeOverview !== undefined) setScopeOverview(parsed.scopeOverview);
      if (Array.isArray(parsed.quoteServices)) setQuoteServices(parsed.quoteServices);
      if (Array.isArray(parsed.deliverables)) setDeliverables(parsed.deliverables);
      if (Array.isArray(parsed.customerArrangements))
        setCustomerArrangements(parsed.customerArrangements);
      if (Array.isArray(parsed.pricingItems)) setPricingItems(parsed.pricingItems);
      if (typeof parsed.gstEnabled === 'boolean') setGstEnabled(parsed.gstEnabled);
      if (parsed.advanceAmount !== undefined) setAdvanceAmount(Number(parsed.advanceAmount) || 0);
      if (Array.isArray(parsed.terms)) setTerms(parsed.terms);
      if (parsed.paymentTerms !== undefined) setPaymentTerms(parsed.paymentTerms);
      if (parsed.commercialNotes !== undefined) setCommercialNotes(parsed.commercialNotes);
      setHasSavedLocalDraft(false);
      pushToast({ type: 'info', title: 'Draft restored', description: 'Loaded your unsaved work.' });
    } catch {
      setHasSavedLocalDraft(false);
    }
  };

  const discardLocalDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasSavedLocalDraft(false);
  };

  const handleSelectExistingCustomer = (id: string) => {
    setCustomerId(id);
    if (!id) return;
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomer({
        companyName: found.companyName,
        address: found.address,
        contactPerson: found.contactPerson,
        designation: found.designation,
        phone: found.phone,
        email: found.email,
        gstin: found.gstin,
        state: found.state,
      });
    }
  };

  const handleCreateNewCustomer = async (
    data: Omit<Customer, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => {
    setSavingCustomer(true);
    try {
      const created = await addCustomer(data);
      setCustomerId(created.id);
      setCustomer({
        companyName: created.companyName,
        address: created.address,
        contactPerson: created.contactPerson,
        designation: created.designation,
        phone: created.phone,
        email: created.email,
        gstin: created.gstin,
        state: created.state,
      });
      setCustomerModalOpen(false);
      pushToast({
        type: 'success',
        title: 'Customer saved & selected',
        description: `${created.companyName} added to your database.`,
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'Failed to save customer',
        description: 'Could not save customer record.',
      });
    } finally {
      setSavingCustomer(false);
    }
  };

  // --- Scope of Work Actions ---
  const addServiceFromLibrary = (tplId: string) => {
    const tpl = serviceLibrary.find((s) => s.id === tplId);
    if (!tpl) return;
    const newSvc: QuotationServiceItem = {
      id: generateSafeId('qsvc'),
      serviceTemplateId: tpl.id,
      title: tpl.name,
      description: tpl.description,
      scopePoints: [...tpl.scopePoints],
    };
    setQuoteServices((prev) => [...prev, newSvc]);

    setPricingItems((prev) => {
      const hasSingleEmpty =
        prev.length === 1 && !prev[0].description.trim() && prev[0].unitPrice === 0;
      const newRow = calculatePricingItem(
        {
          id: generateSafeId('price'),
          description: tpl.name,
          unitPrice: tpl.defaultPrice || 0,
          quantity: 1,
          unitType: tpl.unitType || 'Per Job',
          gstRate: settings.defaultGstRate ?? 18,
        },
        gstEnabled
      );
      return hasSingleEmpty ? [newRow] : [...prev, newRow];
    });
    setSelectedLibraryServiceId('');
  };

  const loadStructuredScopePreset = () => {
    setScopeOverview(STRUCTURED_VIBRATION_SCOPE_PRESET.scopeOverview);
    setQuoteServices(
      STRUCTURED_VIBRATION_SCOPE_PRESET.services.map((s) => ({
        id: generateSafeId('qsvc'),
        title: s.title,
        description: s.description,
        scopePoints: [...s.scopePoints],
      }))
    );
    pushToast({
      type: 'success',
      title: 'Structured scope loaded',
      description: 'Added 4 numbered stages (01–04). Edit any title, description, or bullet point.',
    });
  };

  const addCustomService = () => {
    setQuoteServices((prev) => [
      ...prev,
      {
        id: generateSafeId('qsvc'),
        title: '',
        description: '',
        scopePoints: [''],
      },
    ]);
  };

  const duplicateServiceSection = (idx: number) => {
    const source = quoteServices[idx];
    const copy: QuotationServiceItem = {
      ...source,
      id: generateSafeId('qsvc'),
      title: `${source.title} (Copy)`,
      description: source.description || '',
      scopePoints: [...source.scopePoints],
    };
    const next = [...quoteServices];
    next.splice(idx + 1, 0, copy);
    setQuoteServices(next);
  };

  const moveServiceSection = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= quoteServices.length) return;
    const next = [...quoteServices];
    [next[idx], next[target]] = [next[target], next[idx]];
    setQuoteServices(next);
  };

  const moveScopePoint = (svcIdx: number, ptIdx: number, delta: number) => {
    const svc = quoteServices[svcIdx];
    const target = ptIdx + delta;
    if (target < 0 || target >= svc.scopePoints.length) return;
    const nextPoints = [...svc.scopePoints];
    [nextPoints[ptIdx], nextPoints[target]] = [nextPoints[target], nextPoints[ptIdx]];
    const next = [...quoteServices];
    next[svcIdx] = { ...svc, scopePoints: nextPoints };
    setQuoteServices(next);
  };

  const saveCustomServiceToLibrary = async (svc: QuotationServiceItem) => {
    if (!svc.title.trim()) {
      pushToast({
        type: 'error',
        title: 'Scope title required',
        description: 'Enter a scope title before saving to the Service Library.',
      });
      return;
    }
    try {
      const matchingPrice = pricingItems.find(
        (p) => p.description.trim().toLowerCase() === svc.title.trim().toLowerCase()
      );
      const payload: Omit<ServiceTemplate, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'> = {
        name: svc.title.trim(),
        description: svc.description || '',
        scopePoints: svc.scopePoints.map((p) => p.trim()).filter(Boolean),
        defaultPrice: matchingPrice?.unitPrice || 0,
        unitType: matchingPrice?.unitType || 'Per Job',
      };
      await addServiceTemplate(payload);
      pushToast({
        type: 'success',
        title: 'Saved to Service Library',
        description: `${payload.name} is now reusable in future quotations.`,
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'Save failed',
        description: 'Could not save service to library.',
      });
    }
  };

  // --- Pricing Actions ---
  const addPricingRow = () => {
    setPricingItems((prev) => [
      ...prev,
      calculatePricingItem(
        {
          id: generateSafeId('price'),
          description: '',
          unitPrice: 0,
          quantity: 1,
          unitType: 'Per Day',
          gstRate: gstEnabled ? settings.defaultGstRate ?? 18 : 0,
        },
        gstEnabled
      ),
    ]);
  };

  const updatePricingRow = (idx: number, patch: Partial<PricingItem>) => {
    setPricingItems((prev) => {
      const next = [...prev];
      next[idx] = calculatePricingItem({ ...next[idx], ...patch }, gstEnabled);
      return next;
    });
  };

  const movePricingRow = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= pricingItems.length) return;
    const next = [...pricingItems];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPricingItems(next);
  };

  // --- Terms Actions ---
  const moveTerm = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= terms.length) return;
    const next = [...terms];
    [next[idx], next[target]] = [next[target], next[idx]];
    setTerms(next);
  };

  const scrollToPreview = () => {
    setPreviewExpanded(true);
    setTimeout(() => {
      bottomPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // --- Validation & Persist ---
  const validateBeforeSave = (): boolean => {
    if (!quotationNumber.trim()) {
      pushToast({
        type: 'error',
        title: 'Missing quotation number',
        description: 'Enter a valid quotation number.',
      });
      return false;
    }
    if (!subject.trim()) {
      pushToast({
        type: 'error',
        title: 'Subject required',
        description: 'Please enter a quotation subject.',
      });
      return false;
    }
    if (!customer.companyName.trim()) {
      pushToast({
        type: 'error',
        title: 'Customer required',
        description: 'Select or enter a customer company name.',
      });
      return false;
    }
    return true;
  };

  const executeSave = async (targetStatus: QuotationStatus) => {
    setSavingQuote(true);
    try {
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId && customer.companyName.trim()) {
        const existingMatch = customers.find(
          (c) => c.companyName.trim().toLowerCase() === customer.companyName.trim().toLowerCase()
        );
        if (existingMatch) {
          resolvedCustomerId = existingMatch.id;
        } else {
          const newCust = await addCustomer({
            companyName: customer.companyName.trim(),
            address: customer.address,
            contactPerson: customer.contactPerson,
            designation: customer.designation,
            phone: customer.phone,
            email: customer.email,
            gstin: customer.gstin,
            state: customer.state,
          });
          resolvedCustomerId = newCust.id;
        }
      }

      const saved = await saveQuotation(
        {
          quotationNumber: quotationNumber.trim(),
          quotationDate,
          validUntil,
          subject: subject.trim(),
          referenceNumber: referenceNumber.trim(),
          preparedBy: preparedBy.trim(),
          status: targetStatus,
          customerId: resolvedCustomerId,
          customer,
          companyIntro,
          scopeOverview: scopeOverview.trim(),
          services: quoteServices,
          deliverables: deliverables.map((d) => d.trim()).filter(Boolean),
          customerArrangements: customerArrangements.map((c) => c.trim()).filter(Boolean),
          pricingItems: totals.items,
          gstEnabled,
          subtotal: totals.subtotal,
          totalGst: totals.totalGst,
          grandTotal: totals.grandTotal,
          advanceAmount: totals.advanceAmount,
          balanceAmount: totals.balanceAmount,
          terms,
          paymentTerms,
          commercialNotes: commercialNotes.trim(),
        },
        editingQuotation?.id
      );

      if (!editingQuotation) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      pushToast({
        type: 'success',
        title: editingQuotation ? 'Quotation updated' : 'Quotation saved',
        description: `${saved.quotationNumber} saved as ${saved.status}.`,
      });
      setPendingOverwriteStatus(null);
      onSaved();
    } catch {
      pushToast({
        type: 'error',
        title: 'Save failed',
        description: 'Could not save quotation to Cloud Firestore.',
      });
    } finally {
      setSavingQuote(false);
    }
  };

  const handleSaveRequest = (targetStatus: QuotationStatus) => {
    if (!validateBeforeSave()) return;
    if (editingQuotation) {
      setPendingOverwriteStatus(targetStatus);
    } else {
      void executeSave(targetStatus);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Sticky Top Action Toolbar */}
      <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-[#F4F6F9]/95 backdrop-blur-sm border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-bold text-[#071D36] truncate">
              {editingQuotation ? `Edit ${editingQuotation.quotationNumber}` : 'Create Quotation'}
            </h1>
            {lastAutosavedAt && !editingQuotation && (
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Draft auto-saved {lastAutosavedAt}
              </span>
            )}
          </div>
          {editingQuotation && (
            <button
              type="button"
              onClick={onClearEditing}
              className="text-xs text-slate-500 hover:text-[#071D36] underline cursor-pointer"
            >
              Switch to a fresh new quotation
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={scrollToPreview}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#071D36] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-3.5 h-3.5" />
            Jump to Preview
          </button>
          <button
            type="button"
            onClick={() => setFullPreviewOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#071D36] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            Full-Screen Preview
          </button>
          <button
            type="button"
            onClick={() => void printQuotationPdf(draftQuotation, settings)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#071D36] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            type="button"
            onClick={() => void downloadQuotationPdf(draftQuotation, settings)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#071D36] bg-[#F5B51B] hover:bg-[#E0A20F] rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
          <button
            type="button"
            disabled={savingQuote}
            onClick={() => handleSaveRequest('Draft')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#071D36] bg-white border border-[#071D36] rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>
          <button
            type="button"
            disabled={savingQuote}
            onClick={() => handleSaveRequest('Sent')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 text-[#F5B51B]" />
            {savingQuote ? 'Saving...' : 'Mark as Sent'}
          </button>
        </div>
      </div>

      {/* Autosave Recovery Banner */}
      {hasSavedLocalDraft && !editingQuotation && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-amber-900">
            An unsaved quotation draft was automatically saved in this browser. Would you like to
            restore it?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={restoreLocalDraft}
              className="px-3 py-1.5 text-xs font-semibold bg-[#071D36] text-white rounded-lg cursor-pointer"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={discardLocalDraft}
              className="px-3 py-1.5 text-xs font-medium text-amber-900 hover:underline cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FULL-WIDTH FORM WORKSPACE (ALL COLUMNS SPACIOUS & READABLE)       */}
      {/* ================================================================= */}
      <div className="space-y-6">
        {/* SECTION A: QUOTATION INFORMATION */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Section A · Appears on Page 1
              </p>
              <h2 className="text-base font-bold text-[#071D36]">Quotation Information</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quotation Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={60}
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono font-semibold text-[#071D36] bg-[#F4F6F9] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quotation Date
              </label>
              <input
                type="date"
                value={quotationDate}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setQuotationDate(nextDate);
                  setValidUntil(addDaysISO(nextDate, settings.defaultValidityDays || 30));
                }}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Valid Until Date
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={300}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Techno-Commercial Offer for Vibration Analysis & Laser Shaft Alignment"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reference Number (Optional)
              </label>
              <input
                type="text"
                maxLength={100}
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="RFQ / Mail ref."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prepared By
              </label>
              <input
                type="text"
                maxLength={120}
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>
          </div>
        </section>

        {/* SECTION B: CUSTOMER INFORMATION */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Section B · Appears on Page 1
              </p>
              <h2 className="text-base font-bold text-[#071D36]">Customer Information</h2>
            </div>
            <button
              type="button"
              onClick={() => setCustomerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#071D36] bg-[#F5B51B] hover:bg-[#E0A20F] rounded-lg cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Add New Customer
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Existing Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => handleSelectExistingCustomer(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            >
              <option value="">-- Enter customer details manually or pick saved client --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                  {c.contactPerson ? ` (${c.contactPerson})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Company / Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={200}
                value={customer.companyName}
                onChange={(e) => setCustomer({ ...customer, companyName: e.target.value })}
                placeholder="Enter client company name"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contact Person Name
              </label>
              <input
                type="text"
                maxLength={150}
                value={customer.contactPerson}
                onChange={(e) => setCustomer({ ...customer, contactPerson: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Designation / Department
              </label>
              <input
                type="text"
                maxLength={150}
                value={customer.designation}
                onChange={(e) => setCustomer({ ...customer, designation: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer Address
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                placeholder="Site / Plant address"
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
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
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
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                GSTIN (Optional)
              </label>
              <input
                type="text"
                maxLength={30}
                value={customer.gstin}
                onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                State (Optional)
              </label>
              <select
                value={customer.state}
                onChange={(e) => setCustomer({ ...customer, state: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
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
        </section>

        {/* SECTION C: ABOUT TM INDUSTRIAL SOLUTION */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Section C · Appears on Page 1
              </p>
              <h2 className="text-base font-bold text-[#071D36]">
                About {settings.companyName || 'TM Industrial Solution'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCompanyIntro(settings.defaultCompanyIntro)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#071D36] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default
            </button>
          </div>
          <textarea
            rows={4}
            maxLength={3000}
            value={companyIntro}
            onChange={(e) => setCompanyIntro(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B] leading-relaxed"
          />
        </section>

        {/* SECTION D: DETAILED SCOPE OF WORK (PAGE 2 / PAGE 3) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Section D · Appears on Page 2 (Auto-continues to Page 3 if lengthy)
              </p>
              <h2 className="text-base font-bold text-[#071D36]">Technical Scope of Work</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Build numbered scope sections (01, 02, 03...) with individual descriptions,
                detailed deliverables, and bullet points.
              </p>
            </div>

            <button
              type="button"
              onClick={loadStructuredScopePreset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#071D36] bg-[#F4F6F9] border border-slate-300 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-[#071D36]" />
              Load 4-Stage Structured Scope Sample
            </button>
          </div>

          {/* Scope Overview Intro */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Scope Overview / Technical Summary (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={1500}
              value={scopeOverview}
              onChange={(e) => setScopeOverview(e.target.value)}
              placeholder="e.g., Vibration analysis is carried out to evaluate machine vibration levels and identify potential mechanical issues through measurement, signal analysis and engineering assessment."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            />
          </div>

          {/* Service Library Picker + Add Scope Item Button */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={selectedLibraryServiceId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedLibraryServiceId(id);
                if (id) addServiceFromLibrary(id);
              }}
              className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
            >
              <option value="">+ Add saved template from Service Library...</option>
              {serviceLibrary.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name} ({svc.scopePoints.length} points ·{' '}
                  {svc.defaultPrice > 0 ? formatINR(svc.defaultPrice) : 'Custom rate'})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={addCustomService}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-[#F5B51B]" />
              Add Scope Item
            </button>
          </div>

          {/* Numbered Scope Item Cards */}
          {quoteServices.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-500">
              No scope items added yet. Click <strong>Add Scope Item</strong>, select from the{' '}
              <strong>Service Library</strong>, or click{' '}
              <strong>Load 4-Stage Structured Scope Sample</strong> above.
            </div>
          ) : (
            <div className="space-y-4">
              {quoteServices.map((svc, svcIdx) => {
                const numStr = String(svcIdx + 1).padStart(2, '0');
                return (
                  <div
                    key={svc.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-white relative"
                  >
                    {/* Gold left accent matching PDF preview */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F5B51B]" />

                    {/* Scope Card Top Header */}
                    <div className="bg-[#F4F6F9] border-b border-slate-200 pl-5 pr-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-extrabold text-[#F5B51B] bg-[#071D36] px-2 py-0.5 rounded">
                          {numStr}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                          {svc.title || `Scope Item ${numStr}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Save this scope item to Service Library"
                          onClick={() => void saveCustomServiceToLibrary(svc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-[#071D36] hover:bg-slate-200/70 rounded cursor-pointer"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          Save to Library
                        </button>
                        <button
                          type="button"
                          title="Duplicate scope item"
                          onClick={() => duplicateServiceSection(svcIdx)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-200/70 rounded cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={svcIdx === 0}
                          title="Move up"
                          onClick={() => moveServiceSection(svcIdx, -1)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={svcIdx === quoteServices.length - 1}
                          title="Move down"
                          onClick={() => moveServiceSection(svcIdx, 1)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete scope item"
                          onClick={() =>
                            setQuoteServices((prev) => prev.filter((_, i) => i !== svcIdx))
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 pl-5 space-y-3.5">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-5">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Scope Item Heading
                          </label>
                          <input
                            type="text"
                            maxLength={150}
                            value={svc.title}
                            onChange={(e) => {
                              const next = [...quoteServices];
                              next[svcIdx] = { ...svc, title: e.target.value };
                              setQuoteServices(next);
                            }}
                            placeholder="e.g., Pre-Job Review & Site Coordination"
                            className="w-full px-3 py-2 text-sm font-semibold text-[#071D36] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                          />
                        </div>
                        <div className="md:col-span-7">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Scope Item Description (Summary Paragraph)
                          </label>
                          <input
                            type="text"
                            maxLength={600}
                            value={svc.description || ''}
                            onChange={(e) => {
                              const next = [...quoteServices];
                              next[svcIdx] = { ...svc, description: e.target.value };
                              setQuoteServices(next);
                            }}
                            placeholder="e.g., Review the equipment list and coordinate with the customer representative before commencing measurements."
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                          />
                        </div>
                      </div>

                      {/* Bullet Points */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Detailed Activities / Bullet Points
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...quoteServices];
                              next[svcIdx] = {
                                ...svc,
                                scopePoints: [...svc.scopePoints, ''],
                              };
                              setQuoteServices(next);
                            }}
                            className="text-xs font-semibold text-[#071D36] hover:underline cursor-pointer"
                          >
                            + Add Bullet Point
                          </button>
                        </div>

                        {svc.scopePoints.map((pt, ptIdx) => (
                          <div key={ptIdx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#071D36] shrink-0" />
                            <input
                              type="text"
                              maxLength={500}
                              value={pt}
                              onChange={(e) => {
                                const next = [...quoteServices];
                                const pts = [...svc.scopePoints];
                                pts[ptIdx] = e.target.value;
                                next[svcIdx] = { ...svc, scopePoints: pts };
                                setQuoteServices(next);
                              }}
                              placeholder="Enter detailed scope activity..."
                              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                            />
                            <button
                              type="button"
                              disabled={ptIdx === 0}
                              onClick={() => moveScopePoint(svcIdx, ptIdx, -1)}
                              className="p-1 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={ptIdx === svc.scopePoints.length - 1}
                              onClick={() => moveScopePoint(svcIdx, ptIdx, 1)}
                              className="p-1 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...quoteServices];
                                const pts = svc.scopePoints.filter((_, i) => i !== ptIdx);
                                next[svcIdx] = {
                                  ...svc,
                                  scopePoints: pts.length > 0 ? pts : [''],
                                };
                                setQuoteServices(next);
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
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
          )}

          {/* Deliverables & Customer-Side Arrangements Editor (matching bottom of Image 2) */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Deliverables */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                  Deliverables
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

            {/* Customer-Side Arrangements */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                  Customer-Side Arrangements
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
        </section>

        {/* SECTION E: COMMERCIAL OFFER / PRICING (SPACIOUS FULL-WIDTH TABLE) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Section E · Appears on Final Page
              </p>
              <h2 className="text-base font-bold text-[#071D36]">Commercial Offer / Pricing</h2>
            </div>

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#071D36] rounded cursor-pointer"
                />
                Apply GST
              </label>
              <button
                type="button"
                onClick={addPricingRow}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-[#F5B51B]" />
                Add Pricing Row
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-3 min-w-[260px]">Service / Description</th>
                  <th className="py-3 px-3 min-w-[140px] text-right whitespace-nowrap">
                    Unit Price (₹)
                  </th>
                  <th className="py-3 px-3 min-w-[96px] text-center whitespace-nowrap">Qty</th>
                  <th className="py-3 px-3 min-w-[135px] whitespace-nowrap">Type</th>
                  {gstEnabled && (
                    <>
                      <th className="py-3 px-3 min-w-[96px] text-center whitespace-nowrap">
                        GST (%)
                      </th>
                      <th className="py-3 px-3 min-w-[130px] text-right whitespace-nowrap">
                        GST Amount
                      </th>
                    </>
                  )}
                  <th className="py-3 px-3 min-w-[145px] text-right whitespace-nowrap">
                    Total Amount (₹)
                  </th>
                  <th className="py-3 px-3 min-w-[100px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {totals.items.map((item, idx) => (
                  <tr key={item.id} className="align-middle hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-center font-mono text-xs font-semibold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        maxLength={240}
                        value={item.description}
                        onChange={(e) => updatePricingRow(idx, { description: e.target.value })}
                        placeholder="Service name / description"
                        className="w-full min-w-[220px] px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updatePricingRow(idx, {
                            unitPrice: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full min-w-[120px] px-3 py-2 text-sm font-mono text-right tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.quantity}
                        onChange={(e) =>
                          updatePricingRow(idx, {
                            quantity: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full min-w-[76px] px-2.5 py-2 text-sm font-mono text-center tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        list="pricing-unit-types"
                        type="text"
                        maxLength={50}
                        value={item.unitType}
                        onChange={(e) => updatePricingRow(idx, { unitType: e.target.value })}
                        className="w-full min-w-[115px] px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                      />
                    </td>
                    {gstEnabled && (
                      <>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={item.gstRate}
                            onChange={(e) =>
                              updatePricingRow(idx, {
                                gstRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                              })
                            }
                            className="w-full min-w-[76px] px-2.5 py-2 text-sm font-mono text-center tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm tabular-nums text-slate-700 whitespace-nowrap">
                          {formatINR(item.gstAmount)}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-3 text-right font-mono text-sm font-bold tabular-nums text-[#071D36] whitespace-nowrap">
                      {formatINR(item.totalAmount)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePricingRow(idx, -1)}
                          title="Move row up"
                          className="p-1.5 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === totals.items.length - 1}
                          onClick={() => movePricingRow(idx, 1)}
                          title="Move row down"
                          className="p-1.5 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPricingItems((prev) =>
                              prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev
                            )
                          }
                          title="Remove row"
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="pricing-unit-types">
              {DEFAULT_UNIT_TYPES.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>

          {/* Pricing Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-2">
            <div className="md:col-span-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Advance Amount (₹) — Optional
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-52 px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                />
              </div>
              <div className="p-4 bg-[#F4F6F9] border border-slate-200 rounded-lg">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Grand Total in Words
                </p>
                <p className="text-sm font-semibold text-[#071D36] mt-1">
                  {numberToIndianWords(totals.grandTotal)}
                </p>
              </div>
            </div>

            <div className="md:col-span-6 border border-slate-200 rounded-xl overflow-hidden text-sm">
              <div className="flex justify-between px-4 py-2.5 bg-[#F4F6F9] border-b border-slate-200">
                <span className="text-slate-600">Subtotal (Taxable Value)</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatINR(totals.subtotal)}
                </span>
              </div>
              {gstEnabled && (
                <div className="flex justify-between px-4 py-2.5 bg-[#F4F6F9] border-b border-slate-200">
                  <span className="text-slate-600">Total GST</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatINR(totals.totalGst)}
                  </span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 bg-[#071D36] text-white font-bold">
                <span>Grand Total</span>
                <span className="font-mono tabular-nums text-[#F5B51B]">
                  {formatINR(totals.grandTotal)}
                </span>
              </div>
              {totals.advanceAmount > 0 && (
                <>
                  <div className="flex justify-between px-4 py-2 bg-white border-t border-slate-200 text-xs">
                    <span className="text-slate-600">Advance Amount</span>
                    <span className="font-mono tabular-nums">
                      {formatINR(totals.advanceAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2 bg-white border-t border-slate-200 text-xs font-bold text-[#071D36]">
                    <span>Balance Payable</span>
                    <span className="font-mono tabular-nums">
                      {formatINR(totals.balanceAmount)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* SECTION F: TERMS & CONDITIONS, PAYMENT TERMS & COMMERCIAL NOTES */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Section F · Appears on Final Page
              </p>
              <h2 className="text-base font-bold text-[#071D36]">
                Terms &amp; Conditions, Payment Terms &amp; Commercial Notes
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTerms([...settings.defaultTerms])}
                className="text-xs font-medium text-slate-500 hover:text-[#071D36] cursor-pointer"
              >
                Load Defaults
              </button>
              <button
                type="button"
                onClick={() => setTerms((prev) => [...prev, ''])}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#071D36] bg-[#F4F6F9] hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Term
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {terms.map((term, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 w-6 text-right shrink-0">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  maxLength={500}
                  value={term}
                  onChange={(e) => {
                    const next = [...terms];
                    next[idx] = e.target.value;
                    setTerms(next);
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
                />
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveTerm(idx, -1)}
                  className="p-1.5 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === terms.length - 1}
                  onClick={() => moveTerm(idx, 1)}
                  className="p-1.5 text-slate-400 hover:text-[#071D36] disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTerms((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Terms
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Other Commercial Notes (Optional)
              </label>
              <textarea
                rows={3}
                maxLength={1500}
                value={commercialNotes}
                onChange={(e) => setCommercialNotes(e.target.value)}
                placeholder="Any special commercial notes, mobilization remarks, or site exclusions..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F5B51B]"
              />
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* BOTTOM FULL-WIDTH LIVE PAGE-BY-PAGE QUOTATION PREVIEW             */}
        {/* ================================================================= */}
        <section
          ref={bottomPreviewRef}
          className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-20"
        >
          <div className="px-5 sm:px-6 py-4 bg-[#071D36] text-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                Live Quotation Preview (Structured Page-by-Page A4 Layout)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Page 1: Company &amp; Customer Info · Page 2{quoteServices.length > 4 ? '–3' : ''}:
                Scope of Work · Final Page: Commercial Offer, Terms &amp; Signatory
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void downloadQuotationPdf(draftQuotation, settings)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#071D36] bg-[#F5B51B] hover:bg-[#E0A20F] rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => setPreviewExpanded((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 rounded-lg cursor-pointer whitespace-nowrap"
              >
                {previewExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Expand
                  </>
                )}
              </button>
            </div>
          </div>

          {previewExpanded && (
            <div className="p-4 sm:p-8 bg-[#E8ECF2]">
              <QuotationDocumentView quotation={draftQuotation} settings={settings} />
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <CustomerFormModal
        open={customerModalOpen}
        saving={savingCustomer}
        onSave={handleCreateNewCustomer}
        onClose={() => setCustomerModalOpen(false)}
      />

      <QuotationPreviewModal
        quotation={fullPreviewOpen ? draftQuotation : null}
        settings={settings}
        onClose={() => setFullPreviewOpen(false)}
      />

      <ConfirmModal
        open={Boolean(pendingOverwriteStatus)}
        variant="primary"
        title="Overwrite Saved Quotation?"
        description={`You are updating saved quotation ${quotationNumber}. Confirm to overwrite the existing record in Cloud Firestore with status "${pendingOverwriteStatus}".`}
        confirmLabel="Save Changes"
        loading={savingQuote}
        onConfirm={() => {
          if (pendingOverwriteStatus) void executeSave(pendingOverwriteStatus);
        }}
        onCancel={() => setPendingOverwriteStatus(null)}
      />
    </div>
  );
};
