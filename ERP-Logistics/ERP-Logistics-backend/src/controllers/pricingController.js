const PricingRule = require('../models/PricingRule');

exports.getRules = async (req, res) => {
  try {
    const rules = await PricingRule.find().sort({ createdAt: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createRule = async (req, res) => {
  try {
    const rule = await PricingRule.create(req.body);
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateRule = async (req, res) => {
  try {
    const rule = await PricingRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    await PricingRule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
