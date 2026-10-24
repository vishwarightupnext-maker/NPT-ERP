const Dispatch = require('../models/Dispatch');

const normalizeDestinations = (dests, defaultTo) => {
  if (Array.isArray(dests) && dests.length > 0) {
    return dests.map(d => {
      if (typeof d === 'string') {
        return { name: d.trim(), noOfVehicles: 1, remarks: '' };
      }
      return {
        name: (d.name || d.city || '').trim(),
        noOfVehicles: Number(d.noOfVehicles) > 0 ? Number(d.noOfVehicles) : 1,
        remarks: (d.remarks || '').trim()
      };
    }).filter(d => d.name);
  }
  if (defaultTo) {
    return [{ name: defaultTo.trim(), noOfVehicles: 1, remarks: '' }];
  }
  return [];
};

exports.getAll = async (_req, res) => {
  try {
    const list = await Dispatch.find().sort({ createdAt: -1 });
    const formatted = list.map(doc => {
      const obj = doc.toObject();
      if (Array.isArray(obj.destinations)) {
        obj.destinations = obj.destinations.map(d => {
          if (typeof d === 'string') {
            return { name: d, noOfVehicles: 1, remarks: '' };
          }
          return {
            name: d.name || d.city || '',
            noOfVehicles: d.noOfVehicles != null ? Number(d.noOfVehicles) : 1,
            remarks: d.remarks || ''
          };
        });
      }
      return obj;
    });
    res.json(formatted);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const { vehicle, driver, from, to, destinations, goods, weight, pieces, scheduledDate, liveLocation, notes, lrNumber, remarks } = req.body;
    if (!vehicle || !driver || !from || (!to && (!destinations || destinations.length === 0)) || !goods || !scheduledDate)
      return res.status(400).json({ message: 'All required fields must be filled.' });
    
    const finalDestinations = normalizeDestinations(destinations, to);
    if (finalDestinations.length === 0) {
      return res.status(400).json({ message: 'At least one destination stop is required.' });
    }

    const finalTo = to || finalDestinations.map(d => d.name).join(' → ');

    const dispatch = await Dispatch.create({
      vehicle, driver, from,
      to: finalTo,
      destinations: finalDestinations,
      goods,
      weight: weight || 0,
      pieces: pieces || 0,
      scheduledDate,
      liveLocation: liveLocation || '',
      notes: notes || '',
      lrNumber: lrNumber || '',
      remarks: remarks || '',
      createdBy: req.user._id,
    });
    res.status(201).json(dispatch);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, distance, rating } = req.body;
    const update = { status };
    if (status === 'Delivered') update.deliveredAt = new Date();
    if (distance !== undefined) update.distance = Number(distance) || 0;
    if (rating !== undefined) update.rating = Number(rating) || undefined;
    const dispatch = await Dispatch.findByIdAndUpdate(
      req.params.id,
      update, 
      { new: true }
    );
    if (!dispatch) return res.status(404).json({ message: 'Dispatch not found' });
    res.json(dispatch);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const { _id, dispatchNo, createdAt, updatedAt, createdBy, ...rest } = req.body;
    if (rest.destinations) {
      rest.destinations = normalizeDestinations(rest.destinations, rest.to);
      if (rest.destinations.length > 0 && !rest.to) {
        rest.to = rest.destinations.map(d => d.name).join(' → ');
      }
    }
    const dispatch = await Dispatch.findByIdAndUpdate(req.params.id, rest, { new: true });
    if (!dispatch) return res.status(404).json({ message: 'Dispatch not found' });
    res.json(dispatch);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await Dispatch.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
