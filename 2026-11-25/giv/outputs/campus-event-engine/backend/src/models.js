const mongoose = require('mongoose');

const coordinatorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true }
}, { _id: false });

const eventSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  organizerClub: { type: String, required: true },
  venue: { type: String, required: true },
  date: { type: Date, required: true },
  capacity: { type: Number, required: true, min: 1 },
  seatsAvailable: { type: Number, required: true, min: 0 },
  entryFee: { type: Number, required: true, min: 0 },
  tags: [String],
  coordinators: [coordinatorSchema],
  sponsors: [String]
}, { versionKey: false });

eventSchema.virtual('id').get(function () { return this._id; });
eventSchema.set('toJSON', { virtuals: true });

const registrationSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  eventId: { type: String, required: true, index: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  department: { type: String, required: true, index: true },
  year: { type: Number, required: true },
  registrationDate: { type: Date, default: Date.now },
  checkInStatus: { type: Boolean, default: false },
  paymentDetails: {
    method: { type: String, required: true },
    amountPaid: { type: Number, required: true, min: 0 },
    status: { type: String, required: true }
  }
}, { versionKey: false });

const clubSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  focus: { type: String, required: true }
}, { versionKey: false });

const Club = mongoose.models.Club || mongoose.model('Club', clubSchema, 'clubs');
const Event = mongoose.models.Event || mongoose.model('Event', eventSchema, 'events');
const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema, 'registrations');
module.exports = { Club, Event, Registration };
