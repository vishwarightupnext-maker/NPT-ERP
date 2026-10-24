const Invoice = require('../models/Invoice');

const amountInWords = n => {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const toWords = x => {
    if (x === 0) return '';
    if (x < 20) return a[x];
    if (x < 100) return b[Math.floor(x/10)] + (x%10 ? ' '+a[x%10] : '');
    if (x < 1000) return a[Math.floor(x/100)] + ' Hundred' + (x%100 ? ' '+toWords(x%100) : '');
    if (x < 100000) return toWords(Math.floor(x/1000)) + ' Thousand' + (x%1000 ? ' '+toWords(x%1000) : '');
    if (x < 10000000) return toWords(Math.floor(x/100000)) + ' Lakh' + (x%100000 ? ' '+toWords(x%100000) : '');
    return toWords(Math.floor(x/10000000)) + ' Crore' + (x%10000000 ? ' '+toWords(x%10000000) : '');
  };
  const int = Math.floor(n);
  const dec = Math.round((n - int) * 100);
  let words = toWords(int) || 'Zero';
  if (dec) words += ' and ' + toWords(dec) + ' Paise';
  return words + ' Only';
};

exports.getAll = async (req, res) => {
  try {
    const list = await Invoice.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const {
      invoiceDate, billTo, billToAddress, billToGST,
      rows, multiDelivery, sgstPct, cgstPct,
      bankAccountName, bankAccountNo, bankName, branchName, ifsc,
      remarks,
    } = req.body;

    if (!billTo || !rows?.length)
      return res.status(400).json({ message: 'Bill To and at least one row are required.' });

    const rowsTotal = rows.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const subtotal  = rowsTotal + (Number(multiDelivery) || 0);
    const sgst      = parseFloat(((subtotal * (Number(sgstPct) || 0)) / 100).toFixed(2));
    const cgst      = parseFloat(((subtotal * (Number(cgstPct) || 0)) / 100).toFixed(2));
    const grandTotal = parseFloat((subtotal + sgst + cgst).toFixed(2));

    const invoice = await Invoice.create({
      invoiceDate: invoiceDate || new Date(),
      billTo, billToAddress: billToAddress || '', billToGST: billToGST || '',
      rows: rows.map(r => ({
        truckNo:     r.truckNo     || '',
        lrNo:        r.lrNo        || '',
        lrDate:      r.lrDate      || null,
        invNo:       r.invNo       || '',
        invDate:     r.invDate     || null,
        dealerName:  r.dealerName  || '',
        destination: r.destination || '',
        st:          r.st          || '',
        qty:         Number(r.qty)         || 0,
        googleKm:    Number(r.googleKm)    || 0,
        agreedRate:  Number(r.agreedRate)  || 0,
        totalCost:   Number(r.totalCost)   || 0,
        ratePer100:  Number(r.ratePer100)  || 0,
        totalAmount: Number(r.totalAmount) || 0,
      })),
      multiDelivery: Number(multiDelivery) || 0,
      subtotal,
      sgstPct:  Number(sgstPct)  || 0,
      cgstPct:  Number(cgstPct)  || 0,
      sgstAmount: sgst,
      cgstAmount: cgst,
      grandTotal,
      bankAccountName: bankAccountName || 'New Popular Transport',
      bankAccountNo:   bankAccountNo   || '',
      bankName:        bankName        || '',
      branchName:      branchName      || '',
      ifsc:            ifsc            || '',
      remarks:         remarks         || '',
      createdBy: req.user._id,
    });

    res.status(201).json({ ...invoice.toObject(), amountInWords: amountInWords(grandTotal) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
