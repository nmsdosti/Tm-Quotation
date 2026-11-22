export type QuotationStatus =
  | 'Draft'
  | 'Sent'
  | 'Under Discussion'
  | 'Accepted'
  | 'Rejected'
  | 'Expired';

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId: string;
}

export interface CompanySettings {
  ownerId: string;
  companyName: string;
  tagline: string;
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
  website: string;
  googleMapsUrl: string;
  address: string;
  gstin: string;
  logoUrl: string;
  defaultGstRate: number;
  quotationPrefix: string;
  financialYear: string;
  nextSerialNumber: number;
  defaultValidityDays: number;
  defaultCompanyIntro: string;
  defaultTerms: string[];
  defaultPaymentTerms: string;
  signatoryName: string;
  signatoryTitle: string;
  bankDetails: BankDetails;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Customer {
  id: string;
  ownerId: string;
  companyName: string;
  address: string;
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
  gstin: string;
  state: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface CustomerSnapshot {
  companyName: string;
  address: string;
  contactPerson: string;
  designation: string;
  phone: string;
  email: string;
  gstin: string;
  state: string;
}

export interface ServiceTemplate {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  scopePoints: string[];
  defaultPrice: number;
  unitType: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface QuotationServiceItem {
  id: string;
  serviceTemplateId?: string;
  title: string;
  description?: string;
  scopePoints: string[];
}

export interface PricingItem {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  unitType: string;
  gstRate: number;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
}

export interface Quotation {
  id: string;
  ownerId: string;
  quotationNumber: string;
  quotationDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  subject: string;
  referenceNumber: string;
  preparedBy: string;
  status: QuotationStatus;
  customerId: string;
  customer: CustomerSnapshot;
  companyIntro: string;
  scopeOverview?: string;
  services: QuotationServiceItem[];
  deliverables?: string[];
  customerArrangements?: string[];
  pricingItems: PricingItem[];
  gstEnabled: boolean;
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  advanceAmount: number;
  balanceAmount: number;
  terms: string[];
  paymentTerms: string;
  commercialNotes?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export type AppRoute =
  | 'dashboard'
  | 'create'
  | 'quotations'
  | 'customers'
  | 'services'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
