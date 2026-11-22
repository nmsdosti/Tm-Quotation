import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings, Quotation, QuotationServiceItem } from '../types/quotation';
import { formatDateDisplay, formatINR, numberToIndianWords } from './formatters';

const NAVY: [number, number, number] = [7, 29, 54]; // #071D36
const NAVY_MID: [number, number, number] = [18, 52, 92];
const YELLOW: [number, number, number] = [245, 181, 27]; // #F5B51B
const SLATE_DARK: [number, number, number] = [30, 41, 59];
const SLATE_MUTED: [number, number, number] = [100, 116, 139];
const BORDER_LIGHT: [number, number, number] = [226, 232, 240];
const SURFACE_TINT: [number, number, number] = [244, 246, 249];
const WHITE: [number, number, number] = [255, 255, 255];

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: 'PNG' | 'JPEG';
}

async function loadImageForPdf(url: string): Promise<LoadedImage | null> {
  if (!url) return null;
  try {
    return await new Promise<LoadedImage | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 400;
          canvas.height = img.naturalHeight || 120;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve({
            dataUrl,
            width: canvas.width,
            height: canvas.height,
            format: 'PNG',
          });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

export async function generateQuotationPdfDoc(
  quotation: Quotation,
  settings: CompanySettings
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2; // 180mm
  const footerReserved = 16;
  const maxBodyY = pageHeight - footerReserved - 4; // 277mm

  const logoImage = await loadImageForPdf(settings.logoUrl);

  const drawContinuationHeader = (sectionLabel: string) => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 13, 'F');
    doc.setFillColor(...YELLOW);
    doc.rect(0, 13, pageWidth, 1.4, 'F');
    doc.setFillColor(...YELLOW);
    doc.rect(0, 0, 3, 13, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE);
    doc.text(settings.companyName || 'TM INDUSTRIAL SOLUTION', marginX, 8.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(215, 224, 236);
    doc.text(
      `${sectionLabel}   |   ${quotation.quotationNumber}   |   ${formatDateDisplay(quotation.quotationDate)}`,
      pageWidth - marginX,
      8.2,
      { align: 'right' }
    );
  };

  // =========================================================================
  // PAGE 1: COMPANY & CUSTOMER INFORMATION
  // =========================================================================
  const headerHeight = 38;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  doc.setFillColor(...YELLOW);
  doc.rect(0, headerHeight, pageWidth, 2.2, 'F');
  doc.setFillColor(...YELLOW);
  doc.rect(0, 0, 3.5, headerHeight, 'F');

  // Logo + Company Name + Tagline
  if (logoImage) {
    const maxLogoH = 15;
    const maxLogoW = 48;
    const ratio = logoImage.width / logoImage.height;
    let drawW = maxLogoH * ratio;
    let drawH = maxLogoH;
    if (drawW > maxLogoW) {
      drawW = maxLogoW;
      drawH = drawW / ratio;
    }
    doc.addImage(logoImage.dataUrl, logoImage.format, marginX, 6.5, drawW, drawH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...WHITE);
    doc.text(settings.companyName || 'TM INDUSTRIAL SOLUTION', marginX, 27.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...YELLOW);
    doc.text(
      (settings.tagline || 'THE INTELLIGENCE BEHIND RELIABLE MACHINES.').toUpperCase(),
      marginX,
      32.5
    );
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...WHITE);
    doc.text(settings.companyName || 'TM INDUSTRIAL SOLUTION', marginX, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...YELLOW);
    doc.text(
      (settings.tagline || 'THE INTELLIGENCE BEHIND RELIABLE MACHINES.').toUpperCase(),
      marginX,
      23.5
    );
  }

  // Right-aligned Company Contact Information
  const contactLines: string[] = [];
  if (settings.contactPerson) contactLines.push(`Contact: ${settings.contactPerson}`);
  if (settings.phone) contactLines.push(`Phone: ${settings.phone}`);
  if (settings.email) contactLines.push(`Email: ${settings.email}`);
  if (settings.website) contactLines.push(`Web: ${settings.website.replace(/^https?:\/\//i, '')}`);
  if (settings.gstin) contactLines.push(`GSTIN: ${settings.gstin}`);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(235, 241, 248);
  let contactY = 9;
  contactLines.slice(0, 5).forEach((line) => {
    doc.text(line, pageWidth - marginX, contactY, { align: 'right' });
    contactY += 4.7;
  });

  if (settings.address) {
    const addrLines = doc.splitTextToSize(settings.address, 86);
    doc.setFontSize(7.2);
    doc.setTextColor(198, 211, 226);
    doc.text(addrLines[0] || '', pageWidth - marginX, 34.2, { align: 'right' });
  }

  let cursorY = headerHeight + 12;

  // Document Title & Quotation Metadata Strip
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...YELLOW);
  doc.text('TECHNO-COMMERCIAL PROPOSAL', marginX, cursorY - 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...NAVY);
  doc.text('QUOTATION', marginX, cursorY + 5);

  doc.setFillColor(...YELLOW);
  doc.rect(marginX, cursorY + 7.5, 24, 1.4, 'F');

  const metaBoxW = 104;
  const metaBoxX = pageWidth - marginX - metaBoxW;
  const metaBoxY = cursorY - 5.5;
  doc.setFillColor(...SURFACE_TINT);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.35);
  doc.roundedRect(metaBoxX, metaBoxY, metaBoxW, 16, 1.5, 1.5, 'FD');

  const colW = metaBoxW / 3;
  const drawMetaCell = (label: string, val: string, index: number) => {
    const x = metaBoxX + index * colW + 3.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...SLATE_MUTED);
    doc.text(label.toUpperCase(), x, metaBoxY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...NAVY);
    doc.text(val || '—', x, metaBoxY + 11.8);
  };

  drawMetaCell('Quotation No.', quotation.quotationNumber, 0);
  drawMetaCell('Quotation Date', formatDateDisplay(quotation.quotationDate), 1);
  drawMetaCell('Valid Until', formatDateDisplay(quotation.validUntil), 2);

  cursorY += 18;

  // Customer Information Card & Basic Quotation / Reference Details Card
  const customerBoxY = cursorY;
  const leftColW = 108;
  const rightColX = marginX + leftColW + 6;
  const rightColW = contentWidth - leftColW - 6;

  const cust = quotation.customer;
  const addressLines = cust.address ? doc.splitTextToSize(cust.address, leftColW - 9) : [];
  const leftMetaLines: string[] = [];
  if (cust.contactPerson) {
    leftMetaLines.push(
      `Contact Person: ${cust.contactPerson}${cust.designation ? ` (${cust.designation})` : ''}`
    );
  }
  if (cust.phone) leftMetaLines.push(`Phone: ${cust.phone}`);
  if (cust.email) leftMetaLines.push(`Email: ${cust.email}`);
  const gstState = [
    cust.gstin ? `GSTIN: ${cust.gstin}` : '',
    cust.state ? `State: ${cust.state}` : '',
  ]
    .filter(Boolean)
    .join('   |   ');
  if (gstState) leftMetaLines.push(gstState);

  const measuredLeftH = 16 + addressLines.length * 4.2 + leftMetaLines.length * 4.8 + 4;
  const boxHeight = Math.max(40, measuredLeftH);

  doc.setFillColor(...WHITE);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.35);
  doc.roundedRect(marginX, customerBoxY, leftColW, boxHeight, 1.5, 1.5, 'FD');
  doc.roundedRect(rightColX, customerBoxY, rightColW, boxHeight, 1.5, 1.5, 'FD');

  // Subtle gold left edge on Customer box
  doc.setFillColor(...YELLOW);
  doc.rect(marginX, customerBoxY, 1.5, boxHeight, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(rightColX, customerBoxY, 1.5, boxHeight, 'F');

  // Left Box Content: Customer Information
  let ly = customerBoxY + 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...SLATE_MUTED);
  doc.text('CUSTOMER INFORMATION', marginX + 5.5, ly);
  ly += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  const compLines = doc.splitTextToSize(cust.companyName || 'Valued Customer', leftColW - 10);
  doc.text(compLines[0], marginX + 5.5, ly);
  ly += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_DARK);
  addressLines.forEach((line: string) => {
    doc.text(line, marginX + 5.5, ly);
    ly += 4.2;
  });
  if (addressLines.length > 0) ly += 1.2;

  leftMetaLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, leftColW - 10);
    wrapped.forEach((w: string) => {
      doc.text(w, marginX + 5.5, ly);
      ly += 4.5;
    });
  });

  // Right Box Content: Quotation & Reference Details
  let ry = customerBoxY + 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...SLATE_MUTED);
  doc.text('REFERENCE & PROPOSAL DETAILS', rightColX + 5.5, ry);
  ry += 6;

  const proposalRows: [string, string][] = [
    ['Reference No.', quotation.referenceNumber || 'Direct Enquiry'],
    ['Prepared By', quotation.preparedBy || settings.contactPerson || 'Rinkesh Patel'],
    ['Contact Phone', settings.phone || '—'],
    ['Currency', 'Indian Rupees (INR)'],
    ['Tax Regime', quotation.gstEnabled ? 'GST Applicable' : 'Without GST'],
    ['Total Services', `${quotation.services.length} Scope Item(s)`],
  ];

  proposalRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.9);
    doc.setTextColor(...SLATE_MUTED);
    doc.text(`${label}:`, rightColX + 5.5, ry);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE_DARK);
    const valClip = doc.splitTextToSize(val, rightColW - 28)[0] || '';
    doc.text(valClip, rightColX + 27, ry);
    ry += 5;
  });

  cursorY = customerBoxY + boxHeight + 8;

  // Subject Band
  const subjectLines = doc.splitTextToSize(
    quotation.subject || 'Industrial Condition Monitoring & Reliability Services',
    contentWidth - 28
  );
  const subjectBoxH = Math.max(12, subjectLines.length * 4.8 + 6);
  doc.setFillColor(...SURFACE_TINT);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.roundedRect(marginX, cursorY, contentWidth, subjectBoxH, 1.5, 1.5, 'FD');
  doc.setFillColor(...NAVY);
  doc.rect(marginX, cursorY, 2.5, subjectBoxH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text('SUBJECT:', marginX + 6, cursorY + 6.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_DARK);
  doc.text(subjectLines, marginX + 25, cursorY + 6.8);

  cursorY += subjectBoxH + 10;

  // About Company Section on Page 1
  if (quotation.companyIntro && quotation.companyIntro.trim().length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(`ABOUT ${(settings.companyName || 'TM INDUSTRIAL SOLUTION').toUpperCase()}`, marginX, cursorY);

    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.9);
    doc.line(marginX, cursorY + 2, marginX + 26, cursorY + 2);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.3);
    doc.line(marginX + 26, cursorY + 2, pageWidth - marginX, cursorY + 2);
    cursorY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(...SLATE_DARK);
    const paragraphs = quotation.companyIntro
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    paragraphs.forEach((para) => {
      const wrapped = doc.splitTextToSize(para, contentWidth);
      if (cursorY + wrapped.length * 4.8 < maxBodyY - 34) {
        doc.text(wrapped, marginX, cursorY);
        cursorY += wrapped.length * 4.8 + 4;
      }
    });
  }

  // Proposal Structure Summary Box near bottom of Page 1
  const summaryStripY = Math.max(cursorY + 6, pageHeight - 60);
  if (summaryStripY + 34 < pageHeight - footerReserved) {
    doc.setFillColor(...SURFACE_TINT);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.35);
    doc.roundedRect(marginX, summaryStripY, contentWidth, 32, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text('PROPOSAL CONTENTS', marginX + 5, summaryStripY + 6.5);

    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.7);
    doc.line(marginX + 5, summaryStripY + 8.5, marginX + 35, summaryStripY + 8.5);

    const blocks = [
      { num: 'SECTION 01', title: 'Company & Client Overview', sub: 'Page 1 · Identification & Reference' },
      { num: 'SECTION 02', title: 'Technical Scope of Work', sub: 'Page 2 · Methodology & Deliverables' },
      { num: 'SECTION 03', title: 'Commercial Offer & Terms', sub: 'Final Page · Pricing, GST & Signatory' },
    ];
    const blockW = (contentWidth - 10) / 3;
    blocks.forEach((b, i) => {
      const bx = marginX + 5 + i * blockW;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(...YELLOW);
      doc.text(b.num, bx, summaryStripY + 14.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(...NAVY);
      doc.text(b.title, bx, summaryStripY + 19.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...SLATE_MUTED);
      doc.text(b.sub, bx, summaryStripY + 25);
    });
  }

  // =========================================================================
  // PAGE 2 (AND PAGE 3 IF NEEDED): SCOPE OF WORK
  // =========================================================================
  doc.addPage();
  drawContinuationHeader('TECHNICAL SCOPE OF WORK');
  cursorY = 23;

  // Scope Page Header matching reference Image 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...YELLOW);
  doc.text('TECHNICAL PROPOSAL / SCOPE OF WORK', marginX, cursorY);
  cursorY += 7.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text('Scope of Work', marginX, cursorY);
  cursorY += 5.5;

  if (quotation.scopeOverview && quotation.scopeOverview.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(...SLATE_MUTED);
    const overviewLines = doc.splitTextToSize(quotation.scopeOverview.trim(), contentWidth);
    doc.text(overviewLines, marginX, cursorY);
    cursorY += overviewLines.length * 4.3 + 4.5;
  } else {
    cursorY += 2.5;
  }

  // Helper to measure a structured Scope Card (matching Image 2)
  const measureScopeCard = (svc: QuotationServiceItem, compactMode: boolean) => {
    const headerH = compactMode ? 7.5 : 8.5;
    const descFont = compactMode ? 8 : 8.5;
    const bulletFont = compactMode ? 7.9 : 8.4;
    const lineH = compactMode ? 3.8 : 4.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(descFont);
    const descLines =
      svc.description && svc.description.trim()
        ? doc.splitTextToSize(svc.description.trim(), contentWidth - 11)
        : [];

    doc.setFontSize(bulletFont);
    const points = svc.scopePoints.map((p) => p.trim()).filter(Boolean);
    const wrappedPoints = points.map((pt) => doc.splitTextToSize(pt, contentWidth - 15));

    let bodyH = compactMode ? 3 : 4;
    if (descLines.length > 0) {
      bodyH += descLines.length * lineH + (compactMode ? 2.5 : 3.5);
    }
    wrappedPoints.forEach((wp) => {
      bodyH += wp.length * lineH + (compactMode ? 1 : 1.4);
    });
    bodyH += compactMode ? 2.5 : 3.5;

    return {
      totalH: headerH + bodyH,
      headerH,
      descLines,
      wrappedPoints,
      descFont,
      bulletFont,
      lineH,
    };
  };

  // Estimate if we should use compact spacing to guarantee Scope stays within max 2 pages (Pages 2 & 3)
  const normalTotalScopeH = quotation.services.reduce(
    (sum, s) => sum + measureScopeCard(s, false).totalH + 5,
    0
  );
  const useCompactScope = normalTotalScopeH > 430;
  const cardGap = useCompactScope ? 3.5 : 5;
  let scopePageCount = 1; // Currently on Page 2 (first scope page)

  if (quotation.services.length === 0) {
    doc.setFillColor(...SURFACE_TINT);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.roundedRect(marginX, cursorY, contentWidth, 24, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_MUTED);
    doc.text(
      'Scope of work items will appear here as configured in the quotation.',
      marginX + 6,
      cursorY + 13
    );
    cursorY += 30;
  } else {
    quotation.services.forEach((svc, idx) => {
      const m = measureScopeCard(svc, useCompactScope);

      // Automatically break to Page 3 (second scope page) when card does not fit on Page 2
      if (cursorY + m.totalH > maxBodyY && scopePageCount < 2) {
        doc.addPage();
        scopePageCount += 1;
        drawContinuationHeader('TECHNICAL SCOPE OF WORK (CONTINUED)');
        cursorY = 22;
      }

      const cardY = cursorY;

      // Outer white card with subtle border
      doc.setFillColor(...WHITE);
      doc.setDrawColor(...BORDER_LIGHT);
      doc.setLineWidth(0.32);
      doc.rect(marginX, cardY, contentWidth, m.totalH, 'FD');

      // Soft light grey card title header strip
      doc.setFillColor(...SURFACE_TINT);
      doc.rect(marginX + 1.4, cardY + 0.15, contentWidth - 1.55, m.headerH, 'F');

      // Bottom hairline under header strip
      doc.setDrawColor(...BORDER_LIGHT);
      doc.setLineWidth(0.25);
      doc.line(marginX + 1.4, cardY + m.headerH, marginX + contentWidth, cardY + m.headerH);

      // Signature Gold vertical bar along left edge of card (exact Image 2 design!)
      doc.setFillColor(...YELLOW);
      doc.rect(marginX, cardY, 1.4, m.totalH, 'F');

      // Gold 01 / 02 / 03 number + Bold Navy uppercase title
      const numStr = String(idx + 1).padStart(2, '0');
      const titleBaselineY = cardY + m.headerH - (useCompactScope ? 2.2 : 2.6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(useCompactScope ? 9.5 : 10.2);
      doc.setTextColor(...YELLOW);
      doc.text(numStr, marginX + 4.5, titleBaselineY);

      doc.setTextColor(...NAVY);
      doc.text((svc.title || 'SCOPE ITEM').toUpperCase(), marginX + 11.5, titleBaselineY);

      let innerY = cardY + m.headerH + (useCompactScope ? 4.8 : 5.5);

      // Description paragraph
      if (m.descLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(m.descFont);
        doc.setTextColor(...SLATE_DARK);
        doc.text(m.descLines, marginX + 4.5, innerY);
        innerY += m.descLines.length * m.lineH + (useCompactScope ? 2.2 : 3);
      }

      // Bullet points
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(m.bulletFont);
      doc.setTextColor(...SLATE_DARK);
      m.wrappedPoints.forEach((wp) => {
        doc.setFillColor(...NAVY);
        doc.circle(marginX + 6, innerY - 1.1, 0.55, 'F');
        doc.text(wp, marginX + 9.2, innerY);
        innerY += wp.length * m.lineH + (useCompactScope ? 1 : 1.4);
      });

      cursorY = cardY + m.totalH + cardGap;
    });
  }

  // Deliverables & Customer-Side Arrangements two-column box (bottom of Scope section, matching Image 2!)
  const cleanDeliverables = (quotation.deliverables || []).map((d) => d.trim()).filter(Boolean);
  const cleanArrangements = (quotation.customerArrangements || [])
    .map((c) => c.trim())
    .filter(Boolean);

  if (cleanDeliverables.length > 0 || cleanArrangements.length > 0) {
    const halfW = contentWidth / 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const delivWrapped = cleanDeliverables.map((d) => doc.splitTextToSize(d, halfW - 11));
    const arrWrapped = cleanArrangements.map((c) => doc.splitTextToSize(c, halfW - 11));

    const delivH = delivWrapped.reduce((s, w) => s + w.length * 3.8 + 1.4, 0);
    const arrH = arrWrapped.reduce((s, w) => s + w.length * 3.8 + 1.4, 0);
    const bodyBoxH = Math.max(12, Math.max(delivH, arrH) + 6);
    const totalTableH = 8 + bodyBoxH;

    if (cursorY + totalTableH > maxBodyY && scopePageCount < 2) {
      doc.addPage();
      scopePageCount += 1;
      drawContinuationHeader('TECHNICAL SCOPE OF WORK (CONTINUED)');
      cursorY = 22;
    }

    if (cursorY + totalTableH <= maxBodyY + 4) {
      const boxTopY = cursorY + 1;
      // Dark Navy header bar split into 2 columns
      doc.setFillColor(...NAVY);
      doc.rect(marginX, boxTopY, contentWidth, 8, 'F');
      doc.setDrawColor(...WHITE);
      doc.setLineWidth(0.35);
      doc.line(marginX + halfW, boxTopY, marginX + halfW, boxTopY + 8);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(...WHITE);
      doc.text('DELIVERABLES', marginX + 4.5, boxTopY + 5.3);
      doc.text('CUSTOMER-SIDE ARRANGEMENTS', marginX + halfW + 4.5, boxTopY + 5.3);

      // White bordered body
      doc.setFillColor(...WHITE);
      doc.setDrawColor(...BORDER_LIGHT);
      doc.setLineWidth(0.32);
      doc.rect(marginX, boxTopY + 8, contentWidth, bodyBoxH, 'FD');
      doc.line(marginX + halfW, boxTopY + 8, marginX + halfW, boxTopY + 8 + bodyBoxH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...SLATE_DARK);

      let dy = boxTopY + 13;
      delivWrapped.forEach((wp) => {
        doc.setFillColor(...YELLOW);
        doc.rect(marginX + 4.5, dy - 2, 1.3, 1.3, 'F');
        doc.text(wp, marginX + 8, dy);
        dy += wp.length * 3.8 + 1.4;
      });

      let ay = boxTopY + 13;
      arrWrapped.forEach((wp) => {
        doc.setFillColor(...YELLOW);
        doc.rect(marginX + halfW + 4.5, ay - 2, 1.3, 1.3, 'F');
        doc.text(wp, marginX + halfW + 8, ay);
        ay += wp.length * 3.8 + 1.4;
      });
    }
  }

  // =========================================================================
  // FINAL PAGE (PAGE 3 OR PAGE 4): PRICING, TERMS & CONDITIONS & SIGNATORY
  // =========================================================================
  doc.addPage();
  drawContinuationHeader('COMMERCIAL OFFER & TERMS');
  cursorY = 23;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...YELLOW);
  doc.text('COMMERCIAL PROPOSAL', marginX, cursorY);
  cursorY += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);
  doc.text('Commercial Offer & Terms', marginX, cursorY);
  cursorY += 5.5;

  // Pricing Table
  const tableHead = quotation.gstEnabled
    ? [['Sr.', 'Service / Description', 'Unit Price (INR)', 'Qty', 'Type', 'GST %', 'GST Amt (INR)', 'Total (INR)']]
    : [['Sr.', 'Service / Description', 'Unit Price (INR)', 'Qty', 'Type', 'Total (INR)']];

  const tableBody = quotation.pricingItems.map((item, idx) =>
    quotation.gstEnabled
      ? [
          String(idx + 1),
          item.description || 'Service Item',
          formatINR(item.unitPrice, false),
          String(item.quantity),
          item.unitType || 'Per Job',
          `${item.gstRate}%`,
          formatINR(item.gstAmount, false),
          formatINR(item.totalAmount, false),
        ]
      : [
          String(idx + 1),
          item.description || 'Service Item',
          formatINR(item.unitPrice, false),
          String(item.quantity),
          item.unitType || 'Per Job',
          formatINR(item.totalAmount, false),
        ]
  );

  const compactTable = quotation.pricingItems.length > 6 || quotation.terms.length > 9;

  autoTable(doc, {
    startY: cursorY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    margin: { left: marginX, right: marginX, top: 20, bottom: footerReserved + 4 },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: compactTable ? 7.6 : 8.1,
      cellPadding: compactTable
        ? { top: 2.2, right: 2.4, bottom: 2.2, left: 2.4 }
        : { top: 3, right: 2.8, bottom: 3, left: 2.8 },
      textColor: SLATE_DARK,
      lineColor: BORDER_LIGHT,
      lineWidth: 0.25,
      valign: 'middle',
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7.6,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 252],
    },
    columnStyles: quotation.gstEnabled
      ? {
          0: { halign: 'center', cellWidth: 9 },
          1: { halign: 'left', cellWidth: 52 },
          2: { halign: 'right', cellWidth: 26 },
          3: { halign: 'center', cellWidth: 11 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'center', cellWidth: 13 },
          6: { halign: 'right', cellWidth: 24 },
          7: { halign: 'right', cellWidth: 27, fontStyle: 'bold', textColor: NAVY },
        }
      : {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', cellWidth: 78 },
          2: { halign: 'right', cellWidth: 30 },
          3: { halign: 'center', cellWidth: 14 },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'right', cellWidth: 28, fontStyle: 'bold', textColor: NAVY },
        },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY) + 4.5;

  // Totals Summary Box + Amount in Words
  const hasAdvance = (quotation.advanceAmount || 0) > 0;
  const summaryW = 82;
  const summaryX = pageWidth - marginX - summaryW;
  let sy = cursorY;

  const drawSummaryRow = (label: string, value: string, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...NAVY);
      doc.rect(summaryX, sy, summaryW, 7.6, 'F');
      doc.setFillColor(...YELLOW);
      doc.rect(summaryX, sy, 2, 7.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(...WHITE);
      doc.text(label, summaryX + 4.5, sy + 5.1);
      doc.setTextColor(...YELLOW);
      doc.text(value, summaryX + summaryW - 3.2, sy + 5.1, { align: 'right' });
      sy += 7.6;
    } else {
      doc.setFillColor(...SURFACE_TINT);
      doc.setDrawColor(...BORDER_LIGHT);
      doc.setLineWidth(0.25);
      doc.rect(summaryX, sy, summaryW, 6.2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...SLATE_DARK);
      doc.text(label, summaryX + 3.8, sy + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.text(value, summaryX + summaryW - 3.2, sy + 4.2, { align: 'right' });
      sy += 6.2;
    }
  };

  drawSummaryRow('Subtotal (Taxable Value)', formatINR(quotation.subtotal, false));
  if (quotation.gstEnabled) {
    drawSummaryRow('Total GST', formatINR(quotation.totalGst, false));
  }
  drawSummaryRow('GRAND TOTAL', formatINR(quotation.grandTotal, false), true);
  if (hasAdvance) {
    drawSummaryRow('Advance Payable', formatINR(quotation.advanceAmount, false));
    drawSummaryRow('Balance Payable', formatINR(quotation.balanceAmount, false));
  }

  // Left Column: Amount in Words + Quotation Validity & Payment Terms highlight
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(...NAVY);
  doc.text('AMOUNT IN WORDS:', marginX, cursorY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...SLATE_DARK);
  const wordsWrapped = doc.splitTextToSize(
    numberToIndianWords(quotation.grandTotal),
    summaryX - marginX - 6
  );
  doc.text(wordsWrapped, marginX, cursorY + 8.5);

  const validityY = cursorY + 10 + wordsWrapped.length * 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(...NAVY);
  doc.text('VALIDITY:', marginX, validityY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE_DARK);
  doc.text(
    `Valid until ${formatDateDisplay(quotation.validUntil)}`,
    marginX + 17,
    validityY
  );

  cursorY = Math.max(sy, validityY + 4) + 6;

  // Helper to draw clean sub-section heading on Final Page
  const drawFinalSubHeading = (label: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...NAVY);
    doc.text(label.toUpperCase(), marginX, cursorY);
    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.7);
    doc.line(marginX, cursorY + 1.5, marginX + 20, cursorY + 1.5);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.25);
    doc.line(marginX + 20, cursorY + 1.5, pageWidth - marginX, cursorY + 1.5);
    cursorY += 5.5;
  };

  // Payment Terms & Bank Details
  const hasBankDetails =
    settings.bankDetails &&
    Boolean(
      settings.bankDetails.bankName ||
        settings.bankDetails.accountNumber ||
        settings.bankDetails.ifscCode ||
        settings.bankDetails.upiId
    );

  if ((quotation.paymentTerms && quotation.paymentTerms.trim()) || hasBankDetails) {
    drawFinalSubHeading('Payment Terms & Remittance');
    if (quotation.paymentTerms && quotation.paymentTerms.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...SLATE_DARK);
      const ptLines = doc.splitTextToSize(quotation.paymentTerms.trim(), contentWidth);
      doc.text(ptLines, marginX, cursorY);
      cursorY += ptLines.length * 3.8 + 2.5;
    }

    if (hasBankDetails) {
      const bankEntries: [string, string][] = [
        ['Account Name', settings.bankDetails.accountName],
        ['Bank Name', settings.bankDetails.bankName],
        ['Account No.', settings.bankDetails.accountNumber],
        ['IFSC Code', settings.bankDetails.ifscCode],
        ['Branch', settings.bankDetails.branch],
        ['UPI ID', settings.bankDetails.upiId],
      ].filter(([, v]) => Boolean(v && v.trim())) as [string, string][];

      const rowsNeeded = Math.ceil(bankEntries.length / 2);
      const bankBoxH = rowsNeeded * 4.5 + 5;
      doc.setFillColor(...SURFACE_TINT);
      doc.setDrawColor(...BORDER_LIGHT);
      doc.roundedRect(marginX, cursorY, contentWidth, bankBoxH, 1.2, 1.2, 'FD');

      bankEntries.forEach(([label, val], idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const bx = marginX + 4 + col * (contentWidth / 2);
        const by = cursorY + 4.4 + row * 4.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.4);
        doc.setTextColor(...SLATE_MUTED);
        doc.text(`${label}:`, bx, by);
        doc.setTextColor(...NAVY);
        doc.text(val, bx + 25, by);
      });
      cursorY += bankBoxH + 4.5;
    }
  }

  // Commercial Notes (if entered)
  if (quotation.commercialNotes && quotation.commercialNotes.trim()) {
    drawFinalSubHeading('Commercial Notes');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE_DARK);
    const noteLines = doc.splitTextToSize(quotation.commercialNotes.trim(), contentWidth);
    doc.text(noteLines, marginX, cursorY);
    cursorY += noteLines.length * 3.8 + 4;
  }

  // Terms & Conditions — dynamically adjust spacing so Final Page stays crisp on 1 page
  const cleanTerms = quotation.terms.map((t) => t.trim()).filter(Boolean);
  const signatoryReserved = 29;
  const availableForTerms = maxBodyY - signatoryReserved - cursorY - 6;

  if (cleanTerms.length > 0) {
    drawFinalSubHeading('Terms & Conditions');
    const denseTerms = cleanTerms.length > 7 || availableForTerms < 52;
    const termFont = denseTerms ? 7.4 : 7.9;
    const termLineH = denseTerms ? 3.3 : 3.7;
    const termGap = denseTerms ? 0.7 : 1.1;

    cleanTerms.forEach((term, idx) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(termFont);
      const wrapped = doc.splitTextToSize(term, contentWidth - 7);
      const neededH = wrapped.length * termLineH + termGap;
      if (cursorY + neededH <= maxBodyY - signatoryReserved) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.text(`${idx + 1}.`, marginX, cursorY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_DARK);
        doc.text(wrapped, marginX + 5.5, cursorY);
        cursorY += neededH;
      }
    });
    cursorY += 3;
  }

  // Closing Statement & Authorised Signatory (anchored cleanly at bottom of Final Page)
  const sigStartY = Math.max(cursorY + 2, maxBodyY - signatoryReserved);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.setLineWidth(0.3);
  doc.line(marginX, sigStartY, pageWidth - marginX, sigStartY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...SLATE_DARK);
  doc.text(
    'We look forward to your valuable association and assure you of our best technical support and services.',
    marginX,
    sigStartY + 5
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.6);
  doc.setTextColor(...NAVY);
  doc.text(`For ${settings.companyName || 'TM INDUSTRIAL SOLUTION'}`, marginX, sigStartY + 11.5);

  doc.setDrawColor(...NAVY_MID);
  doc.setLineWidth(0.4);
  doc.line(marginX, sigStartY + 20.5, marginX + 52, sigStartY + 20.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(
    settings.signatoryName || settings.contactPerson || 'Rinkesh Patel',
    marginX,
    sigStartY + 24.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...SLATE_MUTED);
  doc.text(settings.signatoryTitle || 'Authorized Signatory', marginX, sigStartY + 28.2);

  // =========================================================================
  // CONSISTENT FOOTER WITH PAGE NUMBERS ON EVERY PAGE
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 9.5;

    doc.setDrawColor(...YELLOW);
    doc.setLineWidth(0.6);
    doc.line(marginX, footerY - 3.5, marginX + 26, footerY - 3.5);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.25);
    doc.line(marginX + 26, footerY - 3.5, pageWidth - marginX, footerY - 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...SLATE_MUTED);
    const leftFooter = [
      settings.companyName || 'TM INDUSTRIAL SOLUTION',
      settings.phone,
      settings.email,
      settings.website ? settings.website.replace(/^https?:\/\//i, '') : '',
    ]
      .filter(Boolean)
      .join('  |  ');
    doc.text(leftFooter, marginX, footerY + 0.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX, footerY + 0.8, { align: 'right' });
  }

  return doc;
}

export async function downloadQuotationPdf(quotation: Quotation, settings: CompanySettings) {
  const doc = await generateQuotationPdfDoc(quotation, settings);
  const safeNum = (quotation.quotationNumber || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeCust = (quotation.customer.companyName || 'Customer')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .slice(0, 32);
  doc.save(`${safeNum}_${safeCust}.pdf`);
}

export async function printQuotationPdf(quotation: Quotation, settings: CompanySettings) {
  const doc = await generateQuotationPdfDoc(quotation, settings);
  doc.autoPrint();
  const blobUrl = doc.output('bloburl');
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = String(blobUrl);
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      void downloadQuotationPdf(quotation, settings);
    }
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 60000);
  };
}
