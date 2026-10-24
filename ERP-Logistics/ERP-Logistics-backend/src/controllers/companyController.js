const Company = require('../models/Company');

exports.getCompany = async (req, res) => {
  try {
    const company = await Company.findOne();
    res.json(company || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveCompany = async (req, res) => {
  try {
    let company = await Company.findOne();
    if (company) {
      Object.assign(company, req.body);
      await company.save();
    } else {
      company = await Company.create(req.body);
    }
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
