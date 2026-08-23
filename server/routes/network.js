const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { getLocalIpAddress } = require('../utils/networkUtils');
const { PORT } = require('../config');

// GET /api/network/info - Local network connection information & QR Code
router.get('/info', async (req, res) => {
  try {
    const ip = getLocalIpAddress();
    const port = PORT;
    const url = `http://${ip}:${port}`;
    const qrData = await QRCode.toDataURL(url, { width: 260, margin: 2 });

    res.json({
      success: true,
      ip,
      port,
      url,
      qrData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
