const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  rate: { type: Number, required: true },
  zone: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
