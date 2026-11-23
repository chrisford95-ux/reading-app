/* ==========================================================================
   ClearRead AAC — Step 4 (Upgraded): visuals.js
   ARASAAC + OpenMoji, Web Photos (Wikimedia + Openverse), Pixabay BYOK,
   Direct Clipboard Paste (Cmd/Ctrl+V), & Compressed Offline Base64 Caching
   ========================================================================== */
(function () {
  const App = (window.ReadingApp = window.ReadingApp || {});
  const ARASAAC_SEARCH = 'https://api.arasaac.org/v1/pictograms/en/search/';
  const ARASAAC_IMG = id => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
  const OPENMOJI_SVG = hex => `https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/${hex}.svg`;
  const PIXABAY_STORE = 'clearread_pixabay_v1';

  let activeDraft = null;
  let pickerCtx = null; // { itemIdx, choiceIdx }
  let activeSource = 'aac'; // 'aac' | 'web' | 'pixabay'
  const searchCache = new Map();

  const OPENMOJI_HEX = {
    apple: '1F34E', ball: '26BD', banana: '1F34C', bear: '1F43B', bee: '1F41D', bell: '1F514', bird: '1F426',
    book: '1F4D6', bread: '1F35E', broom: '1F9F9', cake: '1F382', castle: '1F3F0', cheese: '1F9C0', clock: '23F0',
    cloud: '2601', clown: '1F921', coat: '1F9E5', cookie: '1F36A', corn: '1F33D', cow: '1F404', crab: '1F980',
    crown: '1F451', cup: '2615', deer: '1F98C', dino: '1F996', dinosaur: '1F996', dragon: '1F409', drum: '1F941',
    fire: '1F525', fish: '1F41F', flag: '1F6A9', flower: '1F33C', fork: '1F374', fox: '1F98A', ghost: '1F47B',
    gift: '1F381', goat: '1F410', grape: '1F347', guitar: '1F3B8', hand: '270B', horse: '1F434', house: '1F3E0',
    key: '1F511', king: '1F934', leaf: '1F343', lion: '1F981', lock: '1F512', milk: '1F95B', moon: '1F319',
    mouse: '1F42D', owl: '1F989', pear: '1F350', pen: '1F58A', pie: '1F967', pizza: '1F355', plane: '2708',
    airplane: '2708', rabbit: '1F430', ring: '1F48D', robot: '1F916', shark: '1F988', sheep: '1F411', shell: '1F41A',
    shoe: '1F45F', skate: '1F6F9', snail: '1F40C', snake: '1F40D', snow: '2744', soap: '1F9FC', sock: '1F9E6',
    spider: '1F577', spoon: '1F944', star: '2B50', tent: '26FA', tiger: '1F42F', tire: '1F6DE', wheel: '1F6DE',
    train: '1F682', tree: '1F333', truck: '1F69A', turtle: '1F422', volcano: '1F30B', whale: '1F433', zebra: '1F993'
  };

  function escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function tokenize(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  }

  /* -------------------- BASE64 & CANVAS COMPRESSION -------------------- */
  function compressBlobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read image data.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file.'));
        img.onload = () => {
          const scale = Math.min(1, 320 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.84));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(blob);
    });
  }

  async function urlToBase64(url, compressPhoto) {
    if (!url || url.startsWith('data:')) return url;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return url;
      const blob = await res.blob();
      if (compressPhoto && !blob.type.includes('svg')) {
        return await compressBlobToBase64(blob);
      }
      return await new Promise(resolve => {
        const r = new FileReader();
        r.onloadend = () => resolve(typeof r.result === 'string' ? r.result : url);
        r.onerror = () => resolve(url);
        r.readAsDataURL(blob);
      });
    } catch (_) {
      return url; // Graceful live URL fallback if upstream host blocks CORS
    }
  }

  /* -------------------- 1. AAC SYMBOLS (ARASAAC + OPENMOJI) -------------------- */
  function scoreArasaac(entry, kw, senseHint, excludeHint) {
    const kws = Array.isArray(entry.keywords) ? entry.keywords : [];
    const blob = [...kws.map(k => `${k.keyword || ''} ${k.meaning || ''}`), ...(entry.tags || []), ...(entry.categories || [])].join(' ').toLowerCase();
    let score = 0;
    if (kws.some(k => String(k.keyword || '').toLowerCase() === kw)) score += 12;
    if (entry.aacColor || entry.aac) score += 2;
    if (entry.schematic) score -= 2;
    tokenize(senseHint).forEach(t => { if (blob.includes(t)) score += 7; });
    tokenize(excludeHint).forEach(t => { if (blob.includes(t)) score -= 14; });
    return { source: 'ARASAAC', url: ARASAAC_IMG(entry._id), thumb: ARASAAC_IMG(entry._id), meaning: kws.find(k => k.meaning)?.meaning || kws[0]?.keyword || kw, score, compress: false };
  }

  async function searchAac(keyword, senseHint, excludeHint) {
    const kw = String(keyword || '').trim().toLowerCase();
    if (!kw) return [];
    const list = [];
    const starter = App.Data?.getStarterSvg?.(kw);
    if (starter && !senseHint) list.push({ source: 'Starter SVG', url: starter, thumb: starter, meaning: `Offline SVG: ${kw}`, compress: false });

    let raw = searchCache.get('aac:' + kw);
    if (raw === undefined) {
      try { const res = await fetch(ARASAAC_SEARCH + encodeURIComponent(kw)); raw = res.ok ? await res.json() : []; }
      catch (_) { raw = []; }
      if (!Array.isArray(raw)) raw = [];
      searchCache.set('aac:' + kw, raw);
    }
    list.push(...raw.slice(0, 18).map(e => scoreArasaac(e, kw, senseHint, excludeHint)).sort((a, b) => b.score - a.score).slice(0, 8));
    if (starter && senseHint) list.push({ source: 'Starter SVG', url: starter, thumb: starter, meaning: `Offline SVG: ${kw}`, compress: false });
    const hex = OPENMOJI_HEX[kw] || OPENMOJI_HEX[kw.replace(/s$/, '')];
    if (hex) {
      const u = OPENMOJI_SVG(hex);
      list.push({ source: 'OpenMoji', url: u, thumb: u, meaning: `OpenMoji: ${kw}`, compress: false });
    }
    return list;
  }

  /* -------------------- 2. FREE WEB PHOTOS (WIKIMEDIA + OPENVERSE) -------------------- */
  async function searchWikimedia(query) {
    const u = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent('filetype:bitmap|drawing ' + query)}&gsrlimit=12&prop=imageinfo&iiprop=url|mime&iiurlwidth=320&format=json&origin=*`;
    const res = await fetch(u);
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    return pages
      .map(p => {
        const info = p.imageinfo?.[0];
        if (!info || !String(info.mime || '').startsWith('image/')) return null;
        const imgUrl = info.thumburl || info.url;
        if (!imgUrl) return null;
        const cleanTitle = String(p.title || '').replace(/^File:/i, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');
        return { source: 'Wikimedia', url: imgUrl, thumb: imgUrl, meaning: cleanTitle || query, compress: true };
      })
      .filter(Boolean)
      .slice(0, 8);
  }

  async function searchOpenverse(query) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5500);
    try {
      const u = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&mature=false&page_size=12`;
      const res = await fetch(u, { signal: ctrl.signal });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || [])
        .map(r => {
          const imgUrl = r.thumbnail || r.url;
          return imgUrl ? { source: 'Openverse', url: imgUrl, thumb: imgUrl, meaning: r.title || query, compress: true } : null;
        })
        .filter(Boolean)
        .slice(0, 8);
    } catch (_) {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  async function searchWebPhotos(query) {
    const q = String(query || '').trim();
    if (!q) return [];
    const key = 'web:' + q.toLowerCase();
    if (searchCache.has(key)) return searchCache.get(key);
    const [wikiRes, ovRes] = await Promise.allSettled([searchWikimedia(q), searchOpenverse(q)]);
    const wiki = wikiRes.status === 'fulfilled' ? wikiRes.value : [];
    const ov = ovRes.status === 'fulfilled' ? ovRes.value : [];
    const merged = [];
    for (let i = 0; i < Math.max(wiki.length, ov.length); i++) {
      if (ov[i]) merged.push(ov[i]);
      if (wiki[i]) merged.push(wiki[i]);
    }
    searchCache.set(key, merged);
    return merged;
  }

  /* -------------------- 3. PIXABAY BYOK (CLIPART / VECTOR / PHOTO) -------------------- */
  async function searchPixabay(query) {
    const apiKey = (document.getElementById('picker-pixabay-key')?.value || '').trim();
    const imgType = document.getElementById('picker-pixabay-type')?.value || 'illustration';
    if (!apiKey) return { needsKey: true, items: [] };
    try { localStorage.setItem(PIXABAY_STORE, JSON.stringify({ apiKey, imgType })); } catch (_) {}

    const q = String(query || '').trim();
    if (!q) return { needsKey: false, items: [] };
    const cacheKey = `px:${imgType}:${q.toLowerCase()}`;
    if (searchCache.has(cacheKey)) return { needsKey: false, items: searchCache.get(cacheKey) };

    const u = `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(q)}&image_type=${encodeURIComponent(imgType)}&safesearch=true&lang=en&per_page=16`;
    const res = await fetch(u);
    if (!res.ok) throw new Error(res.status === 400 ? 'Invalid Pixabay API key.' : `Pixabay HTTP ${res.status}`);
    const data = await res.json();
    const items = (data.hits || []).map(h => ({
      source: 'Pixabay',
      url: h.webformatURL || h.previewURL,
      thumb: h.previewURL || h.webformatURL,
      meaning: h.tags || q,
      compress: true
    }));
    searchCache.set(cacheKey, items);
    return { needsKey: false, items };
  }

  /* -------------------- PREFLIGHT RESOLUTION & RENDER -------------------- */
  async function resolveBestVisual(kw, sense, excl) {
    const list = await searchAac(kw, sense, excl);
    return list.length ? await urlToBase64(list[0].url, false) : null;
  }

  async function runPreflight(lesson) {
    activeDraft = lesson;
    const section = document.getElementById('preflight-section');
    const grid = document.getElementById('preflight-grid');
    if (!section || !grid) return;
    section.classList.remove('hidden');
    grid.innerHTML = '<div class="card"><p class="hint" style="margin:0;">Resolving AAC symbols and caching offline images...</p></div>';
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const jobs = [];
    (lesson.items || []).forEach(item => {
      if (item.promptImageKeyword && !item.promptImageData) {
        jobs.push(resolveBestVisual(item.promptImageKeyword, item.promptSenseHint, item.promptExcludeHint).then(d => { if (d) item.promptImageData = d; }));
      }
      (item.choices || []).forEach(c => {
        if (c.imageKeyword && !c.imageData) {
          jobs.push(resolveBestVisual(c.imageKeyword, c.senseHint, c.excludeHint).then(d => { if (d) c.imageData = d; }));
        }
      });
    });
    await Promise.all(jobs);
    renderPreflightGrid();
  }

  function thumbHtml(src, label, itemIdx, choiceIdx, compact) {
    const st = compact ? 'height:72px;padding:4px;' : '';
    const ch = choiceIdx === null ? 'prompt' : choiceIdx;
    return src
      ? `<img src="${src}" alt="${escapeHtml(label)}" class="preflight-thumb swap-trigger" style="${st}" data-item="${itemIdx}" data-choice="${ch}" title="Click to swap, search web, or paste" />`
      : `<button type="button" class="preflight-thumb swap-trigger" style="${st}border-style:dashed;color:var(--text-muted);font-size:0.78rem;" data-item="${itemIdx}" data-choice="${ch}">Search / Paste</button>`;
  }

  function renderPreflightGrid() {
    const grid = document.getElementById('preflight-grid');
    if (!grid || !activeDraft) return;
    grid.innerHTML = activeDraft.items.map((item, idx) => {
      const hasChoiceImgs = item.taskType === 'word_to_picture' || item.choices.some(c => c.imageKeyword || c.imageData);
      const hasPromptImg = item.taskType === 'picture_to_word' || Boolean(item.promptImageKeyword || item.promptImageData);
      const choiceText = item.choices.map(c => (c.isTarget ? `<strong>${escapeHtml(c.label)}</strong>` : escapeHtml(c.label))).join(' • ');
      let body = '';
      if (item.taskType === 'teacher_spoken_to_word') {
        body = '<div class="hint" style="padding:0.75rem;background:var(--surface);border-radius:8px;text-align:center;margin:0;">Teacher Read-Aloud (Key Code Only)</div>';
      } else if (hasPromptImg) {
        body = thumbHtml(item.promptImageData, item.promptImageKeyword || 'prompt', idx, null, false);
      } else if (hasChoiceImgs) {
        body = `${item.promptText ? `<div style="text-align:center;font-weight:700;margin-bottom:0.4rem;">"${escapeHtml(item.promptText)}"</div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
            ${item.choices.map((c, ci) => `<div style="text-align:center;">${thumbHtml(c.imageData, c.label, idx, ci, true)}<div style="font-size:0.75rem;margin-top:2px;${c.isTarget ? 'font-weight:700;' : ''}">${escapeHtml(c.label)}</div></div>`).join('')}
          </div>`;
      } else {
        body = `<div class="hint" style="padding:0.65rem;background:var(--surface);border-radius:8px;margin:0;">${escapeHtml(item.promptText || 'Text-only prompt')}</div>`;
      }
      const flip = item.taskType !== 'teacher_spoken_to_word'
        ? `<button type="button" class="btn btn-ghost btn-sm flip-inline" data-item="${idx}" style="padding:0.15rem 0.45rem;font-size:0.75rem;">Flip to Read-Aloud</button>` : '';
      return `<div class="preflight-item"><div style="display:flex;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.45rem;"><span class="lesson-badge">[${escapeHtml(item.code)}]</span>${flip}</div>${body}${hasChoiceImgs ? '' : `<div style="margin-top:0.5rem;font-size:0.9rem;">${choiceText}</div>`}<div class="hint" style="margin:0.3rem 0 0;font-size:0.78rem;">${escapeHtml(item.teacherScript)}</div></div>`;
    }).join('');

    grid.querySelectorAll('.swap-trigger').forEach(el => {
      el.addEventListener('click', () => openPicker(Number(el.dataset.item), el.dataset.choice === 'prompt' ? null : Number(el.dataset.choice)));
    });
    grid.querySelectorAll('.flip-inline').forEach(btn => {
      btn.addEventListener('click', () => flipItemToReadAloud(Number(btn.dataset.item)));
    });
  }

  /* -------------------- SWAP PICKER & CLIPBOARD PASTE -------------------- */
  function assignPickedImage(dataUri) {
    if (!pickerCtx || !activeDraft) return;
    const item = activeDraft.items[pickerCtx.itemIdx];
    if (pickerCtx.choiceIdx === null) item.promptImageData = dataUri;
    else item.choices[pickerCtx.choiceIdx].imageData = dataUri;
    document.getElementById('modal-image-picker')?.classList.add('hidden');
    renderPreflightGrid();
  }

  function flipItemToReadAloud(itemIdx) {
    const item = activeDraft?.items?.[itemIdx];
    if (!item) return;
    item.taskType = 'teacher_spoken_to_word';
    item.promptText = item.promptImageKeyword = item.promptImageData = null;
    item.choices.forEach(c => { c.imageKeyword = c.imageData = null; });
    document.getElementById('modal-image-picker')?.classList.add('hidden');
    renderPreflightGrid();
  }

  function setPickerSource(src) {
    activeSource = src;
    document.querySelectorAll('#picker-source-tabs [data-source]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.source === src);
    });
    document.getElementById('picker-pixabay-bar')?.classList.toggle('hidden', src !== 'pixabay');
    const q = (document.getElementById('image-picker-search')?.value || '').trim();
    if (q) runPickerSearch(q, null, null);
  }

  async function runPickerSearch(query, senseHint, excludeHint) {
    const resultsEl = document.getElementById('image-picker-results');
    if (!resultsEl) return;
    const labelMap = { aac: 'AAC symbols', web: 'Wikimedia & Openverse web photos', pixabay: 'Pixabay' };
    resultsEl.innerHTML = `<p class="hint" style="grid-column:1/-1;">Searching ${labelMap[activeSource] || 'images'}...</p>`;

    try {
      let list = [];
      if (activeSource === 'aac') {
        list = await searchAac(query, senseHint, excludeHint);
      } else if (activeSource === 'web') {
        list = await searchWebPhotos(query);
      } else {
        const res = await searchPixabay(query);
        if (res.needsKey) {
          resultsEl.innerHTML = '<p class="hint" style="grid-column:1/-1;">Paste your free Pixabay API key above and click <strong>Search</strong> (stored locally in this browser only).</p>';
          return;
        }
        list = res.items;
      }

      if (!list.length) {
        resultsEl.innerHTML = '<p class="hint" style="grid-column:1/-1;">No matches here. Try another tab above, simplify the keyword, or paste a copied image with <code>Cmd+V</code> / <code>Ctrl+V</code>.</p>';
        return;
      }

      resultsEl.innerHTML = list.map((c, i) => `
        <button type="button" class="card picker-choice" data-cand="${i}" style="padding:0.45rem;text-align:center;cursor:pointer;">
          <img src="${c.thumb}" alt="${escapeHtml(c.meaning)}" loading="lazy" style="width:100%;height:78px;object-fit:contain;background:#fff;border-radius:6px;" />
          <div style="font-size:0.7rem;font-weight:700;margin-top:4px;color:var(--primary);">${escapeHtml(c.source)}</div>
          <div class="hint" style="font-size:0.68rem;margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(c.meaning)}">${escapeHtml(c.meaning)}</div>
        </button>`).join('');

      resultsEl.querySelectorAll('.picker-choice').forEach(btn => {
        btn.addEventListener('click', async () => {
          const chosen = list[Number(btn.dataset.cand)];
          if (!chosen) return;
          btn.disabled = true;
          btn.style.opacity = '0.5';
          const cached = await urlToBase64(chosen.url, chosen.compress);
          assignPickedImage(cached);
        });
      });
    } catch (err) {
      resultsEl.innerHTML = `<p class="hint text-danger" style="grid-column:1/-1;">Search error: ${escapeHtml(err.message)}</p>`;
    }
  }

  function openPicker(itemIdx, choiceIdx) {
    const item = activeDraft?.items?.[itemIdx];
    if (!item) return;
    pickerCtx = { itemIdx, choiceIdx };
    const isPrompt = choiceIdx === null;
    const kw = isPrompt ? (item.promptImageKeyword || item.choices.find(c => c.isTarget)?.label || '') : (item.choices[choiceIdx]?.imageKeyword || item.choices[choiceIdx]?.label || '');
    const sense = isPrompt ? item.promptSenseHint : item.choices[choiceIdx]?.senseHint;
    const excl = isPrompt ? item.promptExcludeHint : item.choices[choiceIdx]?.excludeHint;

    const titleEl = document.getElementById('image-picker-title');
    const searchEl = document.getElementById('image-picker-search');
    if (titleEl) titleEl.textContent = `Swap Visual — [${item.code}] "${kw}"`;
    if (searchEl) searchEl.value = kw;
    document.getElementById('modal-image-picker')?.classList.remove('hidden');
    runPickerSearch(kw, sense, excl);
  }

  function initVisualEvents() {
    // Restore saved Pixabay key & style preference
    try {
      const saved = JSON.parse(localStorage.getItem(PIXABAY_STORE) || 'null');
      if (saved?.apiKey && document.getElementById('picker-pixabay-key')) document.getElementById('picker-pixabay-key').value = saved.apiKey;
      if (saved?.imgType && document.getElementById('picker-pixabay-type')) document.getElementById('picker-pixabay-type').value = saved.imgType;
    } catch (_) {}

    const searchInput = document.getElementById('image-picker-search');
    const triggerSearch = () => {
      const q = (searchInput?.value || '').trim();
      if (q) runPickerSearch(q, null, null);
    };
    document.getElementById('btn-picker-search')?.addEventListener('click', triggerSearch);
    searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); triggerSearch(); } });
    document.getElementById('picker-pixabay-type')?.addEventListener('change', triggerSearch);
    document.getElementById('picker-pixabay-key')?.addEventListener('change', triggerSearch);

    document.querySelectorAll('#picker-source-tabs [data-source]').forEach(btn => {
      btn.addEventListener('click', () => setPickerSource(btn.dataset.source));
    });

    document.getElementById('image-picker-upload')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try { assignPickedImage(await compressBlobToBase64(file)); }
      catch (err) { App.showError(err.message); }
      e.target.value = '';
    });

    // Direct Clipboard Image Paste (only intercepts images, never blocks text paste)
    document.addEventListener('paste', async e => {
      const modal = document.getElementById('modal-image-picker');
      if (!modal || modal.classList.contains('hidden') || !pickerCtx) return;
      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find(it => it.type && it.type.startsWith('image/'));
      if (!imgItem) return;
      e.preventDefault();
      const file = imgItem.getAsFile();
      if (!file) return;
      try { assignPickedImage(await compressBlobToBase64(file)); }
      catch (err) { App.showError('Clipboard paste failed: ' + err.message); }
    });

    document.getElementById('btn-flip-to-code')?.addEventListener('click', () => {
      if (pickerCtx) flipItemToReadAloud(pickerCtx.itemIdx);
    });
  }

  App.Visuals = { runPreflight, searchVisualCandidates: searchAac, resolveBestVisual, urlToBase64, openPicker };
  App.modulesLoaded.visuals = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initVisualEvents);
  else initVisualEvents();
})();
