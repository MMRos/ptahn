const express = require('express');
const router = express.Router();
const { llamaEngine } = require('../engine/llamaEngine');
const { isServerRunning } = require('./lifecycle');

// GET /api/ai/status - Check native engine status
router.get('/status', (req, res) => {
  const isOnline = typeof isServerRunning === 'function' ? isServerRunning() : true;
  res.json({
    online: isOnline,
    running: isOnline,
    ...llamaEngine.getStatus()
  });
});


async function handleChatCompletion(req, res) {
  try {
    const { messages, options = {}, stream = false } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    const isStreaming = stream || options.stream;

    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await llamaEngine.generateCompletion(messages, options, (chunkText) => {
        const payload = JSON.stringify({
          choices: [{ delta: { content: chunkText } }]
        });
        res.write(`data: ${payload}\n\n`);
      });

      res.write(`data: [DONE]\n\n`);
      res.end();
    } else {
      const reply = await llamaEngine.generateCompletion(messages, options);
      res.json({
        success: true,
        reply,
        activeModel: llamaEngine.getStatus().activeModel
      });
    }
  } catch (error) {
    console.error('[AI Route Error]:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.end();
    }
  }
}

// POST /api/ai/chat and /v1/chat/completions
router.post('/chat', handleChatCompletion);
router.post('/completions', handleChatCompletion);

module.exports = router;
