import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Copy,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  FileSpreadsheet,
} from 'lucide-react';
import { StatusSelect } from '../components/StatusBadge';
import { useAppData } from '../context/AppDataContext';
import { Quotation, QuotationStatus } from '../types/quotation';
import { exportDashboardToExcel } from '../utils/excelExport';
import { formatDateDisplay, formatINR, formatINRCompact } from '../utils/formatters';
import { downloadQuotationPdf } from '../utils/pdfGenerator';

interface DashboardPageProps {
  onCreateNew: () => void;
  onViewQuotation: (q: Quotation) => void;
  onEditQuotation: (q: Quotation) => void;
  onViewAllQuotations: () => void;
}

const PIE_COLORS = {
  Accepted: '#16A34A',
  Pending: '#F5B51B',
  Rejected: '#DC2626',
  Expired: '#94A3B8',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onCreateNew,
  onViewQuotation,
  onEditQuotation,
  onViewAllQuotations,
}) => {
  const { quotations, settings, updateQuotationStatus, duplicateQuotation, pushToast, dataLoading } =
    useAppData();
  const [busyId, setBusyId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalCreated = quotations.length;
    const totalSent = quotations.filter((q) => q.status !== 'Draft').length;
    const pending = quotations.filter(
      (q) => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Under Discussion'
    ).length;
    const accepted = quotations.filter((q) => q.status === 'Accepted').length;
    const rejected = quotations.filter((q) => q.status === 'Rejected').length;
    const totalValue = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const acceptedValue = quotations
      .filter((q) => q.status === 'Accepted')
      .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    return {
      totalCreated,
      totalSent,
      pending,
      accepted,
      rejected,
      totalValue,
      acceptedValue,
    };
  }, [quotations]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number; value: number }>();
    quotations.forEach((q) => {
      const iso = q.quotationDate || '';
      if (iso.length < 7) return;
      const key = iso.slice(0, 7);
      const dt = new Date(`${key}-01T00:00:00`);
      const label = Number.isNaN(dt.getTime())
        ? key
        : dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const prev = map.get(key) || { key, label, count: 0, value: 0 };
      prev.count += 1;
      prev.value += q.grandTotal || 0;
      map.set(key, prev);
    });
    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-12);
  }, [quotations]);

  const statusBreakdown = useMemo(() => {
    const accepted = quotations.filter((q) => q.status === 'Accepted').length;
    const rejected = quotations.filter((q) => q.status === 'Rejected').length;
    const pending = quotations.filter(
      (q) => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Under Discussion'
    ).length;
    const expired = quotations.filter((q) => q.status === 'Expired').length;

    return [
      { name: 'Accepted', value: accepted, color: PIE_COLORS.Accepted },
      { name: 'Pending', value: pending, color: PIE_COLORS.Pending },
      { name: 'Rejected', value: rejected, color: PIE_COLORS.Rejected },
      ...(expired > 0 ? [{ name: 'Expired', value: expired, color: PIE_COLORS.Expired }] : []),
    ].filter((d) => d.value > 0);
  }, [quotations]);

  const serviceValueData = useMemo(() => {
    const map = new Map<string, number>();
    quotations.forEach((q) => {
      q.pricingItems.forEach((item) => {
        const name = (item.description || 'Other Service').trim();
        const shortName = name.length > 26 ? `${name.slice(0, 24)}…` : name;
        map.set(shortName, (map.get(shortName) || 0) + (item.totalAmount || 0));
      });
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [quotations]);

  const recentQuotations = useMemo(() => quotations.slice(0, 8), [quotations]);

  const handleStatusChange = async (q: Quotation, status: QuotationStatus) => {
    setBusyId(q.id);
    try {
      await updateQuotationStatus(q.id, status);
      pushToast({
        type: 'success',
        title: 'Status updated',
        description: `${q.quotationNumber} marked as ${status}.`,
      });
    } catch {
      pushToast({
        type: 'error',
        title: 'Status update failed',
        description: 'Could not update quotation status.',
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
        description: `Created ${created.quotationNumber} as a new Draft.`,
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

  const handleDownloadPdf = async (q: Quotation) => {
    setBusyId(q.id);
    try {
      await downloadQuotationPdf(q, settings);
      pushToast({
        type: 'success',
        title: 'PDF downloaded',
        description: `${q.quotationNumber} exported as A4 PDF.`,
      });
    } finally {
      setBusyId(null);
    }
  };

  if (dataLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white border border-slate-200 rounded-xl" />
          <div className="h-72 bg-white border border-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#071D36] tracking-tight">Commercial Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Live proposal performance computed from saved Cloud Firestore quotation records.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={quotations.length === 0}
            onClick={() => {
              exportDashboardToExcel(quotations);
              pushToast({
                type: 'success',
                title: 'Dashboard exported',
                description: 'Saved TM_Dashboard_Report.xlsx.',
              });
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#071D36] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <FilePlus2 className="w-4 h-4 text-[#F5B51B]" />
            New Quotation
          </button>
        </div>
      </div>

      {/* Top Financial KPI Highlight Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#071D36] text-white rounded-xl p-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-300">Total Quotation Value</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-white mt-2">
              {formatINR(stats.totalValue)}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Across {stats.totalCreated} saved quotation{stats.totalCreated === 1 ? '' : 's'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-mono text-[#F5B51B]">
              {stats.totalCreated > 0
                ? `${Math.round((stats.accepted / stats.totalCreated) * 100)}% win rate`
                : 'No records yet'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Accepted Business Value</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-emerald-700 mt-2">
              {formatINR(stats.acceptedValue)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              From {stats.accepted} accepted quotation{stats.accepted === 1 ? '' : 's'}
            </p>
          </div>
          <div className="w-10 h-1.5 bg-[#F5B51B] rounded-full shrink-0 mb-2" />
        </div>
      </div>

      {/* 5 Count Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Created', value: stats.totalCreated, tone: 'text-[#071D36]' },
          { label: 'Total Sent', value: stats.totalSent, tone: 'text-sky-700' },
          { label: 'Pending', value: stats.pending, tone: 'text-amber-700' },
          { label: 'Accepted', value: stats.accepted, tone: 'text-emerald-700' },
          { label: 'Rejected', value: stats.rejected, tone: 'text-red-600' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
          >
            <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
            <span className={`text-2xl font-bold font-mono tabular-nums mt-2 ${kpi.tone}`}>
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      {/* Charts Grid (4 Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Quotation Generation */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[#071D36]">Monthly Quotation Generation</h2>
            <p className="text-xs text-slate-500">Number of quotations issued per month</p>
          </div>
          {monthlyData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Create your first quotation to populate monthly volume trends.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Quotations" fill="#071D36" radius={[4, 4, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Chart 2: Monthly Quotation Value */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[#071D36]">Monthly Quotation Value (INR)</h2>
            <p className="text-xs text-slate-500">Total quoted commercial value per month</p>
          </div>
          {monthlyData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Monthly commercial values will appear once quotations are saved.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 8, right: 12, left: 6, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => formatINRCompact(Number(v))}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val) => [formatINR(Number(val)), 'Quoted Value']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" name="Value" fill="#F5B51B" radius={[4, 4, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Chart 3: Accepted vs Rejected vs Pending */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[#071D36]">Accepted vs Rejected vs Pending</h2>
            <p className="text-xs text-slate-500">Outcome distribution across all quotations</p>
          </div>
          {statusBreakdown.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              No quotation status records available yet.
            </div>
          ) : (
            <div className="h-56 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-1/2 h-48 sm:h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                    >
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2.5">
                {statusBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-700 font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#071D36]">
                      {item.value} ({Math.round((item.value / Math.max(1, stats.totalCreated)) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Chart 4: Service-Wise Quotation Value */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-[#071D36]">Service-Wise Quotation Value</h2>
            <p className="text-xs text-slate-500">Top quoted industrial services by cumulative value</p>
          </div>
          {serviceValueData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Service revenue breakdown populates automatically from pricing items.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={serviceValueData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatINRCompact(Number(v))}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11, fill: '#334155' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val) => [formatINR(Number(val)), 'Quoted Value']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill="#071D36" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Recent Quotations Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#071D36]">Recent Quotations</h2>
            <p className="text-xs text-slate-500">Latest proposals saved in your workspace</p>
          </div>
          {quotations.length > 0 && (
            <button
              type="button"
              onClick={onViewAllQuotations}
              className="text-xs font-semibold text-[#071D36] hover:underline cursor-pointer whitespace-nowrap"
            >
              View All ({quotations.length})
            </button>
          )}
        </div>

        {recentQuotations.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-[#071D36]">No quotations created yet</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Start by creating your first technical &amp; commercial quotation for TM Industrial
              Solution. All dashboard totals and charts update automatically.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#071D36] hover:bg-[#0E2B4D] rounded-lg transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-4 h-4 text-[#F5B51B]" />
              Create First Quotation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F4F6F9] border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Quotation No.</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Total Amount</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentQuotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#071D36] whitespace-nowrap">
                      {q.quotationNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-[200px] truncate">
                      {q.customer.companyName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[240px] truncate">{q.subject}</td>
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
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title="View quotation"
                          onClick={() => onViewQuotation(q)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Edit quotation"
                          onClick={() => onEditQuotation(q)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Download PDF"
                          disabled={busyId === q.id}
                          onClick={() => void handleDownloadPdf(q)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Duplicate quotation"
                          disabled={busyId === q.id}
                          onClick={() => void handleDuplicate(q)}
                          className="p-1.5 text-slate-500 hover:text-[#071D36] hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
