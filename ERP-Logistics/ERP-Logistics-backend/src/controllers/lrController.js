const LR = require('../models/LR');

exports.getAll = async (req, res) => {
  try {
    const list = await LR.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.getById = async (req, res) =>  {
  try {
    const lr = await LR.findById(req.params.id);
    if (!lr) return res.status(404).json({ message: 'LR not found' });
    res.json(lr);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const {
      dispatchId, dispatchNo,
      truckNumber, driver, from, to, liveLocation, expectedDeliveryDate,
      consignorName, consignorAddress, consignorGST,
      consigneeName, consigneeAddress, consigneeGST,
      serviceTaxPayableBy,
      shipmentNumber, insurancePolicy, packingCount, packingType,
      dimensions, privateMarking, goods, description, sealNumber,
      actualWeight, chargedWeight,
      invoiceNumber, invoiceValue,
      vehicleType, basisOfBooking,
      freightCharges, handlingCharges, deliveryCharges, tollCharges, miscCharges, grandTotal,
      paymentType, podDetails, remarks, images,
    } = req.body;

    if (!consignorName || !consigneeName || !from || !to || !goods)
      return res.status(400).json({ message: 'Consignor, Consignee, From, To and Goods are required.' });

    const lr = await LR.create({
      dispatchId: dispatchId || undefined,
      dispatchNo: dispatchNo || '',
      truckNumber:  truckNumber  || '',
      driver:       driver       || '',
      from, to,
      liveLocation: liveLocation || '',
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      consignorName, consignorAddress: consignorAddress || '', consignorGST: consignorGST || '',
      consigneeName, consigneeAddress: consigneeAddress || '', consigneeGST: consigneeGST || '',
      serviceTaxPayableBy: serviceTaxPayableBy || '',
      shipmentNumber: shipmentNumber || '',
      insurancePolicy: insurancePolicy || '',
      packingCount: packingCount || 0,
      packingType: packingType || '',
      dimensions: dimensions || '',
      privateMarking: privateMarking || '',
      goods,
      description: description || '',
      sealNumber: sealNumber || '',
      actualWeight: actualWeight || 0,
      chargedWeight: chargedWeight || 0,
      invoiceNumber: invoiceNumber || '',
      invoiceValue: invoiceValue || 0,
      vehicleType: vehicleType || '',
      basisOfBooking: basisOfBooking || '',
      freightCharges: freightCharges || 0,
      handlingCharges: handlingCharges || 0,
      deliveryCharges: deliveryCharges || 0,
      tollCharges: tollCharges || 0,
      miscCharges: miscCharges || 0,
      grandTotal: grandTotal || 0,
      paymentType: paymentType || 'Cash',
      podDetails: podDetails || '',
      images: Array.isArray(images) ? images : [],
      remarks: remarks || '',
      // legacy
      weight: actualWeight || 0,
      amount: grandTotal || 0,
      createdBy: req.user._id,
    });
    res.status(201).json(lr);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const { _id, lrNo, createdAt, updatedAt, createdBy, ...rest } = req.body;
    const lr = await LR.findByIdAndUpdate(req.params.id, rest, { new: true });
    if (!lr) return res.status(404).json({ message: 'LR not found' });
    res.json(lr);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const lr = await LR.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!lr) return res.status(404).json({ message: 'LR not found' });
    res.json(lr);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await LR.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
