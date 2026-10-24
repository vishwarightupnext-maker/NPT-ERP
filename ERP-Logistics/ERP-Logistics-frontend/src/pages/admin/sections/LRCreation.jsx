import { useState, useEffect, createContext, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileText, Plus, X, Trash2, Download, ChevronRight, CheckCircle2, MapPin, Pencil, Camera, Upload, Image as ImageIcon, Search, Eye, Calendar, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import logoUrl from '../../../assets/logo.jpeg';

import CameraCapture from '../../../components/CameraCapture';
import Pagination from '../../../components/Pagination';
import { fetchLRs, createLR, updateLR, deleteLR } from '../../../store/slices/lrSlice';
import { fetchDispatches } from '../../../store/slices/dispatchSlice';

async function imgToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Compress images to ~100-200KB for fast uploading, smooth PDF generation & zero server errors
function compressImageFile(fileOrDataUrl, maxWidth = 1024, maxHeight = 1024, quality = 0.75) {
  return new Promise((resolve) => {
    if (!fileOrDataUrl) return resolve('');

    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:image/')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = fileOrDataUrl;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(fileOrDataUrl);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(fileOrDataUrl);
    reader.onload = (e) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = e.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result || '');
    };
    reader.onerror = () => resolve('');
  });
}

// Helper to export LR list to Excel / CSV format
function exportLRsToExcel(records) {
  if (!records || records.length === 0) {
    alert('No LR records to export.');
    return;
  }

  const headers = [
    'LR No.', 'Dispatch No.', 'Truck Number', 'Driver', 'Origin (From)', 'Destination (To)',
    'Consignor Name', 'Consignor GST', 'Consignee Name', 'Consignee GST', 'Goods Description',
    'Actual Weight (kg)', 'Charged Weight (kg)', 'Invoice No.', 'Invoice Value', 'Payment Type',
    'Grand Total (INR)', 'Status', 'Image Remarks', 'Remarks', 'Created Date'
  ];

  const escapeCSV = (str) => `"${String(str ?? '').replace(/"/g, '""')}"`;

  const rows = records.map(l => [
    l.lrNo || '',
    l.dispatchNo || '',
    l.truckNumber || '',
    l.driver || '',
    l.from || '',
    l.to || '',
    l.consignorName || '',
    l.consignorGST || '',
    l.consigneeName || '',
    l.consigneeGST || '',
    l.goods || '',
    l.actualWeight || 0,
    l.chargedWeight || 0,
    l.invoiceNumber || '',
    l.invoiceValue || 0,
    l.paymentType || '',
    l.grandTotal || l.amount || 0,
    l.status || '',
    l.imageRemarks || '',
    l.remarks || '',
    l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : ''
  ]);

  const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `LR_Records_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Form context + stable field helpers ──
const LRFormCtx = createContext(null);
const F_CLS   = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';
const F_CLSRO = 'w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed';

const Inp = ({ k, label, type = 'text', ph = '', req, readOnly }) => {
  const { form, setF } = useContext(LRFormCtx);
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} value={form[k] ?? ''} onChange={e => setF(k, e.target.value)}
        placeholder={ph} readOnly={readOnly}
        className={readOnly ? F_CLSRO : F_CLS} />
    </div>
  );
};

const Sel = ({ k, label, options, req }) => {
  const { form, setF } = useContext(LRFormCtx);
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}{req && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select value={form[k] ?? ''} onChange={e => setF(k, e.target.value)} className={F_CLS}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
};

const SEC_COLORS = {
  emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  blue:    'bg-blue-50 text-blue-800 border-blue-200',
  violet:  'bg-violet-50 text-violet-800 border-violet-200',
  amber:   'bg-amber-50 text-amber-800 border-amber-200',
  rose:    'bg-rose-50 text-rose-800 border-rose-200',
  sky:     'bg-sky-50 text-sky-800 border-sky-200',
  indigo:  'bg-indigo-50 text-indigo-800 border-indigo-200',
};

const Sec = ({ title, color = 'emerald', children }) => {
  const hdr = SEC_COLORS[color] || 'bg-gray-50 text-gray-800 border-gray-200';
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b ${hdr}`}>{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
};

// ── empty form ──
const EMPTY = {
  dispatchId: '', dispatchNo: '',
  truckNumber: '', driver: '', from: '', to: '', goods: '',
  liveLocation: '',
  expectedDeliveryDate: '',
  consignorName: '', consignorAddress: '', consignorGST: '',
  consigneeName: '', consigneeAddress: '', consigneeGST: '',
  serviceTaxPayableBy: 'Consignor',
  shipmentNumber: '', insurancePolicy: '',
  packingCount: '', packingType: '', dimensions: '', privateMarking: '',
  description: '', sealNumber: '',
  actualWeight: '', chargedWeight: '',
  invoiceNumber: '', invoiceValue: '',
  vehicleType: '', basisOfBooking: 'Fixed',
  freightCharges: '', handlingCharges: '', deliveryCharges: '',
  tollCharges: '', miscCharges: '', grandTotal: '',
  sgstPct: '0', cgstPct: '0', igstPct: '0',
  paymentType: 'Cash',
  podDetails: '',
  images: [],
  imageRemarks: '',
  remarks: '',
};

const STATUS_COLOR = {
  Created:      'bg-blue-50 text-blue-700',
  'In Transit': 'bg-amber-50 text-amber-700',
  Delivered:    'bg-green-50 text-green-700',
};

function numToWords(n) {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
             'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
             'Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  n = Math.floor(Number(n) || 0);
  if (n === 0) return 'Zero';
  let w = '';
  if (n >= 10000000) { w += numToWords(Math.floor(n / 10000000)) + ' Crore '; n %= 10000000; }
  if (n >= 100000)   { w += numToWords(Math.floor(n / 100000))   + ' Lakh ';  n %= 100000; }
  if (n >= 1000)     { w += numToWords(Math.floor(n / 1000))     + ' Thousand '; n %= 1000; }
  if (n >= 100)      { w += a[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
  if (n >= 20)       { w += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ''); }
  else if (n > 0)    { w += a[n]; }
  return w.trim();
}

async function generateLRPDF(lr) {
  let qrDataUrl = null;
  if (lr.liveLocation) {
    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, lr.liveLocation, { width: 200, margin: 1 });
      qrDataUrl = canvas.toDataURL('image/png');
    } catch (_) {}
  }

  let logoB64 = null;
  try { logoB64 = await imgToBase64(logoUrl); } catch (e) { console.warn('Logo load failed:', e); }

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const L = 8, R = 202, W = 194;
  const QR_SZ = 22;

  const bold  = ()              => doc.setFont('helvetica', 'bold');
  const norm  = ()              => doc.setFont('helvetica', 'normal');
  const sz    = n               => doc.setFontSize(n);
  const lw    = n               => doc.setLineWidth(n);
  const tx    = (s, x, y, o)   => doc.text(String(s ?? ''), x, y, o);
  const ln    = (x1,y1,x2,y2)  => doc.line(x1, y1, x2, y2);
  const bx    = (x,y,w,h)      => doc.rect(x, y, w, h, 'S');
  const fd    = d               => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
  const rs    = n               => n ? Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 }) : '';

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  lw(0.35);

  let y = 8;

  /* 1. COMPANY HEADER */
  const H1 = 22;
  const PG_W = qrDataUrl ? 42 : 65;
  const PG_X = R - PG_W - (qrDataUrl ? QR_SZ : 0);

  lw(0.5); bx(L, y, W, H1); lw(0.35);

  ln(L + 24, y, L + 24, y + H1);
  if (logoB64) {
    doc.addImage(logoB64, 'JPEG', L + 1, y + 1, 22, H1 - 2, undefined, 'FAST');
  } else {
    bold(); sz(7.5);
    tx('NEW',       L + 12, y + 5.5,  { align: 'center' });
    tx('POPULAR',   L + 12, y + 10.5, { align: 'center' });
    tx('TRANSPORT', L + 12, y + 15.5, { align: 'center' });
    sz(5); norm();
    tx('SAFE & SECURE', L + 12, y + 19.5, { align: 'center' });
  }

  ln(PG_X, y, PG_X, y + H1);
  sz(6.5); bold();
  tx('PAN No. AANFN0215H', PG_X + 2, y + 7);
  tx('GST :',              PG_X + 2, y + 13);
  sz(6); norm();
  tx('33AANFN0215H1ZM',   PG_X + 2, y + 18.5);

  if (qrDataUrl) {
    ln(R - QR_SZ, y, R - QR_SZ, y + H1);
    doc.addImage(qrDataUrl, 'PNG', R - QR_SZ + 1, y + 1, QR_SZ - 2, H1 - 2);
  }

  bold(); sz(13);
  tx('NEW POPULAR TRANSPORT', L + 27, y + 8);
  norm(); sz(6.3);
  tx('8/17-A, Chettipalsyatham Thottam, L & T Bye Pass Road, Irugur Post,', L + 27, y + 13);
  tx('Coimbatore - 641 100.  Mob.: 91598 33303, 91598 33330, 05654 17111',  L + 27, y + 17.5);
  tx('E-mail: admin@npbt.in     Website: www.npbt.in',                      L + 27, y + 21.5);

  y += H1;

  /* 2. DOCNET / BOOKING DATE / EXPECTED DATE / FROM / TO */
  const H2 = 14;
  bx(L, y, W, H2);
  const c1 = L + 32, c2 = c1 + 30, c3 = c2 + 33, c4 = c3 + 49;
  [c1, c2, c3, c4].forEach(x => ln(x, y, x, y + H2));

  sz(5.5); bold();
  tx('DOCNET No. :',      L + 1,  y + 4.5);
  tx('Booking Date',      c1 + 1, y + 4.5);
  tx('Expected Dly Date', c2 + 1, y + 4.5);
  tx('FROM',              c3 + 1, y + 4.5);
  tx('TO',                c4 + 1, y + 4.5);

  sz(8); norm();
  tx(lr.dispatchNo || '',              L + 1,  y + 11.5);
  tx(fd(lr.createdAt),                 c1 + 1, y + 11.5);
  tx(fd(lr.expectedDeliveryDate),      c2 + 1, y + 11.5);
  tx(lr.from || '',                    c3 + 1, y + 11.5);
  tx(lr.to || '',                      c4 + 1, y + 11.5);

  y += H2;

  /* 3. TRUCK NO. + LR NO. */
  const H3 = 9;
  bx(L, y, W, H3);
  ln(L + 22, y, L + 22, y + H3);
  ln(R - 55,  y, R - 55,  y + H3);

  sz(6); bold();  tx('TRUCK NO.',        L + 1,     y + 6);
  sz(9); norm();  tx(lr.truckNumber || '', L + 24,    y + 6.5);
  sz(5.5); bold();tx('LR No. :',          R - 53,    y + 3.5);
  sz(10); bold(); tx(lr.lrNo || '',        R - 53,    y + 8.5);

  y += H3;

  /* 4. CONSIGNOR / CONSIGNEE */
  const H4   = 38;
  const CMID = L + Math.round(W * 0.48);
  const CLW  = 15;

  bx(L, y, W, H4);
  ln(CMID, y, CMID, y + H4);

  sz(7.5); bold(); tx('CONSIGNOR', L + 1, y + 5.5);
  lw(0.25); ln(L, y + 7.5, CMID, y + 7.5); lw(0.35);
  ln(L + CLW, y + 7.5, L + CLW, y + H4);

  sz(5.5); bold(); tx('Name',    L + 1, y + 12.5);
  norm(); sz(7.5);
  tx((doc.splitTextToSize(lr.consignorName || '', CMID - L - CLW - 2))[0] || '', L + CLW + 1, y + 12.5);
  lw(0.25); ln(L, y + 15, CMID, y + 15);

  bold(); sz(5.5); tx('Address', L + 1, y + 20.5);
  norm(); sz(7);
  const cAddr = doc.splitTextToSize(lr.consignorAddress || '', CMID - L - CLW - 2);
  if (cAddr[0]) tx(cAddr[0], L + CLW + 1, y + 20.5);
  if (cAddr[1]) tx(cAddr[1], L + CLW + 1, y + 25);
  ln(L, y + 28.5, CMID, y + 28.5);

  bold(); sz(5.5); tx('GSTIN :', L + 1, y + 35);
  norm(); sz(7.5); tx(lr.consignorGST || '', L + CLW + 1, y + 35);

  lw(0.35);
  sz(7.5); bold(); tx('TO', CMID + 2, y + 5.5);
  lw(0.25); ln(CMID, y + 7.5, R, y + 7.5); lw(0.35);
  ln(CMID + CLW, y + 7.5, CMID + CLW, y + H4);

  sz(5.5); bold(); tx('Name',    CMID + 1, y + 12.5);
  norm(); sz(7.5);
  tx((doc.splitTextToSize(lr.consigneeName || '', R - CMID - CLW - 2))[0] || '', CMID + CLW + 1, y + 12.5);
  lw(0.25); ln(CMID, y + 15, R, y + 15);

  bold(); sz(5.5); tx('Address', CMID + 1, y + 20.5);
  norm(); sz(7);
  const eAddr = doc.splitTextToSize(lr.consigneeAddress || '', R - CMID - CLW - 2);
  if (eAddr[0]) tx(eAddr[0], CMID + CLW + 1, y + 20.5);
  if (eAddr[1]) tx(eAddr[1], CMID + CLW + 1, y + 25);
  ln(CMID, y + 25.5, R, y + 25.5);

  bold(); sz(5.5); tx('Mobile :', CMID + 1, y + 30.5);
  lw(0.25); ln(CMID, y + 32.5, R, y + 32.5); lw(0.35);

  bold(); sz(5.5); tx('GSTIN :', CMID + 1, y + 37);
  norm(); sz(7.5); tx(lr.consigneeGST || '', CMID + CLW + 1, y + 37);

  y += H4;

  /* 5. SERVICE TAX PAYABLE BY */
  const H5 = 7;
  bx(L, y, W, H5);
  sz(6); bold(); tx('Service Tax Payable by', L + 2, y + 5);
  ln(L + 47, y, L + 47, y + H5);
  norm(); sz(7.5); tx(lr.serviceTaxPayableBy || 'Consignor', L + 49, y + 5);
  y += H5;

  /* 6. BOOKING DETAILS + FREIGHT CHARGES */
  const BW  = Math.round(W * 0.55);
  const FX  = L + BW;
  const DH  = 7;
  const FAW = 30;

  const bkRows = [
    ['No. of packing',                String(lr.packingCount || '')],
    ['Type of Packing',               lr.packingType || ''],
    ['Dimensions (inches / Cms)',      lr.dimensions || ''],
    ['Private Marking',               lr.privateMarking || ''],
    ['Description (said to Contain)', lr.goods || ''],
    ['Seal No.',                      lr.sealNumber || ''],
    ['Actual Weight',                 lr.actualWeight ? lr.actualWeight + ' kg' : ''],
    ['Charged Weight',                lr.chargedWeight ? lr.chargedWeight + ' kg' : ''],
    ['Invoice No. / DC. No.',         lr.invoiceNumber || ''],
    ['Invoice Value',                 lr.invoiceValue ? 'Rs.' + rs(lr.invoiceValue) : ''],
    ['Vehicle Type',                  lr.vehicleType || ''],
  ];

  const frRows = [
    ['Basic Freight',                  rs(lr.freightCharges)],
    ['Minimum C Note Charges',         ''],
    ['Handling Charges',               rs(lr.handlingCharges)],
    ['State / Permit Charges .',       ''],
    ['Door Pickup / Delivery Charges', rs(lr.deliveryCharges)],
    ['To Pay Charge',                  ''],
    ['Checkpost Expenses',             rs(lr.tollCharges)],
    ['MISC Charges',                   rs(lr.miscCharges)],
    ['Service Tax GSTIN',              ''],
    ['',                               ''],
    ['Grand Total',                    rs(lr.grandTotal)],
  ];

  const PH = 7 + (bkRows.length + 1) * DH;

  lw(0.5); bx(L, y, W, PH); lw(0.35);
  ln(FX, y, FX, y + PH);
  ln(R - FAW, y + 7, R - FAW, y + PH);

  sz(7.5); bold();
  tx('BOOKING DETAILS', L + 2, y + 5.5);
  tx('FREIGHT CHARGES', FX + 2, y + 5.5);
  lw(0.5); ln(L, y + 7, R, y + 7); lw(0.35);

  let by = y + 7;
  bkRows.forEach(([lbl, val]) => {
    lw(0.2); ln(L, by + DH, FX, by + DH); lw(0.35);
    bold(); sz(5.8); tx(lbl, L + 1, by + DH - 1.5);
    norm(); sz(7.5);
    const vt = doc.splitTextToSize(val, 34);
    tx(vt[0] || '', FX - 36, by + DH - 1.5);
    by += DH;
  });

  lw(0.2); ln(L, by + DH, FX, by + DH); lw(0.35);
  bold(); sz(5.8); tx('Basis of Booking', L + 1, by + DH - 2);

  const bases = ['PAID', 'TBB', 'TOPAY'];
  let bxp = L + 46;
  const pt  = (lr.paymentType   || '').toLowerCase();
  const bob = (lr.basisOfBooking || '').toLowerCase();
  bases.forEach(base => {
    doc.rect(bxp, by + 1.5, 4, 4, 'S');
    const sel =
      (base === 'PAID'  && (pt === 'cash' || pt === 'cheque' || bob === 'fixed')) ||
      (base === 'TOPAY' && pt === 'topay') ||
      (base === 'TBB'   && (bob.includes('km') || bob.includes('ton') || bob.includes('trip')));
    if (sel) {
      doc.setFillColor(0, 0, 0);
      doc.rect(bxp + 1, by + 2.5, 2, 2, 'F');
    }
    sz(7); norm(); tx(base, bxp + 6, by + DH - 2);
    bxp += 22;
  });

  let fy = y + 7;
  frRows.forEach(([lbl, val], i) => {
    const isLast = i === frRows.length - 1;
    if (isLast) { lw(0.5); } else { lw(0.2); }
    ln(FX, fy + DH, R, fy + DH);
    lw(0.35);

    bold(); sz(isLast ? 7.5 : 5.8);
    if (lbl) tx(lbl, FX + 1, fy + DH - 1.5);

    if (isLast) { bold(); sz(8); } else { norm(); sz(7.5); }
    tx(val, R - FAW + 1, fy + DH - 1.5);
    fy += DH;
  });

  y += PH;

  /* 7. RUPEES IN WORDS */
  const H7  = 9;
  const CCX = L + Math.round(W * 0.60);
  const SNX = CCX + Math.round((R - CCX) * 0.50);

  bx(L, y, W, H7);
  ln(L + 33, y, L + 33, y + H7);
  ln(CCX, y, CCX, y + H7);
  ln(SNX, y, SNX, y + H7);

  sz(5.5); bold(); tx('Rupees in Words :', L + 1, y + 4);
  norm(); sz(6.5);
  const wWords = 'Rs. ' + numToWords(Math.floor(Number(lr.grandTotal) || 0)) + ' Only';
  const wl     = doc.splitTextToSize(wWords, CCX - (L + 34) - 1);
  tx(wl[0] || '', L + 34, y + 7.5);

  bold(); sz(5.5);
  tx('Cash / Cheque :', CCX + 1, y + 4);
  tx('Shipment No. :',  SNX + 1, y + 4);
  norm(); sz(7); tx(lr.shipmentNumber || '', SNX + 1, y + 8);

  y += H7;

  /* 8. E-WAY NO. + INSURANCE POLICY */
  const H8  = 8;
  const INX = L + Math.round(W * 0.45);

  bx(L, y, W, H8);
  ln(L + 22, y, L + 22, y + H8);
  ln(INX,    y, INX,    y + H8);

  sz(5.5); bold(); tx('E-Way No. :',                   L + 1,   y + 5.5);
  tx('Insurance Policy Details if any :',               INX + 1, y + 5.5);
  norm(); sz(7);   tx(lr.insurancePolicy || '', INX + 50, y + 5.5);

  y += H8;

  /* 9. AT OWNERS RISK */
  const H9   = 20;
  const SIGX = R - 60;

  bx(L, y, W, H9);
  ln(SIGX, y, SIGX, y + H9);

  sz(6); bold();   tx('AT OWNERS RISK', L + 1, y + 5);
  sz(5.3); norm();
  tx('We hereby agree to the terms & Conditions stated on the reverse of this C Notes & declare that', L + 1, y + 9.5);
  tx('contents on this C Note are true and correct. The To-Pay freight will my / our consent and',     L + 1, y + 13.5);
  tx('will be paid by the Consignee along with Service Charges at the time of Delivery.',              L + 1, y + 17.5);

  sz(6.3); bold(); tx('Prepared by NEW POPULAR TRANSPORT', SIGX + 2, y + 6);
  sz(5.5); norm();
  tx('Name :',      SIGX + 2,  y + 11);
  tx('Date :',      SIGX + 2,  y + 15);  tx(fd(lr.createdAt), SIGX + 15, y + 15);
  tx('Time :',      SIGX + 2,  y + 19);
  tx('V.K.',        SIGX + 48, y + 19);
  bold(); sz(5.5); tx('Signature', SIGX + 35, y + 19);

  y += H9;

  /* 10. NAME + CONSIGNOR SIGN */
  const H10 = 14;
  const NS1 = L + 14;
  const NS2 = L + Math.round(W * 0.50);
  const NS3 = NS2 + Math.round((R - NS2) * 0.55);

  bx(L, y, W, H10);
  [NS1, NS2, NS3].forEach(x => ln(x, y, x, y + H10));

  sz(5.5); bold();
  tx('NAME',           L + 1,  y + 4);
  tx('CONSIGNOR SIGN', NS2 + 2, y + 4);
  tx('Date & Time :',  NS3 + 1, y + 4);
  norm(); sz(6.5); tx(fd(lr.createdAt), NS3 + 1, y + 10.5);

  y += H10;

  /* 11. POD SECTION */
  const H11  = 22;
  const PODL = L + 10;

  bx(L, y, W, H11);
  ln(PODL, y, PODL, y + H11);

  sz(6.5); bold(); tx('POD :', L + 1, y + 5.5);
  sz(5.5); norm();
  tx('Goods Received as per invoice / DC and in good condition.', PODL + 1, y + 5.5);

  lw(0.25); ln(L, y + 8, R, y + 8); lw(0.35);

  const P1 = L + Math.round(W * 0.30);
  const P2 = P1 + Math.round(W * 0.26);
  const P3 = P2 + Math.round(W * 0.22);
  [P1, P2, P3].forEach(x => ln(x, y + 8, x, y + H11));

  sz(5.5); bold();
  tx('Name :',        L + 1,  y + 13);
  tx('Sign & Seal :', P1 + 1, y + 13);
  tx('Phone :',       P2 + 1, y + 13);
  tx('Date & Time :', P3 + 1, y + 13);

  lw(0.25); ln(L, y + 15.5, R, y + 15.5); lw(0.35);

  if (lr.podDetails) {
    norm(); sz(6.5); tx(lr.podDetails, PODL + 1, y + 20.5);
  }

  y += H11;

  /* 12. COPY COLOURS FOOTER */
  const H12 = 8;
  const CPW = Math.round(W / 3);

  bx(L, y, W, H12);
  ln(L + CPW,     y, L + CPW,     y + H12);
  ln(L + CPW * 2, y, L + CPW * 2, y + H12);

  sz(7); bold();
  tx('Green - Consignee Copy',  L + 2,           y + 5.5);
  tx('Yellow - File Copy',      L + CPW + 2,     y + 5.5);
  tx('Blue - Pod Copy',         L + CPW * 2 + 2, y + 5.5);

  /* 13. PAGE 2+: UNLIMITED CARGO & INSPECTION ATTACHMENT PHOTOS */
  const validImages = Array.isArray(lr.images) ? lr.images.filter(Boolean) : [];
  if (validImages.length > 0) {
    const imagesPerPage = 4;
    for (let pageIdx = 0; pageIdx < Math.ceil(validImages.length / imagesPerPage); pageIdx++) {
      doc.addPage();
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('NEW POPULAR TRANSPORT', 105, 14, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`CARGO INSPECTION & POD ATTACHMENT PHOTOS (Page ${pageIdx + 1})`, 105, 20, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`LR No: ${lr.lrNo || ''}   |   Dispatch: ${lr.dispatchNo || ''}   |   Route: ${lr.from || ''} -> ${lr.to || ''}`, 105, 25, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(8, 28, 202, 28);

      const pageImages = validImages.slice(pageIdx * imagesPerPage, (pageIdx + 1) * imagesPerPage);

      const grid = [
        { x: 10,  y: 34 },
        { x: 106, y: 34 },
        { x: 10,  y: 156 },
        { x: 106, y: 156 },
      ];

      pageImages.forEach((imgUrl, i) => {
        const { x, y: gY } = grid[i];
        const boxW = 88, boxH = 114;
        const globalImgNum = pageIdx * imagesPerPage + i + 1;

        doc.setLineWidth(0.3);
        doc.rect(x, gY, boxW, boxH, 'S');

        doc.setFillColor(245, 245, 245);
        doc.rect(x, gY, boxW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(40, 40, 40);
        doc.text(`Photo ${globalImgNum}: LR Document / Inspection`, x + 3, gY + 5);

        try {
          const fmt = imgUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          doc.addImage(imgUrl, fmt, x + 2, gY + 9, boxW - 4, boxH - 11, undefined, 'FAST');
        } catch (e) {
          console.warn('PDF addImage error:', e);
        }
      });

      // Render image remarks at the bottom of the last photos page if available
      if (pageIdx === Math.ceil(validImages.length / imagesPerPage) - 1 && (lr.imageRemarks || lr.remarks)) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('IMAGE / DOCUMENT REMARKS:', 10, 275);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(String(lr.imageRemarks || lr.remarks), 55, 275);
      }
    }
  }

  doc.save(`${lr.lrNo || 'LR'}.pdf`);
}

// ── main component ──
const LRCreation = () => {
  const reduxDispatch = useDispatch();
  const { list, loading } = useSelector(s => s.lr);
  const dispatches = useSelector(s => s.dispatches.list);

  const [showModal, setShowModal] = useState(false);
  const [viewLR, setViewLR] = useState(null);
  const [step, setStep] = useState(1);
  const [selectedDispatchId, setSelectedDispatchId] = useState('');
  const [selectedStopIdx, setSelectedStopIdx] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdLR, setCreatedLR] = useState(null);
  const [batchLRs, setBatchLRs] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [liveQR, setLiveQR] = useState(null);

  // Pagination & filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Quick photo upload modal state for existing LRs (Unlimited Images + Remarks)
  const [photoModalLR, setPhotoModalLR] = useState(null);
  const [photoModalImages, setPhotoModalImages] = useState([]);
  const [photoModalRemarks, setPhotoModalRemarks] = useState('');
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(null); // { idx, isPhotoModal, title }

  useEffect(() => {
    reduxDispatch(fetchLRs());
    reduxDispatch(fetchDispatches());
  }, [reduxDispatch]);

  useEffect(() => {
    const total = ['freightCharges', 'handlingCharges', 'deliveryCharges', 'tollCharges', 'miscCharges']
      .reduce((s, k) => s + (parseFloat(form[k]) || 0), 0);
    setForm(p => ({ ...p, grandTotal: total ? total.toFixed(2) : '' }));
  }, [form.freightCharges, form.handlingCharges, form.deliveryCharges, form.tollCharges, form.miscCharges]);

  useEffect(() => {
    if (!form.liveLocation) { setLiveQR(null); return; }
    const t = setTimeout(async () => {
      try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, form.liveLocation, { width: 200, margin: 1 });
        setLiveQR(canvas.toDataURL('image/png'));
      } catch { setLiveQR(null); }
    }, 400);
    return () => clearTimeout(t);
  }, [form.liveLocation]);

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // Dynamic image handler supporting unlimited images
  const handleImageFile = async (idx, fileOrDataUrl, isPhotoModal = false) => {
    if (!fileOrDataUrl) return;
    try {
      const base64 = await compressImageFile(fileOrDataUrl);
      if (isPhotoModal) {
        setPhotoModalImages(p => {
          const updated = [...p];
          if (idx < updated.length) updated[idx] = base64;
          else updated.push(base64);
          return updated;
        });
      } else {
        setForm(p => {
          const updated = Array.isArray(p.images) ? [...p.images] : [];
          if (idx < updated.length) updated[idx] = base64;
          else updated.push(base64);
          return { ...p, images: updated };
        });
      }
    } catch (err) {
      console.error('Image compression error:', err);
    }
  };

  const handleRemoveImage = (idx, isPhotoModal = false) => {
    if (isPhotoModal) {
      setPhotoModalImages(p => p.filter((_, i) => i !== idx));
    } else {
      setForm(p => ({
        ...p,
        images: Array.isArray(p.images) ? p.images.filter((_, i) => i !== idx) : []
      }));
    }
  };

  const selectedDispatch = dispatches.find(d => d._id === selectedDispatchId);

  const getDispatchStops = (d) => {
    if (!d) return [];
    if (Array.isArray(d.destinations) && d.destinations.length > 0) {
      return d.destinations
        .map(s => (typeof s === 'string' ? s : (s.name || s.city || '')).trim())
        .filter(Boolean);
    }
    if (d.to) {
      return d.to.split(' → ').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const handleDispatchSelect = (id) => {
    setSelectedDispatchId(id);
    setSelectedStopIdx(0);
    const d = dispatches.find(d => d._id === id);
    if (d) {
      const stops = getDispatchStops(d);
      const targetTo = stops.length > 0 ? stops[0] : (d.to || '');

      setForm(p => ({
        ...p,
        dispatchId: d._id,
        dispatchNo: d.dispatchNo || '',
        truckNumber: d.vehicle || '',
        driver: d.driver || '',
        from: d.from || '',
        to: targetTo,
        goods: d.goods || '',
        liveLocation: d.liveLocation || '',
        actualWeight: d.weight ? String(d.weight) : '',
      }));
    }
  };

  const handleStopSelect = (stopName, idx) => {
    setSelectedStopIdx(idx);
    setForm(p => ({ ...p, to: stopName }));
  };

  const handleGenerateAllStops = async () => {
    if (!selectedDispatch) return;
    const stops = getDispatchStops(selectedDispatch);
    if (stops.length === 0) return;

    setSaving(true);
    setError('');
    const createdList = [];

    try {
      for (let i = 0; i < stops.length; i++) {
        const stopName = stops[i];
        const lrData = {
          ...EMPTY,
          dispatchId: selectedDispatch._id,
          dispatchNo: selectedDispatch.dispatchNo || '',
          truckNumber: selectedDispatch.vehicle || '',
          driver: selectedDispatch.driver || '',
          from: selectedDispatch.from || '',
          to: stopName,
          goods: selectedDispatch.goods,
          consignorName: 'Consignor',
          consigneeName: `Consignee - ${stopName}`,
          liveLocation: selectedDispatch.liveLocation || '',
          actualWeight: selectedDispatch.weight ? String(selectedDispatch.weight) : '',
        };
        const lr = await reduxDispatch(createLR(lrData)).unwrap();
        createdList.push(lr);
      }
      setBatchLRs(createdList);
      reduxDispatch(fetchLRs());
    } catch (err) {
      setError(err || 'Failed to auto-generate individual LRs for stops.');
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    setShowModal(true); setStep(1);
    setSelectedDispatchId(''); setForm(EMPTY);
    setError(''); setCreatedLR(null); setBatchLRs(null); setLiveQR(null); setEditingId(null);
  };

  const openEdit = (lr) => {
    setShowModal(true); setStep(2); setEditingId(lr._id);
    setSelectedDispatchId(lr.dispatchId || '');
    setForm({
      dispatchId: lr.dispatchId || '', dispatchNo: lr.dispatchNo || '',
      truckNumber: lr.truckNumber || '', driver: lr.driver || '',
      from: lr.from || '', to: lr.to || '', goods: lr.goods || '',
      liveLocation: lr.liveLocation || '',
      expectedDeliveryDate: lr.expectedDeliveryDate ? lr.expectedDeliveryDate.split('T')[0] : '',
      consignorName: lr.consignorName || '', consignorAddress: lr.consignorAddress || '', consignorGST: lr.consignorGST || '',
      consigneeName: lr.consigneeName || '', consigneeAddress: lr.consigneeAddress || '', consigneeGST: lr.consigneeGST || '',
      serviceTaxPayableBy: lr.serviceTaxPayableBy || 'Consignor',
      shipmentNumber: lr.shipmentNumber || '', insurancePolicy: lr.insurancePolicy || '',
      packingCount: lr.packingCount || '', packingType: lr.packingType || '',
      dimensions: lr.dimensions || '', privateMarking: lr.privateMarking || '',
      description: lr.description || '', sealNumber: lr.sealNumber || '',
      actualWeight: lr.actualWeight || '', chargedWeight: lr.chargedWeight || '',
      invoiceNumber: lr.invoiceNumber || '', invoiceValue: lr.invoiceValue || '',
      vehicleType: lr.vehicleType || '', basisOfBooking: lr.basisOfBooking || 'Fixed',
      freightCharges: lr.freightCharges || '', handlingCharges: lr.handlingCharges || '',
      deliveryCharges: lr.deliveryCharges || '', tollCharges: lr.tollCharges || '',
      miscCharges: lr.miscCharges || '', grandTotal: lr.grandTotal || '',
      sgstPct: lr.sgstPct ?? '0', cgstPct: lr.cgstPct ?? '0', igstPct: lr.igstPct ?? '0',
      paymentType: lr.paymentType || 'Cash', podDetails: lr.podDetails || '',
      images: Array.isArray(lr.images) ? lr.images.filter(Boolean) : [],
      imageRemarks: lr.imageRemarks || lr.remarks || '',
      remarks: lr.remarks || '',
    });
    setError(''); setCreatedLR(null); setBatchLRs(null); setLiveQR(null);
  };

  const openPhotoModal = (lr) => {
    setPhotoModalLR(lr);
    setPhotoModalImages(Array.isArray(lr.images) ? lr.images.filter(Boolean) : []);
    setPhotoModalRemarks(lr.imageRemarks || lr.remarks || '');
  };

  const savePhotoModal = async () => {
    if (!photoModalLR) return;
    setSavingPhotos(true);
    try {
      await reduxDispatch(updateLR({
        id: photoModalLR._id,
        images: photoModalImages,
        imageRemarks: photoModalRemarks,
        remarks: photoModalRemarks || photoModalLR.remarks,
      })).unwrap();
      setPhotoModalLR(null);
      reduxDispatch(fetchLRs());
    } catch (e) {
      alert(e || 'Failed to save photos & remarks.');
    } finally {
      setSavingPhotos(false);
    }
  };

  const closeModal = () => { setShowModal(false); setCreatedLR(null); setBatchLRs(null); };

  const handleCreate = async () => {
    if (!form.consignorName.trim() || !form.consigneeName.trim() || !form.from.trim() || !form.to.trim() || !form.goods.trim()) {
      setError('Consignor Name, Consignee Name, From, To and Goods are required.'); return;
    }
    setSaving(true); setError('');
    try {
      const lr = editingId
        ? await reduxDispatch(updateLR({ id: editingId, ...form })).unwrap()
        : await reduxDispatch(createLR(form)).unwrap();
      setCreatedLR(lr);
      reduxDispatch(fetchLRs());
    } catch (err) { setError(err || 'Failed to save LR.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this LR?')) return;
    await reduxDispatch(deleteLR(id)).unwrap().catch(() => {});
    reduxDispatch(fetchLRs());
  };

  const filteredList = list.filter(l => {
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;

    // Date filter matching createdAt or expectedDeliveryDate
    let matchesDate = true;
    if (l.createdAt || l.expectedDeliveryDate) {
      const lrDateStr = new Date(l.createdAt || l.expectedDeliveryDate).toISOString().slice(0, 10);
      if (startDateFilter && lrDateStr < startDateFilter) matchesDate = false;
      if (endDateFilter && lrDateStr > endDateFilter) matchesDate = false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus && matchesDate;
    return matchesStatus && matchesDate && (
      (l.lrNo && l.lrNo.toLowerCase().includes(q)) ||
      (l.dispatchNo && l.dispatchNo.toLowerCase().includes(q)) ||
      (l.consignorName && l.consignorName.toLowerCase().includes(q)) ||
      (l.consigneeName && l.consigneeName.toLowerCase().includes(q)) ||
      (l.from && l.from.toLowerCase().includes(q)) ||
      (l.to && l.to.toLowerCase().includes(q)) ||
      (l.goods && l.goods.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search LR No, Dispatch, Consignor, Consignee, Route..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Created">Created</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-medium text-gray-500 hidden sm:inline">From:</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={e => { setStartDateFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs text-gray-700 focus:outline-none"
            />
            <span className="text-gray-400">—</span>
            <span className="font-medium text-gray-500 hidden sm:inline">To:</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={e => { setEndDateFilter(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-xs text-gray-700 focus:outline-none"
            />
            {(startDateFilter || endDateFilter) && (
              <button
                onClick={() => { setStartDateFilter(''); setEndDateFilter(''); setCurrentPage(1); }}
                className="text-gray-400 hover:text-red-500 ml-1 font-bold text-xs"
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => exportLRsToExcel(filteredList)}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold px-3 py-2 rounded-xl text-xs transition"
            title="Export filtered LR records to Excel CSV format"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export to Excel
          </button>
          <button onClick={openModal}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition">
            <Plus className="w-4 h-4" /> New LR
          </button>
        </div>
      </div>

      {/* table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-indigo-50 rounded-xl p-2.5"><FileText className="w-5 h-5 text-indigo-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Lorry Receipts (LR)</h2>
            <p className="text-xs text-gray-400">Manage Lorry Receipts, view complete details, export to Excel & attach unlimited photos with remarks</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{filteredList.length} LR{filteredList.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{['LR No.', 'Dispatch', 'Consignor', 'Consignee', 'Route (From → To)', 'Uploaded Images', 'Grand Total', 'Payment', 'Status', 'Action'].map(h =>
                <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && filteredList.length === 0 && <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">No LRs match search/filter.</td></tr>}
              {filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(l => {
                const imgCount = Array.isArray(l.images) ? l.images.filter(Boolean).length : 0;
                return (
                  <tr key={l._id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-indigo-700">{l.lrNo}</td>
                    <td className="px-5 py-4 text-gray-500 font-mono text-xs">{l.dispatchNo || '—'}</td>
                    <td className="px-5 py-4 text-gray-700">{l.consignorName}</td>
                    <td className="px-5 py-4 text-gray-700">{l.consigneeName}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap text-xs font-medium">
                      {l.from} → <span className="text-emerald-700 font-semibold">{l.to}</span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openPhotoModal(l)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition ${
                          imgCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {imgCount} Photos & Remarks
                      </button>
                    </td>
                    <td className="px-5 py-4 text-gray-700 font-medium">₹{Number(l.grandTotal || l.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{l.paymentType || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[l.status] || 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewLR(l)} title="View Complete LR Details"
                          className="text-indigo-600 hover:text-indigo-800 transition">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openPhotoModal(l)} title="Upload/Manage Unlimited Photos & Remarks"
                          className="text-purple-500 hover:text-purple-700 transition">
                          <Camera className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(l)} title="Edit"
                          className="text-amber-500 hover:text-amber-700 transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => generateLRPDF(l)} title="Download PDF with Photos"
                          className="text-emerald-600 hover:text-emerald-800 transition">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(l._id)} title="Delete"
                          className="text-red-400 hover:text-red-600 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={filteredList.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
        />
      </div>

      {/* VIEW COMPLETE LR DETAILS MODAL */}
      {viewLR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-700">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Lorry Receipt (LR) Details</h3>
                  <p className="text-xs text-gray-500 font-mono">LR No: {viewLR.lrNo} {viewLR.dispatchNo ? `| Dispatch: ${viewLR.dispatchNo}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setViewLR(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block mb-1">LR Status</span>
                <span className={`inline-block px-2.5 py-1 rounded-full font-semibold ${STATUS_COLOR[viewLR.status] || 'bg-gray-100 text-gray-700'}`}>
                  {viewLR.status}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block mb-1">Truck Number</span>
                <span className="font-bold text-gray-800">{viewLR.truckNumber || '—'}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block mb-1">Driver Name</span>
                <span className="font-bold text-gray-800">{viewLR.driver || '—'}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block mb-1">Grand Total</span>
                <span className="font-bold text-indigo-700 text-sm">₹{Number(viewLR.grandTotal || viewLR.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Consignor & Consignee info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="border border-blue-100 bg-blue-50/40 p-4 rounded-xl space-y-1.5">
                <span className="font-bold text-blue-900 uppercase text-[10px] tracking-wider block">Consignor Details (Sender)</span>
                <p className="font-bold text-gray-800">{viewLR.consignorName}</p>
                <p className="text-gray-600">{viewLR.consignorAddress || 'No address'}</p>
                {viewLR.consignorGST && <p className="text-blue-700 font-mono">GSTIN: {viewLR.consignorGST}</p>}
              </div>
              <div className="border border-sky-100 bg-sky-50/40 p-4 rounded-xl space-y-1.5">
                <span className="font-bold text-sky-900 uppercase text-[10px] tracking-wider block">Consignee Details (Receiver)</span>
                <p className="font-bold text-gray-800">{viewLR.consigneeName}</p>
                <p className="text-gray-600">{viewLR.consigneeAddress || 'No address'}</p>
                {viewLR.consigneeGST && <p className="text-sky-700 font-mono">GSTIN: {viewLR.consigneeGST}</p>}
              </div>
            </div>

            {/* Route & Shipment */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block">Route</span>
                <span className="font-semibold text-gray-800">{viewLR.from} → {viewLR.to}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block">Goods Description</span>
                <span className="font-semibold text-gray-800">{viewLR.goods}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block">Invoice No & Value</span>
                <span className="font-semibold text-gray-800">{viewLR.invoiceNumber || '—'} {viewLR.invoiceValue ? `(₹${viewLR.invoiceValue})` : ''}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block">Actual / Charged Weight</span>
                <span className="font-semibold text-gray-800">{viewLR.actualWeight || 0} kg / {viewLR.chargedWeight || 0} kg</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block">Payment Type & Booking</span>
                <span className="font-semibold text-gray-800">{viewLR.paymentType || 'Cash'} ({viewLR.basisOfBooking || 'Fixed'})</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <span className="text-gray-400 font-medium block">Expected Delivery Date</span>
                <span className="font-semibold text-gray-800">{viewLR.expectedDeliveryDate ? new Date(viewLR.expectedDeliveryDate).toLocaleDateString('en-IN') : '—'}</span>
              </div>
            </div>

            {/* Uploaded LR Images Gallery */}
            {Array.isArray(viewLR.images) && viewLR.images.filter(Boolean).length > 0 && (
              <div className="border border-indigo-100 bg-indigo-50/30 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    Uploaded LR Images & Documents ({viewLR.images.filter(Boolean).length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {viewLR.images.filter(Boolean).map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noreferrer" className="block group border border-gray-200 rounded-xl overflow-hidden bg-white aspect-video relative">
                      <img src={img} alt={`LR photo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        #{idx + 1}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Remarks Section */}
            {(viewLR.imageRemarks || viewLR.remarks) && (
              <div className="bg-amber-50/70 border border-amber-200/70 p-4 rounded-xl space-y-1 text-xs">
                <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block">LR Images & Document Remarks</span>
                <p className="text-amber-950 whitespace-pre-wrap">{viewLR.imageRemarks || viewLR.remarks}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => generateLRPDF(viewLR)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition"
              >
                <Download className="w-4 h-4" /> Download LR PDF
              </button>
              <button
                onClick={() => setViewLR(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl text-xs transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK UNLIMITED PHOTO UPLOAD & REMARKS MODAL FOR EXISTING LR */}
      {photoModalLR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Attach Unlimited LR Images & Document Remarks</h3>
                <p className="text-xs text-gray-500">LR No: <strong className="text-indigo-700 font-mono">{photoModalLR.lrNo}</strong> ({photoModalLR.from} → {photoModalLR.to})</p>
              </div>
              <button onClick={() => setPhotoModalLR(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unlimited Images Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Uploaded LR Images ({photoModalImages.length})</span>
                <button
                  type="button"
                  onClick={() => setPhotoModalImages(p => [...p, ''])}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Photo Slot
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {photoModalImages.map((imgVal, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">Image #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx, true)}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>

                    {imgVal ? (
                      <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white aspect-video flex items-center justify-center">
                        <img src={imgVal} alt={`Upload ${idx + 1}`} className="max-h-28 w-full object-contain" />
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-1">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 hover:border-indigo-400 rounded-xl text-xs font-medium text-gray-700 cursor-pointer transition shadow-xs">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" /> Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (file) await handleImageFile(idx, file, true);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setCameraTarget({ idx, isPhotoModal: true, title: `Capture Image #${idx + 1}` })}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 hover:border-indigo-400 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition shadow-xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-600" /> Camera
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {photoModalImages.length === 0 && (
                  <div className="col-span-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs">
                    No images uploaded yet. Click "Add Another Photo Slot" or upload/capture below.
                  </div>
                )}
              </div>
            </div>

            {/* Remarks Section after LR Images */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                LR Image & Document Remarks / Notes
              </label>
              <textarea
                value={photoModalRemarks}
                onChange={e => setPhotoModalRemarks(e.target.value)}
                placeholder="Enter remarks related to the uploaded LR images or inspection documents..."
                rows={3}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPhotoModalLR(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={savePhotoModal}
                disabled={savingPhotos}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-sm"
              >
                {savingPhotos ? 'Saving Photos & Remarks...' : 'Save Photos & Remarks to LR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CREATE / EDIT LR MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[93vh] flex flex-col">

            {/* modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 rounded-xl p-2"><FileText className="w-5 h-5 text-emerald-700" /></div>
                <div>
                  <h3 className="font-bold text-gray-800">{editingId ? 'Edit Lorry Receipt' : 'Create Lorry Receipt'}</h3>
                  <p className="text-xs text-gray-400">{step === 1 ? 'Select a dispatch order & target destination stop' : 'Fill LR details, upload unlimited images & enter remarks'}</p>
                </div>
              </div>
              {/* step indicator */}
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
                <span className="text-gray-300">—</span>
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5">

              {/* BATCH CREATION SUCCESS */}
              {batchLRs && batchLRs.length > 0 ? (
                <div className="py-6 space-y-4">
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Successfully Created {batchLRs.length} Individual LR Copies!</h4>
                      <p className="text-xs text-emerald-700">An individual Lorry Receipt copy has been generated for each destination stop.</p>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                    {batchLRs.map((lr, idx) => (
                      <div key={lr._id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 text-sm">
                        <div>
                          <span className="font-mono font-bold text-indigo-700 mr-3">{lr.lrNo}</span>
                          <span className="text-xs text-gray-600 font-medium">
                            Stop {idx + 1}: <strong className="text-emerald-700">{lr.from} → {lr.to}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPhotoModal(lr)}
                            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            <Camera className="w-3.5 h-3.5 text-indigo-600" /> Upload Photos & Remarks
                          </button>
                          <button
                            type="button"
                            onClick={() => generateLRPDF(lr)}
                            className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition border border-indigo-200"
                          >
                            <Download className="w-3.5 h-3.5" /> Download LR PDF
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button onClick={closeModal} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition">
                      Done
                    </button>
                  </div>
                </div>

              ) : createdLR ? (
                /* SINGLE SUCCESS STATE */
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="bg-emerald-50 rounded-full p-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">{editingId ? 'LR Updated Successfully!' : 'LR Created Successfully!'}</h4>
                  <p className="text-sm text-gray-500">LR Number: <span className="font-mono font-semibold text-indigo-700">{createdLR.lrNo}</span></p>
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => openPhotoModal(createdLR)}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition">
                      <Camera className="w-4 h-4" /> Manage Photos & Remarks
                    </button>
                    <button onClick={() => generateLRPDF(createdLR)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition">
                      <Download className="w-4 h-4" /> Download LR PDF
                    </button>
                    <button onClick={closeModal}
                      className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                      Close
                    </button>
                  </div>
                </div>

              ) : step === 1 ? (
                /* STEP 1: SELECT DISPATCH & DESTINATION STOP */
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Dispatch Order</label>
                    <select value={selectedDispatchId} onChange={e => handleDispatchSelect(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                      <option value="">— Choose a dispatch order —</option>
                      {dispatches.map(d => (
                        <option key={d._id} value={d._id}>
                          {d.dispatchNo} | Truck: {d.vehicle} | {d.from} → {d.to} | {d.goods}
                        </option>
                      ))}
                    </select>
                    {dispatches.length === 0 && (
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">No dispatch orders found. Create a dispatch order first.</p>
                    )}
                  </div>

                  {selectedDispatch && dispatchStops.length > 1 && (
                    <div className="border border-indigo-200 bg-indigo-50/70 rounded-xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Multi-Stop ({dispatchStops.length} Destinations)
                          </span>
                          <span className="text-xs font-semibold text-indigo-900">Choose Target Destination Stop:</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateAllStops}
                          disabled={saving}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-xs self-start sm:self-auto"
                        >
                          <Plus className="w-3.5 h-3.5" /> Auto-Create LRs for All {dispatchStops.length} Stops
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {dispatchStops.map((stop, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleStopSelect(stop, idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                              form.to === stop
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'
                            }`}
                          >
                            <span className="opacity-75">Stop {idx + 1}:</span>
                            <span>{stop}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleStopSelect(selectedDispatch.to, -1)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            form.to === selectedDispatch.to
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'
                          }`}
                        >
                          Combined Route ({selectedDispatch.to})
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedDispatch && (
                    <div className="border border-emerald-100 rounded-xl bg-emerald-50/50 p-4 space-y-3">
                      <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Auto-filled from dispatch</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                          ['Dispatch No',    selectedDispatch.dispatchNo],
                          ['Truck / Vehicle',selectedDispatch.vehicle],
                          ['Driver',         selectedDispatch.driver],
                          ['Origin (From)',  selectedDispatch.from],
                          ['Destination (To)', form.to || selectedDispatch.to],
                          ['Goods',          selectedDispatch.goods],
                          ['Weight (kg)',    selectedDispatch.weight || '—'],
                          ['Scheduled Date', selectedDispatch.scheduledDate ? new Date(selectedDispatch.scheduledDate).toLocaleDateString('en-IN') : '—'],
                        ].map(([lbl, val]) => (
                          <div key={lbl} className="flex gap-2">
                            <span className="text-xs text-gray-500 w-32 shrink-0">{lbl}:</span>
                            <span className="text-xs font-medium text-gray-800">{val || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">You can also skip dispatch selection and fill the form manually in Step 2.</p>
                </div>

              ) : (
                /* STEP 2: FULL LR FORM */
                <LRFormCtx.Provider value={{ form, setF }}>
                <div className="space-y-4">
                  {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

                  <Sec title="Header Information" color="emerald">
                    <div className="grid grid-cols-3 gap-3">
                      <Inp k="dispatchNo"           label="Dispatch No."           ph="DSP-0001" />
                      <Inp k="truckNumber"          label="Truck Number"           ph="KA-01-AB-1234" req />
                      <Inp k="driver"               label="Driver Name"            ph="Driver name" />
                      <Inp k="expectedDeliveryDate" label="Expected Delivery Date" type="date" />
                      <Inp k="from"                 label="Origin / From"          ph="City" req />
                      <Inp k="to"                   label="Destination / To (Stop)" ph="City" req />

                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Live Location Link
                          <span className="text-gray-400 font-normal">(Google Maps / tracking URL)</span>
                        </label>
                        <div className="flex gap-3 items-start">
                          <div className="flex-1 relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                              value={form.liveLocation}
                              onChange={e => setF('liveLocation', e.target.value)}
                              placeholder="Paste Google Maps or tracking URL…"
                              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                            {form.liveLocation && !liveQR && (
                              <p className="text-xs text-amber-500 mt-1">Generating QR…</p>
                            )}
                            {liveQR && (
                              <p className="text-xs text-emerald-600 mt-1">QR ready — will print in PDF top-right corner</p>
                            )}
                          </div>

                          {liveQR && (
                            <div className="shrink-0 border-2 border-emerald-200 rounded-xl p-1.5 bg-white shadow-sm">
                              <img src={liveQR} alt="QR preview" className="w-20 h-20 rounded-lg" />
                              <p className="text-center text-[10px] text-emerald-700 font-medium mt-1">Scan to track</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Sec>

                  {/* UNLIMITED CARGO & INSPECTION PHOTOS + REMARKS SECTION */}
                  <Sec title="Cargo & Inspection Verification Photos (Unlimited Uploads & Remarks)" color="indigo">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700">Uploaded Photos ({form.images?.length || 0})</span>
                        <button
                          type="button"
                          onClick={() => setForm(p => ({ ...p, images: [...(p.images || []), ''] }))}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Another Photo Slot
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {(form.images || []).map((imgVal, idx) => (
                          <div key={idx} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-700">Photo #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx, false)}
                                className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            </div>

                            {imgVal ? (
                              <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white aspect-video flex items-center justify-center">
                                <img src={imgVal} alt={`Upload ${idx + 1}`} className="max-h-28 w-full object-contain" />
                              </div>
                            ) : (
                              <div className="flex gap-2 pt-1">
                                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 hover:border-indigo-400 rounded-xl text-xs font-medium text-gray-700 cursor-pointer transition shadow-xs">
                                  <Upload className="w-3.5 h-3.5 text-indigo-600" /> Upload
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async e => {
                                      const file = e.target.files?.[0];
                                      if (file) await handleImageFile(idx, file, false);
                                      e.target.value = '';
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setCameraTarget({ idx, isPhotoModal: false, title: `Capture Photo #${idx + 1}` })}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 hover:border-indigo-400 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition shadow-xs"
                                >
                                  <Camera className="w-3.5 h-3.5 text-emerald-600" /> Camera
                                </button>
                              </div>
                            )}
                          </div>
                        ))}

                        {(!form.images || form.images.length === 0) && (
                          <div className="col-span-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs">
                            No photos added yet. Click "Add Another Photo Slot" above to attach images.
                          </div>
                        )}
                      </div>

                      {/* Remarks section after LR images */}
                      <div className="pt-2 border-t border-gray-200">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          LR Image & Document Remarks / Notes
                        </label>
                        <textarea
                          value={form.imageRemarks || form.remarks || ''}
                          onChange={e => {
                            setF('imageRemarks', e.target.value);
                            setF('remarks', e.target.value);
                          }}
                          placeholder="Enter remarks related to the uploaded LR images or documents..."
                          rows={2}
                          className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                      </div>
                    </div>
                  </Sec>

                  <Sec title="Consignor Details (Sender)" color="blue">
                    <div className="grid grid-cols-3 gap-3">
                      <Inp k="consignorName"    label="Consignor Name"    ph="Company / Person name" req />
                      <div className="col-span-2"><Inp k="consignorAddress" label="Consignor Address" ph="Full address" /></div>
                      <Inp k="consignorGST"     label="Consignor GST No." ph="22AAAAA0000A1Z5" />
                    </div>
                  </Sec>

                  <Sec title="Consignee Details (Receiver)" color="sky">
                    <div className="grid grid-cols-3 gap-3">
                      <Inp k="consigneeName"    label="Consignee Name"    ph="Company / Person name" req />
                      <div className="col-span-2"><Inp k="consigneeAddress" label="Consignee Address" ph="Full address" /></div>
                      <Inp k="consigneeGST"     label="Consignee GST No." ph="22AAAAA0000A1Z5" />
                    </div>
                  </Sec>

                  <Sec title="GST Details" color="amber">
                    <div className="grid grid-cols-3 gap-3">
                      <Sel k="serviceTaxPayableBy" label="Service Tax Payable By"
                        options={['Consignor', 'Consignee', 'Transporter']} />
                      <Inp k="sgstPct" label="SGST %" type="number" ph="0" />
                      <Inp k="cgstPct" label="CGST %" type="number" ph="0" />
                      <Inp k="igstPct" label="IGST %" type="number" ph="0" />
                    </div>
                  </Sec>

                  <Sec title="Shipment Details" color="violet">
                    <div className="grid grid-cols-3 gap-3">
                      <Inp k="shipmentNumber"  label="Shipment Number"    ph="SHP-001" />
                      <Inp k="insurancePolicy" label="Insurance Policy No." ph="Policy number" />
                      <Inp k="packingCount"    label="No. of Packing"     type="number" ph="0" />
                      <Inp k="packingType"     label="Type of Packing"    ph="e.g. Bags, Boxes" />
                      <Inp k="dimensions"      label="Dimensions"         ph="e.g. 100×50×50 cm" />
                      <Inp k="privateMarking"  label="Private Marking"    ph="e.g. P.M. 001" />
                      <div className="col-span-2"><Inp k="goods" label="Goods / Commodity" ph="e.g. 50 bags of rice" req /></div>
                      <Inp k="description"     label="Description"        ph="Additional description" />
                      <Inp k="sealNumber"      label="Seal Number"        ph="Seal no." />
                    </div>
                  </Sec>

                  <Sec title="Weight Details" color="emerald">
                    <div className="grid grid-cols-2 gap-3">
                      <Inp k="actualWeight"  label="Actual Weight (kg)"  type="number" ph="0" />
                      <Inp k="chargedWeight" label="Charged Weight (kg)" type="number" ph="0" />
                    </div>
                  </Sec>

                  <Sec title="Invoice & Vehicle Details" color="indigo">
                    <div className="grid grid-cols-2 gap-3">
                      <Inp k="invoiceNumber" label="Invoice Number"      ph="INV-001" />
                      <Inp k="invoiceValue"  label="Invoice Value (₹)"   type="number" ph="0" />
                      <Inp k="vehicleType"   label="Vehicle Type"        ph="e.g. 10T Truck" />
                      <Sel k="basisOfBooking" label="Basis of Booking"
                        options={['Fixed', 'Per KM', 'Per Ton', 'Per Trip']} />
                    </div>
                  </Sec>

                  <Sec title="Freight Charges" color="rose">
                    <div className="grid grid-cols-3 gap-3">
                      <Inp k="freightCharges"  label="Freight Charges (₹)"  type="number" ph="0" />
                      <Inp k="handlingCharges" label="Handling Charges (₹)" type="number" ph="0" />
                      <Inp k="deliveryCharges" label="Delivery Charges (₹)" type="number" ph="0" />
                      <Inp k="tollCharges"     label="Toll Charges (₹)"     type="number" ph="0" />
                      <Inp k="miscCharges"     label="Misc Charges (₹)"     type="number" ph="0" />
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Grand Total (₹) <span className="text-gray-400">(auto)</span></label>
                        <div className="w-full px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-emerald-50 text-emerald-800 font-bold">
                          ₹ {form.grandTotal || '0.00'}
                        </div>
                      </div>
                    </div>
                  </Sec>

                  <Sec title="Payment & POD" color="emerald">
                    <div className="grid grid-cols-2 gap-3">
                      <Sel k="paymentType" label="Payment Type" options={['Cash', 'Cheque', 'ToPay']} req />
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">POD Details</label>
                        <textarea value={form.podDetails} onChange={e => setF('podDetails', e.target.value)}
                          placeholder="Proof of delivery details..." rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                    </div>
                  </Sec>
                </div>
                </LRFormCtx.Provider>
              )}
            </div>

            {/* modal footer */}
            {!createdLR && !batchLRs && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50 rounded-b-2xl">
                {step === 1 ? (
                  <>
                    <button onClick={closeModal}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={() => { setStep(2); setError(''); }}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition">
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setStep(1)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                      ← Back
                    </button>
                    <button onClick={handleCreate} disabled={saving}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition">
                      {saving ? (editingId ? 'Updating…' : 'Creating…') : (editingId ? 'Update LR' : 'Create LR')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIVE CAMERA CAPTURE MODAL */}
      {cameraTarget && (
        <CameraCapture
          title={cameraTarget.title || 'Capture Inspection Photo'}
          onCapture={async (file, dataUrl) => {
            await handleImageFile(cameraTarget.idx, dataUrl || file, cameraTarget.isPhotoModal);
            setCameraTarget(null);
          }}
          onClose={() => setCameraTarget(null)}
        />
      )}
    </div>
  );
};

export default LRCreation;
