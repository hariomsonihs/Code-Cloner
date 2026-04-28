const SITE_LINKS = [
  { label: 'Home', href: 'index.html', keywords: ['home', 'start', 'main'] },
  { label: 'Articles', href: 'articles.html', keywords: ['article', 'read', 'theory'] },
  { label: 'Learning', href: 'learning.html', keywords: ['learning', 'course', 'category', 'practice'] },
  { label: 'Tips', href: 'tips.html', keywords: ['tip', 'trick', 'shortcut'] },
  { label: 'Facts', href: 'facts.html', keywords: ['fact', 'did you know'] },
  { label: 'Projects', href: 'projects.html', keywords: ['project', 'build', 'source code'] },
  { label: 'Resources', href: 'resources.html', keywords: ['resource', 'tool', 'link'] },
  { label: 'Search', href: 'search.html', keywords: ['search', 'find'] },
  { label: 'Saved', href: 'saved.html', keywords: ['saved', 'bookmark', 'history'] },
  { label: 'Profile', href: 'profile.html', keywords: ['profile', 'account'] }
];

const state = {
  indexReady: false,
  learningIndex: [],
  loadingIndex: false,
  contentIndexReady: false,
  contentIndex: [],
  loadingContentIndex: false,
  firebaseCtx: null,
  chatHistory: []
};

const SEARCH_STOP_WORDS = new Set([
  'show', 'me', 'please', 'find', 'search', 'for', 'about', 'on', 'the',
  'a', 'an', 'to', 'of', 'and', 'or', 'course', 'courses', 'category',
  'categories', 'learning', 'learn', 'some', 'any', 'give'
]);

const CONTENT_COLLECTIONS = [
  { type: 'articles', page: 'articles.html', titleField: 'title', descFields: ['description', 'content'] },
  { type: 'tips', page: 'tips.html', titleField: 'title', descFields: ['description', 'body'] },
  { type: 'facts', page: 'facts.html', titleField: 'title', descFields: ['description', 'body'] },
  { type: 'projects', page: 'projects.html', titleField: 'name', descFields: ['description'] },
  { type: 'resources', page: 'resources.html', titleField: 'title', descFields: ['description', 'body'] }
];

const CONTENT_TYPE_LABEL = {
  articles: 'Article',
  tips: 'Tip',
  facts: 'Fact',
  projects: 'Project',
  resources: 'Resource'
};

const BRAND_NAME = 'CodeCloner AI';
const DEVELOPER_PROFILE = {
  name: 'Hariom Kumar',
  degree: 'BTech CSE',
  phone: '7667110195',
  email: 'hariomsoni0818@gmail.com'
};

const WEBSITE_DETAILS = {
  name: 'Code Cloner',
  purpose: 'Programming learning hub with practical + theory content',
  sections: ['Articles', 'Learning (Categories/Courses)', 'Tips & Tricks', 'Facts', 'Projects', 'Resources', 'Search', 'Saved', 'Profile']
};

const REMOTE_AI_ENDPOINT = '/api/ai-chat';
const MAX_HISTORY = 8;

function normalize(value) {
  return String(value || '').toLowerCase().trim();
}

function tokenizeQuery(value) {
  return normalize(value)
    .split(/[^a-z0-9+#.]+/g)
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token));
}

function addToHistory(role, content) {
  if (!content) return;
  state.chatHistory.push({ role, content: String(content) });
  if (state.chatHistory.length > MAX_HISTORY * 2) {
    state.chatHistory = state.chatHistory.slice(-MAX_HISTORY * 2);
  }
}

function dedupeLinks(links) {
  const seen = new Set();
  return links.filter((item) => {
    const label = String(item?.label || '').trim();
    const href = String(item?.href || '').trim();
    if (!label || !href) return false;
    const key = `${label}__${href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isGreetingOrSmallTalk(query) {
  const q = normalize(query);
  const smallTalkPatterns = [
    /\b(hi|hello|hey|hii|hola)\b/,
    /\b(kya haal|kaise ho|kaisa hai|haal chal|aur batao)\b/,
    /\b(thanks|thank you|thx|shukriya)\b/,
    /\b(good morning|good evening|good night)\b/,
    /\b(how are you|what'?s up|wassup)\b/
  ];
  return smallTalkPatterns.some((pattern) => pattern.test(q));
}

function isPersonalQuestion(query) {
  const q = normalize(query);
  const patterns = [
    /\b(tumhara naam|aapka naam|your name|who are you|what are you|what is your name)\b/,
    /\b(kya naam hai|naam kya hai)\b/,
    /\b(kahan se ho|where are you from)\b/
  ];
  return patterns.some((pattern) => pattern.test(q));
}

function getPersonalReply(query) {
  const q = normalize(query);
  if (/\b(name|naam)\b/.test(q)) {
    return `Mera naam ${BRAND_NAME} hai. Main aapki website ka smart assistant hoon.`;
  }
  if (/\b(where are you from|kahan se ho)\b/.test(q)) {
    return `Main ${WEBSITE_DETAILS.name} website ke andar chalne wala assistant hoon, yahin se help karta hoon.`;
  }
  return `Main ${BRAND_NAME} hoon. Aap mujhse casual chat bhi kar sakte ho aur content bhi find kar sakte ho.`;
}

function isDeveloperOrWebsiteQuery(query) {
  const q = normalize(query);
  const patterns = [
    /\b(developer|owner|creator|banaya kisne|kisne banaya|made by|contact|phone|number|email)\b/,
    /\b(about website|website details|code cloner details|site details|platform details|what is this website|what is this site|about this website|about this site|tell me about this website|tell me about this site|what is code cloner)\b/,
    /\b(hariom|hari om|hariom kumar)\b/
  ];
  return patterns.some((pattern) => pattern.test(q));
}

function getDeveloperWebsiteReply(query) {
  const q = normalize(query);
  const detailText = [
    `${BRAND_NAME} details:`,
    `Website: ${WEBSITE_DETAILS.name}`,
    `Purpose: ${WEBSITE_DETAILS.purpose}`,
    `Main Sections: ${WEBSITE_DETAILS.sections.join(', ')}`,
    '',
    'Developer Details:',
    `Name: ${DEVELOPER_PROFILE.name}`,
    `Qualification: ${DEVELOPER_PROFILE.degree}`,
    `Contact: ${DEVELOPER_PROFILE.phone}`,
    `Email: ${DEVELOPER_PROFILE.email}`
  ].join('\n');

  if (/\b(phone|number|contact)\b/.test(q)) {
    return {
      text: `Developer Contact:\nName: ${DEVELOPER_PROFILE.name}\nPhone: ${DEVELOPER_PROFILE.phone}\nEmail: ${DEVELOPER_PROFILE.email}`,
      links: [{ label: 'Open Profile Page', href: 'profile.html' }]
    };
  }

  if (/\b(email)\b/.test(q)) {
    return {
      text: `Developer Email: ${DEVELOPER_PROFILE.email}\nName: ${DEVELOPER_PROFILE.name}`,
      links: [{ label: 'Open Profile Page', href: 'profile.html' }]
    };
  }

  return {
    text: detailText,
    links: [
      { label: 'Open Home', href: 'index.html' },
      { label: 'Open Learning', href: 'learning.html' },
      { label: 'Open Profile', href: 'profile.html' }
    ]
  };
}

function hasExplicitSearchIntent(query) {
  const q = normalize(query);
  const intentPatterns = [
    /\b(find|search|show|lookup|look up|recommend|suggest|open)\b/,
    /\b(mujhe|dhoond|dhund|batao|dikhao|lao)\b/,
    /\b(how to|guide|tutorial|course|courses|article|articles|tips|facts|resources|project|projects)\b/
  ];
  return intentPatterns.some((pattern) => pattern.test(q));
}

function getSmallTalkReply(query) {
  const q = normalize(query);
  if (/\b(thanks|thank you|thx|shukriya)\b/.test(q)) {
    return 'Always happy to help. Agar aap chaho to main abhi kisi bhi topic ka best content nikaal ke de sakta hoon.';
  }
  if (/\b(kya haal|kaise ho|kaisa hai|haal chal|how are you)\b/.test(q)) {
    return 'Main bilkul badhiya. Aap bolo, aaj kis topic par kaam karna hai?';
  }
  return `Hello! Main ${BRAND_NAME} hoon. Casual chat bhi kar sakte hain, ya agar kuchh find karna ho to seedha topic likh do.`;
}

async function getFirebaseContext() {
  if (state.firebaseCtx) return state.firebaseCtx;
  const appMod = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
  const fsMod = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  const cfg = window.__env || {};
  const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(cfg);
  const db = fsMod.getFirestore(app);
  state.firebaseCtx = { fsMod, db };
  return state.firebaseCtx;
}

function injectStyles() {
  if (document.getElementById('cc-ai-style')) return;
  const style = document.createElement('style');
  style.id = 'cc-ai-style';
  style.textContent = `
    .cc-ai-toggle {
      position: fixed;
      right: 16px;
      bottom: 84px;
      z-index: 4200;
      border: 0;
      border-radius: 999px;
      padding: 0.52rem 0.82rem;
      font-size: 0.82rem;
      font-weight: 700;
      font-family: "Outfit", sans-serif;
      color: #fff;
      background: linear-gradient(120deg, #355ef8, #1dbf9f);
      box-shadow: 0 10px 26px rgba(35, 73, 132, 0.28);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.48rem;
    }
    .cc-ai-toggle:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 30px rgba(35, 73, 132, 0.34);
    }
    .cc-ai-toggle-icon {
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.2);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
    }
    .cc-ai-toggle-icon svg {
      width: 14px;
      height: 14px;
      stroke: #fff;
      fill: none;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .cc-ai-toggle-label {
      letter-spacing: 0.01em;
    }
    .cc-ai-panel {
      position: fixed;
      right: 16px;
      bottom: 136px;
      z-index: 4200;
      width: min(380px, calc(100vw - 20px));
      max-height: min(560px, calc(100vh - 170px));
      border-radius: 16px;
      border: 1px solid rgba(76, 111, 166, 0.24);
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 16px 38px rgba(26, 54, 94, 0.24);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    .cc-ai-panel.open { display: flex; }
    .cc-ai-head {
      padding: 0.72rem 0.82rem;
      background: linear-gradient(135deg, #eff5ff, #ebfffa);
      border-bottom: 1px solid rgba(76, 111, 166, 0.2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
    }
    .cc-ai-title { margin: 0; font-size: 0.92rem; color: #112f59; }
    .cc-ai-sub { margin: 0.1rem 0 0; font-size: 0.73rem; color: #587099; }
    .cc-ai-brand-head {
      display: inline-flex;
      align-items: center;
      gap: 0.42rem;
    }
    .cc-ai-brand-orb {
      width: 20px;
      height: 20px;
      border-radius: 999px;
      background: radial-gradient(circle at 35% 25%, #b0f1e7, #4a7cff 60%, #355ef8);
      box-shadow: 0 0 0 1px rgba(53, 94, 248, 0.2), 0 6px 12px rgba(48, 93, 173, 0.28);
    }
    .cc-ai-close {
      border: 1px solid rgba(76, 111, 166, 0.24);
      background: #fff;
      border-radius: 10px;
      width: 30px;
      height: 30px;
      color: #325786;
      cursor: pointer;
      font-weight: 700;
    }
    .cc-ai-messages {
      padding: 0.72rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      min-height: 180px;
    }
    .cc-ai-msg {
      border-radius: 12px;
      padding: 0.56rem 0.64rem;
      font-size: 0.8rem;
      line-height: 1.5;
      border: 1px solid rgba(76, 111, 166, 0.2);
      white-space: pre-wrap;
    }
    .cc-ai-msg.user {
      align-self: flex-end;
      background: rgba(63, 115, 255, 0.1);
      color: #1f4f98;
      border-color: rgba(63, 115, 255, 0.24);
      max-width: 88%;
    }
    .cc-ai-msg.bot {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.95);
      color: #233f67;
      max-width: 100%;
    }
    .cc-ai-links {
      margin-top: 0.45rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.32rem;
    }
    .cc-ai-link {
      text-decoration: none;
      font-size: 0.72rem;
      border-radius: 999px;
      border: 1px solid rgba(76, 111, 166, 0.24);
      padding: 0.22rem 0.55rem;
      color: #2a5e9f;
      background: rgba(255, 255, 255, 0.9);
    }
    .cc-ai-quick {
      padding: 0.3rem 0.72rem 0.52rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      border-top: 1px solid rgba(76, 111, 166, 0.12);
    }
    .cc-ai-chip {
      border: 1px solid rgba(76, 111, 166, 0.22);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      color: #2d507e;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.22rem 0.56rem;
      cursor: pointer;
    }
    .cc-ai-form {
      padding: 0.58rem;
      display: flex;
      gap: 0.45rem;
      border-top: 1px solid rgba(76, 111, 166, 0.2);
      background: #f9fcff;
    }
    .cc-ai-input {
      flex: 1;
      min-width: 0;
      border: 1px solid rgba(76, 111, 166, 0.3);
      border-radius: 12px;
      padding: 0.52rem 0.62rem;
      font-size: 0.8rem;
      color: #123767;
      outline: none;
      background: #fff;
    }
    .cc-ai-send {
      border: 0;
      border-radius: 12px;
      padding: 0.52rem 0.78rem;
      color: #fff;
      font-size: 0.8rem;
      font-weight: 700;
      font-family: "Outfit", sans-serif;
      background: linear-gradient(115deg, #3f73ff, #22b99a);
      cursor: pointer;
    }
    @media (max-width: 760px) {
      .cc-ai-toggle { bottom: 94px; right: 10px; }
      .cc-ai-panel {
        right: 10px;
        bottom: 146px;
        max-height: min(66vh, 520px);
      }
    }
  `;
  document.head.appendChild(style);
}

function buildUI() {
  if (document.getElementById('cc-ai-toggle')) return null;

  const toggle = document.createElement('button');
  toggle.className = 'cc-ai-toggle';
  toggle.id = 'cc-ai-toggle';
  toggle.type = 'button';
  toggle.innerHTML = `
    <span class="cc-ai-toggle-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="10" rx="3"/><path d="M12 3v3M8.5 12h.01M15.5 12h.01"/></svg>
    </span>
    <span class="cc-ai-toggle-label">${BRAND_NAME}</span>
  `;

  const panel = document.createElement('section');
  panel.className = 'cc-ai-panel';
  panel.id = 'cc-ai-panel';
  panel.innerHTML = `
    <div class="cc-ai-head">
      <div>
        <h3 class="cc-ai-title"><span class="cc-ai-brand-head"><span class="cc-ai-brand-orb"></span>${BRAND_NAME}</span></h3>
        <p class="cc-ai-sub">Smart assistant for full Code Cloner website</p>
      </div>
      <button type="button" class="cc-ai-close" id="cc-ai-close">x</button>
    </div>
    <div class="cc-ai-messages" id="cc-ai-messages"></div>
    <div class="cc-ai-quick" id="cc-ai-quick"></div>
    <form class="cc-ai-form" id="cc-ai-form">
      <input class="cc-ai-input" id="cc-ai-input" type="text" placeholder="Ask anything: posts, developer, contact, roadmap..." autocomplete="off">
      <button class="cc-ai-send" type="submit">Send</button>
    </form>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);
  return { toggle, panel };
}

function addMessage(messagesEl, role, text, links = []) {
  const item = document.createElement('div');
  item.className = `cc-ai-msg ${role}`;
  item.textContent = text;

  if (links.length) {
    const wrap = document.createElement('div');
    wrap.className = 'cc-ai-links';
    links.forEach((entry) => {
      const a = document.createElement('a');
      a.className = 'cc-ai-link';
      a.href = entry.href;
      a.textContent = entry.label;
      wrap.appendChild(a);
    });
    item.appendChild(wrap);
  }

  messagesEl.appendChild(item);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function getPageSummary() {
  const scope = document.querySelector('main') || document.body;
  const title = (document.querySelector('h1')?.textContent || document.title || '').trim();
  const textBlocks = Array.from(scope.querySelectorAll('p, h2, h3'))
    .map((el) => normalize(el.textContent).replace(/\s+/g, ' '))
    .filter((txt) => txt.length > 45)
    .slice(0, 10);

  if (!textBlocks.length) {
    return `This page focuses on: ${title || 'Code Cloner content'}.\nUse the search or navigation links for more sections.`;
  }

  const topLines = textBlocks.slice(0, 4).map((line) => line.charAt(0).toUpperCase() + line.slice(1));
  return `Quick summary: ${title}\n- ${topLines.join('\n- ')}`;
}

function buildLearningPlan(topic) {
  const t = topic || 'web development';
  return [
    `4-week learning plan for ${t}:`,
    'Week 1: Basics + core concepts.',
    'Week 2: Practice with guided exercises.',
    'Week 3: Build a mini project.',
    'Week 4: Revise weak areas and publish a final project.'
  ].join('\n');
}

async function buildLearningIndex() {
  if (state.indexReady || state.loadingIndex) return;
  state.loadingIndex = true;

  try {
    const { fsMod, db } = await getFirebaseContext();

    const categoriesSnap = await fsMod.getDocs(fsMod.collection(db, 'learning_categories'));
    const items = [];

    for (const catDoc of categoriesSnap.docs) {
      const cat = catDoc.data() || {};
      items.push({
        type: 'category',
        title: cat.name || 'Category',
        description: cat.description || '',
        keywords: `${cat.name || ''} ${cat.description || ''}`,
        href: `courses.html?category=${encodeURIComponent(catDoc.id)}`
      });

      const coursesSnap = await fsMod.getDocs(fsMod.collection(db, `learning_categories/${catDoc.id}/courses`));
      coursesSnap.docs.forEach((courseDoc) => {
        const course = courseDoc.data() || {};
        items.push({
          type: 'course',
          title: course.name || 'Course',
          description: course.description || '',
          keywords: `${course.name || ''} ${course.description || ''} ${cat.name || ''} ${course.level || ''}`,
          href: `courses.html?category=${encodeURIComponent(catDoc.id)}&q=${encodeURIComponent(course.name || '')}`
        });
      });
    }

    state.learningIndex = items;
    state.indexReady = true;
  } catch (error) {
    console.error('AI assistant index load failed:', error);
  } finally {
    state.loadingIndex = false;
  }
}

async function buildContentIndex() {
  if (state.contentIndexReady || state.loadingContentIndex) return;
  state.loadingContentIndex = true;

  try {
    const { fsMod, db } = await getFirebaseContext();
    const items = [];

    for (const config of CONTENT_COLLECTIONS) {
      const snap = await fsMod.getDocs(fsMod.collection(db, config.type));
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() || {};
        const title = String(data[config.titleField] || data.title || 'Untitled').trim();
        const description = config.descFields
          .map((field) => String(data[field] || '').trim())
          .find(Boolean) || '';
        const category = String(data.category || '').trim();
        const tags = String(data.tags || '').trim();
        items.push({
          type: config.type,
          title,
          description,
          keywords: `${title} ${description} ${category} ${tags} ${config.type}`,
          href: `read.html?type=${encodeURIComponent(config.type)}&id=${encodeURIComponent(docSnap.id)}`,
          pageHref: config.page
        });
      });
    }

    state.contentIndex = items;
    state.contentIndexReady = true;
  } catch (error) {
    console.error('AI assistant content index load failed:', error);
  } finally {
    state.loadingContentIndex = false;
  }
}

function searchSiteLinks(query) {
  const q = normalize(query);
  return SITE_LINKS.filter((entry) => entry.keywords.some((key) => q.includes(normalize(key))))
    .slice(0, 4)
    .map((entry) => ({ label: `Open ${entry.label}`, href: entry.href }));
}

function searchLearning(query) {
  const q = normalize(query);
  const tokens = tokenizeQuery(query);
  if (!q || !tokens.length) return [];

  return state.learningIndex
    .map((item) => {
      const haystack = normalize(item.keywords);
      const title = normalize(item.title);
      let score = 0;

      tokens.forEach((token) => {
        if (title.includes(token)) score += 3;
        else if (haystack.includes(token)) score += 1;
      });

      if (haystack.includes(q)) score += 5;
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => ({
      label: `${item.item.type === 'course' ? 'Course' : 'Category'}: ${item.item.title}`,
      href: item.item.href,
      score: item.score,
      kind: 'learning'
    }));
}

function detectPreferredContentTypes(query) {
  const q = normalize(query);
  const types = [];
  if (q.includes('tip') || q.includes('trick')) types.push('tips');
  if (q.includes('fact')) types.push('facts');
  if (q.includes('article')) types.push('articles');
  if (q.includes('project')) types.push('projects');
  if (q.includes('resource') || q.includes('tool')) types.push('resources');
  return types;
}

function searchContent(query, preferredTypes = []) {
  const q = normalize(query);
  const tokens = tokenizeQuery(query);
  if (!q || !tokens.length) return [];

  const preferredSet = new Set(preferredTypes);

  return state.contentIndex
    .map((item) => {
      const haystack = normalize(item.keywords);
      const title = normalize(item.title);
      let score = 0;

      tokens.forEach((token) => {
        if (title.includes(token)) score += 4;
        else if (haystack.includes(token)) score += 2;
      });

      if (haystack.includes(q)) score += 6;
      if (preferredSet.has(item.type)) score += 5;

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => ({
      label: `${CONTENT_TYPE_LABEL[entry.item.type] || 'Item'}: ${entry.item.title}`,
      href: entry.item.href,
      score: entry.score,
      kind: 'content'
    }));
}

async function universalSearch(query) {
  await Promise.all([buildLearningIndex(), buildContentIndex()]);
  const learningMatches = searchLearning(query);
  const contentMatches = searchContent(query);

  const dedupe = new Set();
  const merged = [...contentMatches, ...learningMatches]
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      const key = `${item.label}__${item.href}`;
      if (dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    })
    .slice(0, 8);

  return merged.map((item) => ({ label: item.label, href: item.href }));
}

async function askRemoteAssistant(query) {
  try {
    const candidates = await universalSearch(query);
    const payload = {
      message: query,
      history: state.chatHistory.slice(-MAX_HISTORY),
      context: {
        brand: BRAND_NAME,
        website: WEBSITE_DETAILS,
        developer: DEVELOPER_PROFILE,
        currentPage: {
          title: document.title || '',
          path: window.location.pathname || ''
        },
        candidates: candidates.slice(0, 8)
      }
    };

    const response = await fetch(REMOTE_AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data || !data.answer) return null;

    return {
      text: String(data.answer),
      intent: String(data.intent || 'chat'),
      searchQuery: String(data.searchQuery || ''),
      links: Array.isArray(data.links) ? data.links : []
    };
  } catch (error) {
    console.error('Remote AI unavailable, falling back to local logic:', error);
    return null;
  }
}

function extractTopic(query) {
  const lower = normalize(query);
  const parts = lower.split(/\b(for|about|on)\b/);
  if (parts.length >= 3) return parts[2].trim();
  return lower.replace(/(create|make|give|a|an|the|learning|roadmap|plan)/g, '').trim();
}

async function answerQuery(query) {
  const q = normalize(query);
  if (!q) {
    return { text: `Ask me anything about ${WEBSITE_DETAILS.name}: posts, courses, roadmap, developer details, or contact info.`, links: [] };
  }

  if (isPersonalQuestion(query)) {
    return { text: getPersonalReply(query), links: [] };
  }

  if (isDeveloperOrWebsiteQuery(query)) {
    return getDeveloperWebsiteReply(query);
  }

  if (isGreetingOrSmallTalk(query)) {
    return { text: getSmallTalkReply(query), links: [] };
  }

  if (q.includes('summary') || q.includes('summarize') || q.includes('summarise')) {
    return { text: getPageSummary(), links: [] };
  }

  if (q.includes('roadmap') || q.includes('plan')) {
    const topic = extractTopic(query);
    const links = [{ label: 'Open Learning Hub', href: 'learning.html' }];
    return { text: buildLearningPlan(topic), links };
  }

  if (q.includes('course') || q.includes('category') || q.includes('learn') || q.includes('practice')) {
    await buildLearningIndex();
    const matches = searchLearning(query);
    if (matches.length) {
      return { text: `I found ${matches.length} matching learning options.`, links: matches.map((item) => ({ label: item.label, href: item.href })) };
    }
    return {
      text: 'I could not find exact matches yet. Try keywords like "web development", "java", "beginner".',
      links: [
        { label: 'Open All Courses', href: 'courses.html' },
        { label: 'Search in Courses Page', href: `courses.html?q=${encodeURIComponent(query)}` }
      ]
    };
  }

  const preferredContentTypes = detectPreferredContentTypes(query);
  const contentIntent = preferredContentTypes.length > 0 || q.includes('read') || q.includes('content');
  if (contentIntent) {
    await buildContentIndex();
    const matches = searchContent(query, preferredContentTypes);
    if (matches.length) {
      return { text: `I found ${matches.length} matching content items.`, links: matches.map((item) => ({ label: item.label, href: item.href })) };
    }

    const pageLinks = preferredContentTypes.length
      ? preferredContentTypes.map((type) => {
        const conf = CONTENT_COLLECTIONS.find((c) => c.type === type);
        return conf ? { label: `Open ${type.charAt(0).toUpperCase()}${type.slice(1)}`, href: conf.page } : null;
      }).filter(Boolean)
      : [{ label: 'Open Search', href: 'search.html' }];

    return {
      text: 'I could not find exact content matches. Try a more specific keyword.',
      links: pageLinks
    };
  }

  if (q.startsWith('open ') || q.includes('go to ')) {
    const links = searchSiteLinks(query);
    if (links.length) return { text: 'Quick navigation options:', links };
  }

  if (q.includes('search')) {
    return {
      text: 'Use global search for all content types.',
      links: [{ label: 'Open Search', href: 'search.html' }, { label: 'Search Courses', href: `courses.html?q=${encodeURIComponent(query.replace(/search/gi, '').trim())}` }]
    };
  }

  const fallbackLinks = searchSiteLinks(query);
  if (!hasExplicitSearchIntent(query)) {
    return {
      text: 'Samajh gaya. Agar aap content dhoondhna chahte ho to query ko thoda specific likho, jaise: "find android app article" ya "show java beginner course".',
      links: []
    };
  }

  const universalMatches = await universalSearch(query);
  if (universalMatches.length) {
    return {
      text: `I found ${universalMatches.length} matching results across your website content.`,
      links: universalMatches
    };
  }

  if (fallbackLinks.length) {
    return {
      text: 'I could not find exact posts yet. Try these pages:',
      links: [
        ...fallbackLinks,
        { label: `Search "${query}"`, href: `search.html?q=${encodeURIComponent(query)}` },
        { label: `Search in All Courses`, href: `courses.html?q=${encodeURIComponent(query)}` }
      ]
    };
  }

  return {
    text: 'No direct matches found yet. Try global search or courses search.',
    links: [
      { label: `Search "${query}"`, href: `search.html?q=${encodeURIComponent(query)}` },
      { label: `Search in All Courses`, href: `courses.html?q=${encodeURIComponent(query)}` },
      { label: 'Open Learning', href: 'learning.html' }
    ]
  };
}

function initQuickActions(quickEl, inputEl, submitHandler) {
  const actions = [
    { label: 'Find courses', prompt: 'Show beginner web development courses' },
    { label: 'Plan', prompt: 'Create a 4 week roadmap for javascript' },
    { label: 'Summary', prompt: 'Summarize this page' },
    { label: 'Developer', prompt: 'Developer details and contact' },
    { label: 'Search page', prompt: 'Open search' }
  ];

  actions.forEach((action) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cc-ai-chip';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      inputEl.value = action.prompt;
      submitHandler(action.prompt);
    });
    quickEl.appendChild(btn);
  });
}

function initAssistant() {
  if (window.__ccAiAssistantInit) return;
  window.__ccAiAssistantInit = true;

  injectStyles();
  const ui = buildUI();
  if (!ui) return;

  const { toggle, panel } = ui;
  const closeBtn = document.getElementById('cc-ai-close');
  const messagesEl = document.getElementById('cc-ai-messages');
  const formEl = document.getElementById('cc-ai-form');
  const inputEl = document.getElementById('cc-ai-input');
  const quickEl = document.getElementById('cc-ai-quick');

  const submitQuery = async (raw) => {
    const query = String(raw || '').trim();
    if (!query) return;
    addMessage(messagesEl, 'user', query);
    addToHistory('user', query);

    const remote = await askRemoteAssistant(query);
    if (remote) {
      let links = dedupeLinks(remote.links || []);
      if (remote.intent === 'search' || remote.intent === 'content' || remote.intent === 'learning') {
        const lookup = remote.searchQuery || query;
        const ranked = await universalSearch(lookup);
        links = dedupeLinks([...links, ...ranked]).slice(0, 8);
      }

      addMessage(messagesEl, 'bot', remote.text, links);
      addToHistory('assistant', remote.text);
      inputEl.value = '';
      return;
    }

    const result = await answerQuery(query);
    addMessage(messagesEl, 'bot', result.text, result.links || []);
    addToHistory('assistant', result.text);
    inputEl.value = '';
  };

  addMessage(
    messagesEl,
    'bot',
    `Hi! I am ${BRAND_NAME}. Main website content, learning courses, roadmap, developer details, aur contact info sab bata sakta hoon.`
  );

  initQuickActions(quickEl, inputEl, submitQuery);

  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) inputEl.focus();
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
  });

  formEl.addEventListener('submit', (event) => {
    event.preventDefault();
    submitQuery(inputEl.value);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAssistant);
} else {
  initAssistant();
}
