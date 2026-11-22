import React, { useMemo, useState } from 'react';
import { DEFAULT_LOGO_PATH } from '../constants/defaults';
import { CompanySettings, Quotation, QuotationServiceItem } from '../types/quotation';
import { formatDateDisplay, formatINR, numberToIndianWords } from '../utils/formatters';

interface QuotationDocumentViewProps {
  quotation: Quotation;
  settings: CompanySettings;
}

/**
 * Estimates whether the Scope of Work needs 1 page (Page 2) or 2 pages (Pages 2 & 3),
 * mirroring the 3-to-4 page A4 PDF layout cleanly.
 */
function splitScopePages(
  services: QuotationServiceItem[],
  hasOverview: boolean,
  hasFooterBox: boolean
): QuotationServiceItem[][] {
  if (services.length === 0) return [[]];
  if (services.length <= 4) {
    const totalPoints = services.reduce((sum, s) => sum + s.scopePoints.length, 0);
    if (totalPoints <= 16) return [services];
  }
  const pages: QuotationServiceItem[][] = [];
  let current: QuotationServiceItem[] = [];
  let weight = hasOverview ? 2 : 0;
  const maxWeightPerPage = hasFooterBox ? 18 : 20;

  services.forEach((svc) => {
    const itemWeight = 2 + (svc.description ? 1.5 : 0) + Math.max(1, svc.scopePoints.length);
    if (current.length > 0 && weight + itemWeight > maxWeightPerPage) {
      pages.push(current);
      current = [svc];
      weight = itemWeight;
    } else {
      current.push(svc);
      weight += itemWeight;
    }
  });

  if (current.length > 0) {
    pages.push(current);
  }
  return pages;
}

export const QuotationDocumentView: React.FC<QuotationDocumentViewProps> = ({
  quotation,
  settings,
}) => {
  const [logoError, setLogoError] = useState(false);

  const hasBankDetails =
    settings.bankDetails &&
    Boolean(
      settings.bankDetails.bankName ||
        settings.bankDetails.accountNumber ||
        settings.bankDetails.ifscCode ||
        settings.bankDetails.upiId
    );

  const cleanTerms = quotation.terms.map((t) => t.trim()).filter(Boolean);
  const cleanDeliverables = (quotation.deliverables || []).map((d) => d.trim()).filter(Boolean);
  const cleanArrangements = (quotation.customerArrangements || [])
    .map((c) => c.trim())
    .filter(Boolean);
  const hasFooterBox = cleanDeliverables.length > 0 || cleanArrangements.length > 0;

  const scopePages = useMemo(
    () =>
      splitScopePages(
        quotation.services,
        Boolean(quotation.scopeOverview && quotation.scopeOverview.trim()),
        hasFooterBox
      ),
    [quotation.services, quotation.scopeOverview, hasFooterBox]
  );

  // Minimum 3 pages (Page 1 + Scope Page 2 + Final Page 3), Max 4 pages (Page 1 + Scope Pages 2-3 + Final Page 4)
  const totalPages = 1 + scopePages.length + 1;

  const footerLeftText = [
    settings.companyName || 'TM INDUSTRIAL SOLUTION',
    settings.phone,
    settings.email,
    settings.website ? settings.website.replace(/^https?:\/\//i, '') : '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  const renderPageFooter = (pageNum: number) => (
    <div className="px-8 py-3 bg-[#F4F6F9] border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 mt-auto">
      <span>{footerLeftText}</span>
      <span className="font-semibold text-[#071D36]">
        Page {pageNum} of {totalPages}
      </span>
    </div>
  );

  const renderContinuationHeader = (sectionTitle: string) => (
    <div className="bg-[#071D36] text-white relative">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#F5B51B]" />
      <div className="px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold tracking-wide">
          {settings.companyName || 'TM INDUSTRIAL SOLUTION'}
        </span>
        <span className="text-slate-300 font-mono text-[11px]">
          {sectionTitle} · {quotation.quotationNumber} · {formatDateDisplay(quotation.quotationDate)}
        </span>
      </div>
      <div className="h-1 bg-[#F5B51B] w-full" />
    </div>
  );

  let runningScopeIndex = 0;

  return (
    <div className="space-y-6 max-w-[850px] mx-auto text-[13px] leading-relaxed text-[#071D36]">
      {/* ================================================================= */}
      {/* PAGE 1: COMPANY & CUSTOMER INFORMATION                            */}
      {/* ================================================================= */}
      <article className="bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden flex flex-col min-h-[1040px]">
        {/* Executive Navy Letterhead */}
        <header className="bg-[#071D36] text-white relative">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#F5B51B]" />
          <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              {!logoError && (
                <img
                  src={settings.logoUrl || DEFAULT_LOGO_PATH}
                  alt={settings.companyName}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="h-11 w-auto object-contain mb-2"
                />
              )}
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                {settings.companyName || 'TM INDUSTRIAL SOLUTION'}
              </h1>
              <p className="text-[10px] font-semibold tracking-widest text-[#F5B51B] uppercase mt-0.5">
                {settings.tagline || 'THE INTELLIGENCE BEHIND RELIABLE MACHINES.'}
              </p>
            </div>

            <div className="text-left sm:text-right text-slate-200 space-y-0.5 text-xs">
              {settings.contactPerson && (
                <p className="font-medium text-white">Contact: {settings.contactPerson}</p>
              )}
              {settings.phone && <p>Phone: {settings.phone}</p>}
              {settings.email && <p>Email: {settings.email}</p>}
              {settings.website && (
                <p>Web: {settings.website.replace(/^https?:\/\//i, '')}</p>
              )}
              {settings.gstin && (
                <p className="font-mono text-[#F5B51B]">GSTIN: {settings.gstin}</p>
              )}
              {settings.address && (
                <p className="text-slate-300 max-w-xs sm:ml-auto">{settings.address}</p>
              )}
            </div>
          </div>
          <div className="h-1 bg-[#F5B51B] w-full" />
        </header>

        <div className="p-8 space-y-6 flex-1 flex flex-col">
          {/* Title & Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-[#F5B51B] uppercase">
                Techno-Commercial Proposal
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#071D36] mt-0.5">
                QUOTATION
              </h2>
              <div className="w-14 h-1 bg-[#F5B51B] mt-1.5" />
            </div>

            <div className="grid grid-cols-3 bg-[#F4F6F9] border border-slate-200 rounded-lg divide-x divide-slate-200">
              <div className="px-4 py-2.5">
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                  Quotation No.
                </p>
                <p className="font-mono font-bold text-[#071D36] mt-0.5 whitespace-nowrap">
                  {quotation.quotationNumber || '—'}
                </p>
              </div>
              <div className="px-4 py-2.5">
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                  Quotation Date
                </p>
                <p className="font-mono font-semibold text-[#071D36] mt-0.5 whitespace-nowrap">
                  {formatDateDisplay(quotation.quotationDate)}
                </p>
              </div>
              <div className="px-4 py-2.5">
                <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                  Valid Until
                </p>
                <p className="font-mono font-semibold text-[#071D36] mt-0.5 whitespace-nowrap">
                  {formatDateDisplay(quotation.validUntil)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info + Reference Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7 border border-slate-200 rounded-lg p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F5B51B]" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Customer Information
              </p>
              <p className="text-base font-bold text-[#071D36]">
                {quotation.customer.companyName || 'Customer Name Not Entered'}
              </p>
              {quotation.customer.address && (
                <p className="text-slate-600 mt-1 whitespace-pre-line">
                  {quotation.customer.address}
                </p>
              )}
              <div className="mt-3 space-y-1 text-slate-700 text-xs">
                {quotation.customer.contactPerson && (
                  <p>
                    <span className="font-semibold text-slate-500">Contact Person:</span>{' '}
                    {quotation.customer.contactPerson}
                    {quotation.customer.designation ? ` (${quotation.customer.designation})` : ''}
                  </p>
                )}
                {quotation.customer.phone && (
                  <p>
                    <span className="font-semibold text-slate-500">Phone:</span>{' '}
                    {quotation.customer.phone}
                  </p>
                )}
                {quotation.customer.email && (
                  <p>
                    <span className="font-semibold text-slate-500">Email:</span>{' '}
                    {quotation.customer.email}
                  </p>
                )}
                {(quotation.customer.gstin || quotation.customer.state) && (
                  <p className="font-mono text-[11px] pt-0.5">
                    {[
                      quotation.customer.gstin ? `GSTIN: ${quotation.customer.gstin}` : '',
                      quotation.customer.state ? `State: ${quotation.customer.state}` : '',
                    ]
                      .filter(Boolean)
                      .join('  ·  ')}
                  </p>
                )}
              </div>
            </div>

            <div className="md:col-span-5 border border-slate-200 rounded-lg p-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#071D36]" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Reference &amp; Proposal Details
              </p>
              <dl className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Reference No.</dt>
                  <dd className="font-semibold text-[#071D36] text-right">
                    {quotation.referenceNumber || 'Direct Enquiry'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Prepared By</dt>
                  <dd className="font-semibold text-[#071D36] text-right">
                    {quotation.preparedBy || settings.contactPerson || 'Rinkesh Patel'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Currency</dt>
                  <dd className="font-medium text-[#071D36] text-right">Indian Rupees (INR)</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Tax Regime</dt>
                  <dd className="font-medium text-[#071D36] text-right">
                    {quotation.gstEnabled ? 'GST Applicable' : 'Without GST'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Scope Items</dt>
                  <dd className="font-medium text-[#071D36] text-right">
                    {quotation.services.length} Section(s)
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Subject Line */}
          <div className="bg-[#F4F6F9] border border-slate-200 rounded-lg px-4 py-3 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#071D36]" />
            <span className="font-bold text-[#071D36] mr-2 text-xs uppercase tracking-wider">
              Subject:
            </span>
            <span className="font-bold text-slate-800">
              {quotation.subject || 'Industrial Reliability & Condition Monitoring Services'}
            </span>
          </div>

          {/* Company Introduction */}
          {quotation.companyIntro && quotation.companyIntro.trim().length > 0 && (
            <section>
              <div className="mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                  About {settings.companyName || 'TM Industrial Solution'}
                </h3>
                <div className="flex items-center mt-1">
                  <div className="w-12 h-0.5 bg-[#F5B51B]" />
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              </div>
              <div className="text-slate-700 whitespace-pre-line space-y-2.5">
                {quotation.companyIntro}
              </div>
            </section>
          )}

          {/* Proposal Contents Index at bottom of Page 1 */}
          <div className="mt-auto pt-6">
            <div className="bg-[#F4F6F9] border border-slate-200 rounded-lg p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#071D36]">
                Proposal Contents
              </p>
              <div className="w-10 h-0.5 bg-[#F5B51B] mt-1 mb-3" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-[#F5B51B]">SECTION 01</p>
                  <p className="text-xs font-bold text-[#071D36] mt-0.5">Company &amp; Client Overview</p>
                  <p className="text-[11px] text-slate-500">Page 1 · Identification &amp; Reference</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#F5B51B]">SECTION 02</p>
                  <p className="text-xs font-bold text-[#071D36] mt-0.5">Technical Scope of Work</p>
                  <p className="text-[11px] text-slate-500">
                    {scopePages.length > 1 ? 'Pages 2–3' : 'Page 2'} · Methodology &amp; Deliverables
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#F5B51B]">SECTION 03</p>
                  <p className="text-xs font-bold text-[#071D36] mt-0.5">Commercial Offer &amp; Terms</p>
                  <p className="text-[11px] text-slate-500">
                    Page {totalPages} · Pricing, GST &amp; Signatory
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {renderPageFooter(1)}
      </article>

      {/* ================================================================= */}
      {/* PAGE 2 (AND PAGE 3 IF NEEDED): SCOPE OF WORK                      */}
      {/* ================================================================= */}
      {scopePages.map((pageServices, pageIdx) => {
        const isFirstScopePage = pageIdx === 0;
        const isLastScopePage = pageIdx === scopePages.length - 1;
        const pageNumber = 2 + pageIdx;

        return (
          <article
            key={`scope-page-${pageIdx}`}
            className="bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden flex flex-col min-h-[1040px]"
          >
            {renderContinuationHeader(
              isFirstScopePage ? 'TECHNICAL SCOPE OF WORK' : 'TECHNICAL SCOPE OF WORK (CONTINUED)'
            )}

            <div className="p-8 space-y-5 flex-1">
              {isFirstScopePage && (
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#F5B51B] uppercase">
                    Technical Proposal / Scope of Work
                  </p>
                  <h2 className="text-2xl font-extrabold text-[#071D36] mt-1">Scope of Work</h2>
                  {quotation.scopeOverview && quotation.scopeOverview.trim() && (
                    <p className="text-slate-600 mt-1.5 leading-relaxed">
                      {quotation.scopeOverview}
                    </p>
                  )}
                </div>
              )}

              {pageServices.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-400">
                  Add numbered Scope of Work items in Section D to display them here.
                </div>
              ) : (
                <div className="space-y-4">
                  {pageServices.map((svc) => {
                    runningScopeIndex += 1;
                    const numStr = String(runningScopeIndex).padStart(2, '0');
                    const validPoints = svc.scopePoints.map((p) => p.trim()).filter(Boolean);
                    return (
                      <div
                        key={svc.id || numStr}
                        className="border border-slate-200 bg-white relative overflow-hidden"
                      >
                        {/* Signature Gold Vertical Accent Bar (Reference Image 2) */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F5B51B]" />

                        <div className="bg-[#F4F6F9] border-b border-slate-200 px-4 py-2.5 pl-5 flex items-baseline gap-2.5">
                          <span className="font-mono font-extrabold text-sm text-[#F5B51B]">
                            {numStr}
                          </span>
                          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#071D36]">
                            {svc.title || 'Scope Item'}
                          </h3>
                        </div>

                        <div className="px-5 py-3.5 space-y-2.5">
                          {svc.description && svc.description.trim() && (
                            <p className="text-slate-700 leading-relaxed">{svc.description}</p>
                          )}

                          {validPoints.length > 0 && (
                            <ul className="space-y-1.5 pl-1">
                              {validPoints.map((pt, pIdx) => (
                                <li key={pIdx} className="flex items-start gap-2.5 text-slate-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#071D36] mt-2 shrink-0" />
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Deliverables & Customer-Side Arrangements Box at bottom of last scope page */}
              {isLastScopePage && hasFooterBox && (
                <div className="pt-2">
                  <div className="border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 bg-[#071D36] text-white divide-y sm:divide-y-0 sm:divide-x divide-white/20">
                      <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider">
                        Deliverables
                      </div>
                      <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider">
                        Customer-Side Arrangements
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white">
                      <div className="p-4">
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {cleanDeliverables.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-[#F5B51B] mt-1.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-4">
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {cleanArrangements.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-[#F5B51B] mt-1.5 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {renderPageFooter(pageNumber)}
          </article>
        );
      })}

      {/* ================================================================= */}
      {/* FINAL PAGE: PRICING, TERMS & CONDITIONS & SIGNATORY               */}
      {/* ================================================================= */}
      <article className="bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden flex flex-col min-h-[1040px]">
        {renderContinuationHeader('COMMERCIAL OFFER & TERMS')}

        <div className="p-8 space-y-5 flex-1 flex flex-col">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#F5B51B] uppercase">
              Commercial Proposal
            </p>
            <h2 className="text-2xl font-extrabold text-[#071D36] mt-0.5">
              Commercial Offer &amp; Terms
            </h2>
          </div>

          {/* Pricing Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#071D36] text-white text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-2.5 text-center w-9">Sr.</th>
                  <th className="py-2.5 px-2.5">Service / Description</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Unit Price</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-center">Type</th>
                  {quotation.gstEnabled && (
                    <>
                      <th className="py-2.5 px-2 text-center">GST %</th>
                      <th className="py-2.5 px-2.5 text-right whitespace-nowrap">GST Amt</th>
                    </>
                  )}
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {quotation.pricingItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={quotation.gstEnabled ? 8 : 6}
                      className="py-6 text-center text-slate-400"
                    >
                      Add commercial pricing line items to preview totals.
                    </td>
                  </tr>
                ) : (
                  quotation.pricingItems.map((item, idx) => (
                    <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-2.5 font-medium text-slate-800">
                        {item.description || 'Service Item'}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                        {formatINR(item.unitPrice)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap text-slate-600">
                        {item.unitType}
                      </td>
                      {quotation.gstEnabled && (
                        <>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                            {item.gstRate}%
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                            {formatINR(item.gstAmount)}
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold tabular-nums text-[#071D36] whitespace-nowrap">
                        {formatINR(item.totalAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary & Amount in Words */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-6 space-y-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Amount in Words
                </p>
                <p className="font-semibold text-slate-800 mt-0.5 text-xs">
                  {numberToIndianWords(quotation.grandTotal)}
                </p>
              </div>
              <p className="text-xs text-slate-600">
                <span className="font-bold text-[#071D36]">Quotation Validity:</span> Valid until{' '}
                {formatDateDisplay(quotation.validUntil)}
              </p>
            </div>

            <div className="md:col-span-6 border border-slate-200 rounded-lg overflow-hidden text-xs">
              <div className="flex justify-between px-3.5 py-2 bg-[#F4F6F9] border-b border-slate-200">
                <span className="text-slate-600">Subtotal (Taxable Value)</span>
                <span className="font-mono font-semibold tabular-nums">
                  {formatINR(quotation.subtotal)}
                </span>
              </div>
              {quotation.gstEnabled && (
                <div className="flex justify-between px-3.5 py-2 bg-[#F4F6F9] border-b border-slate-200">
                  <span className="text-slate-600">Total GST</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {formatINR(quotation.totalGst)}
                  </span>
                </div>
              )}
              <div className="flex justify-between px-3.5 py-2.5 bg-[#071D36] text-white">
                <span className="font-bold">GRAND TOTAL</span>
                <span className="font-mono font-bold tabular-nums text-[#F5B51B]">
                  {formatINR(quotation.grandTotal)}
                </span>
              </div>
              {(quotation.advanceAmount || 0) > 0 && (
                <>
                  <div className="flex justify-between px-3.5 py-1.5 bg-white border-t border-slate-200 text-slate-700">
                    <span>Advance Payable</span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatINR(quotation.advanceAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between px-3.5 py-1.5 bg-white border-t border-slate-200 font-semibold text-[#071D36]">
                    <span>Balance Payable</span>
                    <span className="font-mono tabular-nums">
                      {formatINR(quotation.balanceAmount)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Terms & Bank Details */}
          {(quotation.paymentTerms?.trim() || hasBankDetails) && (
            <section className="space-y-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                  Payment Terms &amp; Remittance
                </h3>
                <div className="flex items-center mt-1">
                  <div className="w-12 h-0.5 bg-[#F5B51B]" />
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              </div>
              {quotation.paymentTerms?.trim() && (
                <p className="text-xs text-slate-700 whitespace-pre-line">
                  {quotation.paymentTerms}
                </p>
              )}
              {hasBankDetails && (
                <div className="bg-[#F4F6F9] border border-slate-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  {settings.bankDetails.accountName && (
                    <p>
                      <span className="text-slate-500">Account Name:</span>{' '}
                      <span className="font-semibold text-[#071D36]">
                        {settings.bankDetails.accountName}
                      </span>
                    </p>
                  )}
                  {settings.bankDetails.bankName && (
                    <p>
                      <span className="text-slate-500">Bank Name:</span>{' '}
                      <span className="font-semibold text-[#071D36]">
                        {settings.bankDetails.bankName}
                      </span>
                    </p>
                  )}
                  {settings.bankDetails.accountNumber && (
                    <p>
                      <span className="text-slate-500">Account No.:</span>{' '}
                      <span className="font-mono font-semibold text-[#071D36]">
                        {settings.bankDetails.accountNumber}
                      </span>
                    </p>
                  )}
                  {settings.bankDetails.ifscCode && (
                    <p>
                      <span className="text-slate-500">IFSC Code:</span>{' '}
                      <span className="font-mono font-semibold text-[#071D36]">
                        {settings.bankDetails.ifscCode}
                      </span>
                    </p>
                  )}
                  {settings.bankDetails.branch && (
                    <p>
                      <span className="text-slate-500">Branch:</span>{' '}
                      <span className="font-semibold text-[#071D36]">
                        {settings.bankDetails.branch}
                      </span>
                    </p>
                  )}
                  {settings.bankDetails.upiId && (
                    <p>
                      <span className="text-slate-500">UPI ID:</span>{' '}
                      <span className="font-mono font-semibold text-[#071D36]">
                        {settings.bankDetails.upiId}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Other Commercial Notes */}
          {quotation.commercialNotes && quotation.commercialNotes.trim() && (
            <section className="space-y-1.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                  Commercial Notes
                </h3>
                <div className="flex items-center mt-1">
                  <div className="w-12 h-0.5 bg-[#F5B51B]" />
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              </div>
              <p className="text-xs text-slate-700 whitespace-pre-line">
                {quotation.commercialNotes}
              </p>
            </section>
          )}

          {/* Terms & Conditions */}
          {cleanTerms.length > 0 && (
            <section className="space-y-1.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#071D36]">
                  Terms &amp; Conditions
                </h3>
                <div className="flex items-center mt-1">
                  <div className="w-12 h-0.5 bg-[#F5B51B]" />
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              </div>
              <ol className="space-y-1 text-xs text-slate-700 list-decimal pl-5">
                {cleanTerms.map((term, i) => (
                  <li key={i} className="pl-1">
                    {term}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Closing Statement & Signatory */}
          <footer className="mt-auto pt-4 border-t border-slate-200 space-y-4">
            <p className="text-xs text-slate-700">
              We look forward to your valuable association and assure you of our best technical
              support and services.
            </p>
            <div>
              <p className="text-xs font-bold text-[#071D36]">
                For {settings.companyName || 'TM INDUSTRIAL SOLUTION'}
              </p>
              <div className="w-40 border-b border-slate-400 mt-9 mb-1.5" />
              <p className="text-sm font-bold text-[#071D36]">
                {settings.signatoryName || settings.contactPerson || 'Rinkesh Patel'}
              </p>
              <p className="text-xs text-slate-500">
                {settings.signatoryTitle || 'Authorized Signatory'}
              </p>
            </div>
          </footer>
        </div>

        {renderPageFooter(totalPages)}
      </article>
    </div>
  );
};
