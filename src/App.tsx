import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { QuotationPreviewModal } from './components/QuotationPreviewModal';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { AppDataProvider, useAppData } from './context/AppDataContext';
import { AllQuotationsPage } from './pages/AllQuotationsPage';
import { CompanySettingsPage } from './pages/CompanySettingsPage';
import { CreateQuotationPage } from './pages/CreateQuotationPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { ServiceLibraryPage } from './pages/ServiceLibraryPage';
import { AppRoute, Customer, Quotation } from './types/quotation';

const ROUTE_TITLES: Record<AppRoute, string> = {
  dashboard: 'Dashboard',
  create: 'Create Quotation',
  quotations: 'All Quotations',
  customers: 'Customers',
  services: 'Service Library',
  settings: 'Company Settings',
};

const AppShell: React.FC = () => {
  const { user, authLoading, settings } = useAppData();

  const [activeRoute, setActiveRoute] = useState<AppRoute>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [preselectedCustomer, setPreselectedCustomer] = useState<Customer | null>(null);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#071D36] flex flex-col items-center justify-center p-6 text-white">
        <div className="w-10 h-10 border-2 border-[#F5B51B] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Loading TM Quotation Manager...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
        <ToastContainer />
      </>
    );
  }

  const handleNavigate = (route: AppRoute) => {
    if (route === 'create' && activeRoute !== 'create') {
      setEditingQuotation(null);
      setPreselectedCustomer(null);
    }
    setActiveRoute(route);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleEditQuotation = (q: Quotation) => {
    setPreselectedCustomer(null);
    setEditingQuotation(q);
    setActiveRoute('create');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleCreateForCustomer = (customer: Customer) => {
    setEditingQuotation(null);
    setPreselectedCustomer(customer);
    setActiveRoute('create');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#071D36] flex">
      <Sidebar
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        {/* Clean Contextual Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4 shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-[#071D36] rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
              <span className="font-semibold text-slate-400 whitespace-nowrap hidden sm:inline">
                TM Industrial Solution
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-bold text-[#071D36] truncate">
                {ROUTE_TITLES[activeRoute]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline text-xs font-mono text-slate-500">
              FY {settings.financialYear}
            </span>
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] w-full mx-auto">
          {activeRoute === 'dashboard' && (
            <DashboardPage
              onCreateNew={() => handleNavigate('create')}
              onViewQuotation={setViewingQuotation}
              onEditQuotation={handleEditQuotation}
              onViewAllQuotations={() => handleNavigate('quotations')}
            />
          )}

          {activeRoute === 'create' && (
            <CreateQuotationPage
              editingQuotation={editingQuotation}
              preselectedCustomer={preselectedCustomer}
              onSaved={() => {
                setEditingQuotation(null);
                setPreselectedCustomer(null);
                setActiveRoute('quotations');
              }}
              onClearEditing={() => {
                setEditingQuotation(null);
                setPreselectedCustomer(null);
              }}
            />
          )}

          {activeRoute === 'quotations' && (
            <AllQuotationsPage
              onCreateNew={() => handleNavigate('create')}
              onViewQuotation={setViewingQuotation}
              onEditQuotation={handleEditQuotation}
            />
          )}

          {activeRoute === 'customers' && (
            <CustomersPage
              onViewQuotation={setViewingQuotation}
              onCreateQuotationForCustomer={handleCreateForCustomer}
            />
          )}

          {activeRoute === 'services' && <ServiceLibraryPage />}

          {activeRoute === 'settings' && <CompanySettingsPage />}
        </main>
      </div>

      {/* Full-Screen Quotation Preview Modal */}
      <QuotationPreviewModal
        quotation={viewingQuotation}
        settings={settings}
        onClose={() => setViewingQuotation(null)}
        onEdit={handleEditQuotation}
      />

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppDataProvider>
        <AppShell />
      </AppDataProvider>
    </ErrorBoundary>
  );
}
