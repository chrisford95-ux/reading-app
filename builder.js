/* ==========================================================================
   ClearRead AAC — Step 3: builder.js
   8-Stage Phonics Prompt Engine, Optional BYOK API, Strict JSON Validator,
   Opaque Code Sanitizer, & Preflight Handoff
   ========================================================================== */
(function () {
  const App = (window.ReadingApp = window.ReadingApp || {});
  const BYOK_KEY = 'clearread_byok_v1';
  let currentDraft = null;

  /* -------------------- 8-STAGE PHONICS RULE INJECTIONS -------------------- */
  const STAGE_RULES = {
    stage_1_letters: `- SCOPE: Single lowercase consonants (m,s,t,p,n,c,f,r,h,g,l,d,w,j,k,v,y,z) and short vowels (a,i,o,u,e). No digraphs or whole words as letter choices.
- DISTRACTORS: Never pair reversible letters (b/d, p/q, m/n). Foil 1 ("errorTag":"phoneme_voicing_or_manner") contrasts articulation; Foil 2 ("errorTag":"unrelated_consonant") is another scope letter.`,

    stage_2_cvc_families: `- SCOPE: 2-3 letter closed-syllable CVC words in shared rime families (-at,-an,-ap,-ig,-in,-ip,-op,-ot,-ug,-un,-et,-en).
- DISTRACTORS (Shared Rime): All 3 choices MUST share the exact same vowel and final consonant (e.g., cat/hat/mat). Foil 1 & Foil 2 use "errorTag":"initial_consonant_sub".`,

    stage_3_cvc_pairs: `- SCOPE: 3-letter CVC words with mixed short vowels and varied final consonants. No blends, digraphs, or silent-e.
- DISTRACTORS: Alternate 50% medial-vowel sets (same start & end, e.g., bug/bag/big -> "errorTag":"medial_short_vowel_sub") and 50% final-consonant sets (same start & vowel, e.g., cap/cab/cat -> "errorTag":"final_consonant_sub").`,

    stage_4_digraphs: `- SCOPE: 1-syllable short-vowel words with initial/final digraphs (sh, ch, th, wh, -ck).
- DISTRACTORS: Foil 1 ("errorTag":"digraph_to_single_consonant") drops one digraph letter into a real CVC word (ship->sip, duck->dug). Foil 2 ("errorTag":"digraph_confusion") swaps to another digraph (ship->chip, path->pack).`,

    stage_5_blends: `- SCOPE: 1-syllable short-vowel words with initial 2-consonant blends (bl,cl,fl,gl,pl,sl,br,cr,dr,fr,gr,tr,sp,st,sw) or final blends (-nd,-nt,-nk,-mp,-st,-lt,-ft).
- DISTRACTORS: Foil 1 ("errorTag":"blend_consonant_omission") deletes one blend consonant to form a real CVC word (stop->top, frog->fog, lamp->lap). Foil 2 ("errorTag":"blend_consonant_sub") alters one blend letter (stop->spot).`,

    stage_6_cvce: `- SCOPE: 1-syllable long-vowel VCe words (a_e, i_e, o_e, u_e; simple blends/digraphs allowed like plane, slide, drive).
- DISTRACTORS: Foil 1 ("errorTag":"silent_e_ignored_short_vowel") MUST be the exact short-vowel CVC twin without final 'e' when it is a real word (cape->cap, kite->kit, plane->plan). Foil 2 ("errorTag":"cvce_consonant_near_miss") is another CVCe word with the same long vowel (cape->cane).`,

    stage_7_vowel_teams: `- SCOPE: 1-syllable vowel teams (ai,ay,ee,ea,oa,ow,oo) or r-controlled vowels (ar,or,er,ir,ur).
- DISTRACTORS: Foil 1 ("errorTag":"vowel_team_to_short_vowel") is a short-vowel word with matching consonants (rain->ran, boat->bat, car->can). Foil 2 ("errorTag":"vowel_pattern_confusion") swaps to another vowel team/r-controlled pattern (boat->boot, car->core).`,

    stage_8_passages: `- SCOPE: 2-syllable words (compound/closed/open), inflected endings (-ing,-ed,-s), cloze sentences, and 2-sentence decodable passages.
- TASK MIX: Combine word decoding, "cloze_sentence" (promptText with "____"), and "passage_comprehension" (2-sentence story + question).
- DISTRACTORS: Word/cloze foils use "affix_or_syllable_error" (rocket->rockets) and "orthographic_near_miss" (rocket->pocket). Passage foils use "comprehension_detail_error" (subtle detail swap).`
  };

  /* -------------------- HELPERS -------------------- */
  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setStatus(type, msg) {
    const box = document.getElementById('builder-validation-status');
    if (!box) return;
    box.className = 'status-box ' + (type === 'ok' ? 'ok' : 'err');
    box.textContent = msg;
    box.classList.remove('hidden');
  }

  /* -------------------- MASTER PROMPT GENERATOR -------------------- */
  function buildMasterPrompt() {
    const stageId = document.getElementById('builder-stage')?.value || 'stage_6_cvce';
    const stageName = App.STAGE_META?.[stageId]?.name || stageId;
    const modality = document.getElementById('builder-modality')?.value || 'hybrid_auto';
    const count = document.getElementById('builder-count')?.value || '10';
    const interest = (document.getElementById('builder-interest')?.value || '').trim() || 'everyday favorites';
    const notes = (document.getElementById('builder-notes')?.value || '').trim();
    const rules = STAGE_RULES[stageId] || STAGE_RULES.stage_6_cvce;

    const prompt = `SYSTEM ROLE:
You are a structured-literacy assessment designer for non-verbal readers (modeled on Tobii Dynavox ALL). Design receptive field-of-3 tasks where students demonstrate decoding and comprehension without speaking or writing.

SESSION PARAMETERS:
- Target Stage: ${stageId} (${stageName})
- Task Modality: ${modality}
- Student Interest Theme: "${interest}"
- Item Count: ${count}
${notes ? `- Teacher Focus Notes: ${notes}\n` : ''}
STAGE PHONICS & DISTRACTOR RULES:
${rules}

GLOBAL CLINICAL & VISUAL RULES:
1. FIELD OF 3: Every item has exactly 3 choices: 1 with "isTarget": true and 2 distractors with "isTarget": false.
2. MODALITY ROUTING:
   - "teacher_spoken_only": All items use "taskType": "teacher_spoken_to_word", "promptText": null, "promptImageKeyword": null, and choice "imageKeyword": null.
   - "independent_visual_only": Use concrete picturable nouns/phrases alternating "picture_to_word" and "word_to_picture".
   - "hybrid_auto": Route concrete nouns to "picture_to_word" or "word_to_picture"; route verbs/adjectives/abstract minimal pairs to "teacher_spoken_to_word".
3. VISUAL DISTINCTNESS & SENSE HINTS: Never assign "word_to_picture" if 2+ choices look visually similar (e.g., cap/hat or mug/cup); switch those to "picture_to_word" or "teacher_spoken_to_word". Whenever an image is used, set "imageKeyword" to 1 concrete singular English noun and add "senseHint" (e.g., "baseball equipment") + "excludeHint" (e.g., "flying mammal") to disambiguate homographs.
4. INTEREST INTEGRATION: Weave "${interest}" into targets or sentences ONLY when words strictly obey the Target Stage phonics scope.
5. TEACHER CUE & CODES: Include "teacherScript" with target word, segmented phonemes, and context sentence. Assign each item a unique 3-char code (1 lowercase consonant + 2 digits, excluding l,1,o,0,i,q,9 — e.g., "x73", "k48").

OUTPUT FORMAT:
Return ONLY raw, valid JSON (no markdown fences, no commentary) matching this schema:
{
  "lessonMeta": {
    "title": "${stageName.split(':')[0]}: ${interest}",
    "stageId": "${stageId}",
    "modality": "${modality}",
    "interestTheme": "${interest}"
  },
  "items": [
    {
      "code": "x73",
      "taskType": "picture_to_word",
      "promptText": null,
      "promptImageKeyword": "bat",
      "promptSenseHint": "baseball wooden bat",
      "promptExcludeHint": "animal mammal",
      "teacherScript": "Target: 'bat' | /b/ - /a/ - /t/ | Context: 'Swing the bat.'",
      "choices": [
        { "label": "bat", "imageKeyword": null, "senseHint": null, "isTarget": true, "errorTag": null },
        { "label": "hat", "imageKeyword": null, "senseHint": null, "isTarget": false, "errorTag": "initial_consonant_sub" },
        { "label": "cat", "imageKeyword": null, "senseHint": null, "isTarget": false, "errorTag": "initial_consonant_sub" }
      ]
    }
  ]
}`;

    const preview = document.getElementById('generated-prompt-preview');
    if (preview) preview.value = prompt;
    return prompt;
  }

  /* -------------------- STRICT JSON VALIDATOR & SANITIZER -------------------- */
  function extractJsonString(raw) {
    let text = String(raw || '').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
    return text;
  }

  function validateAndSanitize(rawText) {
    const cleaned = extractJsonString(rawText);
    if (!cleaned) throw new Error('JSON input is empty.');

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch (err) { throw new Error('Invalid JSON syntax: ' + err.message); }

    if (!parsed || typeof parsed !== 'object') throw new Error('Root JSON must be an object.');
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      throw new Error('Lesson must contain a non-empty "items" array.');
    }

    const stageFallback = document.getElementById('builder-stage')?.value || 'stage_6_cvce';
    const modFallback = document.getElementById('builder-modality')?.value || 'hybrid_auto';
    const themeFallback = (document.getElementById('builder-interest')?.value || '').trim() || 'Custom';

    const meta = parsed.lessonMeta || {};
    const lesson = {
      lessonMeta: {
        lessonId: meta.lessonId || 'les_' + Math.random().toString(36).slice(2, 9),
        title: String(meta.title || `${App.STAGE_META?.[stageFallback]?.short || 'Custom'}: ${themeFallback}`).trim(),
        stageId: App.STAGE_META?.[meta.stageId] ? meta.stageId : stageFallback,
        modality: meta.modality || modFallback,
        interestTheme: String(meta.interestTheme || themeFallback).trim(),
        isStarter: false,
        createdAt: new Date().toISOString().slice(0, 10)
      },
      items: []
    };

    const allowedTasks = new Set(['teacher_spoken_to_word', 'picture_to_word', 'word_to_picture', 'cloze_sentence', 'passage_comprehension']);
    const usedCodes = new Set();
    let codeFixes = 0;

    parsed.items.forEach((rawItem, idx) => {
      const n = idx + 1;
      if (!rawItem || !Array.isArray(rawItem.choices) || rawItem.choices.length !== 3) {
        throw new Error(`Item #${n} must have exactly 3 choices.`);
      }
      const targetCount = rawItem.choices.filter(c => Boolean(c && c.isTarget)).length;
      if (targetCount !== 1) {
        throw new Error(`Item #${n} must have exactly 1 target choice (found ${targetCount}).`);
      }

      let code = String(rawItem.code || '').toLowerCase().trim();
      if (!/^[bcdfghjkmnprstvwxyz][2-8]{2}$/.test(code) || usedCodes.has(code)) {
        code = App.Data.generateSafeCode(usedCodes);
        codeFixes++;
      } else {
        usedCodes.add(code);
      }

      const taskType = allowedTasks.has(rawItem.taskType) ? rawItem.taskType : 'teacher_spoken_to_word';
      const promptKw = rawItem.promptImageKeyword ? String(rawItem.promptImageKeyword).trim() : null;

      const cleanChoices = rawItem.choices.map(c => {
        const kw = c.imageKeyword ? String(c.imageKeyword).trim() : null;
        return {
          label: String(c.label ?? '').trim() || '?',
          imageKeyword: kw,
          senseHint: c.senseHint ? String(c.senseHint).trim() : null,
          excludeHint: c.excludeHint ? String(c.excludeHint).trim() : null,
          imageData: c.imageData || (kw ? App.Data.getStarterSvg(kw) : null),
          isTarget: Boolean(c.isTarget),
          errorTag: c.isTarget ? null : (c.errorTag ? String(c.errorTag).trim() : 'orthographic_near_miss')
        };
      });

      lesson.items.push({
        code,
        taskType,
        promptText: rawItem.promptText ? String(rawItem.promptText).trim() : null,
        promptImageKeyword: promptKw,
        promptSenseHint: rawItem.promptSenseHint ? String(rawItem.promptSenseHint).trim() : null,
        promptExcludeHint: rawItem.promptExcludeHint ? String(rawItem.promptExcludeHint).trim() : null,
        promptImageData: rawItem.promptImageData || (promptKw ? App.Data.getStarterSvg(promptKw) : null),
        teacherScript: String(rawItem.teacherScript || '').trim(),
        choices: cleanChoices
      });
    });

    return { lesson, codeFixes };
  }

  /* -------------------- FALLBACK PREFLIGHT RENDER (BEFORE STEP 4) -------------------- */
  function renderBasicPreflight(lesson) {
    const section = document.getElementById('preflight-section');
    const grid = document.getElementById('preflight-grid');
    if (!section || !grid) return;

    grid.innerHTML = lesson.items.map(item => {
      const target = item.choices.find(c => c.isTarget);
      const choiceText = item.choices.map(c => (c.isTarget ? `<strong>${escapeHtml(c.label)}</strong>` : escapeHtml(c.label))).join(' • ');
      const thumb = item.promptImageData || item.choices.find(c => c.imageData)?.imageData;
      const visualNote = thumb
        ? `<img src="${thumb}" alt="${escapeHtml(target?.label)}" class="preflight-thumb" />`
        : `<div class="hint" style="padding:0.6rem;background:var(--surface);border-radius:6px;text-align:center;">${
            item.taskType === 'teacher_spoken_to_word' ? 'Code-Cued Text Only (No Image)' : 'Visual lookup activates in Step 4 (visuals.js)'
          }</div>`;

      return `
        <div class="preflight-item">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
            <span class="lesson-badge">[${escapeHtml(item.code)}]</span>
            <span class="hint" style="margin:0;font-size:0.78rem;">${escapeHtml(item.taskType)}</span>
          </div>
          ${visualNote}
          <div style="margin-top:0.5rem;font-size:0.9rem;">${choiceText}</div>
          <div class="hint" style="margin:0.25rem 0 0;font-size:0.78rem;">${escapeHtml(item.teacherScript)}</div>
        </div>`;
    }).join('');

    section.classList.remove('hidden');
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* -------------------- OPTIONAL BYOK API CALL -------------------- */
  async function generateViaApi() {
    const provider = document.getElementById('byok-provider')?.value || 'gemini';
    const apiKey = (document.getElementById('byok-api-key')?.value || '').trim();
    if (!apiKey) {
      setStatus('err', 'Paste a Gemini or OpenAI API key first, or use the free Copy AI Prompt button above.');
      return;
    }
    try { localStorage.setItem(BYOK_KEY, JSON.stringify({ provider, apiKey })); } catch (_) {}

    const btn = document.getElementById('btn-generate-api');
    const prompt = buildMasterPrompt();
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
    setStatus('ok', `Requesting structured lesson from ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'}...`);

    try {
      let rawText = '';
      if (provider === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.4 }
            })
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
        rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            temperature: 0.4,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
        rawText = data.choices?.[0]?.message?.content || '';
      }

      const box = document.getElementById('builder-json-input');
      if (box) box.value = rawText;
      handleValidateClick();
    } catch (err) {
      setStatus('err', 'API generation failed: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Generate Lesson Directly'; }
    }
  }

  /* -------------------- VALIDATE & SAVE HANDLERS -------------------- */
  async function handleValidateClick() {
    const raw = document.getElementById('builder-json-input')?.value || '';
    try {
      const { lesson, codeFixes } = validateAndSanitize(raw);
      currentDraft = lesson;
      const fixNote = codeFixes > 0 ? ` (${codeFixes} code${codeFixes > 1 ? 's' : ''} auto-sanitized)` : '';
      setStatus('ok', `Valid lesson: "${lesson.lessonMeta.title}" — ${lesson.items.length} items ready${fixNote}.`);

      if (App.Visuals && typeof App.Visuals.runPreflight === 'function') {
        await App.Visuals.runPreflight(currentDraft);
      } else {
        renderBasicPreflight(currentDraft);
      }
    } catch (err) {
      currentDraft = null;
      setStatus('err', err.message);
    }
  }

  function initBuilder() {
    // Load saved BYOK preferences if present
    try {
      const saved = JSON.parse(localStorage.getItem(BYOK_KEY) || 'null');
      if (saved?.provider && document.getElementById('byok-provider')) document.getElementById('byok-provider').value = saved.provider;
      if (saved?.apiKey && document.getElementById('byok-api-key')) document.getElementById('byok-api-key').value = saved.apiKey;
    } catch (_) {}

    // Live prompt preview updates
    ['builder-stage', 'builder-modality', 'builder-count', 'builder-interest', 'builder-notes'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', buildMasterPrompt);
      document.getElementById(id)?.addEventListener('change', buildMasterPrompt);
    });
    buildMasterPrompt();

    // Copy Prompt button
    document.getElementById('btn-copy-prompt')?.addEventListener('click', () => {
      const text = buildMasterPrompt();
      navigator.clipboard.writeText(text);
      const btn = document.getElementById('btn-copy-prompt');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied Prompt!';
        setTimeout(() => { btn.textContent = orig; }, 1400);
      }
    });

    document.getElementById('btn-generate-api')?.addEventListener('click', generateViaApi);
    document.getElementById('btn-validate-json')?.addEventListener('click', handleValidateClick);

    document.getElementById('btn-clear-json')?.addEventListener('click', () => {
      const box = document.getElementById('builder-json-input');
      if (box) box.value = '';
      currentDraft = null;
      document.getElementById('builder-validation-status')?.classList.add('hidden');
      document.getElementById('preflight-section')?.classList.add('hidden');
    });

    document.getElementById('btn-open-teacher-key')?.addEventListener('click', () => {
      if (currentDraft && App.Data?.openTeacherKey) App.Data.openTeacherKey(currentDraft);
    });

    document.getElementById('btn-save-lesson')?.addEventListener('click', () => {
      if (!currentDraft) return setStatus('err', 'Validate a lesson first before saving.');
      App.Data.saveLesson(currentDraft);
      setStatus('ok', `Saved "${currentDraft.lessonMeta.title}" to your Lesson Library!`);
      App.switchTab('lessons');
    });
  }

  /* -------------------- PUBLIC API -------------------- */
  App.Builder = {
    STAGE_RULES,
    buildMasterPrompt,
    validateAndSanitize,
    getDraft: () => currentDraft,
    setDraft: (d) => { currentDraft = d; }
  };

  App.modulesLoaded.builder = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBuilder);
  else initBuilder();
})();
