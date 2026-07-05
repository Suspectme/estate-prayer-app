 const mongoose = require('mongoose');

const PrayerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  prayerTime: { type: Date, required: true },
  iqamaTime: { type: Date, required: true },
  callingTime: { type: Date, required: true },
  icon: { type: String, default: 'fa-clock' }
});

module.exports = mongoose.model('Prayer', PrayerSchema);