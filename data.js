/* ==========================================================================
   ClearRead AAC — Step 2: data.js (Compact Edition)
   Profiles, LocalStorage, Backup/Restore, 22 Offline SVGs, 8 Starter Lessons
   ========================================================================== */
(function () {
  const App = (window.ReadingApp = window.ReadingApp || {});
  const STORAGE_KEY = 'clearread_aac_v1';

  const STAGE_META = {
    stage_1_letters: { short: 'Stage 1', name: 'Stage 1: Letter-Sound & Phonemic Awareness' },
    stage_2_cvc_families: { short: 'Stage 2', name: 'Stage 2: VC & CVC Word Families' },
    stage_3_cvc_pairs: { short: 'Stage 3', name: 'Stage 3: CVC Minimal Pairs' },
    stage_4_digraphs: { short: 'Stage 4', name: 'Stage 4: Consonant Digraphs' },
    stage_5_blends: { short: 'Stage 5', name: 'Stage 5: Consonant Blends' },
    stage_6_cvce: { short: 'Stage 6', name: 'Stage 6: CVCe Silent-E' },
    stage_7_vowel_teams: { short: 'Stage 7', name: 'Stage 7: Vowel Teams & R-Controlled' },
    stage_8_passages: { short: 'Stage 8', name: 'Stage 8: Multisyllabic & Passages' }
  };

  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function svgUri(inner) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">${inner}</svg>`);
  }

  function generateSafeCode(used, forbidden) {
    const allLetters = 'bcdfghjkmnprstvwxyz';
    const digits = '2345678';
    const blocked = forbidden instanceof Set ? forbidden : new Set();
    const pool = [...allLetters].filter(ch => !blocked.has(ch));
    const letters = pool.length ? pool : [...allLetters];
    for (let i = 0; i < 200; i++) {
      const c = letters[Math.floor(Math.random() * letters.length)] + digits[Math.floor(Math.random() * digits.length)];
      if (!used.has(c)) { used.add(c); return c; }
    }
    return 'k4';
  }

  /* -------------------- 22 OFFLINE STARTER SVGS -------------------- */
  const STARTER_SVGS = {
    sun: svgUri('<circle cx="60" cy="60" r="26" fill="#FACC15" stroke="#CA8A04" stroke-width="4"/><g stroke="#EAB308" stroke-width="5" stroke-linecap="round"><line x1="60" y1="12" x2="60" y2="24"/><line x1="60" y1="96" x2="60" y2="108"/><line x1="12" y1="60" x2="24" y2="60"/><line x1="96" y1="60" x2="108" y2="60"/><line x1="26" y1="26" x2="35" y2="35"/><line x1="85" y1="85" x2="94" y2="94"/><line x1="94" y1="26" x2="85" y2="35"/><line x1="35" y1="85" x2="26" y2="94"/></g>'),
    pig: svgUri('<circle cx="32" cy="36" r="14" fill="#F9A8D4" stroke="#BE185D" stroke-width="3"/><circle cx="88" cy="36" r="14" fill="#F9A8D4" stroke="#BE185D" stroke-width="3"/><circle cx="60" cy="64" r="36" fill="#FBCFE8" stroke="#BE185D" stroke-width="4"/><circle cx="46" cy="54" r="4.5" fill="#1E293B"/><circle cx="74" cy="54" r="4.5" fill="#1E293B"/><ellipse cx="60" cy="72" rx="16" ry="11" fill="#F472B6" stroke="#BE185D" stroke-width="3"/><circle cx="54" cy="72" r="3" fill="#831843"/><circle cx="66" cy="72" r="3" fill="#831843"/>'),
    hat: svgUri('<path d="M32 76 L38 34 C38 26 82 26 82 34 L88 76 Z" fill="#2563EB" stroke="#1E3A8A" stroke-width="4"/><rect x="34" y="62" width="52" height="10" fill="#FACC15"/><ellipse cx="60" cy="78" rx="46" ry="11" fill="#3B82F6" stroke="#1E3A8A" stroke-width="4"/>'),
    cat: svgUri('<polygon points="28,54 34,20 54,40" fill="#FB923C" stroke="#9A3412" stroke-width="4" stroke-linejoin="round"/><polygon points="92,54 86,20 66,40" fill="#FB923C" stroke="#9A3412" stroke-width="4" stroke-linejoin="round"/><circle cx="60" cy="66" r="34" fill="#FDBA74" stroke="#9A3412" stroke-width="4"/><circle cx="47" cy="60" r="4.5" fill="#1E293B"/><circle cx="73" cy="60" r="4.5" fill="#1E293B"/><polygon points="55,70 65,70 60,76" fill="#BE185D"/><g stroke="#7C2D12" stroke-width="3" stroke-linecap="round"><line x1="18" y1="68" x2="36" y2="70"/><line x1="18" y1="78" x2="36" y2="76"/><line x1="102" y1="68" x2="84" y2="70"/><line x1="102" y1="78" x2="84" y2="76"/></g>'),
    mat: svgUri('<polygon points="18,86 34,42 102,42 86,86" fill="#D97706" stroke="#78350F" stroke-width="4" stroke-linejoin="round"/><polygon points="28,78 40,50 92,50 80,78" fill="#FDE68A" stroke="#92400E" stroke-width="3"/><line x1="44" y1="64" x2="78" y2="64" stroke="#92400E" stroke-width="4" stroke-linecap="round"/>'),
    bat: svgUri('<path d="M26 96 L82 22 C88 16 98 24 92 32 L38 102 C32 106 22 100 26 96 Z" fill="#D97706" stroke="#78350F" stroke-width="4"/><line x1="30" y1="90" x2="40" y2="98" stroke="#1E293B" stroke-width="5"/>'),
    cap: svgUri('<path d="M24 72 C24 38 84 38 84 72 Z" fill="#EF4444" stroke="#991B1B" stroke-width="4"/><path d="M20 72 L104 72 C104 82 88 86 68 82 L20 78 Z" fill="#B91C1C" stroke="#7F1D1D" stroke-width="4"/><circle cx="54" cy="40" r="4" fill="#991B1B"/>'),
    bug: svgUri('<ellipse cx="60" cy="68" rx="28" ry="30" fill="#EF4444" stroke="#7F1D1D" stroke-width="4"/><path d="M38 44 C38 28 82 28 82 44 Z" fill="#1E293B"/><line x1="60" y1="42" x2="60" y2="98" stroke="#1E293B" stroke-width="4"/><circle cx="47" cy="62" r="5" fill="#1E293B"/><circle cx="73" cy="62" r="5" fill="#1E293B"/><circle cx="49" cy="80" r="5" fill="#1E293B"/><circle cx="71" cy="80" r="5" fill="#1E293B"/>'),
    ship: svgUri('<polygon points="16,74 104,74 92,98 28,98" fill="#1E3A8A" stroke="#0F172A" stroke-width="4" stroke-linejoin="round"/><rect x="56" y="20" width="6" height="54" fill="#78350F"/><polygon points="62,24 96,66 62,66" fill="#F8FAFC" stroke="#64748B" stroke-width="3"/><polygon points="56,30 28,66 56,66" fill="#E0F2FE" stroke="#64748B" stroke-width="3"/>'),
    duck: svgUri('<ellipse cx="56" cy="76" rx="34" ry="22" fill="#FACC15" stroke="#A16207" stroke-width="4"/><circle cx="76" cy="44" r="18" fill="#FACC15" stroke="#A16207" stroke-width="4"/><polygon points="92,42 110,48 92,54" fill="#F97316" stroke="#9A3412" stroke-width="3" stroke-linejoin="round"/><circle cx="80" cy="40" r="3.5" fill="#0F172A"/>'),
    frog: svgUri('<circle cx="40" cy="36" r="13" fill="#4ADE80" stroke="#166534" stroke-width="4"/><circle cx="80" cy="36" r="13" fill="#4ADE80" stroke="#166534" stroke-width="4"/><circle cx="40" cy="36" r="5" fill="#0F172A"/><circle cx="80" cy="36" r="5" fill="#0F172A"/><ellipse cx="60" cy="70" rx="38" ry="26" fill="#22C55E" stroke="#166534" stroke-width="4"/><path d="M38 74 Q60 90 82 74" fill="none" stroke="#14532D" stroke-width="4" stroke-linecap="round"/>'),
    lamp: svgUri('<polygon points="36,24 84,24 94,58 26,58" fill="#FDE047" stroke="#A16207" stroke-width="4" stroke-linejoin="round"/><rect x="55" y="58" width="10" height="32" fill="#64748B" stroke="#334155" stroke-width="3"/><rect x="36" y="90" width="48" height="10" rx="4" fill="#475569" stroke="#1E293B" stroke-width="3"/>'),
    bike: svgUri('<circle cx="30" cy="82" r="20" fill="none" stroke="#1E293B" stroke-width="5"/><circle cx="90" cy="82" r="20" fill="none" stroke="#1E293B" stroke-width="5"/><polyline points="30,82 54,52 84,52 90,82" fill="none" stroke="#2563EB" stroke-width="5" stroke-linejoin="round"/><line x1="54" y1="52" x2="62" y2="82" stroke="#2563EB" stroke-width="5"/><line x1="46" y1="46" x2="62" y2="46" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/><line x1="78" y1="38" x2="90" y2="38" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>'),
    kite: svgUri('<polygon points="60,14 96,52 60,92 24,52" fill="#EC4899" stroke="#831843" stroke-width="4" stroke-linejoin="round"/><line x1="60" y1="14" x2="60" y2="92" stroke="#FDE047" stroke-width="3"/><line x1="24" y1="52" x2="96" y2="52" stroke="#FDE047" stroke-width="3"/><path d="M60 92 Q72 104 54 114" fill="none" stroke="#475569" stroke-width="3" stroke-linecap="round"/>'),
    bone: svgUri('<g fill="#F8FAFC" stroke="#475569" stroke-width="4"><circle cx="28" cy="50" r="12"/><circle cx="28" cy="70" r="12"/><circle cx="92" cy="50" r="12"/><circle cx="92" cy="70" r="12"/><rect x="28" y="50" width="64" height="20" stroke="none"/><line x1="34" y1="50" x2="86" y2="50"/><line x1="34" y1="70" x2="86" y2="70"/></g>'),
    rain: svgUri('<path d="M30 58 C20 58 18 42 30 40 C34 24 62 20 72 34 C86 30 98 44 90 58 Z" fill="#94A3B8" stroke="#475569" stroke-width="4"/><g stroke="#2563EB" stroke-width="5" stroke-linecap="round"><line x1="38" y1="70" x2="32" y2="88"/><line x1="60" y1="70" x2="54" y2="88"/><line x1="82" y1="70" x2="76" y2="88"/></g>'),
    boat: svgUri('<polygon points="18,68 102,68 88,94 32,94" fill="#EF4444" stroke="#7F1D1D" stroke-width="4" stroke-linejoin="round"/><rect x="44" y="46" width="32" height="22" fill="#F8FAFC" stroke="#475569" stroke-width="4"/><rect x="52" y="52" width="16" height="10" fill="#38BDF8"/>'),
    car: svgUri('<path d="M18 76 L26 52 L44 38 L78 38 L94 54 L104 76 Z" fill="#2563EB" stroke="#1E3A8A" stroke-width="4" stroke-linejoin="round"/><polygon points="46,44 74,44 84,56 36,56" fill="#BAE6FD"/><circle cx="36" cy="80" r="12" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/><circle cx="84" cy="80" r="12" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/>'),
    rocket: svgUri('<path d="M60 14 C76 30 78 58 74 82 L46 82 C42 58 44 30 60 14 Z" fill="#F8FAFC" stroke="#334155" stroke-width="4"/><polygon points="46,66 28,86 46,82" fill="#EF4444" stroke="#991B1B" stroke-width="3"/><polygon points="74,66 92,86 74,82" fill="#EF4444" stroke="#991B1B" stroke-width="3"/><circle cx="60" cy="48" r="10" fill="#38BDF8" stroke="#1E40AF" stroke-width="3"/><polygon points="50,84 70,84 60,106" fill="#F97316"/>'),
    dog: svgUri('<ellipse cx="26" cy="56" rx="12" ry="22" fill="#92400E" stroke="#451A03" stroke-width="3"/><ellipse cx="94" cy="56" rx="12" ry="22" fill="#92400E" stroke="#451A03" stroke-width="3"/><circle cx="60" cy="60" r="32" fill="#D97706" stroke="#451A03" stroke-width="4"/><circle cx="48" cy="52" r="4.5" fill="#0F172A"/><circle cx="72" cy="52" r="4.5" fill="#0F172A"/><ellipse cx="60" cy="68" rx="9" ry="6" fill="#1E293B"/>'),
    van: svgUri('<rect x="16" y="40" width="84" height="40" rx="10" fill="#16A34A" stroke="#14532D" stroke-width="4"/><rect x="66" y="48" width="26" height="16" rx="3" fill="#DCFCE7"/><rect x="26" y="48" width="32" height="16" rx="3" fill="#DCFCE7"/><circle cx="34" cy="82" r="11" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/><circle cx="82" cy="82" r="11" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/>'),
    bus: svgUri('<rect x="14" y="34" width="92" height="46" rx="8" fill="#FACC15" stroke="#854D0E" stroke-width="4"/><rect x="22" y="42" width="18" height="16" fill="#BAE6FD" stroke="#854D0E" stroke-width="2"/><rect x="46" y="42" width="18" height="16" fill="#BAE6FD" stroke="#854D0E" stroke-width="2"/><rect x="70" y="42" width="28" height="16" fill="#BAE6FD" stroke="#854D0E" stroke-width="2"/><circle cx="34" cy="82" r="11" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/><circle cx="86" cy="82" r="11" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/>')
  };

  /* -------------------- COMPACT LESSON FACTORY -------------------- */
  function mkChoice(label, isTarget, errorTag, imgKey) {
    return { label, isTarget: !!isTarget, errorTag: errorTag || null, imageKeyword: imgKey || null, imageData: imgKey ? STARTER_SVGS[imgKey] || null : null };
  }
  function mkItem(code, taskType, script, choices, opts) {
    const o = opts || {};
    return {
      code, taskType, teacherScript: script, choices,
      promptText: o.promptText || null,
      promptImageKeyword: o.promptImg || null,
      promptImageData: o.promptImg ? STARTER_SVGS[o.promptImg] || null : null
    };
  }
  function mkLesson(id, title, stageId, theme, items) {
    return { lessonMeta: { lessonId: id, title, stageId, modality: 'hybrid_auto', interestTheme: theme, isStarter: true, scriptVersion: 2, createdAt: '2026-11-20' }, items };
  }

  /* -------------------- 8 PRE-LOADED STARTER LESSONS -------------------- */
  const STARTER_LESSONS = [
    mkLesson('starter_stage_1', 'Stage 1 Sample: Initial Sounds (m, s, p, h)', 'stage_1_letters', 'animals & nature', [
      mkItem('b4', 'teacher_spoken_to_word', '"Which letter says /m/, like in \'map\'?"', [mkChoice('m', 1), mkChoice('s', 0, 'phoneme_voicing_or_manner'), mkChoice('t', 0, 'unrelated_consonant')]),
      mkItem('f2', 'word_to_picture', '"Look at the letter at the top. Pick the picture that starts with that sound." (Do not read the choices aloud.)', [mkChoice('sun', 1, null, 'sun'), mkChoice('pig', 0, 'unrelated_consonant', 'pig'), mkChoice('hat', 0, 'unrelated_consonant', 'hat')], { promptText: 's' }),
      mkItem('k6', 'teacher_spoken_to_word', '"Which letter says /p/, like in \'pig\'?"', [mkChoice('p', 1), mkChoice('f', 0, 'phoneme_voicing_or_manner'), mkChoice('c', 0, 'unrelated_consonant')]),
      mkItem('r8', 'picture_to_word', '"Look at the picture. Pick the letter that makes its starting sound." (Do not say the word aloud.)', [mkChoice('h', 1), mkChoice('r', 0, 'unrelated_consonant'), mkChoice('w', 0, 'unrelated_consonant')], { promptImg: 'hat' })
    ]),
    mkLesson('starter_stage_2', 'Stage 2 Sample: CVC Word Families (-at, -an)', 'stage_2_cvc_families', 'everyday objects', [
      mkItem('c3', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('cat', 1), mkChoice('hat', 0, 'initial_consonant_sub'), mkChoice('mat', 0, 'initial_consonant_sub')], { promptImg: 'cat' }),
      mkItem('g5', 'word_to_picture', '"Read the word at the top, then pick the matching picture." (Do not read the word aloud.)', [mkChoice('bat', 1, null, 'bat'), mkChoice('cat', 0, 'initial_consonant_sub', 'cat'), mkChoice('hat', 0, 'initial_consonant_sub', 'hat')], { promptText: 'bat' }),
      mkItem('m7', 'teacher_spoken_to_word', '"Find \'van.\' Ride in the green van." (If prompting press "P" and say "/v/, /a/, /n/.")', [mkChoice('van', 1), mkChoice('fan', 0, 'initial_consonant_sub'), mkChoice('pan', 0, 'initial_consonant_sub')]),
      mkItem('x4', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('mat', 1), mkChoice('sat', 0, 'initial_consonant_sub'), mkChoice('rat', 0, 'initial_consonant_sub')], { promptImg: 'mat' })
    ]),
    mkLesson('starter_stage_3', 'Stage 3 Sample: CVC Medial & Final Minimal Pairs', 'stage_3_cvc_pairs', 'bugs & pets', [
      mkItem('d2', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('bug', 1), mkChoice('bag', 0, 'medial_short_vowel_sub'), mkChoice('big', 0, 'medial_short_vowel_sub')], { promptImg: 'bug' }),
      mkItem('h4', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('cap', 1), mkChoice('cab', 0, 'final_consonant_sub'), mkChoice('cat', 0, 'final_consonant_sub')], { promptImg: 'cap' }),
      mkItem('p6', 'teacher_spoken_to_word', '"Find \'dog.\' The brown dog barked." (If prompting press "P" and say "/d/, /o/, /g/.")', [mkChoice('dog', 1), mkChoice('dug', 0, 'medial_short_vowel_sub'), mkChoice('dig', 0, 'medial_short_vowel_sub')]),
      mkItem('t8', 'teacher_spoken_to_word', '"Find \'bus.\' Get on the school bus." (If prompting press "P" and say "/b/, /u/, /s/.")', [mkChoice('bus', 1), mkChoice('bud', 0, 'final_consonant_sub'), mkChoice('bun', 0, 'final_consonant_sub')])
    ]),
    mkLesson('starter_stage_4', 'Stage 4 Sample: Consonant Digraphs (sh, ch, th, ck)', 'stage_4_digraphs', 'water & animals', [
      mkItem('b7', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('ship', 1), mkChoice('sip', 0, 'digraph_to_single_consonant'), mkChoice('chip', 0, 'digraph_confusion')], { promptImg: 'ship' }),
      mkItem('j3', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('duck', 1), mkChoice('dug', 0, 'digraph_to_single_consonant'), mkChoice('deck', 0, 'medial_short_vowel_sub')], { promptImg: 'duck' }),
      mkItem('n5', 'teacher_spoken_to_word', '"Find \'chin.\' Touch your chin." (If prompting press "P" and say "/ch/, /i/, /n/.")', [mkChoice('chin', 1), mkChoice('tin', 0, 'digraph_to_single_consonant'), mkChoice('thin', 0, 'digraph_confusion')]),
      mkItem('w6', 'teacher_spoken_to_word', '"Find \'path.\' Walk on the park path." (If prompting press "P" and say "/p/, /a/, /th/.")', [mkChoice('path', 1), mkChoice('pat', 0, 'digraph_to_single_consonant'), mkChoice('pack', 0, 'digraph_confusion')])
    ]),
    mkLesson('starter_stage_5', 'Stage 5 Sample: Initial & Final Blends', 'stage_5_blends', 'pond & home', [
      mkItem('c8', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('frog', 1), mkChoice('fog', 0, 'blend_consonant_omission'), mkChoice('clog', 0, 'blend_consonant_sub')], { promptImg: 'frog' }),
      mkItem('k2', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('lamp', 1), mkChoice('lap', 0, 'blend_consonant_omission'), mkChoice('limp', 0, 'medial_short_vowel_sub')], { promptImg: 'lamp' }),
      mkItem('s4', 'teacher_spoken_to_word', '"Find \'stop.\' A red light means stop." (If prompting press "P" and say "/s/, /t/, /o/, /p/.")', [mkChoice('stop', 1), mkChoice('top', 0, 'blend_consonant_omission'), mkChoice('spot', 0, 'blend_consonant_sub')]),
      mkItem('v7', 'teacher_spoken_to_word', '"Find \'clap.\' Clap your hands." (If prompting press "P" and say "/k/, /l/, /a/, /p/.")', [mkChoice('clap', 1), mkChoice('cap', 0, 'blend_consonant_omission'), mkChoice('slap', 0, 'blend_consonant_sub')])
    ]),
    mkLesson('starter_stage_6', 'Stage 6 Sample: CVCe Silent-E Long Vowels', 'stage_6_cvce', 'outdoor play', [
      mkItem('d4', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('kite', 1), mkChoice('kit', 0, 'silent_e_ignored_short_vowel'), mkChoice('bite', 0, 'cvce_consonant_near_miss')], { promptImg: 'kite' }),
      mkItem('m3', 'word_to_picture', '"Read the word at the top, then pick the matching picture." (Do not read the word aloud.)', [mkChoice('bike', 1, null, 'bike'), mkChoice('kite', 0, 'cvce_consonant_near_miss', 'kite'), mkChoice('bone', 0, 'cvce_consonant_near_miss', 'bone')], { promptText: 'bike' }),
      mkItem('p8', 'teacher_spoken_to_word', '"Find \'cape.\' The hero wore a red cape." (If prompting press "P" and say "/k/, /ā/ (long A), /p/.")', [mkChoice('cape', 1), mkChoice('cap', 0, 'silent_e_ignored_short_vowel'), mkChoice('cane', 0, 'cvce_consonant_near_miss')]),
      mkItem('x7', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('bone', 1), mkChoice('bon', 0, 'silent_e_ignored_short_vowel'), mkChoice('cone', 0, 'cvce_consonant_near_miss')], { promptImg: 'bone' })
    ]),
    mkLesson('starter_stage_7', 'Stage 7 Sample: Vowel Teams & R-Controlled', 'stage_7_vowel_teams', 'weather & travel', [
      mkItem('f6', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('rain', 1), mkChoice('ran', 0, 'vowel_team_to_short_vowel'), mkChoice('read', 0, 'vowel_pattern_confusion')], { promptImg: 'rain' }),
      mkItem('h2', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('boat', 1), mkChoice('bat', 0, 'vowel_team_to_short_vowel'), mkChoice('boot', 0, 'vowel_pattern_confusion')], { promptImg: 'boat' }),
      mkItem('r4', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('car', 1), mkChoice('can', 0, 'vowel_team_to_short_vowel'), mkChoice('core', 0, 'vowel_pattern_confusion')], { promptImg: 'car' }),
      mkItem('z5', 'teacher_spoken_to_word', '"Find \'corn.\' We ate sweet corn." (If prompting press "P" and say "/k/, /or/, /n/.")', [mkChoice('corn', 1), mkChoice('con', 0, 'vowel_team_to_short_vowel'), mkChoice('card', 0, 'vowel_pattern_confusion')])
    ]),
    mkLesson('starter_stage_8', 'Stage 8 Sample: Multisyllabic & Decodable Passages', 'stage_8_passages', 'space & vehicles', [
      mkItem('g3', 'picture_to_word', '"Look at the picture. Find the matching word." (Do not read the choices aloud.)', [mkChoice('rocket', 1), mkChoice('rockets', 0, 'affix_or_syllable_error'), mkChoice('pocket', 0, 'orthographic_near_miss')], { promptImg: 'rocket' }),
      mkItem('n7', 'cloze_sentence', '"Read the sentence and pick the word that fits the blank." (Do not read aloud.)', [mkChoice('space', 1), mkChoice('spice', 0, 'orthographic_near_miss'), mkChoice('spin', 0, 'silent_e_ignored_short_vowel')], { promptText: 'The fast rocket went up into ____.' }),
      mkItem('t2', 'passage_comprehension', '"Read the story and pick the answer to the question." (Do not read aloud.)', [mkChoice('bus', 1, null, 'bus'), mkChoice('boat', 0, 'comprehension_detail_error', 'boat'), mkChoice('bike', 0, 'comprehension_detail_error', 'bike')], { promptText: 'Sam got on the big yellow bus. The bus went past the park. What did Sam ride?' }),
      mkItem('v6', 'passage_comprehension', '"Read the story and pick the answer to the question." (Do not read aloud.)', [mkChoice('by the pond', 1), mkChoice('in the mud', 0, 'comprehension_detail_error'), mkChoice('on a rock', 0, 'comprehension_detail_error')], { promptText: 'The green frog sat by the pond in the rain. It did not jump in the mud. Where did the frog sit?' })
    ])
  ];

  /* -------------------- STATE & PROFILES -------------------- */
  function createDefaultProfile(code, color, stageId) {
    return {
      studentId: 'stu_' + Math.random().toString(36).slice(2, 8),
      displayCode: (code || 'JM').toUpperCase().slice(0, 4),
      avatarColor: color || '#2563EB',
      currentStageId: stageId || 'stage_6_cvce',
      targetMasteryPct: 80,
      accessConfig: { inputMode: 'direct_touch', touchTrigger: 'on_release', postTapLockoutMs: 1000, dwellDurationMs: 1100, dwellGraceWindowMs: 250, scanIntervalMs: 2000, maxScanLoops: 3 },
      visualConfig: { fontFamily: 'Andika' },
      pacingConfig: { advanceMode: 'teacher_manual', autoAdvanceDelayMs: 1500 },
      createdAt: new Date().toISOString().slice(0, 10)
    };
  }

function loadInitialState() {
    let saved = null;
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) saved = JSON.parse(raw); }
    catch (err) { App.showError('Could not read saved data; starting fresh.', err.message); }
    if (saved && Array.isArray(saved.profiles) && saved.profiles.length > 0) {
      if (!Array.isArray(saved.lessons) || !saved.lessons.length) saved.lessons = JSON.parse(JSON.stringify(STARTER_LESSONS));
      if (!Array.isArray(saved.sessions)) saved.sessions = [];
       const starterMap = new Map(STARTER_LESSONS.map(l => [l.lessonMeta.lessonId, l]));
      saved.lessons = saved.lessons.map(l =>
        l.lessonMeta?.isStarter && !l.lessonMeta?.userEdited && (l.lessonMeta?.scriptVersion || 0) < 2 && starterMap.has(l.lessonMeta.lessonId)
          ? JSON.parse(JSON.stringify(starterMap.get(l.lessonMeta.lessonId)))
          : l
      );
      saved.cviDarkMode = Boolean(saved.cviDarkMode);
      return saved;
    }
    const def = createDefaultProfile('JM', '#2563EB', 'stage_6_cvce');
    return { version: 1, profiles: [def], activeProfileId: def.studentId, lessons: JSON.parse(JSON.stringify(STARTER_LESSONS)), sessions: [], lastBackupAt: null, cviDarkMode: false };
  }

  const state = loadInitialState();

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (err) { App.showError('Browser storage full. Export a backup and clear old custom photo lessons.', err.message); }
  }

  function getActiveProfile() {
    return state.profiles.find(p => p.studentId === state.activeProfileId) || state.profiles[0];
  }

  function applyProfileTheme(profile) {
    if (!profile) return;
    document.body.classList.remove('font-andika', 'font-lexend', 'font-system');
    document.body.classList.add('font-' + (profile.visualConfig?.fontFamily || 'Andika').toLowerCase());
    const dot = document.getElementById('active-student-dot');
    const code = document.getElementById('active-student-code');
    const stage = document.getElementById('active-student-stage');
    if (dot) dot.style.background = profile.avatarColor || '#2563EB';
    if (code) code.textContent = profile.displayCode;
    if (stage) stage.textContent = STAGE_META[profile.currentStageId]?.short || 'Stage 1';
  }

  /* -------------------- TEACHER KEY FORMATTER -------------------- */
  function defaultSayScript(item, answer) {
    if (item.taskType === 'picture_to_word') return '"Look at the picture. Find the matching word." (Do not read the choices aloud.)';
    if (item.taskType === 'word_to_picture') return '"Read the word at the top, then pick the matching picture." (Do not read the word aloud.)';
    if (item.taskType === 'cloze_sentence') return '"Read the sentence and pick the word that fits the blank." (Do not read aloud.)';
    if (item.taskType === 'passage_comprehension') return '"Read the story and pick the answer to the question." (Do not read aloud.)';
    return `"Find '${answer}'."`;
  }

  function formatTeacherKey(lesson) {
    const meta = lesson.lessonMeta || {};
    const sorted = [...(lesson.items || [])].sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));
    const lines = [
      `TEACHER KEY: ${meta.title || 'Untitled Lesson'}`,
      `Stage: ${STAGE_META[meta.stageId]?.name || meta.stageId || 'Custom'} | Items: ${sorted.length}`,
      'How to use: Match the 2-character code in the top-left corner of the screen (like k4) to the list below (sorted A-Z). Read only the words inside quotes.'
    ];
    if (meta.stageId === 'stage_1_letters') {
      lines.push('Tip: Say crisp letter sounds (like /m/), not letter names (like "em").');
    }
    lines.push('--------------------------------------------------------------------------');
    sorted.forEach(item => {
      const target = (item.choices || []).find(c => c.isTarget);
      const answer = target?.label || '?';
      const list = (item.choices || []).map(c => c.label).join(', ');
      const rawScript = String(item.teacherScript || '').trim().replace(/^(?:say|cue)\s*:\s*/i, '');
      const sayText = rawScript || defaultSayScript(item, answer);
      lines.push(`[${item.code}]  Answer: ${answer}  |  Choices: ${list}`);
      lines.push(`       Say: ${sayText}`);
    });
    lines.push('--------------------------------------------------------------------------');
    return lines.join('\n');
  }

  function openTeacherKey(lesson) {
    const pre = document.getElementById('teacher-key-output');
    const modal = document.getElementById('modal-teacher-key');
    if (pre && modal) { pre.textContent = formatTeacherKey(lesson); modal.classList.remove('hidden'); }
  }

  function downloadJson(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  /* -------------------- RENDER LIBRARY & PROFILES -------------------- */
  function renderLibrary() {
    const grid = document.getElementById('lesson-library-grid');
    if (!grid) return;
    const filter = document.getElementById('filter-lesson-stage')?.value || 'all';
    const filtered = state.lessons.filter(l => (filter === 'all' ? true : l.lessonMeta?.stageId === filter));
    if (!filtered.length) {
      grid.innerHTML = '<div class="card"><h3>No lessons in this stage yet</h3><p class="hint">Use AI Lesson Builder to create one or switch filter to All 8 Stages.</p></div>';
      return;
    }
    grid.innerHTML = filtered.map(lesson => {
      const m = lesson.lessonMeta || {};
      const cnt = (lesson.items || []).length;
      const codeCnt = (lesson.items || []).filter(i => i.taskType === 'teacher_spoken_to_word').length;
      return `
        <article class="card lesson-card" data-lesson-id="${escapeHtml(m.lessonId)}">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">
              <span class="lesson-badge">${escapeHtml(STAGE_META[m.stageId]?.short || 'Custom')}</span>
              <span class="hint" style="margin:0;">${cnt} items (${codeCnt} code • ${cnt - codeCnt} visual)</span>
            </div>
            <h3 style="margin:0 0 0.35rem;font-size:1.05rem;">${escapeHtml(m.title)}</h3>
            <p class="hint" style="margin:0;">Theme: ${escapeHtml(m.interestTheme || 'General')}</p>
          </div>
          <div class="button-row" style="margin-top:0.5rem;">
            <button class="btn btn-primary btn-sm action-launch">Launch</button>
            <button class="btn btn-outline btn-sm action-key">Teacher Key</button>
            <button class="btn btn-ghost btn-sm action-export">Export</button>
            <button class="btn btn-outline btn-sm action-edit">Edit</button>
            ${m.isStarter ? '' : '<button class="btn btn-ghost btn-sm text-danger action-delete">Delete</button>'}
          </div>
        </article>`;
    }).join('');

    grid.querySelectorAll('.lesson-card').forEach(card => {
      const lesson = state.lessons.find(l => l.lessonMeta?.lessonId === card.dataset.lessonId);
      if (!lesson) return;
      card.querySelector('.action-launch')?.addEventListener('click', () => {
        if (App.Player?.startSession) App.Player.startSession(lesson);
        else App.showError('Student Player (player.js) is added in Step 5. Test Profiles and Teacher Keys now!');
      });
      card.querySelector('.action-key')?.addEventListener('click', () => openTeacherKey(lesson));
      card.querySelector('.action-export')?.addEventListener('click', () => {
        downloadJson(lesson, (lesson.lessonMeta.title || 'lesson').toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.json');
      });
      card.querySelector('.action-edit')?.addEventListener('click', () => {
        if (App.Builder?.editLesson) App.Builder.editLesson(lesson);
      });
      card.querySelector('.action-delete')?.addEventListener('click', () => {
        if (!confirm(`Delete "${lesson.lessonMeta.title}"?`)) return;
        state.lessons = state.lessons.filter(l => l.lessonMeta?.lessonId !== lesson.lessonMeta.lessonId);
        saveState(); renderLibrary();
      });
    });
  }

  function renderProfiles() {
    const listEl = document.getElementById('profile-list');
    const active = getActiveProfile();
    if (!listEl || !active) return;
    listEl.innerHTML = state.profiles.map(p => {
      const act = p.studentId === active.studentId;
      return `<button type="button" class="profile-pill" data-stu="${escapeHtml(p.studentId)}" style="${act ? 'border-color:var(--primary);border-width:2px;' : ''}">
        <span class="avatar-dot" style="background:${escapeHtml(p.avatarColor)};"></span>
        <span class="pill-code">${escapeHtml(p.displayCode)}</span>
        <span class="pill-stage">${escapeHtml(STAGE_META[p.currentStageId]?.short || 'S1')}</span>
      </button>`;
    }).join('');
    listEl.querySelectorAll('button[data-stu]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeProfileId = btn.dataset.stu;
        saveState(); renderProfiles(); applyProfileTheme(getActiveProfile());
        if (App.Reports) App.Reports.renderDashboard();
      });
    });

    const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setV('prof-code', active.displayCode);
    setV('prof-color', active.avatarColor || '#2563EB');
    setV('prof-stage', active.currentStageId || 'stage_6_cvce');
    setV('prof-goal', active.targetMasteryPct ?? 80);
    setV('prof-input-mode', active.accessConfig?.inputMode || 'direct_touch');
    setV('prof-touch-trigger', active.accessConfig?.touchTrigger || 'on_release');
    setV('prof-lockout', active.accessConfig?.postTapLockoutMs ?? 1000);
    setV('prof-dwell-ms', active.accessConfig?.dwellDurationMs ?? 1100);
    setV('prof-dwell-grace', active.accessConfig?.dwellGraceWindowMs ?? 250);
    setV('prof-scan-ms', active.accessConfig?.scanIntervalMs ?? 2000);
    setV('prof-scan-loops', active.accessConfig?.maxScanLoops ?? 3);
    setV('prof-font', active.visualConfig?.fontFamily || 'Andika');
    setV('prof-advance-mode', active.pacingConfig?.advanceMode || 'teacher_manual');

    const bTxt = document.getElementById('backup-status-text');
    if (bTxt) {
      if (!state.lastBackupAt) bTxt.textContent = 'No backup exported yet. Export periodically so cache clears never erase IEP logs.';
      else {
        const d = Math.floor((Date.now() - new Date(state.lastBackupAt).getTime()) / 86400000);
        bTxt.textContent = d > 14 ? `Last backup was ${d} days ago — export a fresh .json backup.` : `Last backup exported on ${state.lastBackupAt.slice(0, 10)}.`;
      }
    }
  }

  /* -------------------- DOM EVENTS -------------------- */
 function initDataEvents() {
    document.body.classList.toggle('cvi-dark', Boolean(state.cviDarkMode));
    applyProfileTheme(getActiveProfile());
    renderProfiles();
    renderLibrary();

    document.getElementById('filter-lesson-stage')?.addEventListener('change', renderLibrary);

    document.getElementById('btn-new-profile')?.addEventListener('click', () => {
      const code = prompt('Enter anonymized student code (2–4 chars, e.g., KL or S-02):');
      if (!code || !code.trim()) return;
      const colors = ['#2563EB', '#16A34A', '#9333EA', '#EA580C', '#0891B2', '#DB2777'];
      const np = createDefaultProfile(code.trim(), colors[state.profiles.length % colors.length], 'stage_2_cvc_families');
      state.profiles.push(np);
      state.activeProfileId = np.studentId;
      saveState();
      renderProfiles();
      applyProfileTheme(np);
    });

    document.getElementById('profile-settings-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const a = getActiveProfile();
      if (!a) return;
      a.displayCode = (document.getElementById('prof-code').value || 'STU').trim().toUpperCase().slice(0, 4);
      a.avatarColor = document.getElementById('prof-color').value;
      a.currentStageId = document.getElementById('prof-stage').value;
      a.targetMasteryPct = Number(document.getElementById('prof-goal').value) || 80;
      a.accessConfig = {
        inputMode: document.getElementById('prof-input-mode').value,
        touchTrigger: document.getElementById('prof-touch-trigger').value,
        postTapLockoutMs: Number(document.getElementById('prof-lockout').value) || 0,
        dwellDurationMs: Number(document.getElementById('prof-dwell-ms').value) || 1100,
        dwellGraceWindowMs: Number(document.getElementById('prof-dwell-grace').value) || 250,
        scanIntervalMs: Number(document.getElementById('prof-scan-ms').value) || 2000,
        maxScanLoops: Number(document.getElementById('prof-scan-loops').value) || 3
      };
      a.visualConfig = { fontFamily: document.getElementById('prof-font').value };
      a.pacingConfig = { advanceMode: document.getElementById('prof-advance-mode').value, autoAdvanceDelayMs: 1500 };
      saveState();
      applyProfileTheme(a);
      renderProfiles();
      App.closeDrawer();
    });

    document.getElementById('btn-delete-profile')?.addEventListener('click', () => {
      if (state.profiles.length <= 1) return App.showError('At least one student profile must remain active.');
      const a = getActiveProfile();
      if (!confirm(`Delete profile "${a.displayCode}"?`)) return;
      state.profiles = state.profiles.filter(p => p.studentId !== a.studentId);
      state.activeProfileId = state.profiles[0].studentId;
      saveState();
      renderProfiles();
      applyProfileTheme(getActiveProfile());
    });

    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
      state.lastBackupAt = new Date().toISOString();
      saveState();
      renderProfiles();
      downloadJson(state, `clearread_backup_${state.lastBackupAt.slice(0, 10)}.json`);
    });

    const bIn = document.getElementById('input-import-backup');
    document.getElementById('btn-import-backup')?.addEventListener('click', () => bIn?.click());
    bIn?.addEventListener('change', e => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const p = JSON.parse(r.result);
          if (!Array.isArray(p.profiles) || !Array.isArray(p.lessons)) throw new Error('Invalid ClearRead backup file.');
          state.profiles = p.profiles;
          state.activeProfileId = p.activeProfileId || p.profiles[0].studentId;
          state.lessons = p.lessons;
          state.sessions = Array.isArray(p.sessions) ? p.sessions : [];
          state.lastBackupAt = p.lastBackupAt || new Date().toISOString();
          state.cviDarkMode = Boolean(p.cviDarkMode);
          document.body.classList.toggle('cvi-dark', state.cviDarkMode);
          saveState();
          applyProfileTheme(getActiveProfile());
          renderProfiles();
          renderLibrary();
          if (App.Reports) App.Reports.renderDashboard();
          alert('Backup restored successfully.');
        } catch (err) {
          App.showError('Backup restore failed: ' + err.message);
        }
      };
      r.readAsText(f);
      e.target.value = '';
    });

    const lIn = document.getElementById('input-import-lesson-file');
    document.getElementById('btn-import-lesson-file')?.addEventListener('click', () => lIn?.click());
    lIn?.addEventListener('change', e => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const lesson = JSON.parse(r.result);
          if (!lesson.lessonMeta || !Array.isArray(lesson.items)) throw new Error('Invalid lesson JSON.');
          App.Data.saveLesson(lesson);
          alert(`Imported "${lesson.lessonMeta.title}".`);
        } catch (err) {
          App.showError('Lesson import failed: ' + err.message);
        }
      };
      r.readAsText(f);
      e.target.value = '';
    });

    document.getElementById('btn-copy-key')?.addEventListener('click', () => {
      navigator.clipboard.writeText(document.getElementById('teacher-key-output')?.textContent || '');
    });
    document.getElementById('btn-print-key')?.addEventListener('click', () => window.print());
  }

  /* -------------------- PUBLIC API -------------------- */
  App.STAGE_META = STAGE_META;
  App.Data = {
    state, STARTER_SVGS, saveState, getActiveProfile, generateSafeCode, formatTeacherKey, openTeacherKey, renderLibrary, renderProfiles,
    getStarterSvg(kw) { return kw ? STARTER_SVGS[String(kw).trim().toLowerCase()] || null : null; },
    saveLesson(lesson) {
      if (!lesson.lessonMeta) lesson.lessonMeta = {};
      if (!lesson.lessonMeta.lessonId) lesson.lessonMeta.lessonId = 'les_' + Math.random().toString(36).slice(2, 9);
      const used = new Set();
      (lesson.items || []).forEach(it => {
        if (!/^[bcdfghjkmnprstvwxyz][2-8]$/.test(it.code || '') || used.has(it.code)) it.code = generateSafeCode(used);
        else used.add(it.code);
      });
      const idx = state.lessons.findIndex(l => l.lessonMeta?.lessonId === lesson.lessonMeta.lessonId);
      if (idx >= 0) state.lessons[idx] = lesson; else state.lessons.unshift(lesson);
      saveState(); renderLibrary();
    },
    logSession(rec) { state.sessions.push(rec); saveState(); },
    getSessionsForActive() { const a = getActiveProfile(); return state.sessions.filter(s => s.studentId === a?.studentId); }
  };

  App.modulesLoaded.data = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDataEvents);
  else initDataEvents();
})();
