const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const DEFAULT_REFERER = process.env.OPENROUTER_REFERER || 'https://code-cloner.vercel.app';
const DEFAULT_TITLE = process.env.OPENROUTER_APP_TITLE || 'Code Cloner';

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonObject(text) {
  if (!text) return null;
  const direct = safeJsonParse(text);
  if (direct && typeof direct === 'object') return direct;

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  const sliced = text.slice(start, end + 1);
  const parsed = safeJsonParse(sliced);
  return parsed && typeof parsed === 'object' ? parsed : null;
}

function clampText(value, max = 3000) {
  return String(value || '').slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.status(200).json({
      ok: true,
      message: 'CodeCloner AI endpoint is live. Use POST with { message, history, context }.'
    });
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, HEAD, POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'OPENROUTER_API_KEY is not configured'
    });
  }

  try {
    const body = typeof req.body === 'string' ? safeJsonParse(req.body) || {} : (req.body || {});
    const userMessage = clampText(body.message, 1500);
    const history = Array.isArray(body.history) ? body.history : [];
    const context = body.context || {};

    if (!userMessage.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const sanitizedHistory = history
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
      .slice(-8)
      .map((item) => ({
        role: item.role,
        content: clampText(item.content, 1200)
      }));

    const contextText = JSON.stringify({
      brand: context.brand || 'CodeCloner AI',
      website: context.website || {},
      developer: context.developer || {},
      userContext: context.userContext || {},
      currentPage: context.currentPage || {},
      candidates: Array.isArray(context.candidates) ? context.candidates.slice(0, 8) : []
    });

    const systemPrompt = [
      'You are CodeCloner AI, a helpful learning assistant for the Code Cloner platform.',
      'Your primary goal is to help users find courses, articles, tips, projects, and resources.',
      'Be friendly, concise, and action-oriented. Use emojis sparingly for better UX.',
      'Format your answer using markdown: **bold** for emphasis, lists (- item) for multiple points, `code` for technical terms.',
      'Focus on what users can DO: find content, learn topics, track progress, discover courses.',
      'When user asks about content, provide specific helpful results with clear next steps.',
      'Use website context to give personalized recommendations based on their learning progress.',
      'For developer/contact queries, provide contact info professionally without unnecessary details.',
      'Keep responses under 3-4 sentences unless detailed explanation is requested.',
      'Return ONLY valid minified JSON: {"intent":"chat|search|content|learning|developer|website","answer":"markdown formatted string","searchQuery":"string","links":[{"label":"string","href":"string"}]}',
      'Intent types: chat (general), search (finding content), content (articles/tips/facts), learning (courses/roadmaps), developer (contact), website (about platform).',
      'Always include relevant links when possible to help users take action immediately.'
    ].join(' ');

    const messages = [
      { role: 'system', content: systemPrompt },
      ...sanitizedHistory,
      {
        role: 'user',
        content: `Context: ${contextText}\n\nUser query: ${userMessage}`
      }
    ];

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': DEFAULT_REFERER,
        'X-OpenRouter-Title': DEFAULT_TITLE
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.25,
        max_tokens: 450,
        messages
      })
    });

    const upstreamJson = await upstream.json();
    if (!upstream.ok) {
      const detail = upstreamJson?.error?.message || 'OpenRouter request failed';
      return res.status(502).json({ error: detail });
    }

    const rawContent = upstreamJson?.choices?.[0]?.message?.content || '';
    const parsed = extractJsonObject(rawContent);

    if (!parsed) {
      return res.status(200).json({
        intent: 'chat',
        answer: String(rawContent || 'Sorry, I could not process that response.'),
        searchQuery: '',
        links: []
      });
    }

    const intent = String(parsed.intent || 'chat');
    const answer = String(parsed.answer || '').trim() || 'Sorry, I could not generate a response.';
    const searchQuery = String(parsed.searchQuery || '').trim();
    const links = Array.isArray(parsed.links) ? parsed.links
      .map((item) => ({
        label: String(item?.label || '').trim(),
        href: String(item?.href || '').trim()
      }))
      .filter((item) => item.label && item.href)
      .slice(0, 8) : [];

    return res.status(200).json({ intent, answer, searchQuery, links });
  } catch (error) {
    console.error('ai-chat error:', error);
    return res.status(500).json({ error: 'AI request failed' });
  }
}
