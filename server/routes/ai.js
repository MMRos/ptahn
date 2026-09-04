const express = require('express');
const router = express.Router();
const { llamaEngine } = require('../engine/llamaEngine');
const { rerankerEngine } = require('../engine/rerankerEngine');
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

    const abortController = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    const mergedOptions = {
      ...req.body,
      ...(options || {}),
      model: req.body.model || options.model,
      maxTokens: req.body.max_tokens || req.body.maxTokens || options.maxTokens || options.max_tokens,
      temperature: req.body.temperature !== undefined ? req.body.temperature : options.temperature,
      topP: req.body.top_p !== undefined ? req.body.top_p : options.topP,
      signal: abortController.signal
    };

    const isStreaming = stream || options.stream || req.body.stream;

    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await llamaEngine.generateCompletion(messages, mergedOptions, (chunkText) => {
        const payload = JSON.stringify({
          choices: [{ delta: { content: chunkText } }]
        });
        res.write(`data: ${payload}\n\n`);
      });

      res.write(`data: [DONE]\n\n`);
      res.end();
    } else {
      const reply = await llamaEngine.generateCompletion(messages, mergedOptions);
      res.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: typeof reply === 'string' ? reply : (reply?.content || '') },
            finish_reason: 'stop'
          }
        ],
        success: true,
        reply,
        activeModel: llamaEngine.getStatus().activeModel
      });
    }
  } catch (error) {
    const isAbort =
      error.name === 'AbortError' ||
      abortController.signal.aborted ||
      (error.message && error.message.toLowerCase().includes('aborted'));

    if (isAbort) {
      console.log('[AI Route]: Request cancelled by client (abort).');
      if (!res.headersSent) {
        return res.status(499).json({ success: false, error: 'This operation was aborted', aborted: true });
      }
      return res.end();
    }

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

// POST /api/ai/rerank - Pairwise semantic relevance scoring
router.post('/rerank', async (req, res) => {
  try {
    const { query, candidates = [] } = req.body;
    const scores = await rerankerEngine.scoreCandidates(query, candidates);
    res.json({
      success: true,
      scores,
      count: Object.keys(scores).length
    });
  } catch (error) {
    console.error('[AI Rerank Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
