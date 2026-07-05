 require('dotenv').config();
const mongoose = require('mongoose');
const Prayer = require('./models/Prayer');

const prayers = [
  { name: 'Fajr', prayerTime: new Date('2026-07-06T05:30:00'), iqamaTime: new Date('2026-07-06T06:00:00'), callingTime: new Date('2026-07-06T05:45:00'), icon: 'fa-sun' },
  { name: 'Dhuhr', prayerTime: new Date('2026-07-06T13:00:00'), iqamaTime: new Date('2026-07-06T13:30:00'), callingTime: new Date('2026-07-06T13:15:00'), icon: 'fa-cloud-sun' },
  { name: 'Asr', prayerTime: new Date('2026-07-06T16:30:00'), iqamaTime: new Date('2026-07-06T17:00:00'), callingTime: new Date('2026-07-06T16:45:00'), icon: 'fa-sun' },
  { name: 'Maghrib', prayerTime: new Date('2026-07-06T19:00:00'), iqamaTime: new Date('2026-07-06T19:30:00'), callingTime: new Date('2026-07-06T19:15:00'), icon: 'fa-moon' },
  { name: 'Isha', prayerTime: new Date('2026-07-06T20:30:00'), iqamaTime: new Date('2026-07-06T21:00:00'), callingTime: new Date('2026-07-06T20:45:00'), icon: 'fa-moon' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Prayer.deleteMany({});
    await Prayer.insertMany(prayers);
    console.log('✅ Prayers seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}
seed();
