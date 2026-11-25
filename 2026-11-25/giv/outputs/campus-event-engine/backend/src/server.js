require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDatabase = require('./db');
const { Club, Event, Registration } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(require('path').join(__dirname, '../../frontend')));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'campus-event-engine' }));

app.get('/api/clubs', async (_req, res, next) => {
  try { res.json(await Club.find().sort({ name: 1 })); }
  catch (error) { next(error); }
});

app.get('/api/events', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { organizerClub: { $regex: req.query.search, $options: 'i' } },
      { tags: { $regex: req.query.search, $options: 'i' } }
    ];
    if (req.query.freeOnly === 'true') filter.entryFee = 0;
    if (req.query.tagged === 'true') filter.tags = { $in: ['coding', 'hackathon'] };
    const events = await Event.find(filter).sort({ date: 1 });
    res.json(events);
  } catch (error) { next(error); }
});

app.get('/api/events/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.json(event);
  } catch (error) { next(error); }
});

app.get('/api/registrations', async (req, res, next) => {
  try {
    const filter = req.query.department ? { department: req.query.department } : {};
    res.json(await Registration.find(filter).sort({ registrationDate: -1 }));
  } catch (error) { next(error); }
});

app.post('/api/events/:id/book', async (req, res, next) => {
  try {
    const { studentId, studentName, department, year, method = 'UPI' } = req.body;
    if (![studentId, studentName, department, year].every(value => value !== undefined && String(value).trim())) {
      return res.status(400).json({ message: 'studentId, studentName, department, and year are required.' });
    }
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, seatsAvailable: { $gt: 0 } },
      { $inc: { seatsAvailable: -1 } },
      { new: true }
    );
    if (!event) return res.status(409).json({ message: 'Event not found or sold out.' });
    try {
      const registration = await Registration.create({
        ticketId: `TICK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        eventId: event._id, studentId, studentName, department, year: Number(year),
        checkInStatus: false,
        paymentDetails: { method: event.entryFee === 0 ? 'Free' : method, amountPaid: event.entryFee, status: 'Completed' }
      });
      res.status(201).json({ message: 'Ticket booked successfully.', registration, event });
    } catch (error) {
      await Event.updateOne({ _id: event._id }, { $inc: { seatsAvailable: 1 } });
      throw error;
    }
  } catch (error) { next(error); }
});

app.patch('/api/registrations/:ticketId/check-in', async (req, res, next) => {
  try {
    const registration = await Registration.findOneAndUpdate(
      { ticketId: req.params.ticketId }, { $set: { checkInStatus: true } }, { new: true }
    );
    if (!registration) return res.status(404).json({ message: 'Ticket not found.' });
    res.json(registration);
  } catch (error) { next(error); }
});

app.post('/api/events/:id/sponsors', async (req, res, next) => {
  try {
    const sponsor = String(req.body.sponsor || '').trim();
    if (!sponsor) return res.status(400).json({ message: 'Sponsor name is required.' });
    const event = await Event.findByIdAndUpdate(req.params.id, { $addToSet: { sponsors: sponsor } }, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.json(event);
  } catch (error) { next(error); }
});

app.get('/api/analytics/overview', async (_req, res, next) => {
  try {
    const [eventCount, registrationCount, checkedInCount, revenue] = await Promise.all([
      Event.countDocuments(), Registration.countDocuments(), Registration.countDocuments({ checkInStatus: true }),
      Registration.aggregate([{ $group: { _id: null, total: { $sum: '$paymentDetails.amountPaid' } } }])
    ]);
    res.json({ eventCount, registrationCount, checkedInCount, totalRevenue: revenue[0]?.total || 0 });
  } catch (error) { next(error); }
});

app.get('/api/analytics/revenue', async (_req, res, next) => {
  try {
    const rows = await Registration.aggregate([
      { $group: { _id: '$eventId', totalRevenue: { $sum: '$paymentDetails.amountPaid' }, totalTicketsSold: { $sum: 1 } } },
      { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'eventInfo' } },
      { $unwind: '$eventInfo' },
      { $project: { _id: 0, eventId: '$_id', eventTitle: '$eventInfo.title', organizerClub: '$eventInfo.organizerClub', totalRevenue: 1, totalTicketsSold: 1 } },
      { $sort: { totalRevenue: -1 } }
    ]);
    res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/analytics/departments', async (_req, res, next) => {
  try {
    res.json(await Registration.aggregate([
      { $group: { _id: '$department', totalRegistrations: { $sum: 1 } } },
      { $sort: { totalRegistrations: -1 } }
    ]));
  } catch (error) { next(error); }
});

app.get('/api/analytics/turnout', async (_req, res, next) => {
  try {
    res.json(await Registration.aggregate([
      { $group: { _id: '$eventId', totalRegistrations: { $sum: 1 }, checkedInCount: { $sum: { $cond: [{ $eq: ['$checkInStatus', true] }, 1, 0] } } } },
      { $project: { _id: 0, eventId: '$_id', totalRegistrations: 1, checkedInCount: 1, turnoutPercentage: { $multiply: [{ $divide: ['$checkedInCount', '$totalRegistrations'] }, 100] } } },
      { $sort: { eventId: 1 } }
    ]));
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || 'Unexpected server error.' });
});

const port = process.env.PORT || 5000;
connectDatabase().then(() => app.listen(port, () => console.log(`Campus Event Engine running at http://localhost:${port}`)))
  .catch(error => { console.error(error.message); process.exit(1); });
