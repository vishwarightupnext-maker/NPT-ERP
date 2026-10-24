import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Receipt, Plus, X, Trash2, Download, PlusCircle, MinusCircle, Search, CheckSquare, Square, FileCheck, Calendar } from 'lucide-react';
import { jsPDF } from 'jspdf';
import logoUrl from '../../../assets/logo1.jpeg';
import { fetchInvoices, deleteInvoice } from '../../../store/slices/invoiceSlice';
import api from '../../../api/axios';
import Pagination from '../../../components/Pagination';

// ── Helpers ──────────────────────────
function amountInWords(n) {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const tw = x => {
    if (!x) return '';
    if (x < 20) return a[x];
    if (x < 100) return b[Math.floor(x/10)] + (x%10 ? ' '+a[x%10] : '');
    if (x < 1000) return a[Math.floor(x/100)] + ' Hundred' + (x%100 ? ' '+tw(x%100) : '');
    if (x < 100000) return tw(Math.floor(x/1000)) + ' Thousand' + (x%1000 ? ' '+tw(x%1000) : '');
    if (x < 10000000) return tw(Math.floor(x/100000)) + ' Lakh' + (x%100000 ? ' '+tw(x%100000) : '');
    return tw(Math.floor(x/10000000)) + ' Crore' + (x%10000000 ? ' '+tw(x%10000000) : '');
  };
  return 'Rs. ' + (tw(Math.floor(n)) || 'Zero') + ' Only';
}

// ── Convert image URL to base64 for jsPDF ─────────────────────────────────────
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

// ── PDF generator — A4 Portrait ───────────────────────────────────────────────
async function generateInvoicePDF(inv, withGst = true) {
  // A4 portrait: 210 × 297 mm
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ML = 8, MR = 202, MT = 8;
  const PW = MR - ML; // 194

  const brandName = withGst ? 'NEW POPULAR TRANSPORT PVT LTD' : 'NEW POPULAR TRANSPORT';
  const sigBrandName = withGst ? 'New Popular Transport PVT LTD' : 'New Popular Transport';

  // Load company logo
  let logoB64 = null;
  try { logoB64 = await imgToBase64(logoUrl); } catch (e) { console.warn('Logo load failed:', e); }

  doc.setDrawColor(0); doc.setTextColor(0); doc.setLineWidth(0.4);
  const bold = () => doc.setFont('helvetica', 'bold');
  const norm = () => doc.setFont('helvetica', 'normal');
  const sz   = n  => doc.setFontSize(n);
  const tx   = (s, x, y, o) => doc.text(String(s ?? ''), x, y, o);
  const ln   = (x1,y1,x2,y2) => doc.line(x1, y1, x2, y2);
  const bx   = (x, y, w, h)  => doc.rect(x, y, w, h, 'S');
  const fd   = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  let y = MT;

  /* ═══ 1. HEADER ══════════════════════════════════════════════════════════ */
  const H1 = 26;
  bx(ML, y, PW, H1);

  // Logo sub-box (left 24 mm)
  const LOGO_W = 24;
  ln(ML + LOGO_W, y, ML + LOGO_W, y + H1);
  if (logoB64) {
    doc.addImage(logoB64, 'JPEG', ML + 1, y + 1, LOGO_W - 2, H1 - 2);
  } else {
    bold(); sz(6.5);
    tx('NEW POPULAR', ML + LOGO_W / 2, y + 9, { align: 'center' });
    tx('TRANSPORT',   ML + LOGO_W / 2, y + 14, { align: 'center' });
    if (withGst) tx('PVT LTD', ML + LOGO_W / 2, y + 19, { align: 'center' });
    norm();
  }

  // Company info — centered between logo box and right invoice box
  const invBoxX = ML + PW * 0.60;
  ln(invBoxX, y, invBoxX, y + H1);
  const compCX = ML + LOGO_W + (invBoxX - ML - LOGO_W) / 2;

  bold(); sz(withGst ? 10 : 11);
  tx(brandName, compCX, y + 7, { align: 'center' });
  norm(); sz(6);
  tx('No.1/262, Kamatchi Amman Koil St, Sathiyamangalam,', compCX, y + 12, { align: 'center' });
  tx('Erode Dt - 638401, Tamil Nadu', compCX, y + 16, { align: 'center' });
  tx('Ph : 9843117777 / 9843227777', compCX, y + 20, { align: 'center' });
  if (withGst) {
    tx('GST No : 33AACFN0960K1ZN', compCX, y + 24, { align: 'center' });
  }

  // Invoice info (right ~40%)
  bold(); sz(6);
  tx('Invoice No :', invBoxX + 2, y + 7);
  tx('Date :', invBoxX + 2, y + 13);
  if (withGst) tx('GST No :', invBoxX + 2, y + 19);
  norm(); sz(6.5);
  tx(inv.invoiceNo || '', invBoxX + 24, y + 7);
  tx(fd(inv.invoiceDate), invBoxX + 24, y + 13);
  if (withGst) tx('33AACFN0960K1ZN', invBoxX + 24, y + 19);
  y += H1;

  /* ═══ 2. BILL TO ═════════════════════════════════════════════════════════ */
  const ADDR_LINE_H = 4.5;
  const addrLines = doc.splitTextToSize(inv.billToAddress || '', PW * 0.65);
  const H2 = Math.max(22, 16 + addrLines.length * ADDR_LINE_H + (withGst ? 8 : 4));
  bx(ML, y, PW, H2);
  bold(); sz(6.5); tx('Bill To :', ML + 2, y + 5);
  bold(); sz(8.5); tx(inv.billTo || '', ML + 2, y + 11);
  norm(); sz(6);
  let addrCurY = y + 16;
  addrLines.forEach(line => { tx(line, ML + 2, addrCurY); addrCurY += ADDR_LINE_H; });
  if (withGst) {
    const gstY = addrLines.length > 0 ? addrCurY + 0.5 : y + 16;
    bold(); sz(6);  tx('GST No :', ML + 2, gstY);
    norm(); sz(6);  tx(inv.billToGST || '', ML + 22, gstY);
  }
  y += H2;

  /* ═══ 3. TABLE ═══════════════════════════════════════════════════════════ */
  const cols = [
    { label: 'S.\nNO',        w: 6  },
    { label: 'TRUCK\nNO',     w: 15 },
    { label: 'LR\nNO',        w: 13 },
    { label: 'LR\nDATE',      w: 14 },
    { label: 'INV\nNO',       w: 13 },
    { label: 'INV\nDATE',     w: 14 },
    { label: 'DEALER\nNAME',  w: 23 },
    { label: 'DESTINATION',   w: 21 },
    { label: 'ST',            w: 7  },
    { label: 'QTY',           w: 7  },
    { label: 'Google\nKm',    w: 12 },
    { label: 'Agreed\nRate',  w: 12 },
    { label: 'Total\nCost',   w: 11 },
    { label: 'Rate\nPer 100', w: 11 },
    { label: 'TOTAL\nAMT',    w: 15 },
  ];

  const TH = 12;
  bx(ML, y, PW, TH);
  let cx = ML;
  cols.forEach((c, i) => {
    if (i > 0) { doc.setLineWidth(0.2); ln(cx, y, cx, y + TH); doc.setLineWidth(0.4); }
    const lines = c.label.split('\n');
    bold(); sz(4.8);
    if (lines.length === 1) {
      tx(lines[0], cx + c.w / 2, y + TH / 2 + 1.5, { align: 'center' });
    } else {
      tx(lines[0], cx + c.w / 2, y + TH / 2 - 0.8, { align: 'center' });
      tx(lines[1], cx + c.w / 2, y + TH / 2 + 3.2, { align: 'center' });
    }
    cx += c.w;
  });
  y += TH;

  const ROW_H = 8;
  const rows = inv.rows || [];
  const numRows = Math.max(rows.length, 5);
  const numericCols = new Set([0, 9, 10, 11, 12, 13, 14]);

  for (let ri = 0; ri < numRows; ri++) {
    const row = rows[ri] || {};
    bx(ML, y, PW, ROW_H);
    cx = ML;
    const cells = [
      ri < rows.length ? String(ri + 1) : '',
      row.truckNo || '', row.lrNo || '', fd(row.lrDate),
      row.invNo || '', fd(row.invDate),
      row.dealerName || '', row.destination || '', row.st || '',
      row.qty != null ? String(row.qty) : '',
      row.googleKm != null ? String(row.googleKm) : '',
      row.agreedRate != null ? String(row.agreedRate) : '',
      row.totalCost != null ? String(row.totalCost) : '',
      row.ratePer100 != null ? String(row.ratePer100) : '',
      row.totalAmount ? Number(row.totalAmount).toLocaleString('en-IN') : '',
    ];
    cols.forEach((c, i) => {
      if (i > 0) { doc.setLineWidth(0.15); ln(cx, y, cx, y + ROW_H); doc.setLineWidth(0.4); }
      norm(); sz(5.5);
      if (numericCols.has(i)) {
        tx(cells[i], cx + c.w - 1.2, y + ROW_H / 2 + 1.5, { align: 'right' });
      } else {
        const wrapped = doc.splitTextToSize(cells[i], c.w - 1.5);
        tx(wrapped[0] || '', cx + 1, y + ROW_H / 2 + 1.5);
      }
      cx += c.w;
    });
    y += ROW_H;
  }

  /* ═══ 4. GST NOTE + TOTALS ═══════════════════════════════════════════════ */
  const T_H = 7;
  const TOT_W = 85;
  const totX = MR - TOT_W;

  const subtotalVal = Number(inv.subtotal || 0);
  const multiDeliveryVal = Number(inv.multiDelivery || 0);

  let tRows = [];
  let grandTotalAmount = 0;

  if (withGst) {
    grandTotalAmount = Number(inv.grandTotal || 0);
    tRows = [
      ['Multi Delivery :', multiDeliveryVal ? multiDeliveryVal.toLocaleString('en-IN') : '—'],
      ['Total :', subtotalVal.toLocaleString('en-IN')],
      [`SGST ${inv.sgstPct || 0}% :`, Number(inv.sgstAmount || 0).toLocaleString('en-IN')],
      [`CGST ${inv.cgstPct || 0}% :`, Number(inv.cgstAmount || 0).toLocaleString('en-IN')],
      ['GRAND TOTAL :', grandTotalAmount.toLocaleString('en-IN')],
    ];
  } else {
    grandTotalAmount = subtotalVal + multiDeliveryVal;
    tRows = [
      ['Multi Delivery :', multiDeliveryVal ? multiDeliveryVal.toLocaleString('en-IN') : '—'],
      ['Subtotal :', subtotalVal.toLocaleString('en-IN')],
      ['TOTAL AMOUNT :', grandTotalAmount.toLocaleString('en-IN')],
    ];
  }

  const totalsBlockH = tRows.length * T_H;

  bx(ML, y, totX - ML, totalsBlockH);
  norm(); sz(6);
  if (withGst) {
    tx('G.S.T. : Payable by the Customer Under RCM 5%', ML + 2, y + totalsBlockH / 2 + 1.5);
  } else {
    tx('Non-GST Freight Bill', ML + 2, y + totalsBlockH / 2 + 1.5);
  }

  tRows.forEach(([label, val], i) => {
    const isGrand = i === tRows.length - 1;
    if (isGrand) { doc.setFillColor(225, 225, 225); doc.rect(totX, y, TOT_W, T_H, 'FD'); doc.setFillColor(255, 255, 255); }
    else bx(totX, y, TOT_W, T_H);
    const splitX = totX + 50;
    doc.setLineWidth(0.2); ln(splitX, y, splitX, y + T_H); doc.setLineWidth(0.4);
    sz(6); isGrand ? bold() : norm();
    tx(label, splitX - 1.5, y + T_H / 2 + 1.5, { align: 'right' });
    bold(); sz(isGrand ? 7 : 6);
    tx(val, totX + TOT_W - 1.5, y + T_H / 2 + 1.5, { align: 'right' });
    y += T_H;
  });

  /* ═══ 5. AMOUNT IN WORDS ═════════════════════════════════════════════════ */
  const AIW_H = 9;
  bx(ML, y, PW, AIW_H);
  bold(); sz(6.5); tx('Amount in Words :', ML + 2, y + AIW_H / 2 + 1.5);
  norm(); sz(6.5);
  const wordsText = amountInWords(grandTotalAmount);
  tx(wordsText, ML + 42, y + AIW_H / 2 + 1.5);
  y += AIW_H;

  /* ═══ 6. REMARKS ═════════════════════════════════════════════════════════ */
  const REM_H = 10;
  bx(ML, y, PW, REM_H);
  bold(); sz(6.5); tx('Remarks :', ML + 2, y + 4.5);
  norm(); sz(6.5); tx(inv.remarks || '', ML + 24, y + 4.5);
  if (inv.remarks) {
    norm(); sz(6); tx('Rate : As per Contract Norms', ML + 2, y + 8.5);
  }
  y += REM_H;

  /* ═══ 7. BANK DETAILS ════════════════════════════════════════════════════ */
  const BANK_H = 22;
  const bankW = PW * 0.55;
  const sigBankX = ML + bankW;
  bx(ML, y, bankW, BANK_H);
  ln(sigBankX, y, sigBankX, y + BANK_H);
  bx(sigBankX, y, PW - bankW, BANK_H);

  bold(); sz(6.5); tx('Bank Details :', ML + 2, y + 5);
  norm(); sz(6);
  tx(`Account Name : ${inv.bankAccountName || '—'}`, ML + 2, y + 10);
  tx(`Account No   : ${inv.bankAccountNo || '—'}`, ML + 2, y + 14);
  tx(`Bank Name    : ${inv.bankName || '—'}  |  Branch : ${inv.branchName || '—'}`, ML + 2, y + 18);
  tx(`IFSC         : ${inv.ifsc || '—'}`, ML + 2, y + 21.5);

  // Signature
  bold(); sz(6.5); tx('AUTHORISED SIGNATURE', sigBankX + (PW - bankW) / 2, y + 6, { align: 'center' });
  bold(); sz(7);   tx(sigBrandName, sigBankX + (PW - bankW) / 2, y + BANK_H - 3, { align: 'center' });
  y += BANK_H;

  /* ═══ 8. FOOTER CONTACT BAR ══════════════════════════════════════════════ */
  const FOOT_H = 7;
  doc.setFillColor(30, 80, 160);
  doc.rect(ML, y, PW, FOOT_H, 'F');
  doc.setTextColor(255, 255, 255);
  bold(); sz(5.5);
  tx('9843117777 / 9843227777', ML + PW / 2, y + FOOT_H / 2 + 1.5, { align: 'center' });
  norm(); sz(5);

  doc.setTextColor(0, 0, 0);

  const pdfFilename = `${inv.invoiceNo || 'Invoice'}_${withGst ? 'GST' : 'NO_GST'}.pdf`;
  doc.save(pdfFilename);
}

function generateCombinedInvoicesPDF(selectedInvoices) {
  if (!selectedInvoices || selectedInvoices.length === 0) return;
  const doc = new jsPDF('p', 'mm', 'a4');
  const ML = 10, PW = 190;
  let y = 12;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(30, 80, 160);
  doc.text('NEW POPULAR TRANSPORT', ML, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('CONSOLIDATED INVOICE SUMMARY REPORT', ML, y);
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, ML + PW, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(ML, y, ML + PW, y);
  y += 6;

  // Summary Table Header
  doc.setFillColor(240, 245, 255);
  doc.rect(ML, y, PW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text('Invoice No', ML + 2, y + 4.5);
  doc.text('Date', ML + 35, y + 4.5);
  doc.text('Bill To Customer', ML + 60, y + 4.5);
  doc.text('SGST (₹)', ML + 120, y + 4.5, { align: 'right' });
  doc.text('CGST (₹)', ML + 145, y + 4.5, { align: 'right' });
  doc.text('Grand Total (₹)', ML + PW - 2, y + 4.5, { align: 'right' });
  y += 7;

  let totalSGST = 0, totalCGST = 0, totalGrand = 0;

  selectedInvoices.forEach((inv) => {
    if (y > 270) {
      doc.addPage();
      y = 12;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(inv.invoiceNo || '—', ML + 2, y + 4.5);
    doc.text(inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '—', ML + 35, y + 4.5);
    doc.text(inv.billTo || '—', ML + 60, y + 4.5);
    
    const sgst = Number(inv.sgstAmount || 0);
    const cgst = Number(inv.cgstAmount || 0);
    const grand = Number(inv.grandTotal || 0);

    totalSGST += sgst;
    totalCGST += cgst;
    totalGrand += grand;

    doc.text(sgst.toLocaleString('en-IN'), ML + 120, y + 4.5, { align: 'right' });
    doc.text(cgst.toLocaleString('en-IN'), ML + 145, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(grand.toLocaleString('en-IN'), ML + PW - 2, y + 4.5, { align: 'right' });

    doc.setDrawColor(240, 240, 240);
    doc.line(ML, y + 6, ML + PW, y + 6);
    y += 6;
  });

  // Grand Total Block
  y += 4;
  doc.setFillColor(235, 243, 255);
  doc.rect(ML, y, PW, 9, 'F');
  doc.setDrawColor(30, 80, 160);
  doc.rect(ML, y, PW, 9, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 80, 160);
  doc.text(`TOTAL SELECTED INVOICES: ${selectedInvoices.length}`, ML + 3, y + 6);
  doc.text(`TOTAL AMOUNT: ₹${totalGrand.toLocaleString('en-IN')}`, ML + PW - 3, y + 6, { align: 'right' });

  doc.save(`Consolidated_Invoices_${Date.now()}.pdf`);
}

// ── Constants ──────────────────────────────────────────────────────────────────
const EMPTY_ROW = {
  truckNo: '', lrNo: '', lrDate: '', invNo: '', invDate: '',
  dealerName: '', destination: '', st: '', qty: '', googleKm: '',
  agreedRate: '', totalCost: '', ratePer100: '', totalAmount: '',
};

const EMPTY_FORM = {
  invoiceDate: new Date().toISOString().split('T')[0],
  billTo: '', billToAddress: '', billToGST: '',
  rows: [{ ...EMPTY_ROW }],
  multiDelivery: '',
  sgstPct: '2.5', cgstPct: '2.5',
  bankAccountName: 'New Popular Transport',
  bankAccountNo: '', bankName: '', branchName: '', ifsc: '',
  remarks: '',
};

const STATUS_COLOR = {
  Draft:   'bg-gray-100 text-gray-600',
  Sent:    'bg-blue-50 text-blue-700',
  Paid:    'bg-green-50 text-green-700',
  Overdue: 'bg-red-50 text-red-700',
};

// ── Component ──────────────────────────────────────────────────────────────────
const InvoiceCreation = () => {
  const reduxDispatch = useDispatch();
  const { list, loading } = useSelector(s => s.invoices);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [savedInv, setSavedInv]   = useState(null);

  // Pagination, Search, Date & Selection state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [quickDateFilter, setQuickDateFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => { reduxDispatch(fetchInvoices()); }, [reduxDispatch]);

  const handlePresetClick = (preset) => {
    setQuickDateFilter(preset);
    setCurrentPage(1);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (preset === 'All') {
      setFromDateFilter('');
      setToDateFilter('');
    } else if (preset === 'Today') {
      setFromDateFilter(todayStr);
      setToDateFilter(todayStr);
    } else if (preset === 'This Month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setFromDateFilter(firstDay);
      setToDateFilter(todayStr);
    }
  };

  const clearDateFilters = () => {
    setFromDateFilter('');
    setToDateFilter('');
    setQuickDateFilter('All');
    setCurrentPage(1);
  };

  // ── Derived totals ──────────────────────────────────────────────────────────
  const rowsTotal  = form.rows.reduce((s, r) => s + (parseFloat(r.totalAmount) || 0), 0);
  const subtotal   = rowsTotal + (parseFloat(form.multiDelivery) || 0);
  const sgstAmt    = parseFloat(((subtotal * (parseFloat(form.sgstPct) || 0)) / 100).toFixed(2));
  const cgstAmt    = parseFloat(((subtotal * (parseFloat(form.cgstPct) || 0)) / 100).toFixed(2));
  const grandTotal = parseFloat((subtotal + sgstAmt + cgstAmt).toFixed(2));

  const setF   = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const addRow = ()     => setForm(p => ({ ...p, rows: [...p.rows, { ...EMPTY_ROW }] }));
  const removeRow = i   => setForm(p => ({ ...p, rows: p.rows.filter((_, j) => j !== i) }));

  const setRow = (i, k, v) => {
    setForm(p => {
      const rows = [...p.rows];
      rows[i] = { ...rows[i], [k]: v };
      // Auto-calc totalCost when qty or agreedRate changes
      if (k === 'qty' || k === 'agreedRate') {
        const qty  = parseFloat(k === 'qty'        ? v : rows[i].qty)        || 0;
        const rate = parseFloat(k === 'agreedRate' ? v : rows[i].agreedRate) || 0;
        const tc   = qty && rate ? (qty * rate).toFixed(2) : rows[i].totalCost;
        rows[i].totalCost   = tc;
        rows[i].totalAmount = tc;
      }
      if (k === 'totalCost') rows[i].totalAmount = v;
      return { ...p, rows };
    });
  };

  const openModal  = () => { setShowModal(true); setForm(EMPTY_FORM); setError(''); setSavedInv(null); };
  const closeModal = () => { setShowModal(false); setSavedInv(null); };

  const handleSave = async () => {
    if (!form.billTo.trim()) { setError('Bill To (company name) is required.'); return; }
    if (!form.rows.some(r => r.truckNo || r.lrNo)) {
      setError('At least one row must have a Truck No or LR No.'); return;
    }
    setSaving(true); setError('');
    try {
      const { data } = await api.post('/invoices', {
        ...form,
        subtotal,
        sgstPct:    parseFloat(form.sgstPct)  || 0,
        cgstPct:    parseFloat(form.cgstPct)  || 0,
        sgstAmount: sgstAmt,
        cgstAmount: cgstAmt,
        grandTotal,
      });
      setSavedInv({ ...data, subtotal, sgstAmount: sgstAmt, cgstAmount: cgstAmt, grandTotal });
      reduxDispatch(fetchInvoices());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create invoice.');
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this invoice?')) return;
    await reduxDispatch(deleteInvoice(id)).unwrap().catch(() => {});
    reduxDispatch(fetchInvoices());
  };

  const filteredList = list.filter(inv => {
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    
    let matchesDate = true;
    const rawDate = inv.invoiceDate || inv.createdAt;
    if (rawDate) {
      const invDateStr = new Date(rawDate).toISOString().slice(0, 10);
      if (fromDateFilter && invDateStr < fromDateFilter) matchesDate = false;
      if (toDateFilter && invDateStr > toDateFilter) matchesDate = false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus && matchesDate;
    return matchesStatus && matchesDate && (
      (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(q)) ||
      (inv.billTo && inv.billTo.toLowerCase().includes(q)) ||
      (inv.billToGST && inv.billToGST.toLowerCase().includes(q)) ||
      (inv.status && inv.status.toLowerCase().includes(q))
    );
  });

  const selectedInvoices = list.filter(inv => selectedIds.includes(inv._id));
  const selectedTotal = selectedInvoices.reduce((s, inv) => s + (Number(inv.grandTotal) || 0), 0);

  const toggleSelect = (id) => {
    setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredList.map(inv => inv._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(p => p.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(p => Array.from(new Set([...p, ...visibleIds])));
    }
  };

  const handleBatchDownloadPDFs = (withGst = true) => {
    if (selectedInvoices.length === 0) return;
    selectedInvoices.forEach((inv, index) => {
      setTimeout(() => {
        generateInvoicePDF(inv, withGst);
      }, index * 300);
    });
  };

  const handleDownloadCombinedPDF = () => {
    generateCombinedInvoicesPDF(selectedInvoices);
  };

  const cls   = 'w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white';
  const clsLg = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

  return (
    <div className="space-y-4">

      {/* Modern Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search & Status */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search Invoice No, Bill To Customer, GST No..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition"
            >
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <button onClick={openModal}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-sm whitespace-nowrap">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>

        {/* Modern Date Filter Bar */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-gray-100 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            <span className="flex items-center gap-1.5 text-gray-600 font-semibold px-2.5 py-1 bg-gray-100 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Date Filter:
            </span>
            
            {/* Presets Chips */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200/60">
              {['All', 'Today', 'This Month'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    quickDateFilter === preset && !fromDateFilter && !toDateFilter
                      ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1 rounded-xl">
              <span className="text-gray-400 text-[11px] font-medium">From:</span>
              <input
                type="date"
                value={fromDateFilter}
                onChange={e => { setFromDateFilter(e.target.value); setQuickDateFilter('Custom'); setCurrentPage(1); }}
                className="bg-transparent text-xs text-gray-700 focus:outline-none"
              />
              <span className="text-gray-400 text-[11px] font-medium">To:</span>
              <input
                type="date"
                value={toDateFilter}
                onChange={e => { setToDateFilter(e.target.value); setQuickDateFilter('Custom'); setCurrentPage(1); }}
                className="bg-transparent text-xs text-gray-700 focus:outline-none"
              />
              {(fromDateFilter || toDateFilter) && (
                <button
                  onClick={clearDateFilters}
                  className="text-gray-400 hover:text-red-500 font-bold ml-1 text-xs"
                  title="Clear Date Filter"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {(fromDateFilter || toDateFilter || statusFilter !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('All');
                clearDateFilters();
              }}
              className="text-xs text-red-600 hover:text-red-700 font-medium px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Selected Items Batch Action Banner */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-700 p-2 rounded-xl">
              <FileCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-sm">{selectedIds.length} Invoice{selectedIds.length !== 1 ? 's' : ''} Selected</p>
              <p className="text-xs text-indigo-200">Combined Total: <strong className="text-emerald-300 font-mono text-sm">₹{selectedTotal.toLocaleString('en-IN')}</strong></p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBatchDownloadPDFs(true)}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3.5 py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download GST PDFs (PVT LTD)
            </button>
            <button
              onClick={() => handleBatchDownloadPDFs(false)}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-3.5 py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Download No GST PDFs
            </button>
            <button
              onClick={handleDownloadCombinedPDF}
              className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-white font-semibold px-3.5 py-2 rounded-xl text-xs transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Summary Report
            </button>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="bg-indigo-50 rounded-xl p-2.5"><Receipt className="w-5 h-5 text-indigo-700" /></div>
          <div>
            <h2 className="font-bold text-gray-800">Transport Invoices</h2>
            <p className="text-xs text-gray-400">NEW POPULAR TRANSPORT — freight invoices</p>
          </div>
          <span className="ml-auto text-xs text-gray-400">{filteredList.length} invoice{filteredList.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && filteredList.every(inv => selectedIds.includes(inv._id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                {['Invoice No.','Date','Bill To','LR Rows','Grand Total','SGST','CGST','Status',''].map(h =>
                  <th key={h} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>}
              {!loading && filteredList.length === 0 && <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">No invoices match search/filter.</td></tr>}
              {filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(inv => {
                const isSelected = selectedIds.includes(inv._id);
                return (
                  <tr key={inv._id} className={`hover:bg-gray-50 transition ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(inv._id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-indigo-700">{inv.invoiceNo}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-5 py-4 text-gray-700">{inv.billTo}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs text-center">{(inv.rows||[]).length}</td>
                    <td className="px-5 py-4 text-gray-700 font-medium">₹{Number(inv.grandTotal||0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">₹{Number(inv.sgstAmount||0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">₹{Number(inv.cgstAmount||0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLOR[inv.status]||'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => generateInvoicePDF(inv, true)}
                          title="Download GST PDF (PVT LTD)"
                          className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 text-[11px] font-semibold px-2 py-1 rounded-lg transition"
                        >
                          <Download className="w-3 h-3 text-emerald-600" /> GST PDF
                        </button>
                        <button
                          onClick={() => generateInvoicePDF(inv, false)}
                          title="Download Non-GST PDF"
                          className="flex items-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-medium px-2 py-1 rounded-lg transition"
                        >
                          <Download className="w-3 h-3 text-gray-500" /> No GST PDF
                        </button>
                        <button
                          onClick={() => handleDelete(inv._id)}
                          title="Delete"
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-1"
                        >
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

      {/* ── MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 rounded-xl p-2"><Receipt className="w-5 h-5 text-emerald-700" /></div>
                <div>
                  <h3 className="font-bold text-gray-800">New Transport Invoice</h3>
                  <p className="text-xs text-gray-400">NEW POPULAR TRANSPORT — fill LR rows and bill-to details</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {savedInv ? (
                /* ── SUCCESS ── */
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="bg-emerald-50 rounded-full p-4"><Receipt className="w-10 h-10 text-emerald-600" /></div>
                  <h4 className="text-lg font-bold text-gray-800">Invoice Created!</h4>
                  <p className="text-sm text-gray-500">
                    Invoice No: <span className="font-mono font-semibold text-indigo-700">{savedInv.invoiceNo}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Grand Total: <span className="font-semibold text-emerald-700">₹{Number(savedInv.grandTotal).toLocaleString('en-IN')}</span>
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    <button
                      onClick={() => generateInvoicePDF(savedInv, true)}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Download GST PDF (PVT LTD)
                    </button>
                    <button
                      onClick={() => generateInvoicePDF(savedInv, false)}
                      className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Download No GST PDF
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

                  {/* Bill To + Invoice Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b bg-blue-50 text-blue-800 border-blue-200">Bill To</div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Company Name <span className="text-red-500">*</span></label>
                          <input value={form.billTo} onChange={e => setF('billTo', e.target.value)}
                            className={clsLg} placeholder="Customer company name" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">GST No.</label>
                          <input value={form.billToGST} onChange={e => setF('billToGST', e.target.value)}
                            className={clsLg} placeholder="22AAAAA0000A1Z5" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                          <textarea value={form.billToAddress} onChange={e => setF('billToAddress', e.target.value)}
                            rows={2} placeholder="Full address"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b bg-emerald-50 text-emerald-800 border-emerald-200">Invoice Info</div>
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
                          <input type="date" value={form.invoiceDate} onChange={e => setF('invoiceDate', e.target.value)} className={clsLg} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Multi Delivery Amount (₹)</label>
                          <input type="number" value={form.multiDelivery} onChange={e => setF('multiDelivery', e.target.value)}
                            className={clsLg} placeholder="0" min={0} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">SGST %</label>
                            <input type="number" value={form.sgstPct} onChange={e => setF('sgstPct', e.target.value)}
                              className={clsLg} placeholder="2.5" min={0} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">CGST %</label>
                            <input type="number" value={form.cgstPct} onChange={e => setF('cgstPct', e.target.value)}
                              className={clsLg} placeholder="2.5" min={0} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LR Rows */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b bg-violet-50 border-violet-200">
                      <span className="text-xs font-semibold uppercase tracking-wider text-violet-800">LR Rows</span>
                      <button onClick={addRow}
                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition">
                        <PlusCircle className="w-3.5 h-3.5" /> Add Row
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500 uppercase">
                          <tr>
                            <th className="px-2 py-2 text-left font-semibold">#</th>
                            {[['Truck No','80px'],['LR No','80px'],['LR Date','110px'],['Inv No','80px'],['Inv Date','110px'],
                              ['Dealer Name','110px'],['Destination','100px'],['ST','50px'],['QTY','60px'],
                              ['Google km','70px'],['Agreed Rate','80px'],['Total Cost','80px'],['Rate/100','70px'],['Total Amt','80px']].map(([h,w]) =>
                              <th key={h} className="px-1.5 py-2 text-left font-semibold whitespace-nowrap" style={{ minWidth: w }}>{h}</th>)}
                            <th className="px-2 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {form.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50/80">
                              <td className="px-2 py-1.5 text-gray-400 font-medium text-center">{i+1}</td>
                              {[
                                ['truckNo','text','Truck No'],['lrNo','text','LR No'],
                                ['lrDate','date',''],['invNo','text','Inv No'],['invDate','date',''],
                                ['dealerName','text','Dealer'],['destination','text','Dest.'],['st','text','ST'],
                                ['qty','number',''],['googleKm','number',''],['agreedRate','number',''],
                                ['totalCost','number',''],['ratePer100','number',''],['totalAmount','number',''],
                              ].map(([k, type, ph]) => (
                                <td key={k} className="px-1 py-1.5">
                                  <input
                                    type={type}
                                    value={row[k]}
                                    onChange={e => setRow(i, k, e.target.value)}
                                    placeholder={ph}
                                    className={cls}
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-1.5">
                                {form.rows.length > 1 && (
                                  <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 transition">
                                    <MinusCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals + Bank Details */}
                  <div className="grid grid-cols-2 gap-4">

                    {/* Bank Details */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b bg-sky-50 text-sky-800 border-sky-200">Bank Details</div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {[
                          ['bankAccountName','Account Name'],['bankAccountNo','Account No.'],
                          ['bankName','Bank Name'],['branchName','Branch'],['ifsc','IFSC Code'],
                          ['remarks','Remarks'],
                        ].map(([k, label]) => (
                          <div key={k}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                            <input value={form[k]} onChange={e => setF(k, e.target.value)} className={clsLg} placeholder={label} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden self-start">
                      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b bg-rose-50 text-rose-800 border-rose-200">Summary</div>
                      <div className="p-4 space-y-2">
                        {[
                          ['Rows Total',              `₹${rowsTotal.toLocaleString('en-IN')}`],
                          ['Multi Delivery',          `₹${(parseFloat(form.multiDelivery)||0).toLocaleString('en-IN')}`],
                          ['Sub Total',               `₹${subtotal.toLocaleString('en-IN')}`],
                          [`SGST ${form.sgstPct||0}%`,`₹${sgstAmt.toLocaleString('en-IN')}`],
                          [`CGST ${form.cgstPct||0}%`,`₹${cgstAmt.toLocaleString('en-IN')}`],
                        ].map(([l,v]) => (
                          <div key={l} className="flex justify-between text-xs text-gray-600">
                            <span>{l}</span><span className="font-medium">{v}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
                          <span>Grand Total</span>
                          <span className="text-emerald-700">₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-xs text-gray-400 italic pt-1">{amountInWords(grandTotal)}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!savedInv && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50/50 rounded-b-2xl">
                <button onClick={closeModal}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <span className="text-sm text-gray-500">
                  Grand Total: <span className="font-bold text-emerald-700">₹{grandTotal.toLocaleString('en-IN')}</span>
                </span>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition">
                  {saving ? 'Creating…' : 'Create Invoice'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceCreation;
