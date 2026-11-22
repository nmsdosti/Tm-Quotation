import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  storage,
} from '../lib/firebase';
import {
  createDefaultCompanySettings,
  INITIAL_SERVICE_LIBRARY,
} from '../constants/defaults';
import {
  CompanySettings,
  Customer,
  Quotation,
  QuotationStatus,
  ServiceTemplate,
  ToastMessage,
} from '../types/quotation';
import {
  addDaysISO,
  buildQuotationNumber,
  calculateQuotationTotals,
  generateSafeId,
  getTodayISO,
  truncateString,
} from '../utils/formatters';

interface AppDataContextValue {
  user: User | null;
  authLoading: boolean;
  dataLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  settings: CompanySettings;
  customers: Customer[];
  services: ServiceTemplate[];
  quotations: Quotation[];
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  saveCompanySettings: (next: Partial<CompanySettings>) => Promise<void>;
  uploadCompanyLogo: (file: File) => Promise<string>;
  addCustomer: (
    data: Omit<Customer, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<Customer>;
  updateCustomer: (
    id: string,
    data: Partial<Omit<Customer, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addServiceTemplate: (
    data: Omit<ServiceTemplate, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<ServiceTemplate>;
  updateServiceTemplate: (
    id: string,
    data: Partial<Omit<ServiceTemplate, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  deleteServiceTemplate: (id: string) => Promise<void>;
  saveQuotation: (
    data: Omit<Quotation, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => Promise<Quotation>;
  updateQuotationStatus: (id: string, status: QuotationStatus) => Promise<void>;
  duplicateQuotation: (source: Quotation) => Promise<Quotation>;
  deleteQuotation: (id: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    const sec = (val as { seconds: number }).seconds;
    return new Date(sec * 1000);
  }
  return null;
}

async function compressLogoFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 520;
        const maxH = 180;
        let w = img.width;
        let h = img.height;
        const scale = Math.min(1, maxW / w, maxH / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not initialize image canvas.'));
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const pngData = canvas.toDataURL('image/png');
        if (pngData.length <= 240000) {
          resolve(pngData);
        } else {
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        }
      };
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [settings, setSettings] = useState<CompanySettings>(() => createDefaultCompanySettings(''));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceTemplate[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const bootstrappedUidRef = useRef<string | null>(null);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateSafeId('toast');
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (!firebaseUser) {
        bootstrappedUidRef.current = null;
        setCustomers([]);
        setServices([]);
        setQuotations([]);
        setSettings(createDefaultCompanySettings(''));
      }
    });
    return () => unsub();
  }, []);

  // Bootstrap default settings & 6 core TM Industrial Solution service templates once per user
  const bootstrapWorkspace = useCallback(async (uid: string) => {
    if (bootstrappedUidRef.current === uid) return;
    bootstrappedUidRef.current = uid;

    const settingsRef = doc(db, 'companySettings', uid);
    try {
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        const defaults = createDefaultCompanySettings(uid);
        await setDoc(settingsRef, {
          ...defaults,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `companySettings/${uid}`);
    }

    try {
      const svcQuery = query(collection(db, 'services'), where('ownerId', '==', uid));
      const existingSvcs = await getDocs(svcQuery);
      if (existingSvcs.empty) {
        const batch = writeBatch(db);
        INITIAL_SERVICE_LIBRARY.forEach((tpl, idx) => {
          const svcId = `svc_core_${idx + 1}_${uid.slice(0, 8)}`.replace(/[^a-zA-Z0-9_-]/g, '');
          batch.set(doc(db, 'services', svcId), {
            ownerId: uid,
            name: truncateString(tpl.name, 150),
            description: truncateString(tpl.description, 1000),
            scopePoints: tpl.scopePoints.slice(0, 30).map((p) => truncateString(p, 500)),
            defaultPrice: tpl.defaultPrice,
            unitType: truncateString(tpl.unitType, 50),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'services');
    }
  }, []);

  // Attach real-time Firestore listeners once authenticated
  useEffect(() => {
    if (authLoading || !user) return;
    const uid = user.uid;
    setDataLoading(true);

    let loadedFlags = { settings: false, customers: false, services: false, quotations: false };
    const markLoaded = (key: keyof typeof loadedFlags) => {
      loadedFlags = { ...loadedFlags, [key]: true };
      if (
        loadedFlags.settings &&
        loadedFlags.customers &&
        loadedFlags.services &&
        loadedFlags.quotations
      ) {
        setDataLoading(false);
      }
    };

    void bootstrapWorkspace(uid);

    const unsubSettings = onSnapshot(
      doc(db, 'companySettings', uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const base = createDefaultCompanySettings(uid);
          setSettings({
            ...base,
            ...d,
            bankDetails: {
              ...base.bankDetails,
              ...(d.bankDetails || {}),
            },
            defaultTerms: Array.isArray(d.defaultTerms) ? d.defaultTerms : base.defaultTerms,
            createdAt: toDate(d.createdAt),
            updatedAt: toDate(d.updatedAt),
          } as CompanySettings);
        } else {
          setSettings(createDefaultCompanySettings(uid));
        }
        markLoaded('settings');
      },
      (error) => handleFirestoreError(error, OperationType.GET, `companySettings/${uid}`)
    );

    const unsubCustomers = onSnapshot(
      query(collection(db, 'customers'), where('ownerId', '==', uid)),
      (snap) => {
        const list: Customer[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              ownerId: d.ownerId || uid,
              companyName: d.companyName || '',
              address: d.address || '',
              contactPerson: d.contactPerson || '',
              designation: d.designation || '',
              phone: d.phone || '',
              email: d.email || '',
              gstin: d.gstin || '',
              state: d.state || '',
              createdAt: toDate(d.createdAt),
              updatedAt: toDate(d.updatedAt),
            };
          })
          .sort((a, b) => a.companyName.localeCompare(b.companyName));
        setCustomers(list);
        markLoaded('customers');
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'customers')
    );

    const unsubServices = onSnapshot(
      query(collection(db, 'services'), where('ownerId', '==', uid)),
      (snap) => {
        const list: ServiceTemplate[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              ownerId: d.ownerId || uid,
              name: d.name || '',
              description: d.description || '',
              scopePoints: Array.isArray(d.scopePoints) ? d.scopePoints : [],
              defaultPrice: Number(d.defaultPrice) || 0,
              unitType: d.unitType || 'Per Job',
              createdAt: toDate(d.createdAt),
              updatedAt: toDate(d.updatedAt),
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        setServices(list);
        markLoaded('services');
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'services')
    );

    const unsubQuotations = onSnapshot(
      query(collection(db, 'quotations'), where('ownerId', '==', uid)),
      (snap) => {
        const list: Quotation[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              ownerId: d.ownerId || uid,
              quotationNumber: d.quotationNumber || '',
              quotationDate: d.quotationDate || '',
              validUntil: d.validUntil || '',
              subject: d.subject || '',
              referenceNumber: d.referenceNumber || '',
              preparedBy: d.preparedBy || '',
              status: (d.status as QuotationStatus) || 'Draft',
              customerId: d.customerId || '',
              customer: d.customer || {
                companyName: '',
                address: '',
                contactPerson: '',
                designation: '',
                phone: '',
                email: '',
                gstin: '',
                state: '',
              },
              companyIntro: d.companyIntro || '',
              scopeOverview: d.scopeOverview || '',
              services: Array.isArray(d.services) ? d.services : [],
              deliverables: Array.isArray(d.deliverables) ? d.deliverables : [],
              customerArrangements: Array.isArray(d.customerArrangements)
                ? d.customerArrangements
                : [],
              pricingItems: Array.isArray(d.pricingItems) ? d.pricingItems : [],
              gstEnabled: typeof d.gstEnabled === 'boolean' ? d.gstEnabled : true,
              subtotal: Number(d.subtotal) || 0,
              totalGst: Number(d.totalGst) || 0,
              grandTotal: Number(d.grandTotal) || 0,
              advanceAmount: Number(d.advanceAmount) || 0,
              balanceAmount: Number(d.balanceAmount) || 0,
              terms: Array.isArray(d.terms) ? d.terms : [],
              paymentTerms: d.paymentTerms || '',
              commercialNotes: d.commercialNotes || '',
              createdAt: toDate(d.createdAt),
              updatedAt: toDate(d.updatedAt),
            };
          })
          .sort((a, b) => {
            const ta = b.updatedAt?.getTime() || b.createdAt?.getTime() || 0;
            const tb = a.updatedAt?.getTime() || a.createdAt?.getTime() || 0;
            return ta - tb;
          });
        setQuotations(list);
        markLoaded('quotations');
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'quotations')
    );

    return () => {
      unsubSettings();
      unsubCustomers();
      unsubServices();
      unsubQuotations();
    };
  }, [authLoading, user, bootstrapWorkspace]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      pushToast({
        type: 'success',
        title: 'Signed in successfully',
        description: 'Connected to TM Industrial Solution cloud database.',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign-in failed.';
      pushToast({
        type: 'error',
        title: 'Authentication failed',
        description: msg,
      });
      throw error;
    }
  }, [pushToast]);

  const logout = useCallback(async () => {
    await signOut(auth);
    pushToast({
      type: 'info',
      title: 'Signed out',
      description: 'Your session has been closed securely.',
    });
  }, [pushToast]);

  const saveCompanySettings = useCallback(
    async (next: Partial<CompanySettings>) => {
      if (!user) throw new Error('Not authenticated');
      const merged: CompanySettings = {
        ...settings,
        ...next,
        ownerId: user.uid,
        bankDetails: {
          ...settings.bankDetails,
          ...(next.bankDetails || {}),
        },
      };

      const sanitized = {
        companyName: truncateString(merged.companyName.trim() || 'TM INDUSTRIAL SOLUTION', 150),
        tagline: truncateString(merged.tagline, 200),
        contactPerson: truncateString(merged.contactPerson, 120),
        designation: truncateString(merged.designation, 120),
        phone: truncateString(merged.phone, 40),
        email: truncateString(merged.email, 150),
        website: truncateString(merged.website, 200),
        googleMapsUrl: truncateString(merged.googleMapsUrl, 300),
        address: truncateString(merged.address, 500),
        gstin: truncateString(merged.gstin.toUpperCase(), 30),
        logoUrl: truncateString(merged.logoUrl, 250000),
        defaultGstRate: Math.min(100, Math.max(0, Number(merged.defaultGstRate) || 0)),
        quotationPrefix: truncateString(merged.quotationPrefix.trim() || 'TMIS', 20),
        financialYear: truncateString(merged.financialYear.trim() || '2026-27', 20),
        nextSerialNumber: Math.max(1, Math.min(999999, Math.floor(Number(merged.nextSerialNumber) || 1))),
        defaultValidityDays: Math.max(1, Math.min(365, Math.floor(Number(merged.defaultValidityDays) || 30))),
        defaultCompanyIntro: truncateString(merged.defaultCompanyIntro, 3000),
        defaultTerms: (merged.defaultTerms || []).slice(0, 40).map((t) => truncateString(t, 500)),
        defaultPaymentTerms: truncateString(merged.defaultPaymentTerms, 1000),
        signatoryName: truncateString(merged.signatoryName, 120),
        signatoryTitle: truncateString(merged.signatoryTitle, 120),
        bankDetails: {
          bankName: truncateString(merged.bankDetails.bankName, 120),
          accountName: truncateString(merged.bankDetails.accountName, 150),
          accountNumber: truncateString(merged.bankDetails.accountNumber, 50),
          ifscCode: truncateString(merged.bankDetails.ifscCode.toUpperCase(), 30),
          branch: truncateString(merged.bankDetails.branch, 150),
          upiId: truncateString(merged.bankDetails.upiId, 100),
        },
        updatedAt: serverTimestamp(),
      };

      const settingsRef = doc(db, 'companySettings', user.uid);
      try {
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          await updateDoc(settingsRef, sanitized);
        } else {
          await setDoc(settingsRef, {
            ownerId: user.uid,
            ...sanitized,
            createdAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `companySettings/${user.uid}`);
      }
    },
    [user, settings]
  );

  const uploadCompanyLogo = useCallback(
    async (file: File): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      try {
        const storageRef = ref(storage, `company-logos/${user.uid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return url;
      } catch {
        // Fallback to compressed PNG/JPEG data URL when Firebase Storage rules aren't provisioned
        return compressLogoFileToDataUrl(file);
      }
    },
    [user]
  );

  const addCustomer = useCallback(
    async (data: Omit<Customer, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
      if (!user) throw new Error('Not authenticated');
      const id = generateSafeId('cust');
      const payload = {
        ownerId: user.uid,
        companyName: truncateString(data.companyName.trim(), 200),
        address: truncateString(data.address, 500),
        contactPerson: truncateString(data.contactPerson, 150),
        designation: truncateString(data.designation, 150),
        phone: truncateString(data.phone, 40),
        email: truncateString(data.email, 150),
        gstin: truncateString(data.gstin.toUpperCase(), 30),
        state: truncateString(data.state, 80),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'customers', id), payload);
        return {
          id,
          ownerId: user.uid,
          companyName: payload.companyName,
          address: payload.address,
          contactPerson: payload.contactPerson,
          designation: payload.designation,
          phone: payload.phone,
          email: payload.email,
          gstin: payload.gstin,
          state: payload.state,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `customers/${id}`);
      }
    },
    [user]
  );

  const updateCustomer = useCallback(
    async (
      id: string,
      data: Partial<Omit<Customer, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
    ) => {
      if (!user) throw new Error('Not authenticated');
      const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (data.companyName !== undefined) patch.companyName = truncateString(data.companyName.trim(), 200);
      if (data.address !== undefined) patch.address = truncateString(data.address, 500);
      if (data.contactPerson !== undefined) patch.contactPerson = truncateString(data.contactPerson, 150);
      if (data.designation !== undefined) patch.designation = truncateString(data.designation, 150);
      if (data.phone !== undefined) patch.phone = truncateString(data.phone, 40);
      if (data.email !== undefined) patch.email = truncateString(data.email, 150);
      if (data.gstin !== undefined) patch.gstin = truncateString(data.gstin.toUpperCase(), 30);
      if (data.state !== undefined) patch.state = truncateString(data.state, 80);

      try {
        await updateDoc(doc(db, 'customers', id), patch);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `customers/${id}`);
      }
    },
    [user]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
      }
    },
    [user]
  );

  const addServiceTemplate = useCallback(
    async (
      data: Omit<ServiceTemplate, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
    ): Promise<ServiceTemplate> => {
      if (!user) throw new Error('Not authenticated');
      const id = generateSafeId('svc');
      const payload = {
        ownerId: user.uid,
        name: truncateString(data.name.trim(), 150),
        description: truncateString(data.description, 1000),
        scopePoints: data.scopePoints
          .map((p) => truncateString(p.trim(), 500))
          .filter(Boolean)
          .slice(0, 30),
        defaultPrice: Math.max(0, Number(data.defaultPrice) || 0),
        unitType: truncateString(data.unitType.trim() || 'Per Job', 50),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'services', id), payload);
        return {
          id,
          ownerId: user.uid,
          name: payload.name,
          description: payload.description,
          scopePoints: payload.scopePoints,
          defaultPrice: payload.defaultPrice,
          unitType: payload.unitType,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `services/${id}`);
      }
    },
    [user]
  );

  const updateServiceTemplate = useCallback(
    async (
      id: string,
      data: Partial<Omit<ServiceTemplate, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
    ) => {
      if (!user) throw new Error('Not authenticated');
      const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
      if (data.name !== undefined) patch.name = truncateString(data.name.trim(), 150);
      if (data.description !== undefined) patch.description = truncateString(data.description, 1000);
      if (data.scopePoints !== undefined) {
        patch.scopePoints = data.scopePoints
          .map((p) => truncateString(p.trim(), 500))
          .filter(Boolean)
          .slice(0, 30);
      }
      if (data.defaultPrice !== undefined) patch.defaultPrice = Math.max(0, Number(data.defaultPrice) || 0);
      if (data.unitType !== undefined) patch.unitType = truncateString(data.unitType.trim() || 'Per Job', 50);

      try {
        await updateDoc(doc(db, 'services', id), patch);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `services/${id}`);
      }
    },
    [user]
  );

  const deleteServiceTemplate = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      try {
        await deleteDoc(doc(db, 'services', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `services/${id}`);
      }
    },
    [user]
  );

  const saveQuotation = useCallback(
    async (
      data: Omit<Quotation, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ): Promise<Quotation> => {
      if (!user) throw new Error('Not authenticated');

      const computed = calculateQuotationTotals(
        data.pricingItems,
        data.gstEnabled,
        data.advanceAmount
      );

      const sanitizedCustomer = {
        companyName: truncateString(data.customer.companyName.trim() || 'Customer', 200),
        address: truncateString(data.customer.address, 500),
        contactPerson: truncateString(data.customer.contactPerson, 150),
        designation: truncateString(data.customer.designation, 150),
        phone: truncateString(data.customer.phone, 40),
        email: truncateString(data.customer.email, 150),
        gstin: truncateString(data.customer.gstin.toUpperCase(), 30),
        state: truncateString(data.customer.state, 80),
      };

      const sanitizedServices = data.services.slice(0, 30).map((s) => ({
        id: s.id || generateSafeId('qsvc'),
        serviceTemplateId: s.serviceTemplateId || '',
        title: truncateString(s.title.trim() || 'Service', 150),
        description: truncateString(s.description, 600),
        scopePoints: s.scopePoints
          .map((p) => truncateString(p.trim(), 500))
          .filter(Boolean)
          .slice(0, 30),
      }));

      const sanitizedPricing = computed.items.slice(0, 50).map((p) => ({
        id: p.id || generateSafeId('price'),
        description: truncateString(p.description.trim() || 'Service Item', 240),
        unitPrice: p.unitPrice,
        quantity: p.quantity,
        unitType: truncateString(p.unitType.trim() || 'Per Job', 50),
        gstRate: p.gstRate,
        baseAmount: p.baseAmount,
        gstAmount: p.gstAmount,
        totalAmount: p.totalAmount,
      }));

      const commonFields = {
        quotationNumber: truncateString(data.quotationNumber.trim(), 60),
        quotationDate: truncateString(data.quotationDate, 20),
        validUntil: truncateString(data.validUntil, 20),
        subject: truncateString(data.subject.trim() || 'Industrial Service Quotation', 300),
        referenceNumber: truncateString(data.referenceNumber, 100),
        preparedBy: truncateString(data.preparedBy, 120),
        status: data.status,
        customerId: data.customerId ? truncateString(data.customerId, 128) : '',
        customer: sanitizedCustomer,
        companyIntro: truncateString(data.companyIntro, 3000),
        scopeOverview: truncateString(data.scopeOverview, 1500),
        services: sanitizedServices,
        deliverables: (data.deliverables || [])
          .map((d) => truncateString(d.trim(), 500))
          .filter(Boolean)
          .slice(0, 20),
        customerArrangements: (data.customerArrangements || [])
          .map((c) => truncateString(c.trim(), 500))
          .filter(Boolean)
          .slice(0, 20),
        pricingItems: sanitizedPricing,
        gstEnabled: Boolean(data.gstEnabled),
        subtotal: computed.subtotal,
        totalGst: computed.totalGst,
        grandTotal: computed.grandTotal,
        advanceAmount: computed.advanceAmount,
        balanceAmount: computed.balanceAmount,
        terms: data.terms
          .map((t) => truncateString(t.trim(), 500))
          .filter(Boolean)
          .slice(0, 40),
        paymentTerms: truncateString(data.paymentTerms, 1000),
        commercialNotes: truncateString(data.commercialNotes, 1500),
        updatedAt: serverTimestamp(),
      };

      if (existingId) {
        try {
          await updateDoc(doc(db, 'quotations', existingId), commonFields);
          return {
            id: existingId,
            ownerId: user.uid,
            ...commonFields,
            updatedAt: new Date(),
          } as Quotation;
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `quotations/${existingId}`);
        }
      } else {
        const newId = generateSafeId('quot');
        try {
          await setDoc(doc(db, 'quotations', newId), {
            ownerId: user.uid,
            ...commonFields,
            createdAt: serverTimestamp(),
          });

          // Increment quotation serial counter automatically
          const nextSerial = Math.max(1, (settings.nextSerialNumber || 1) + 1);
          await updateDoc(doc(db, 'companySettings', user.uid), {
            nextSerialNumber: nextSerial,
            updatedAt: serverTimestamp(),
          });

          return {
            id: newId,
            ownerId: user.uid,
            ...commonFields,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Quotation;
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `quotations/${newId}`);
        }
      }
    },
    [user, settings.nextSerialNumber]
  );

  const updateQuotationStatus = useCallback(
    async (id: string, status: QuotationStatus) => {
      if (!user) throw new Error('Not authenticated');
      try {
        await updateDoc(doc(db, 'quotations', id), {
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `quotations/${id}`);
      }
    },
    [user]
  );

  const duplicateQuotation = useCallback(
    async (source: Quotation): Promise<Quotation> => {
      const today = getTodayISO();
      const validUntil = addDaysISO(today, settings.defaultValidityDays || 30);
      const nextNum = buildQuotationNumber(
        settings.quotationPrefix,
        settings.financialYear,
        settings.nextSerialNumber || 1
      );

      // Verify customerId still exists before linking on create
      const customerExists = source.customerId
        ? customers.some((c) => c.id === source.customerId)
        : false;

      return saveQuotation({
        quotationNumber: nextNum,
        quotationDate: today,
        validUntil,
        subject: source.subject,
        referenceNumber: source.referenceNumber,
        preparedBy: source.preparedBy || settings.contactPerson,
        status: 'Draft',
        customerId: customerExists ? source.customerId : '',
        customer: { ...source.customer },
        companyIntro: source.companyIntro,
        scopeOverview: source.scopeOverview || '',
        services: source.services.map((s) => ({
          ...s,
          id: generateSafeId('qsvc'),
          scopePoints: [...s.scopePoints],
        })),
        deliverables: [...(source.deliverables || [])],
        customerArrangements: [...(source.customerArrangements || [])],
        pricingItems: source.pricingItems.map((p) => ({
          ...p,
          id: generateSafeId('price'),
        })),
        gstEnabled: source.gstEnabled,
        subtotal: source.subtotal,
        totalGst: source.totalGst,
        grandTotal: source.grandTotal,
        advanceAmount: source.advanceAmount,
        balanceAmount: source.balanceAmount,
        terms: [...source.terms],
        paymentTerms: source.paymentTerms,
        commercialNotes: source.commercialNotes || '',
      });
    },
    [settings, customers, saveQuotation]
  );

  const deleteQuotation = useCallback(
    async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      try {
        await deleteDoc(doc(db, 'quotations', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `quotations/${id}`);
      }
    },
    [user]
  );

  return (
    <AppDataContext.Provider
      value={{
        user,
        authLoading,
        dataLoading,
        signInWithGoogle,
        logout,
        settings,
        customers,
        services,
        quotations,
        toasts,
        pushToast,
        dismissToast,
        saveCompanySettings,
        uploadCompanyLogo,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addServiceTemplate,
        updateServiceTemplate,
        deleteServiceTemplate,
        saveQuotation,
        updateQuotationStatus,
        duplicateQuotation,
        deleteQuotation,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }
  return ctx;
}
