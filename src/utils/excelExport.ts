import * as XLSX from 'xlsx';
import { Customer, Quotation } from '../types/quotation';
import { formatDateDisplay, formatTimestampDisplay } from './formatters';

export function exportQuotationsToExcel(quotations: Quotation[], fileName = 'TM_Quotations_Register.xlsx') {
  const rows = quotations.map((q, idx) => ({
    'Sr. No.': idx + 1,
    'Quotation Number': q.quotationNumber,
    'Quotation Date': formatDateDisplay(q.quotationDate),
    'Valid Until': formatDateDisplay(q.validUntil),
    'Customer Company': q.customer.companyName,
    'Contact Person': q.customer.contactPerson || '',
    Phone: q.customer.phone || '',
    Email: q.customer.email || '',
    Subject: q.subject,
    'Reference No.': q.referenceNumber || '',
    'Prepared By': q.preparedBy || '',
    Status: q.status,
    'Subtotal (INR)': q.subtotal,
    'GST Amount (INR)': q.totalGst,
    'Grand Total (INR)': q.grandTotal,
    'Advance (INR)': q.advanceAmount || 0,
    'Balance (INR)': q.balanceAmount ?? q.grandTotal,
    'Services Count': q.services.length,
    'Last Updated': formatTimestampDisplay(q.updatedAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 16 },
    { wch: 24 },
    { wch: 36 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotations');
  XLSX.writeFile(workbook, fileName);
}

export function exportCustomersToExcel(
  customers: Customer[],
  quotations: Quotation[],
  fileName = 'TM_Customer_Database.xlsx'
) {
  const rows = customers.map((c, idx) => {
    const customerQuotes = quotations.filter(
      (q) =>
        (q.customerId && q.customerId === c.id) ||
        q.customer.companyName.trim().toLowerCase() === c.companyName.trim().toLowerCase()
    );
    const acceptedValue = customerQuotes
      .filter((q) => q.status === 'Accepted')
      .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    return {
      'Sr. No.': idx + 1,
      'Company Name': c.companyName,
      'Contact Person': c.contactPerson || '',
      'Designation / Dept': c.designation || '',
      Phone: c.phone || '',
      Email: c.email || '',
      GSTIN: c.gstin || '',
      State: c.state || '',
      Address: c.address || '',
      'Total Quotations': customerQuotes.length,
      'Accepted Business Value (INR)': acceptedValue,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 36 },
    { wch: 16 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
  XLSX.writeFile(workbook, fileName);
}

export function exportDashboardToExcel(
  quotations: Quotation[],
  fileName = 'TM_Dashboard_Report.xlsx'
) {
  const totalCount = quotations.length;
  const sentCount = quotations.filter((q) => q.status !== 'Draft').length;
  const pendingCount = quotations.filter(
    (q) => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Under Discussion'
  ).length;
  const acceptedCount = quotations.filter((q) => q.status === 'Accepted').length;
  const rejectedCount = quotations.filter((q) => q.status === 'Rejected').length;
  const totalValue = quotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
  const acceptedValue = quotations
    .filter((q) => q.status === 'Accepted')
    .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  const summaryRows = [
    { Metric: 'Total Quotations Created', Value: totalCount },
    { Metric: 'Total Quotations Sent', Value: sentCount },
    { Metric: 'Pending Quotations', Value: pendingCount },
    { Metric: 'Accepted Quotations', Value: acceptedCount },
    { Metric: 'Rejected Quotations', Value: rejectedCount },
    { Metric: 'Total Quotation Value (INR)', Value: totalValue },
    { Metric: 'Accepted Business Value (INR)', Value: acceptedValue },
  ];

  const monthlyMap = new Map<string, { Month: string; Count: number; TotalValue: number; AcceptedValue: number }>();
  quotations.forEach((q) => {
    const monthKey = q.quotationDate ? q.quotationDate.slice(0, 7) : 'Unknown';
    const existing = monthlyMap.get(monthKey) || {
      Month: monthKey,
      Count: 0,
      TotalValue: 0,
      AcceptedValue: 0,
    };
    existing.Count += 1;
    existing.TotalValue += q.grandTotal || 0;
    if (q.status === 'Accepted') existing.AcceptedValue += q.grandTotal || 0;
    monthlyMap.set(monthKey, existing);
  });

  const serviceMap = new Map<string, { Service: string; Quotations: number; ValueINR: number }>();
  quotations.forEach((q) => {
    q.pricingItems.forEach((item) => {
      const label = item.description.trim() || 'Other Service';
      const existing = serviceMap.get(label) || { Service: label, Quotations: 0, ValueINR: 0 };
      existing.Quotations += 1;
      existing.ValueINR += item.totalAmount || 0;
      serviceMap.set(label, existing);
    });
  });

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const wsMonthly = XLSX.utils.json_to_sheet(
    Array.from(monthlyMap.values()).sort((a, b) => a.Month.localeCompare(b.Month))
  );
  wsMonthly['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Trend');

  const wsServices = XLSX.utils.json_to_sheet(
    Array.from(serviceMap.values()).sort((a, b) => b.ValueINR - a.ValueINR)
  );
  wsServices['!cols'] = [{ wch: 36 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsServices, 'Service Breakdown');

  XLSX.writeFile(wb, fileName);
}
