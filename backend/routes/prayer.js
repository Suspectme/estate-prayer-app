 const express = require('express');
const Prayer = require('../models/Prayer');
const { isAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const prayers = await Prayer.find().sort({ prayerTime: 1 });
    res.json({ prayers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { prayerTime, iqamaTime, callingTime } = req.body;
    const prayer = await Prayer.findById(req.params.id);
    if (!prayer) return res.status(404).json({ message: 'Prayer not found.' });

    if (prayerTime) prayer.prayerTime = prayerTime;
    if (iqamaTime) prayer.iqamaTime = iqamaTime;
    if (callingTime) prayer.callingTime = callingTime;

    await prayer.save();

    const io = req.app.get('io');
    io.emit('prayer-updated', {
      prayerName: prayer.name,
      field: prayerTime ? 'prayerTime' : (iqamaTime ? 'iqamaTime' : 'callingTime'),
      newTime: prayerTime || iqamaTime || callingTime
    });

    const allPrayers = await Prayer.find().sort({ prayerTime: 1 });
    res.json({ prayers: allPrayers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;