import { jsPDF } from 'jspdf';
import letterheadBgUrl from '../assets/letterhead-bg.png';
import { fileHref } from './fileUrl';

export async function imgToBase64(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  }); 
}

export async function createLetterheadDoc(title, subtitle = '', orientation = 'portrait') {
  let bgB64 = null;
  try { bgB64 = await imgToBase64(letterheadBgUrl); } catch { /* background optional */ }

  const isLandscape = orientation === 'landscape';
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation });
  const PW = isLandscape ? 297 : 210;
  const PH = isLandscape ? 210 : 297;
  const ML = 12;
  const MR = PW - 12;
  const CW = MR - ML;

  const txt = (text, x, y, sz = 9, bold = false, align = 'left', rgb = [0, 0, 0]) => {
    doc.setFontSize(sz);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...rgb);
    doc.text(String(text ?? ''), x, y, { align });
  };
  const bar = (y, h, rgb = [20, 47, 32]) => { doc.setFillColor(...rgb); doc.rect(0, y, PW, h, 'F'); };

  const drawLetterhead = () => {
    if (bgB64) doc.addImage(bgB64, 'PNG', 0, 0, PW, PH);
  };

  drawLetterhead();
  let y = isLandscape ? 45 : 55;
  txt(title, PW / 2, y, 14, true, 'center', [20, 47, 32]); y += 5.5;
  if (subtitle) { txt(subtitle, PW / 2, y, 8.5, false, 'center', [100, 100, 100]); y += 7.5; }
  else y += 2;

  const startY = y;
  const newPage = () => { doc.addPage(); drawLetterhead(); return isLandscape ? 45 : 55; };

  return { doc, txt, bar, PW, PH, ML, MR, CW, y: startY, newPage, isLandscape };
}

export function drawTable(ctx, startY, columns, rows) {
  const { doc, txt, ML, CW, PH, newPage, isLandscape } = ctx;
  const headerH = 7, bottomLimit = PH - (isLandscape ? 22 : 35);
  let y = startY;
  const totalWidth = columns.reduce((a, c) => a + c.width, 0);
  const scale = CW / totalWidth;

  const drawHeader = () => {
    doc.setFillColor(20, 47, 32); doc.rect(ML, y, CW, headerH, 'F');
    let x = ML;
    columns.forEach(c => {
      const w = c.width * scale;
      txt(c.label, x + w / 2, y + headerH - 2.3, 7, true, 'center', [255, 255, 255]);
      x += w;
    });
    y += headerH;
  };

  drawHeader();
  rows.forEach((row, i) => {
    // Process each cell into lines of text, replacing Rupee symbol with Rs. for jsPDF compatibility
    const processedCells = row.map((val, ci) => {
      const w = columns[ci].width * scale;
      const strVal = String(val ?? '—').replace(/₹/g, 'Rs. ');
      const lines = strVal.split('\n').flatMap(line => doc.splitTextToSize(line, w - 2));
      return { lines, w, align: columns[ci].align || 'left' };
    });

    const maxLines = Math.max(1, ...processedCells.map(c => c.lines.length));
    const rowH = Math.max(7, maxLines * 4.2 + 3);

    if (y + rowH > bottomLimit) { y = newPage(); drawHeader(); }

    doc.setFillColor(i % 2 === 0 ? 247 : 255, i % 2 === 0 ? 252 : 255, i % 2 === 0 ? 249 : 255);
    doc.rect(ML, y, CW, rowH, 'F');
    doc.setDrawColor(220, 230, 225); doc.setLineWidth(0.1); doc.rect(ML, y, CW, rowH);

    let x = ML;
    processedCells.forEach(cell => {
      cell.lines.forEach((line, lineIdx) => {
        const lineY = y + 4 + lineIdx * 4;
        const textX = cell.align === 'right' ? x + cell.w - 1.5 : (cell.align === 'center' ? x + cell.w / 2 : x + 1.5);
        txt(line, textX, lineY, 6.5, false, cell.align, [40, 40, 40]);
      });
      x += cell.w;
    });

    y += rowH;
  });

  return y;
}

const DOC_LABELS = {
  drivingLicense: 'Driving License', aadhaarCard: 'Aadhaar Card', panCard: 'PAN Card',
  passport: 'Passport', medicalCertificate: 'Medical Certificate',
  policeVerification: 'Police Verification Certificate', experienceCertificate: 'Experience Certificate',
};

function expiryStatus(date) {
  if (!date) return null;
  const days = Math.ceil((new Date(date) - Date.now()) / 864e5);
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Expiring Soon';
  return 'Valid';
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');

export async function generateDriverProfilePDF(driver, overview) {
  const ctx = await createLetterheadDoc('Driver Profile', driver.driverCode);
  const { doc, txt, ML, MR, CW } = ctx;
  let y = ctx.y;

  // Photo box
  const photoSize = 26;
  doc.setDrawColor(200, 210, 205); doc.setLineWidth(0.3); doc.rect(ML, y, photoSize, photoSize);
  if (driver.photo) {
    try {
      const photoB64 = await imgToBase64(fileHref(driver.photo));
      doc.addImage(photoB64, 'JPEG', ML, y, photoSize, photoSize);
    } catch { /* fall back to blank box */ }
  } else {
    txt('No Photo', ML + photoSize / 2, y + photoSize / 2 + 1.5, 7, false, 'center', [170, 170, 170]);
  }

  // Name/status block to the right of the photo
  const infoX = ML + photoSize + 6;
  txt(driver.name, infoX, y + 6, 12, true, 'left', [20, 47, 32]);
  txt(`Code: ${driver.driverCode}  ·  License: ${driver.licenseNo || 'Not entered'}`, infoX, y + 12, 8, false, 'left', [90, 90, 90]);
  txt(`Driver Status: ${driver.driverStatus || '—'}   |   Approval: ${driver.status || '—'}`, infoX, y + 17, 8, false, 'left', [90, 90, 90]);
  txt(`Mobile Verified: ${driver.mobileVerified ? 'Yes' : 'No'}   |   Emergency Contact Verified: ${driver.emergencyContactVerified ? 'Yes' : 'No'}`,
    infoX, y + 22, 7.5, false, 'left', driver.mobileVerified ? [20, 120, 60] : [180, 100, 0]);
  y += photoSize + 6;

  // Personal information grid
  doc.setFillColor(234, 247, 241); doc.rect(ML, y, CW, 5.5, 'F');
  doc.setFillColor(20, 47, 32); doc.rect(ML, y, 3, 5.5, 'F');
  txt('Personal Information', ML + 5, y + 4, 7.5, true, 'left', [20, 47, 32]); y += 6.5;

  const grid = [
    ['Date of Birth', fmtDate(driver.dob)], ['Blood Group', driver.bloodGroup || '—'],
    ['Mobile', driver.phone || '—'], ['Emergency Contact', driver.emergencyContact || '—'],
    ['Aadhaar No.', driver.aadhaar || '—'], ['PAN No.', driver.pan || '—'],
    ['License Expiry', fmtDate(driver.licenseExpiry)], ['Salary', driver.salary ? `Rs. ${Number(driver.salary).toLocaleString('en-IN')}` : '—'],
  ];
  const gc = CW / 2;
  for (let i = 0; i < grid.length; i += 2) {
    [0, 1].forEach(off => {
      const pair = grid[i + off];
      if (!pair) return;
      const x = ML + off * gc;
      doc.setFillColor(off % 2 === 0 ? 250 : 255, off % 2 === 0 ? 253 : 255, off % 2 === 0 ? 251 : 255);
      doc.rect(x, y, gc, 5.5, 'F');
      doc.setDrawColor(215, 230, 222); doc.setLineWidth(0.15); doc.rect(x, y, gc, 5.5);
      txt(pair[0] + ':', x + 2, y + 3.8, 6.5, true, 'left', [100, 100, 100]);
      txt(String(pair[1]), x + 32, y + 3.8, 7, false, 'left');
    });
    y += 5.5;
  }
  y += 2;

  doc.setFillColor(248, 250, 248); doc.rect(ML, y, CW, 8, 'F');
  doc.setDrawColor(220, 230, 225); doc.setLineWidth(0.15); doc.rect(ML, y, CW, 8);
  txt('Address:', ML + 3, y + 3.5, 6.5, true, 'left', [100, 100, 100]);
  txt(driver.address || '—', ML + 3, y + 6.8, 7, false, 'left');
  y += 12;

  // Documents & Compliance
  doc.setFillColor(234, 247, 241); doc.rect(ML, y, CW, 5.5, 'F');
  doc.setFillColor(20, 47, 32); doc.rect(ML, y, 3, 5.5, 'F');
  txt('Documents & Compliance', ML + 5, y + 4, 7.5, true, 'left', [20, 47, 32]); y += 6.5;

  const docCols = [
    { label: 'Document', width: 45 }, { label: 'Number', width: 30 },
    { label: 'Expiry Date', width: 25 }, { label: 'Status', width: 25 },
  ];
  const docRows = Object.entries(DOC_LABELS).map(([key, label]) => {
    const d = driver.documents?.[key] || {};
    const status = d.expiryDate ? expiryStatus(d.expiryDate) : (d.fileUrl ? 'On File' : 'Not Uploaded');
    return [label, d.number || '—', fmtDate(d.expiryDate), status];
  });
  y = drawTable(ctx, y, docCols, docRows);
  y += 4;

  // Current assignment (optional)
  if (overview?.currentAssignments?.length || overview?.currentTrip) {
    doc.setFillColor(234, 247, 241); doc.rect(ML, y, CW, 5.5, 'F');
    doc.setFillColor(20, 47, 32); doc.rect(ML, y, 3, 5.5, 'F');
    txt('Current Assignment', ML + 5, y + 4, 7.5, true, 'left', [20, 47, 32]); y += 7;
    if (overview.currentAssignments?.length) {
      overview.currentAssignments.forEach(a => {
        txt(`Vehicle: ${a.registrationNo} — ${a.status}`, ML + 3, y + 3, 7.5, false, 'left', [40, 40, 40]);
        y += 5;
      });
    }
    if (overview.currentTrip) {
      txt(`Current Trip: ${overview.currentTrip.dispatchNo} — ${overview.currentTrip.from} to ${overview.currentTrip.to} (${overview.currentTrip.status})`,
        ML + 3, y + 3, 7.5, false, 'left', [40, 40, 40]);
      y += 5;
    }
  }

  txt(`Generated on ${new Date().toLocaleDateString('en-IN')} — this document reflects the driver's profile at the time of download.`,
    (ML + MR) / 2, ctx.PH - 42, 6.5, false, 'center', [160, 160, 160]);

  ctx.doc.save(`Driver_Profile_${driver.driverCode || driver.name}.pdf`);
}
