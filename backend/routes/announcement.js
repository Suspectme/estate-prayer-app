 const express = require('express');
const Announcement = require('../models/Announcement');
const { isAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/latest', async (req, res) => {
  try {
    const announcement = await Announcement.findOne().sort({ createdAt: -1 });
    res.json({ announcement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', isAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Text is required.' });
    await Announcement.deleteMany({});
    const announcement = new Announcement({ text });
    await announcement.save();

    const io = req.app.get('io');
    io.emit('announcement-published', { text, createdAt: announcement.createdAt });

    res.status(201).json({ announcement });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;