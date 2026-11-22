import React, { useState } from 'react';
import {
  FilePlus2,
  FileText,
  LayoutDashboard,
  Layers,
  LogOut,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_LOGO_PATH } from '../constants/defaults';
import { useAppData } from '../context/AppDataContext';
import { AppRoute } from '../types/quotation';

interface SidebarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create', label: 'Create Quotation', icon: FilePlus2 },
  { id: 'quotations', label: 'All Quotations', icon: FileText },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'services', label: 'Service Library', icon: Layers },
  { id: 'settings', label: 'Company Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeRoute,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) => {
  const { user, logout, settings, quotations } = useAppData();
  const [logoError, setLogoError] = useState(false);

  const handleSelect = (route: AppRoute) => {
    onNavigate(route);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#071D36] text-white w-[260px] select-none">
      {/* Top Yellow Brand Strip */}
      <div className="h-1 bg-[#F5B51B] w-full shrink-0" />

      {/* Brand Header */}
      <div className="px-5 pt-5 pb-5 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="min-w-0">
          {!logoError ? (
            <img
              src={settings.logoUrl || DEFAULT_LOGO_PATH}
              alt="TM Industrial Solution"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
              className="h-9 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <div className="text-base font-extrabold tracking-tight text-white">
              TM <span className="text-[#F5B51B]">QUOTATION</span>
            </div>
          )}
          <p className="text-[11px] font-medium text-slate-300 mt-2 truncate">
            TM Quotation Manager
          </p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden text-slate-300 hover:text-white p-1.5 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#F5B51B] text-[#071D36] font-semibold'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#071D36]' : 'text-slate-300'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'quotations' && quotations.length > 0 && (
                <span
                  className={`text-xs font-mono tabular-nums ${
                    isActive ? 'text-[#071D36]/80' : 'text-slate-400'
                  }`}
                >
                  {quotations.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account & Sign Out Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User avatar'}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover border border-white/15 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[#0E2B4D] text-[#F5B51B] font-bold text-sm flex items-center justify-center shrink-0">
              {(user?.displayName || settings.contactPerson || 'R').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {user?.displayName || settings.contactPerson || 'Authorized User'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.email || settings.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-[260px] no-print">
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex no-print">
          <div
            className="fixed inset-0 bg-[#071D36]/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 flex h-full shadow-2xl">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
