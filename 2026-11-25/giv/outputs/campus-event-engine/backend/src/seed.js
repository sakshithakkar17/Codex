require('dotenv').config();
const connectDatabase = require('./db');
const { Club, Event, Registration } = require('./models');

const clubs = [
  { _id: 'CLUB001', name: 'Coding Club', focus: 'Programming, hackathons, and software projects' },
  { _id: 'CLUB002', name: 'Music Society', focus: 'Music, performances, and campus culture' },
  { _id: 'CLUB003', name: 'Robotics Club', focus: 'Robotics, AI, and hands-on workshops' }
];
const events = [
  { _id: 'EVT101', title: 'HackCampus 2026', category: 'Technical', organizerClub: 'Coding Club', venue: 'Auditorium A', date: new Date('2026-10-15T09:00:00Z'), capacity: 200, seatsAvailable: 45, entryFee: 150, tags: ['hackathon', 'coding', 'prizes'], coordinators: [{ name: 'Aarav Sharma', contact: 'aarav@college.edu' }], sponsors: ['TechCorp', 'DevStudio'] },
  { _id: 'EVT102', title: 'Annual Music Night', category: 'Cultural', organizerClub: 'Music Society', venue: 'Open Air Theatre', date: new Date('2026-10-20T18:00:00Z'), capacity: 500, seatsAvailable: 120, entryFee: 0, tags: ['music', 'concert', 'night'], coordinators: [{ name: 'Riya Sen', contact: 'riya@college.edu' }], sponsors: [] },
  { _id: 'EVT103', title: 'AI & Robotics Workshop', category: 'Technical', organizerClub: 'Robotics Club', venue: 'Lab 3', date: new Date('2026-11-05T10:00:00Z'), capacity: 60, seatsAvailable: 10, entryFee: 50, tags: ['ai', 'robotics', 'workshop'], coordinators: [{ name: 'Karan Patel', contact: 'karan@college.edu' }], sponsors: ['RoboLabs'] }
];
const registrations = [
  { ticketId: 'TICK-2026-001', eventId: 'EVT101', studentId: 'STU8821', studentName: 'Priya Verma', department: 'Computer Science', year: 3, registrationDate: new Date('2026-09-12T14:30:00Z'), checkInStatus: false, paymentDetails: { method: 'UPI', amountPaid: 150, status: 'Completed' } },
  { ticketId: 'TICK-2026-002', eventId: 'EVT102', studentId: 'STU8821', studentName: 'Priya Verma', department: 'Computer Science', year: 3, registrationDate: new Date('2026-09-13T10:00:00Z'), checkInStatus: true, paymentDetails: { method: 'Free', amountPaid: 0, status: 'Completed' } },
  { ticketId: 'TICK-2026-003', eventId: 'EVT101', studentId: 'STU4412', studentName: 'Rohan Gupta', department: 'Electrical Engineering', year: 2, registrationDate: new Date('2026-09-14T11:20:00Z'), checkInStatus: true, paymentDetails: { method: 'Card', amountPaid: 150, status: 'Completed' } },
  { ticketId: 'TICK-2026-004', eventId: 'EVT103', studentId: 'STU9903', studentName: 'Ananya Roy', department: 'Computer Science', year: 4, registrationDate: new Date('2026-09-15T16:45:00Z'), checkInStatus: false, paymentDetails: { method: 'UPI', amountPaid: 50, status: 'Completed' } }
];

async function seed() {
  try {
    await connectDatabase();
    await Club.deleteMany({});
    await Event.deleteMany({});
    await Registration.deleteMany({});
    await Club.insertMany(clubs);
    await Event.insertMany(events);
    await Registration.insertMany(registrations);
    console.log('Seed complete: 3 clubs, 3 events, and 4 registrations inserted.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  }
}
seed();
