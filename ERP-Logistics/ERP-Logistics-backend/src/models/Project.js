const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  description:       String,
  status:            { type: String, enum: ['Planning', 'In Progress', 'Completed', 'On Hold'], default: 'Planning' },
  priority:          { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  deadline:          Date,
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  assignedNames:     [String],
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
