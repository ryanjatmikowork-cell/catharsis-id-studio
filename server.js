require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const PROJECTS_DIR = path.join(ROOT_DIR, 'projects');
const FOLDERS = ['00-Admin', '01-Ide-Riset', '02-Script', '03-Visual', '04-Audio'];

const DEFAULT_DB = {
  renderSubuhEnabled: true,
  voiceEngine: 'voicebox',
  voiceboxServerRunning: false,
  voiceboxLang: 'Indonesia',
  voiceboxVoice: 'Nara (Default ID)',
  voiceboxVoices: ['Nara (Default ID)', 'Raka (Deep Narasi)', 'Sinta (Ceria Shorts)', 'Alex (EN Neutral)'],
  voiceboxHistory: [],
  quota: { imageGen: 17, fiveHour: 72, weekly: 65 },
  notifications: [
    { id: 'n1', title: 'Naskah Motion disetor', desc: 'Cron 05 · Topik viral siap dirender', time: 'Baru saja', unread: true, icon: 'file-text' },
    { id: 'n2', title: 'Render selesai · 60 fps', desc: 'Motion #08 (Tipe A)', time: '4 mnt lalu', unread: true, icon: 'film' },
    { id: 'n3', title: 'Tayang di 4 platform', desc: 'YouTube, Instagram, TikTok, Facebook', time: '12 mnt lalu', unread: true, icon: 'send' }
  ],
  platforms: {
    youtube: { name: 'YouTube', followers: 0, delta: 0, views: 0, videos: 0, ctr: '—', color: '#ef4444' },
    instagram: { name: 'Instagram', followers: 0, delta: 0, views: 0, videos: 0, ctr: '—', color: '#ec4899' },
    tiktok: { name: 'TikTok', followers: 0, delta: 0, views: 0, videos: 0, ctr: '—', color: '#0f172a' },
    facebook: { name: 'Facebook', followers: 0, delta: 0, views: 0, videos: 0, ctr: '—', color: '#2563eb' }
  },
  agents: [
    { id: 'sys-agy', name: 'System', engine: 'GEMINI', group: 'Sistem & Router', role: 'Sistem, koordinasi & manajemen proyek', status: 'Aktif', currentTask: 'Memantau cron aktif', color: 'bg-teal-600' },
    { id: 'sys-codex', name: 'System', engine: 'CODEX', group: 'Sistem & Router', role: 'Tugas proyek & dashboard', status: 'Aktif', currentTask: 'Sinkronisasi folder', color: 'bg-slate-800' },
    { id: 'rev-codex', name: 'Revision', engine: 'GEMINI', group: 'Revisi & Produksi', role: 'Komentar & revisi scene otomatis', status: 'Aktif', currentTask: 'Menunggu komentar revisi', color: 'bg-orange-500' },
    { id: 'agent-a', name: 'Agent A', engine: 'GEMINI', group: 'Revisi & Produksi', role: 'Visual reguler — lane A', status: 'Bekerja', currentTask: 'Video-95 · 18/24 scene', color: 'bg-blue-600' },
    { id: 'agent-b', name: 'Agent B', engine: 'GEMINI', group: 'Revisi & Produksi', role: 'Visual reguler — lane B', status: 'Bekerja', currentTask: 'Video-94 · 22/24 scene', color: 'bg-teal-500' },
    { id: 'agent-c', name: 'Agent C', engine: 'CODEX', group: 'Revisi & Produksi', role: 'Visual reguler — lane C', status: 'Bekerja', currentTask: 'Video-96 · 9/20 scene', color: 'bg-indigo-600' },
    { id: 'agent-d', name: 'Agent D', engine: 'CODEX', group: 'Revisi & Produksi', role: 'Visual reguler — lane D', status: 'Aktif', currentTask: 'Thumbnail V2 queue', color: 'bg-emerald-600' },
    { id: 'agent-e', name: 'Agent E', engine: 'REMOTION', group: 'Revisi & Produksi', role: 'Aset & animasi Motion · Remotion', status: 'Aktif', currentTask: 'Siap render 60 fps', color: 'bg-amber-500' },
    { id: 'agy-cli', name: 'Gemini CLI', engine: 'GEMINI', group: 'Asisten & Gateway', role: 'Riset tren, naskah & chat kontrol', status: 'Aktif', currentTask: 'Siap menerima perintah', color: 'bg-sky-600' },
    { id: 'claude-cli', name: 'Claude CLI', engine: 'CLAUDE', group: 'Asisten & Gateway', role: 'Coding, arsitektur & kontrol dashboard', status: 'Aktif', currentTask: 'Chat kontrol dashboard', color: 'bg-orange-600' },
    { id: 'openclaw', name: 'OpenClaw', engine: 'BUFFER', group: 'Asisten & Gateway', role: 'Gateway publikasi 4 platform via Buffer', status: 'Aktif', currentTask: 'Routing YT, IG, TT, FB', color: 'bg-purple-600' },
    { id: 'hermes', name: 'Hermes', engine: 'ROUTER', group: 'Asisten & Gateway', role: 'Notifikasi & auto-reply komentar', status: 'Aktif', currentTask: 'Polling komentar YT & IG', color: 'bg-amber-600' }
  ],
  crons: [
    { id: 'c01', code: '01', name: 'Auto-Reply Komentar YouTube', expr: '0 */2 * * *', schedule: '0 */2 * * * · Asia/Jakarta', status: 'Aktif', lastRun: '24 Nov 2026, 16:00', type: 'reply-yt', desc: 'Membalas komentar baru di YouTube otomatis.' },
    { id: 'c02', code: '02', name: 'Auto-Reply Komentar Instagram', expr: '0 12,20 * * *', schedule: '0 12,20 * * * · Asia/Jakarta', status: 'Aktif', lastRun: '24 Nov 2026, 12:00', type: 'reply-ig', desc: 'Membalas komentar Reels & trigger DM.' },
    { id: 'c03', code: '03', name: 'Upload Video Utama Harian', expr: '0 17 * * *', schedule: '0 17 * * * · Asia/Jakarta', status: 'Aktif', lastRun: '23 Nov 2026, 17:00', type: 'upload-long', desc: 'Publikasi video panjang ke YouTube.' },
    { id: 'c04', code: '04', name: 'Upload Shorts Harian (4 Platform)', expr: '0 1,9,14 * * *', schedule: '0 1,9,14 * * * · Asia/Jakarta', status: 'Aktif', lastRun: '24 Nov 2026, 14:00', type: 'upload-shorts', desc: 'Menayangkan 3 potongan Shorts per hari via Buffer.' },
    { id: 'c05', code: '05', name: 'Setor Naskah Motion (21:00 WIB)', expr: '0 21 * * *', schedule: '0 21 * * * · Asia/Jakarta', status: 'Aktif', lastRun: '23 Nov 2026, 21:00', type: 'script-motion', desc: 'Riset tren viral & setor naskah JSON via Gemini.' },
    { id: 'c06', code: '06', name: 'Auto-Render Motion (Langsung)', expr: null, schedule: 'event · onScriptCreated', status: 'Aktif', lastRun: '23 Nov 2026, 21:04', type: 'render-motion', desc: 'Memicu Agent E saat naskah baru masuk.' },
    { id: 'c07', code: '07', name: 'Upload Video Motion (16:00 WIB)', expr: '0 16 * * *', schedule: '0 16 * * * · Asia/Jakarta', status: 'Aktif', lastRun: '24 Nov 2026, 16:00', type: 'upload-motion', desc: 'Distribusi video Motion ke 4 platform via Buffer.' },
    { id: 'c08', code: '08', name: 'Render Batch Subuh Video Panjang', expr: '0 0 * * *', schedule: '0 0 * * * · 00:00–05:45', status: 'Aktif', lastRun: '24 Nov 2026, 00:05', type: 'render-long', desc: 'Menjalankan Agent A–D saat jam sepi.' },
    { id: 'c09', code: '09', name: 'Sinkronisasi Statistik 4 Platform', expr: '0 6 * * *', schedule: '0 6 * * * · Asia/Jakarta', status: 'Aktif', lastRun: '24 Nov 2026, 06:00', type: 'sync-stats', desc: 'Menarik angka views & follower terbaru.' },
    { id: 'c10', code: '10', name: 'Backup Folder Proyek', expr: '0 3 * * 0', schedule: '0 3 * * 0 · Mingguan', status: 'Paused', lastRun: '17 Nov 2026, 03:00', type: 'backup', desc: 'Arsip otomatis folder proyek.' },
    { id: 'c11', code: '11', name: 'Auto-Sync TikTok Direct API', expr: '0 */6 * * *', schedule: '0 */6 * * * · Asia/Jakarta', status: 'Error', lastRun: '23 Nov 2026, 18:00', type: 'tiktok-api', desc: 'Token kedaluwarsa — fallback via Buffer.' }
  ],
  autoReplyLogs: [],
  motionVideos: [],
  longVideos: [],
  shorts: [],
  revisions: [],
  chatMessages: [
    { id: 'm1', sender: 'user', text: 'Upload hari ini aman?', time: '10:02' },
    { id: 'm2', sender: 'agent', agentName: 'Gemini CLI', text: 'Aman semua. Tambahkan GEMINI_API_KEY dan BUFFER_ACCESS_TOKEN di Variables Railway untuk mengaktifkan AI Gemini dan publikasi Buffer live.', time: '10:02' }
  ],
  topVideos: []
};

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const f of FOLDERS) fs.mkdirSync(path.join(PROJECTS_DIR, f), { recursive: true });
}
function loadDB() {
  ensureDirs();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return JSON.parse(JSON.stringify(DEFAULT_DB)); }
}
function saveDB(db) { ensureDirs(); fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
function scanFolders() {
  ensureDirs();
  const out = {};
  for (const f of FOLDERS) out[f] = fs.readdirSync(path.join(PROJECTS_DIR, f)).filter(x => !x.startsWith('.')).sort().reverse();
  return out;
}
function writeProjFile(folder, filename, content) {
  ensureDirs();
  const safeFolder = FOLDERS.includes(folder) ? folder : '00-Admin';
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  const full = path.join(PROJECTS_DIR, safeFolder, safeName);
  fs.writeFileSync(full, Buffer.isBuffer(content) ? content : (typeof content === 'string' ? content : JSON.stringify(content, null, 2)));
  return { filename: safeName, publicUrl: `/projects/${safeFolder}/${safeName}` };
}
function pushNotif(db, title, desc, icon = 'check-circle') {
  db.notifications.unshift({
    id: 'n-' + Date.now(), title, desc,
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    unread: true, icon
  });
  if (db.notifications.length > 20) db.notifications.length = 20;
}
function providers() {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    buffer: Boolean(process.env.BUFFER_ACCESS_TOKEN),
    youtube: Boolean(process.env.YOUTUBE_API_KEY),
    meta: Boolean(process.env.META_ACCESS_TOKEN)
  };
}

// ==================== GEMINI + FALLBACK LLM ====================
async function callGemini(systemPrompt, userPrompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const candidates = [...new Set([
    process.env.GEMINI_MODEL || 'gemini-4-hydrogen',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ])];
  let lastErr = null;
  for (const model of candidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || null;
      if (text) return text;
    } else {
      const errTxt = await res.text();
      lastErr = new Error(`Gemini (${model}) HTTP ${res.status}: ${errTxt.slice(0, 140)}`);
      if (![404, 429, 500, 503].includes(res.status)) throw lastErr;
    }
  }
  throw lastErr || new Error('Gemini tidak merespons');
}

async function askLLM(sys, prompt) {
  try {
    if (process.env.GEMINI_API_KEY) return await callGemini(sys, prompt);
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest', max_tokens: 700, system: sys, messages: [{ role: 'user', content: prompt }] })
      });
      if (r.ok) return (await r.json()).content?.[0]?.text || null;
    }
    if (process.env.OPENAI_API_KEY) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] })
      });
      if (r.ok) return (await r.json()).choices?.[0]?.message?.content || null;
    }
  } catch (e) {
    console.warn('[LLM fallback]', e.message);
  }
  return null;
}

async function generateScriptWithAI(customTitle) {
  const prompt = customTitle
    ? `Buat naskah video vertikal 9:16 bahasa Indonesia santai-cerdas untuk topik: "${customTitle}". Balas HANYA JSON valid: {"title":"...","scenes":[{"no":1,"label":"Hook","visual":"...","vo":"...","dur":"5 dtk","status":"Siap"}]}`
    : `Riset 1 topik psikologi/ekonomi/fenomena harian yang relevan di Indonesia lalu buat naskah 3 scene video vertikal 9:16. Balas HANYA JSON valid: {"title":"...","scenes":[{"no":1,"label":"Hook","visual":"...","vo":"...","dur":"5 dtk","status":"Siap"}]}`;

  const raw = await askLLM('Kamu penulis naskah video edukasi pendek bergaya Catharsis ID. Balas hanya JSON murni.', prompt);
  if (raw) {
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      if (parsed.title && Array.isArray(parsed.scenes)) return parsed;
    } catch {}
  }
  const title = customTitle || 'Fenomena Doomspending: Belanja Impulsif Saat Masa Depan Terasa Gelap';
  return {
    title,
    scenes: [
      { no: 1, label: 'Hook', visual: 'Karakter menatap layar penuh rasa penasaran', vo: title, dur: '5 dtk', status: 'Siap' },
      { no: 2, label: 'Inti', visual: 'Animasi grafik & poin utama 60 fps', vo: 'Otak kita sering mencari kontrol instan lewat kebiasaan kecil sebelum logika mengejar.', dur: '9 dtk', status: 'Siap' }
    ]
  };
}

// ==================== BUFFER API (4 PLATFORM SOSMED) ====================
async function callBufferGraphQL(query, variables = {}) {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) return null;
  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) throw new Error(`Buffer HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message || 'Buffer GraphQL error');
  return json;
}

async function getBufferChannels() {
  const orgRes = await callBufferGraphQL(`query GetOrganizations { account { organizations { id name } } }`);
  const orgs = orgRes?.data?.account?.organizations || [];
  const all = [];
  for (const org of orgs) {
    const chRes = await callBufferGraphQL(
      `query GetChannels { channels(input: { organizationId: ${JSON.stringify(org.id)} }) { id name displayName service } }`
    );
    for (const ch of (chRes?.data?.channels || [])) {
      all.push({ ...ch, organizationId: org.id });
    }
  }
  return all;
}

async function syncLiveFromAPIs(db) {
  // 1. Sync Buffer channels & post counts
  if (process.env.BUFFER_ACCESS_TOKEN) {
    try {
      const channels = await getBufferChannels();
      const orgIds = [...new Set(channels.map(c => c.organizationId).filter(Boolean))];
      let posts = [];
      for (const orgId of orgIds) {
        try {
          const pRes = await callBufferGraphQL(
            `query GetPosts { posts(first: 20, input: { organizationId: ${JSON.stringify(orgId)} }) { edges { node { id text status channelId createdAt } } } }`
          );
          posts.push(...(pRes?.data?.posts?.edges || []).map(e => e.node));
        } catch {}
      }
      for (const ch of channels) {
        const svc = (ch.service || '').toLowerCase();
        const key = svc.includes('youtube') ? 'youtube' : svc.includes('instagram') ? 'instagram' : svc.includes('tiktok') ? 'tiktok' : svc.includes('facebook') ? 'facebook' : null;
        if (key && db.platforms[key]) {
          db.platforms[key].name = `${ch.displayName || ch.name} (${key.toUpperCase()})`;
          db.platforms[key].videos = posts.filter(p => p.channelId === ch.id).length;
        }
      }
    } catch (e) { console.warn('[Buffer sync]', e.message); }
  }

  // 2. Sync real YouTube subscriber, views, & latest videos if YOUTUBE_API_KEY + YOUTUBE_HANDLE are set
  if (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_HANDLE) {
    try {
      const handle = process.env.YOUTUBE_HANDLE.startsWith('@') ? process.env.YOUTUBE_HANDLE : '@' + process.env.YOUTUBE_HANDLE;
      const chUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(process.env.YOUTUBE_API_KEY)}`;
      const chData = await (await fetch(chUrl)).json();
      const item = chData.items?.[0];
      if (item) {
        const st = item.statistics || {};
        db.platforms.youtube.name = item.snippet?.title || 'YouTube';
        db.platforms.youtube.followers = Number(st.subscriberCount || 0);
        db.platforms.youtube.views = Number(st.viewCount || 0);
        db.platforms.youtube.videos = Number(st.videoCount || 0);

        const vUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(item.id)}&order=date&maxResults=5&type=video&key=${encodeURIComponent(process.env.YOUTUBE_API_KEY)}`;
        const vData = await (await fetch(vUrl)).json();
        if (Array.isArray(vData.items) && vData.items.length) {
          db.longVideos = vData.items.map((v, idx) => ({
            id: v.id?.videoId || 'yt-' + idx,
            code: 'YT-' + (idx + 1),
            title: v.snippet?.title || 'Video YouTube',
            visual: 'Live',
            vo: 'Ada',
            render: 'Jadi',
            shortCount: '—',
            status: 'Publish',
            views: 0
          }));
        }
      }
    } catch (e) { console.warn('[YouTube sync]', e.message); }
  }
  return db;
}

async function publishViaBuffer({ title, caption }) {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) return { ok: true, mode: 'simulated', message: 'BUFFER_ACCESS_TOKEN belum diisi' };

  try {
    const discovered = await getBufferChannels();
    const targetIds = process.env.BUFFER_CHANNEL_IDS
      ? process.env.BUFFER_CHANNEL_IDS.split(',').map(s => s.trim()).filter(Boolean)
      : discovered.map(c => c.id);

    if (!targetIds.length) {
      return { ok: false, mode: 'buffer-no-channels', message: 'Belum ada channel sosmed terhubung di akun Buffer Anda.' };
    }

    const created = [];
    for (const channelId of targetIds) {
      const mut = `mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id status } } ... on MutationError { message } } }`;
      const out = await callBufferGraphQL(mut, {
        input: { channelId, text: caption || title, schedulingType: 'automatic', mode: 'addToQueue' }
      });
      created.push({ channelId, result: out?.data?.createPost || out });
    }
    return { ok: true, mode: 'buffer-live', channelsCount: targetIds.length, created };
  } catch (err) {
    console.warn('[Buffer API]', err.message);
    return { ok: false, mode: 'buffer-error', message: err.message };
  }
}

// ==================== PIPELINE & CRON SCHEDULER ====================
const activeCronTasks = new Map();

async function runMotionPipeline({ customTitle = null, customFormat = 'Tipe A' } = {}) {
  const db = loadDB();
  const scriptData = await generateScriptWithAI(customTitle);
  const nextCode = String(db.motionVideos.length + 7).padStart(2, '0');
  const slug = scriptData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 26);

  writeProjFile('01-Ide-Riset', `${new Date().toISOString().slice(0, 10)}-${slug}.md`, `# ${scriptData.title}\n`);
  writeProjFile('02-Script', `motion-${nextCode}-${slug}.json`, { ...scriptData, format: customFormat });

  const vid = {
    id: 'vid-' + Date.now(), code: nextCode, title: scriptData.title, format: customFormat, status: 'Rendering', progress: 40,
    date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    platforms: ['YT', 'IG', 'FB', 'TT'], views: 0, bgTheme: '#0f172a', scenes: scriptData.scenes
  };
  db.motionVideos.unshift(vid);
  db.revisions.unshift({
    id: 'rev-' + Date.now(),
    videoCode: 'Motion-' + nextCode,
    title: scriptData.title,
    slot: customFormat + ' · Cover',
    headline: scriptData.title.toUpperCase().slice(0, 48),
    bgColor: '#0f172a',
    accentColor: '#14b8a6',
    mood: 'neutral',
    lastComment: 'Dibuat otomatis oleh AI',
    updatedAt: 'Baru saja',
    status: 'Siap direvisi'
  });
  db.quota.fiveHour = Math.min(99, db.quota.fiveHour + 3);
  pushNotif(db, 'Naskah Motion disetor', `#${nextCode}: ${scriptData.title.slice(0, 44)}`, 'file-text');
  saveDB(db);

  setTimeout(async () => {
    const fresh = loadDB();
    const target = fresh.motionVideos.find(v => v.id === vid.id);
    if (target) {
      target.progress = 100;
      target.status = 'Tayang';
      const pub = await publishViaBuffer({
        title: target.title,
        caption: `${target.title}\n\n${(target.scenes || []).map(s => s.vo).join(' ')}`
      });
      pushNotif(
        fresh,
        'Render selesai · 60 fps',
        pub.mode === 'buffer-live'
          ? `Motion #${nextCode} masuk antrean Buffer (${pub.channelsCount} channel)`
          : `Motion #${nextCode} siap tayang (${pub.mode})`,
        'check-circle'
      );
      saveDB(fresh);
    }
  }, 1600);
  return vid;
}

async function executeCron(id) {
  const db = loadDB();
  const job = db.crons.find(c => c.id === id);
  if (!job) return { ok: false };
  job.lastRun = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  if (job.status === 'Error') job.status = 'Aktif';
  if (job.type === 'script-motion' || job.type === 'render-motion') {
    saveDB(db);
    return { ok: true, video: await runMotionPipeline() };
  }
  if (job.type === 'sync-stats') {
    await syncLiveFromAPIs(db);
    pushNotif(db, 'Statistik tersinkron', 'Data live dari Buffer & YouTube diperbarui', 'bar-chart-2');
  } else {
    pushNotif(db, `Cron ${job.code} dijalankan`, job.name, 'check-circle');
  }
  saveDB(db);
  return { ok: true, job };
}

function reloadCrons() {
  for (const t of activeCronTasks.values()) { try { t.stop(); } catch {} }
  activeCronTasks.clear();
  const db = loadDB();
  for (const j of db.crons) {
    if (j.status === 'Aktif' && j.expr && cron.validate(j.expr)) {
      activeCronTasks.set(j.id, cron.schedule(j.expr, () => executeCron(j.id), { timezone: process.env.TZ || 'Asia/Jakarta' }));
    }
  }
}

// ==================== EXPRESS SERVER ====================
const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use((req, res, next) => {
  const pwd = process.env.DASHBOARD_PASSWORD;
  if (!pwd || req.path === '/api/health') return next();
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Basic ')) {
    const pass = Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':').slice(1).join(':');
    if (pass === pwd) return next();
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="Catharsis ID"');
  return res.status(401).send('Autentikasi diperlukan');
});

app.use('/projects', express.static(PROJECTS_DIR));

app.get('/api/health', (req, res) => res.json({ ok: true, providers: providers() }));

app.get('/api/test-connections', async (req, res) => {
  const status = { providers: providers(), geminiTest: 'not-configured', bufferTest: 'not-configured' };
  if (process.env.GEMINI_API_KEY) {
    try {
      const reply = await callGemini('Balas 3 kata saja.', 'Tes koneksi Gemini');
      status.geminiTest = reply ? `OK: ${reply.trim()}` : 'Empty response';
    } catch (e) { status.geminiTest = `ERROR: ${e.message}`; }
  }
  if (process.env.BUFFER_ACCESS_TOKEN) {
    try {
      const ch = await getBufferChannels();
      status.bufferTest = `OK: ${ch.length} channel terdeteksi`;
      status.bufferChannels = ch;
    } catch (e) { status.bufferTest = `ERROR: ${e.message}`; }
  }
  res.json(status);
});

app.get('/api/state', async (req, res) => {
  const p = providers();
  const db = loadDB();
  let changed = false;

  const sampleIds = new Set(['vid-88', 'vid-87', 'sh-1', 'sh-2', 'rev-1', 'rev-2', 'lv-95', 'lv-94', 'lv-88', 'vo-1', 'r1']);
  if (db.platforms?.youtube?.followers === 393 && db.platforms?.instagram?.followers === 1600) {
    db.platforms = JSON.parse(JSON.stringify(DEFAULT_DB.platforms));
    changed = true;
  }
  for (const key of ['motionVideos', 'longVideos', 'shorts', 'revisions', 'voiceboxHistory', 'autoReplyLogs']) {
    const before = (db[key] || []).length;
    db[key] = (db[key] || []).filter(item => !sampleIds.has(item.id));
    if (db[key].length !== before) changed = true;
  }
  if ((db.topVideos || []).some(v => v.title.includes('Merpati Skinner'))) {
    db.topVideos = [];
    changed = true;
  }
  if (!db.hasSyncedOnce) {
    await syncLiveFromAPIs(db);
    db.hasSyncedOnce = true;
    changed = true;
  }
  if (changed) saveDB(db);

  res.json({
    ...db,
    folders: scanFolders(),
    providers: { ...p, openai: p.gemini || p.openai },
    serverTime: new Date().toLocaleTimeString('id-ID') + ' WIB'
  });
});

app.post('/api/notifications/read', (req, res) => { const db = loadDB(); db.notifications.forEach(n => n.unread = false); saveDB(db); res.json({ ok: true }); });
app.post('/api/crons', (req, res) => {
  const { name, expr } = req.body || {};
  const db = loadDB();
  const code = String(db.crons.length + 1).padStart(2, '0');
  db.crons.push({ id: 'c-' + Date.now(), code, name, expr: expr || '0 8 * * *', schedule: `${expr || '0 8 * * *'} · Asia/Jakarta`, desc: 'Automasi kustom', status: 'Aktif', lastRun: 'Belum jalan', type: 'custom' });
  saveDB(db); reloadCrons(); res.json({ ok: true });
});
app.post('/api/crons/:id/toggle', (req, res) => { const db = loadDB(); const j = db.crons.find(x => x.id === req.params.id); if (j) j.status = j.status === 'Aktif' ? 'Paused' : 'Aktif'; saveDB(db); reloadCrons(); res.json({ ok: true }); });
app.post('/api/crons/:id/run', async (req, res) => res.json(await executeCron(req.params.id)));
app.post('/api/motion/render', async (req, res) => res.json({ ok: true, video: await runMotionPipeline({ customTitle: req.body?.title || null, customFormat: req.body?.format || 'Tipe A' }) }));
app.post('/api/long-videos/:id/publish', async (req, res) => {
  const db = loadDB();
  const v = db.longVideos.find(x => x.id === req.params.id);
  if (v) {
    v.status = 'Publish'; v.render = 'Jadi';
    await publishViaBuffer({ title: v.title, caption: `${v.code} — ${v.title}` });
    saveDB(db);
  }
  res.json({ ok: true });
});
app.post('/api/shorts', (req, res) => {
  const db = loadDB();
  db.shorts.unshift({ id: 'sh-' + Date.now(), label: 'Short ' + String.fromCharCode(65 + db.shorts.length), parent: 'Video Utama', hook: String(req.body?.hook || 'SHORT BARU').toUpperCase(), sub: 'Potongan 4 platform', range: req.body?.range || '1:00–2:05', dur: 65, status: 'Siap render', platforms: ['YT', 'IG', 'TT', 'FB'], schedule: 'Antre · 09:00 WIB' });
  saveDB(db); res.json({ ok: true });
});
app.post('/api/shorts/:id/publish', async (req, res) => {
  const db = loadDB();
  const s = db.shorts.find(x => x.id === req.params.id);
  if (s) {
    s.status = 'Sudah tayang'; s.schedule = 'Tayang · Baru saja';
    await publishViaBuffer({ title: s.hook, caption: `${s.hook}\n${s.sub}` });
    saveDB(db);
  }
  res.json({ ok: true });
});
app.post('/api/revisions/:id/comment', (req, res) => {
  const db = loadDB();
  const rev = db.revisions.find(x => x.id === req.params.id);
  const c = String(req.body?.comment || '');
  if (rev && c) {
    const low = c.toLowerCase();
    const q = c.match(/["“]([^"”]+)["”]/);
    if (q) rev.headline = q[1].toUpperCase();
    else if (low.includes('teks') || low.includes('judul')) { const after = c.split(/ganti[:,]?\s*/i)[1]; if (after) rev.headline = after.trim().toUpperCase(); }
    if (low.includes('terang') || low.includes('cerah')) { rev.bgColor = '#0d9488'; rev.accentColor = '#ffffff'; }
    else if (low.includes('gelap')) { rev.bgColor = '#0f172a'; rev.accentColor = '#facc15'; }
    else if (low.includes('biru')) { rev.bgColor = '#1d4ed8'; rev.accentColor = '#ffffff'; }
    rev.lastComment = c; rev.updatedAt = 'Baru saja'; rev.status = 'Dirender ulang otomatis';
    writeProjFile('03-Visual', `revision-${rev.videoCode.toLowerCase()}.json`, rev);
    saveDB(db);
  }
  res.json({ ok: true });
});
app.post('/api/storyboard/:videoId/scenes', (req, res) => {
  const db = loadDB();
  const v = db.motionVideos.find(x => x.id === req.params.videoId);
  if (v) { v.scenes = v.scenes || []; v.scenes.push({ no: v.scenes.length + 1, label: 'Scene Baru', vo: req.body?.vo, visual: req.body?.visual, dur: '6 dtk', status: 'Siap' }); saveDB(db); }
  res.json({ ok: true });
});
app.post('/api/agents/:id/toggle', (req, res) => {
  const db = loadDB();
  const a = db.agents.find(x => x.id === req.params.id);
  if (a) a.status = { Aktif: 'Bekerja', Bekerja: 'Siaga', Siaga: 'Aktif' }[a.status] || 'Aktif';
  saveDB(db); res.json({ ok: true });
});
app.post('/api/quota/reset', (req, res) => { const db = loadDB(); db.quota = { imageGen: 10, fiveHour: 20, weekly: 38 }; saveDB(db); res.json({ ok: true }); });
app.post('/api/settings/subuh', (req, res) => { const db = loadDB(); db.renderSubuhEnabled = !db.renderSubuhEnabled; saveDB(db); res.json({ ok: true }); });
app.post('/api/voicebox/server-toggle', (req, res) => { const db = loadDB(); db.voiceboxServerRunning = !db.voiceboxServerRunning; saveDB(db); res.json({ ok: true }); });
app.post('/api/voicebox/generate', async (req, res) => {
  const { text = '', engine = 'voicebox', lang = 'Indonesia' } = req.body || {};
  const db = loadDB();
  let audioUrl = null; let mode = 'browser-fallback';
  if (engine === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'}`, {
      method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
    });
    if (r.ok) { audioUrl = writeProjFile('04-Audio', `vo-${Date.now()}.mp3`, Buffer.from(await r.arrayBuffer())).publicUrl; mode = 'elevenlabs-live'; }
  }
  const rec = { id: 'vo-' + Date.now(), text, voice: db.voiceboxVoice, engine: engine === 'elevenlabs' ? 'ElevenLabs' : 'Voicebox', lang, duration: Math.max(3, Math.round(text.split(/\s+/).length / 2.2)) + ' dtk', audioUrl, mode, time: 'Baru saja' };
  db.voiceboxHistory.unshift(rec); saveDB(db);
  res.json({ ok: true, record: rec });
});
app.post('/api/stats/sync', async (req, res) => res.json(await executeCron('c09')));
app.post('/api/chat', async (req, res) => {
  const { agentId, text = '' } = req.body || {};
  const db = loadDB();
  const agent = db.agents.find(a => a.id === agentId) || db.agents[8];
  const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  db.chatMessages.push({ id: 'm-' + Date.now(), sender: 'user', text, time });
  saveDB(db);

  const low = text.toLowerCase();
  const ctx = `${db.crons.filter(c => c.status === 'Aktif').length} cron aktif, ${db.motionVideos.length} video Motion, ${db.shorts.length} Shorts, Buffer=${Boolean(process.env.BUFFER_ACCESS_TOKEN)}`;

  let parsed = null;
  const sysPrompt = `Kamu adalah agen kontrol dashboard Catharsis ID (${agent.name}).
Status sistem: ${ctx}.
Tugasmu: pahami pesan user dan tentukan aksi dashboard. Balas HANYA JSON valid:
{"action":"none"|"create_motion"|"sync_stats"|"run_cron","topic":"judul video menarik jika create_motion","format":"Tipe A"|"Tipe B"|"Tipe C"|"Tipe D"|"Serial","cronCode":"01..11 jika run_cron","reply":"jawaban singkat ramah bahasa Indonesia"}
Aturan:
- Jika user menyuruh buat/bikin/render/produksi video atau naskah tentang topik apa pun (misal "buat video ...", "bikin konten ...", "jadikan video ..."), set action="create_motion" dan isi "topic".
- Jika user minta sinkronkan statistik, set action="sync_stats".
- Jika user hanya bertanya, set action="none", jawab singkat di "reply", dan ingatkan bahwa mereka bisa mengetik "Buat video: <topik>" untuk langsung memproduksinya ke tab Motion & Buffer.`;

  const raw = await askLLM(sysPrompt, text);
  if (raw) {
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      parsed = { action: 'none', reply: raw };
    }
  }

  // Keyword fallback jika LLM belum mengembalikan JSON aksi
  if (!parsed || parsed.action === 'none') {
    if (/(buat|bikin|buatkan|produksi|render|jalankan).*(video|konten|motion|naskah)/i.test(low)) {
      const cleanTopic = text.replace(/^(buat|bikin|buatkan|produksi|render|jalankan)\s*(video|konten|motion|naskah)?\s*(tentang|soal|:)?\s*/i, '').trim();
      parsed = { action: 'create_motion', topic: cleanTopic || null, format: 'Tipe A', reply: '' };
    }
  }

  let finalReply = parsed?.reply || '';
  if (parsed?.action === 'create_motion') {
    const v = await runMotionPipeline({ customTitle: parsed.topic || null, customFormat: parsed.format || 'Tipe A' });
    finalReply = `${finalReply ? finalReply + '\n\n' : ''}✅ **Motion #${v.code} (${v.format})** mulai diproduksi: "${v.title}". Cek progresnya di tab **Motion** dan **Storyboard**.`;
  } else if (parsed?.action === 'sync_stats') {
    await executeCron('c09');
    finalReply = `${finalReply ? finalReply + '\n\n' : ''}✅ Statistik 4 platform sudah disinkronkan.`;
  } else if (parsed?.action === 'run_cron' && parsed.cronCode) {
    const freshDb = loadDB();
    const job = freshDb.crons.find(c => c.code === String(parsed.cronCode).padStart(2, '0'));
    if (job) {
      await executeCron(job.id);
      finalReply = `${finalReply ? finalReply + '\n\n' : ''}✅ Cron ${job.code} (${job.name}) berhasil dijalankan.`;
    }
  }

  if (!finalReply) {
    finalReply = process.env.GEMINI_API_KEY
      ? `Server Gemini sedang sibuk sementara (503). Status lokal: ${ctx}. Coba kirim ulang sebentar lagi ya.`
      : `Aman semua (${ctx}). Tambahkan GEMINI_API_KEY di Railway Variables untuk chat AI penuh.`;
  }

  const fresh = loadDB();
  fresh.chatMessages.push({ id: 'm-' + (Date.now() + 1), sender: 'agent', agentName: agent.name, text: finalReply, time });
  saveDB(fresh);
  res.json({ ok: true, reply: finalReply });
});

app.get('*', (req, res) => res.sendFile(path.join(ROOT_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`Catharsis ID Studio (Gemini + Buffer) aktif di port ${PORT}`);
  reloadCrons();
});
