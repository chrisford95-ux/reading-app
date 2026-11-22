/* ==========================================================================
   ClearRead AAC — Step 4: visuals.js
   ARASAAC Sense-Disambiguation, OpenMoji Fallback, Preflight Swap Picker,
   Resized Custom Photo Upload, Read-Aloud Flip, & Offline Base64 Caching
   ========================================================================== */
(function () {
  const App = (window.ReadingApp = window.ReadingApp || {});
  const ARASAAC_SEARCH = 'https://api.arasaac.org/v1/pictograms/en/search/';
  const ARASAAC_IMG = id => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
  const OPENMOJI_SVG = hex => `https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg/${hex}.svg`;

  let activeDraft = null;
  let pickerCtx = null; // { itemIdx, choiceIdx } — null choiceIdx = prompt image
  const searchCache = new Map();

  /* -------------------- OPENMOJI CURATED FALLBACK MAP -------------------- */
  const OPENMOJI_HEX = {
    apple: '1F34E', ball: '26BD', banana: '1F34C', bear: '1F43B', bee: '1F41D',
    bell: '1F514', bird: '1F426', book: '1F4D6', bread: '1F35E', broom: '1F9F9',
    cake: '1F382', castle: '1F3F0', cheese: '1F9C0', clock: '23F0', cloud: '2601',
    clown: '1F921', coat: '1F9E5', cookie: '1F36A', corn: '1F33D', cow: '1F404',
    crab: '1F980', crown: '1F451', cup: '2615', deer: '1F98C', dino: '1F996',
    dinosaur: '1F996', dragon: '1F409', drum: '1F941', fire: '1F525', fish: '1F41F',
    flag: '1F6A9', flower: '1F33C', fork: '1F374', fox: '1F98A', ghost: '1F47B',
    gift: '1F381', goat: '1F410', grape: '1F347', guitar: '1F3B8', hand: '270B',
    horse: '1F434', house: '1F3E0', key: '1F511', king: '1F934', leaf: '1F343',
    lion: '1F981', lock: '1F512', milk: '1F95B', moon: '1F319', mouse: '1F42D',
    owl: '1F989', pear: '1F350', pen: '1F58A', pie: '1F967', pizza: '1F355',
    plane: '2708', airplane: '2708', rabbit: '1F430', ring: '1F48D', robot: '1F916',
    shark: '1F988', sheep: '1F411', shell: '1F41A', shoe: '1F45F', skate: '1F6F9',
    snail: '1F40C', snake: '1F40D', snow: '2744', soap: '1F9FC', sock: '1F9E6',
    spider: '1F577', spoon: '1F944', star: '2B50', tent: '26FA', tiger: '1F42F',
    tire: '1F6DE', wheel: '1F6DE', train: '1F682', tree: '1F333', truck: '1F69A',
    turtle: '1F422', volcano: '1F30B', whale: '1F433', zebra: '1F993'
  };

  /* -------------------- HELPERS -------------------- */
  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  /* -------------------- BASE64 OFFLINE CACHING -------------------- */
  async function urlToBase64(url) {
    if (!url || url.startsWith('data:')) return url;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return url;
      const blob = await res.blob();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : url);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      return url; // Graceful online fallback if CORS blocks caching
    }
  }

  function resizeUploadToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read uploaded image.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file.'));
        img.onload = () => {
          const maxDim = 320;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.84));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* -------------------- ARASAAC SEMANTIC SCORING & LOOKUP -------------------- */
  function scoreCandidate(entry, keyword, senseHint, excludeHint) {
    const kwLower = String(keyword || '').toLowerCase().trim();
    const keywords = Array.isArray(entry.keywords) ? entry.keywords : [];
    const blob = [
      ...keywords.map(k => `${k.keyword || ''} ${k.meaning || ''}`),
      ...(entry.tags || []),
      ...(entry.categories || [])
    ].join(' ').toLowerCase();

    let score = 0;
    if (keywords.some(k => String(k.keyword || '').toLowerCase() === kwLower)) score += 12;
    if (entry.aacColor || entry.aac) score += 2;
    if (entry.schematic) score -= 2;

    tokenize(senseHint).forEach(tok => { if (blob.includes(tok)) score += 7; });
    tokenize(excludeHint).forEach(tok => { if (blob.includes(tok)) score -= 14; });

    const meaning = keywords.find(k => k.meaning)?.meaning || keywords[0]?.keyword || keyword;
    return { source: 'ARASAAC', id: entry._id, url: ARASAAC_IMG(entry._id), meaning, score };
  }

  async function searchVisualCandidates(keyword, senseHint, excludeHint) {
    const kw = String(keyword || '').trim().toLowerCase();
    if (!kw) return [];

    const candidates = [];
    const starter = App.Data?.getStarterSvg?.(kw);
    if (starter && !senseHint) {
      candidates.push({ source: 'Starter SVG', url: starter, meaning: `Offline SVG: ${kw}`, score: 15 });
    }

    let arasaacRaw = searchCache.get(kw);
    if (arasaacRaw === undefined) {
      try {
        const res = await fetch(ARASAAC_SEARCH + encodeURIComponent(kw));
        arasaacRaw = res.ok ? await res.json() : [];
      } catch (_) {
        arasaacRaw = [];
      }
      if (!Array.isArray(arasaacRaw)) arasaacRaw = [];
      searchCache.set(kw, arasaacRaw);
    }

    const scored = arasaacRaw
      .slice(0, 18)
      .map(entry => scoreCandidate(entry, kw, senseHint, excludeHint))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    candidates.push(...scored);

    if (starter && senseHint) {
      candidates.push({ source: 'Starter SVG', url: starter, meaning: `Offline SVG: ${kw}`, score: 4 });
    }

    const hex = OPENMOJI_HEX[kw] || OPENMOJI_HEX[kw.replace(/s$/, '')];
    if (hex) {
      candidates.push({ source: 'OpenMoji', url: OPENMOJI_SVG(hex), meaning: `OpenMoji: ${kw}`, score: 3 });
    }
    return candidates;
  }

  async function resolveBestVisual(keyword, senseHint, excludeHint) {
    const list = await searchVisualCandidates(keyword, senseHint, excludeHint);
    if (!list.length) return null;
    return await urlToBase64(list[0].url);
  }

  /* -------------------- PREFLIGHT RESOLUTION & RENDERING -------------------- */
  async function runPreflight(lesson) {
    activeDraft = lesson;
    const section = document.getElementById('preflight-section');
    const grid = document.getElementById('preflight-grid');
    if (!section || !grid) return;

    section.classList.remove('hidden');
    grid.innerHTML = '<div class="card"><p class="hint" style="margin:0;">Resolving ARASAAC &amp; OpenMoji visuals and caching offline Base64 images...</p></div>';
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const tasks = [];
    (lesson.items || []).forEach(item => {
      if (item.promptImageKeyword && !item.promptImageData) {
        tasks.push(
          resolveBestVisual(item.promptImageKeyword, item.promptSenseHint, item.promptExcludeHint)
            .then(data => { if (data) item.promptImageData = data; })
        );
      }
      (item.choices || []).forEach(c => {
        if (c.imageKeyword && !c.imageData) {
          tasks.push(
            resolveBestVisual(c.imageKeyword, c.senseHint, c.excludeHint)
              .then(data => { if (data) c.imageData = data; })
          );
        }
      });
    });

    await Promise.all(tasks);
    renderPreflightGrid();
  }

  function renderThumbHtml(src, label, itemIdx, choiceIdx, compact) {
    const style = compact ? 'height:72px;padding:4px;' : '';
    if (src) {
      return `<img src="${src}" alt="${escapeHtml(label)}" class="preflight-thumb swap-trigger" style="${style}"
        data-item="${itemIdx}" data-choice="${choiceIdx === null ? 'prompt' : choiceIdx}" title="Click to swap or upload" />`;
    }
    return `<button type="button" class="preflight-thumb swap-trigger" style="${style}border-style:dashed;color:var(--text-muted);font-size:0.78rem;"
      data-item="${itemIdx}" data-choice="${choiceIdx === null ? 'prompt' : choiceIdx}">No match — Pick / Upload</button>`;
  }

  function renderPreflightGrid() {
    const grid = document.getElementById('preflight-grid');
    if (!grid || !activeDraft) return;

    grid.innerHTML = activeDraft.items.map((item, idx) => {
      const hasChoiceImgs = item.taskType === 'word_to_picture' || item.choices.some(c => c.imageKeyword || c.imageData);
      const hasPromptImg = item.taskType === 'picture_to_word' || Boolean(item.promptImageKeyword || item.promptImageData);
      const choiceText = item.choices.map(c => (c.isTarget ? `<strong>${escapeHtml(c.label)}</strong>` : escapeHtml(c.label))).join(' • ');

      let visualBlock = '';
      if (item.taskType === 'teacher_spoken_to_word') {
        visualBlock = `<div class="hint" style="padding:0.75rem;background:var(--surface);border-radius:8px;text-align:center;margin:0;">Teacher Read-Aloud (Key Code Only)</div>`;
      } else if (hasPromptImg) {
        visualBlock = renderThumbHtml(item.promptImageData, item.promptImageKeyword || 'prompt', idx, null, false);
      } else if (hasChoiceImgs) {
        visualBlock = `
          ${item.promptText ? `<div style="text-align:center;font-weight:700;margin-bottom:0.4rem;">"${escapeHtml(item.promptText)}"</div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
            ${item.choices.map((c, cIdx) => `
              <div style="text-align:center;">
                ${renderThumbHtml(c.imageData, c.label, idx, cIdx, true)}
                <div style="font-size:0.75rem;margin-top:2px;${c.isTarget ? 'font-weight:700;' : ''}">${escapeHtml(c.label)}</div>
              </div>`).join('')}
          </div>`;
      } else {
        visualBlock = `<div class="hint" style="padding:0.65rem;background:var(--surface);border-radius:8px;margin:0;">${escapeHtml(item.promptText || 'Text-only prompt')}</div>`;
      }

      const flipBtn = item.taskType !== 'teacher_spoken_to_word'
        ? `<button type="button" class="btn btn-ghost btn-sm flip-inline" data-item="${idx}" style="padding:0.15rem 0.45rem;font-size:0.75rem;">Flip to Read-Aloud</button>`
        : '';

      return `
        <div class="preflight-item">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.45rem;">
            <span class="lesson-badge">[${escapeHtml(item.code)}]</span>
            ${flipBtn}
          </div>
          ${visualBlock}
          ${hasChoiceImgs ? '' : `<div style="margin-top:0.5rem;font-size:0.9rem;">${choiceText}</div>`}
          <div class="hint" style="margin:0.3rem 0 0;font-size:0.78rem;">${escapeHtml(item.teacherScript)}</div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.swap-trigger').forEach(el => {
      el.addEventListener('click', () => {
        const iIdx = Number(el.dataset.item);
        const cIdx = el.dataset.choice === 'prompt' ? null : Number(el.dataset.choice);
        openPicker(iIdx, cIdx);
      });
    });

    grid.querySelectorAll('.flip-inline').forEach(btn => {
      btn.addEventListener('click', () => flipItemToReadAloud(Number(btn.dataset.item)));
    });
  }

  /* -------------------- SWAP PICKER MODAL -------------------- */
  function flipItemToReadAloud(itemIdx) {
    const item = activeDraft?.items?.[itemIdx];
    if (!item) return;
    item.taskType = 'teacher_spoken_to_word';
    item.promptText = null;
    item.promptImageKeyword = null;
    item.promptImageData = null;
    item.choices.forEach(c => { c.imageKeyword = null; c.imageData = null; });
    document.getElementById('modal-image-picker')?.classList.add('hidden');
    renderPreflightGrid();
  }

  async function runPickerSearch(query, senseHint, excludeHint) {
    const resultsEl = document.getElementById('image-picker-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '<p class="hint">Searching ARASAAC &amp; OpenMoji...</p>';

    const list = await searchVisualCandidates(query, senseHint, excludeHint);
    if (!list.length) {
      resultsEl.innerHTML = '<p class="hint">No symbol matches found. Try a simpler singular noun or upload a photo below.</p>';
      return;
    }

    resultsEl.innerHTML = list.map((cand, i) => `
      <button type="button" class="card picker-choice" data-cand="${i}" style="padding:0.5rem;text-align:center;cursor:pointer;">
        <img src="${cand.url}" alt="${escapeHtml(cand.meaning)}" style="width:100%;height:76px;object-fit:contain;background:#fff;border-radius:6px;" />
        <div style="font-size:0.72rem;font-weight:700;margin-top:4px;color:var(--primary);">${escapeHtml(cand.source)}</div>
        <div class="hint" style="font-size:0.7rem;margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(cand.meaning)}">${escapeHtml(cand.meaning)}</div>
      </button>`).join('');

    resultsEl.querySelectorAll('.picker-choice').forEach(btn => {
      btn.addEventListener('click', async () => {
        const chosen = list[Number(btn.dataset.cand)];
        if (!chosen || !pickerCtx || !activeDraft) return;
        btn.disabled = true;
        const cached = await urlToBase64(chosen.url);
        const item = activeDraft.items[pickerCtx.itemIdx];
        if (pickerCtx.choiceIdx === null) item.promptImageData = cached;
        else item.choices[pickerCtx.choiceIdx].imageData = cached;
        document.getElementById('modal-image-picker')?.classList.add('hidden');
        renderPreflightGrid();
      });
    });
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
    const searchInput = document.getElementById('image-picker-search');
    const doSearch = () => {
      const q = (searchInput?.value || '').trim();
      if (q) runPickerSearch(q, null, null);
    };
    document.getElementById('btn-picker-search')?.addEventListener('click', doSearch);
    searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });

    document.getElementById('image-picker-upload')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file || !pickerCtx || !activeDraft) return;
      try {
        const dataUri = await resizeUploadToBase64(file);
        const item = activeDraft.items[pickerCtx.itemIdx];
        if (pickerCtx.choiceIdx === null) item.promptImageData = dataUri;
        else item.choices[pickerCtx.choiceIdx].imageData = dataUri;
        document.getElementById('modal-image-picker')?.classList.add('hidden');
        renderPreflightGrid();
      } catch (err) {
        App.showError(err.message);
      }
      e.target.value = '';
    });

    document.getElementById('btn-flip-to-code')?.addEventListener('click', () => {
      if (pickerCtx) flipItemToReadAloud(pickerCtx.itemIdx);
    });
  }

  /* -------------------- PUBLIC API -------------------- */
  App.Visuals = {
    runPreflight,
    searchVisualCandidates,
    resolveBestVisual,
    urlToBase64,
    openPicker
  };

  App.modulesLoaded.visuals = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initVisualEvents);
  else initVisualEvents();
})();
