const Route = require('../models/Route');

exports.getAll = async (req, res) => {
  try {
    const list = await Route.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const { routeName, from, to, distance, estimatedHours, vehicleType, waypoints, notes } = req.body;
    if (!routeName || !from || !to)
      return res.status(400).json({ message: 'Route name, from and to are required.' });
    const route = await Route.create({
      routeName, from, to,
      distance: distance || 0,
      estimatedHours: estimatedHours || 0,
      vehicleType: vehicleType || '',
      waypoints: waypoints || [],
      notes: notes || '',
    });
    res.status(201).json(route);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!route) return res.status(404).json({ message: 'Route not found' });
    res.json(route);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await Route.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
