/* ==========================================================================
   ClearRead AAC — Step 2: data.js
   Student Profiles (Zero-PII), Persistence, Backup/Restore,
   Offline Starter SVGs, 8 Pre-Loaded Phonics Lessons, & Sorted Teacher Key
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

  /* -------------------- HELPERS -------------------- */
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function svgDataUri(inner) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">${inner}</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function generateSafeCode(existingCodes) {
    const letters = 'bcdfghjkmnprstvwxyz';
    const digits = '2345678';
    for (let tries = 0; tries < 200; tries++) {
      const code =
        letters[Math.floor(Math.random() * letters.length)] +
        digits[Math.floor(Math.random() * digits.length)] +
        digits[Math.floor(Math.random() * digits.length)];
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        return code;
      }
    }
    return 'x73';
  }

  /* -------------------- OFFLINE STARTER SVG LIBRARY -------------------- */
  const STARTER_SVGS = {
    sun: svgDataUri(`
      <circle cx="60" cy="60" r="26" fill="#FACC15" stroke="#CA8A04" stroke-width="4"/>
      <g stroke="#EAB308" stroke-width="5" stroke-linecap="round">
        <line x1="60" y1="12" x2="60" y2="24"/><line x1="60" y1="96" x2="60" y2="108"/>
        <line x1="12" y1="60" x2="24" y2="60"/><line x1="96" y1="60" x2="108" y2="60"/>
        <line x1="26" y1="26" x2="35" y2="35"/><line x1="85" y1="85" x2="94" y2="94"/>
        <line x1="94" y1="26" x2="85" y2="35"/><line x1="35" y1="85" x2="26" y2="94"/>
      </g>`),
    pig: svgDataUri(`
      <circle cx="32" cy="36" r="14" fill="#F9A8D4" stroke="#BE185D" stroke-width="3"/>
      <circle cx="88" cy="36" r="14" fill="#F9A8D4" stroke="#BE185D" stroke-width="3"/>
      <circle cx="60" cy="64" r="36" fill="#FBCFE8" stroke="#BE185D" stroke-width="4"/>
      <circle cx="46" cy="54" r="4.5" fill="#1E293B"/><circle cx="74" cy="54" r="4.5" fill="#1E293B"/>
      <ellipse cx="60" cy="72" rx="16" ry="11" fill="#F472B6" stroke="#BE185D" stroke-width="3"/>
      <circle cx="54" cy="72" r="3" fill="#831843"/><circle cx="66" cy="72" r="3" fill="#831843"/>`),
    hat: svgDataUri(`
      <path d="M32 76 L38 34 C38 26 82 26 82 34 L88 76 Z" fill="#2563EB" stroke="#1E3A8A" stroke-width="4"/>
      <rect x="34" y="62" width="52" height="10" fill="#FACC15"/>
      <ellipse cx="60" cy="78" rx="46" ry="11" fill="#3B82F6" stroke="#1E3A8A" stroke-width="4"/>`),
    cat: svgDataUri(`
      <polygon points="28,54 34,20 54,40" fill="#FB923C" stroke="#9A3412" stroke-width="4" stroke-linejoin="round"/>
      <polygon points="92,54 86,20 66,40" fill="#FB923C" stroke="#9A3412" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="60" cy="66" r="34" fill="#FDBA74" stroke="#9A3412" stroke-width="4"/>
      <circle cx="47" cy="60" r="4.5" fill="#1E293B"/><circle cx="73" cy="60" r="4.5" fill="#1E293B"/>
      <polygon points="55,70 65,70 60,76" fill="#BE185D"/>
      <g stroke="#7C2D12" stroke-width="3" stroke-linecap="round">
        <line x1="18" y1="68" x2="36" y2="70"/><line x1="18" y1="78" x2="36" y2="76"/>
        <line x1="102" y1="68" x2="84" y2="70"/><line x1="102" y1="78" x2="84" y2="76"/>
      </g>`),
    mat: svgDataUri(`
      <polygon points="18,86 34,42 102,42 86,86" fill="#D97706" stroke="#78350F" stroke-width="4" stroke-linejoin="round"/>
      <polygon points="28,78 40,50 92,50 80,78" fill="#FDE68A" stroke="#92400E" stroke-width="3"/>
      <line x1="44" y1="64" x2="78" y2="64" stroke="#92400E" stroke-width="4" stroke-linecap="round"/>`),
    bat: svgDataUri(`
      <path d="M26 96 L82 22 C88 16 98 24 92 32 L38 102 C32 106 22 100 26 96 Z" fill="#D97706" stroke="#78350F" stroke-width="4"/>
      <line x1="30" y1="90" x2="40" y2="98" stroke="#1E293B" stroke-width="5"/>`),
    cap: svgDataUri(`
      <path d="M24 72 C24 38 84 38 84 72 Z" fill="#EF4444" stroke="#991B1B" stroke-width="4"/>
      <path d="M20 72 L104 72 C104 82 88 86 68 82 L20 78 Z" fill="#B91C1C" stroke="#7F1D1D" stroke-width="4"/>
      <circle cx="54" cy="40" r="4" fill="#991B1B"/>`),
    bug: svgDataUri(`
      <ellipse cx="60" cy="68" rx="28" ry="30" fill="#EF4444" stroke="#7F1D1D" stroke-width="4"/>
      <path d="M38 44 C38 28 82 28 82 44 Z" fill="#1E293B"/>
      <line x1="60" y1="42" x2="60" y2="98" stroke="#1E293B" stroke-width="4"/>
      <circle cx="47" cy="62" r="5" fill="#1E293B"/><circle cx="73" cy="62" r="5" fill="#1E293B"/>
      <circle cx="49" cy="80" r="5" fill="#1E293B"/><circle cx="71" cy="80" r="5" fill="#1E293B"/>`),
    ship: svgDataUri(`
      <polygon points="16,74 104,74 92,98 28,98" fill="#1E3A8A" stroke="#0F172A" stroke-width="4" stroke-linejoin="round"/>
      <rect x="56" y="20" width="6" height="54" fill="#78350F"/>
      <polygon points="62,24 96,66 62,66" fill="#F8FAFC" stroke="#64748B" stroke-width="3"/>
      <polygon points="56,30 28,66 56,66" fill="#E0F2FE" stroke="#64748B" stroke-width="3"/>`),
    duck: svgDataUri(`
      <ellipse cx="56" cy="76" rx="34" ry="22" fill="#FACC15" stroke="#A16207" stroke-width="4"/>
      <circle cx="76" cy="44" r="18" fill="#FACC15" stroke="#A16207" stroke-width="4"/>
      <polygon points="92,42 110,48 92,54" fill="#F97316" stroke="#9A3412" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="80" cy="40" r="3.5" fill="#0F172A"/>`),
    frog: svgDataUri(`
      <circle cx="40" cy="36" r="13" fill="#4ADE80" stroke="#166534" stroke-width="4"/>
      <circle cx="80" cy="36" r="13" fill="#4ADE80" stroke="#166534" stroke-width="4"/>
      <circle cx="40" cy="36" r="5" fill="#0F172A"/><circle cx="80" cy="36" r="5" fill="#0F172A"/>
      <ellipse cx="60" cy="70" rx="38" ry="26" fill="#22C55E" stroke="#166534" stroke-width="4"/>
      <path d="M38 74 Q60 90 82 74" fill="none" stroke="#14532D" stroke-width="4" stroke-linecap="round"/>`),
    lamp: svgDataUri(`
      <polygon points="36,24 84,24 94,58 26,58" fill="#FDE047" stroke="#A16207" stroke-width="4" stroke-linejoin="round"/>
      <rect x="55" y="58" width="10" height="32" fill="#64748B" stroke="#334155" stroke-width="3"/>
      <rect x="36" y="90" width="48" height="10" rx="4" fill="#475569" stroke="#1E293B" stroke-width="3"/>`),
    bike: svgDataUri(`
      <circle cx="30" cy="82" r="20" fill="none" stroke="#1E293B" stroke-width="5"/>
      <circle cx="90" cy="82" r="20" fill="none" stroke="#1E293B" stroke-width="5"/>
      <polyline points="30,82 54,52 84,52 90,82" fill="none" stroke="#2563EB" stroke-width="5" stroke-linejoin="round"/>
      <line x1="54" y1="52" x2="62" y2="82" stroke="#2563EB" stroke-width="5"/>
      <line x1="46" y1="46" x2="62" y2="46" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>
      <line x1="78" y1="38" x2="90" y2="38" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>`),
    kite: svgDataUri(`
      <polygon points="60,14 96,52 60,92 24,52" fill="#EC4899" stroke="#831843" stroke-width="4" stroke-linejoin="round"/>
      <line x1="60" y1="14" x2="60" y2="92" stroke="#FDE047" stroke-width="3"/>
      <line x1="24" y1="52" x2="96" y2="52" stroke="#FDE047" stroke-width="3"/>
      <path d="M60 92 Q72 104 54 114" fill="none" stroke="#475569" stroke-width="3" stroke-linecap="round"/>`),
    bone: svgDataUri(`
      <g fill="#F8FAFC" stroke="#475569" stroke-width="4">
        <circle cx="28" cy="50" r="12"/><circle cx="28" cy="70" r="12"/>
        <circle cx="92" cy="50" r="12"/><circle cx="92" cy="70" r="12"/>
        <rect x="28" y="50" width="64" height="20" stroke="none"/>
        <line x1="34" y1="50" x2="86" y2="50"/><line x1="34" y1="70" x2="86" y2="70"/>
      </g>`),
    rain: svgDataUri(`
      <path d="M30 58 C20 58 18 42 30 40 C34 24 62 20 72 34 C86 30 98 44 90 58 Z" fill="#94A3B8" stroke="#475569" stroke-width="4"/>
      <g stroke="#2563EB" stroke-width="5" stroke-linecap="round">
        <line x1="38" y1="70" x2="32" y2="88"/><line x1="60" y1="70" x2="54" y2="88"/><line x1="82" y1="70" x2="76" y2="88"/>
      </g>`),
    boat: svgDataUri(`
      <polygon points="18,68 102,68 88,94 32,94" fill="#EF4444" stroke="#7F1D1D" stroke-width="4" stroke-linejoin="round"/>
      <rect x="44" y="46" width="32" height="22" fill="#F8FAFC" stroke="#475569" stroke-width="4"/>
      <rect x="52" y="52" width="16" height="10" fill="#38BDF8"/>`),
    car: svgDataUri(`
      <path d="M18 76 L26 52 L44 38 L78 38 L94 54 L104 76 Z" fill="#2563EB" stroke="#1E3A8A" stroke-width="4" stroke-linejoin="round"/>
      <polygon points="46,44 74,44 84,56 36,56" fill="#BAE6FD"/>
      <circle cx="36" cy="80" r="12" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/>
      <circle cx="84" cy="80" r="12" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/>`),
    rocket: svgDataUri(`
      <path d="M60 14 C76 30 78 58 74 82 L46 82 C42 58 44 30 60 14 Z" fill="#F8FAFC" stroke="#334155" stroke-width="4"/>
      <polygon points="46,66 28,86 46,82" fill="#EF4444" stroke="#991B1B" stroke-width="3"/>
      <polygon points="74,66 92,86 74,82" fill="#EF4444" stroke="#991B1B" stroke-width="3"/>
      <circle cx="60" cy="48" r="10" fill="#38BDF8" stroke="#1E40AF" stroke-width="3"/>
      <polygon points="50,84 70,84 60,106" fill="#F97316"/>`),
    dog: svgDataUri(`
      <ellipse cx="26" cy="56" rx="12" ry="22" fill="#92400E" stroke="#451A03" stroke-width="3"/>
      <ellipse cx="94" cy="56" rx="12" ry="22" fill="#92400E" stroke="#451A03" stroke-width="3"/>
      <circle cx="60" cy="60" r="32" fill="#D97706" stroke="#451A03" stroke-width="4"/>
      <circle cx="48" cy="52" r="4.5" fill="#0F172A"/><circle cx="72" cy="52" r="4.5" fill="#0F172A"/>
      <ellipse cx="60" cy="68" rx="9" ry="6" fill="#1E293B"/>`),
    van: svgDataUri(`
      <rect x="16" y="40" width="84" height="40" rx="10" fill="#16A34A" stroke="#14532D" stroke-width="4"/>
      <rect x="66" y="48" width="26" height="16" rx="3" fill="#DCFCE7"/>
      <rect x="26" y="48" width="32" height="16" rx="3" fill="#DCFCE7"/>
      <circle cx="34" cy="82" r="11" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/>
      <circle cx="82" cy="82" r="11" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/>`),
    bus: svgDataUri(`
      <rect x="14" y="34" width="92" height="46" rx="8" fill="#FACC15" stroke="#854D0E" stroke-width="4"/>
      <rect x="22" y="42" width="18" height="16" fill="#BAE6FD" stroke="#854D0E" stroke-width="2"/>
      <rect x="46" y="42" width="18" height="16" fill="#BAE6FD" stroke="#854D0E" stroke-width="2"/>
      <rect x="70" y="42" width="28" height="16" fill="#BAE6FD" stroke="#854D0E" stroke-width="2"/>
      <circle cx="34" cy="82" r="11" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/>
      <circle cx="86" cy="82" r="11" fill="#1E293B" stroke="#94A3B8" stroke-width="3"/>`)
  };

  /* -------------------- 8 PRE-LOADED STARTER LESSONS -------------------- */
  const STARTER_LESSONS = [
    {
      lessonMeta: {
        lessonId: 'starter_stage_1',
        title: 'Stage 1 Starter: Initial Sounds (m, s, p, h)',
        stageId: 'stage_1_letters',
        modality: 'hybrid_auto',
        interestTheme: 'animals & nature',
        isStarter: true,
        createdAt: '2026-11-20'
      },
      items: [
        {
          code: 'b42',
          taskType: 'teacher_spoken_to_word',
          promptText: null,
          promptImageKeyword: null,
          teacherScript: "Say isolated phoneme: /m/ (as in 'map')",
          choices: [
            { label: 'm', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 's', imageKeyword: null, isTarget: false, errorTag: 'phoneme_voicing_or_manner' },
            { label: 't', imageKeyword: null, isTarget: false, errorTag: 'unrelated_consonant' }
          ]
        },
        {
          code: 'f28',
          taskType: 'word_to_picture',
          promptText: 's',
          promptImageKeyword: null,
          teacherScript: "Visual initial-sound match: 's' -> sun",
          choices: [
            { label: 'sun', imageKeyword: 'sun', imageData: STARTER_SVGS.sun, isTarget: true, errorTag: null },
            { label: 'pig', imageKeyword: 'pig', imageData: STARTER_SVGS.pig, isTarget: false, errorTag: 'unrelated_consonant' },
            { label: 'hat', imageKeyword: 'hat', imageData: STARTER_SVGS.hat, isTarget: false, errorTag: 'unrelated_consonant' }
          ]
        },
        {
          code: 'k65',
          taskType: 'teacher_spoken_to_word',
          promptText: null,
          promptImageKeyword: null,
          teacherScript: "Say isolated phoneme: /p/ (as in 'pig')",
          choices: [
            { label: 'p', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'f', imageKeyword: null, isTarget: false, errorTag: 'phoneme_voicing_or_manner' },
            { label: 'c', imageKeyword: null, isTarget: false, errorTag: 'unrelated_consonant' }
          ]
        },
        {
          code: 'r83',
          taskType: 'picture_to_word',
          promptText: null,
          promptImageKeyword: 'hat',
          promptImageData: STARTER_SVGS.hat,
          teacherScript: "Initial sound of picture 'hat' -> h",
          choices: [
            { label: 'h', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'r', imageKeyword: null, isTarget: false, errorTag: 'unrelated_consonant' },
            { label: 'w', imageKeyword: null, isTarget: false, errorTag: 'unrelated_consonant' }
          ]
        }
      ]
    },
    {
      lessonMeta: {
        lessonId: 'starter_stage_2',
        title: 'Stage 2 Starter: CVC Word Families (-at, -an)',
        stageId: 'stage_2_cvc_families',
        modality: 'hybrid_auto',
        interestTheme: 'everyday objects',
        isStarter: true,
        createdAt: '2026-11-20'
      },
      items: [
        {
          code: 'c34',
          taskType: 'picture_to_word',
          promptText: null,
          promptImageKeyword: 'cat',
          promptImageData: STARTER_SVGS.cat,
          teacherScript: "Target: 'cat' | /k/ - /a/ - /t/",
          choices: [
            { label: 'cat', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'hat', imageKeyword: null, isTarget: false, errorTag: 'initial_consonant_sub' },
            { label: 'mat', imageKeyword: null, isTarget: false, errorTag: 'initial_consonant_sub' }
          ]
        },
        {
          code: 'g57',
          taskType: 'word_to_picture',
          promptText: 'bat',
          promptImageKeyword: null,
          teacherScript: "Silent decode: 'bat' (baseball bat)",
          choices: [
            { label: 'bat', imageKeyword: 'bat', imageData: STARTER_SVGS.bat, isTarget: true, errorTag: null },
            { label: 'cat', imageKeyword: 'cat', imageData: STARTER_SVGS.cat, isTarget: false, errorTag: 'initial_consonant_sub' },
            { label: 'hat', imageKeyword: 'hat', imageData: STARTER_SVGS.hat, isTarget: false, errorTag: 'initial_consonant_sub' }
          ]
        },
        {
          code: 'm72',
          taskType: 'teacher_spoken_to_word',
          promptText: null,
          promptImageKeyword: null,
          teacherScript: "Target: 'van' | /v/ - /a/ - /n/ | 'Ride in the green van.'",
          choices: [
            { label: 'van', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'fan', imageKeyword: null, isTarget: false, errorTag: 'initial_consonant_sub' },
            { label: 'pan', imageKeyword: null, isTarget: false, errorTag: 'initial_consonant_sub' }
          ]
        },
        {
          code: 'x45',
          taskType: 'picture_to_word',
          promptText: null,
          promptImageKeyword: 'mat',
          promptImageData: STARTER_SVGS.mat,
          teacherScript: "Target: 'mat' | /m/ - /a/ - /t/",
          choices: [
            { label: 'mat', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'sat', imageKeyword: null, isTarget: false, errorTag: 'initial_consonant_sub' },
            { label: 'rat', imageKeyword: null, isTarget: false, errorTag: 'initial_consonant_sub' }
          ]
        }
      ]
    },
    {
      lessonMeta: {
        lessonId: 'starter_stage_3',
        title: 'Stage 3 Starter: CVC Medial & Final Minimal Pairs',
        stageId: 'stage_3_cvc_pairs',
        modality: 'hybrid_auto',
        interestTheme: 'bugs & pets',
        isStarter: true,
        createdAt: '2026-11-20'
      },
      items: [
        {
          code: 'd26',
          taskType: 'picture_to_word',
          promptText: null,
          promptImageKeyword: 'bug',
          promptImageData: STARTER_SVGS.bug,
          teacherScript: "Target: 'bug' | /b/ - /u/ - /g/ (Medial vowel check)",
          choices: [
            { label: 'bug', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'bag', imageKeyword: null, isTarget: false, errorTag: 'medial_short_vowel_sub' },
            { label: 'big', imageKeyword: null, isTarget: false, errorTag: 'medial_short_vowel_sub' }
          ]
        },
        {
          code: 'h48',
          taskType: 'picture_to_word',
          promptText: null,
          promptImageKeyword: 'cap',
          promptImageData: STARTER_SVGS.cap,
          teacherScript: "Target: 'cap' | /k/ - /a/ - /p/ (Final consonant check)",
          choices: [
            { label: 'cap', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'cab', imageKeyword: null, isTarget: false, errorTag: 'final_consonant_sub' },
            { label: 'cat', imageKeyword: null, isTarget: false, errorTag: 'final_consonant_sub' }
          ]
        },
        {
          code: 'p63',
          taskType: 'teacher_spoken_to_word',
          promptText: null,
          promptImageKeyword: null,
          teacherScript: "Target: 'dog' | /d/ - /o/ - /g/ | 'The brown dog barked.'",
          choices: [
            { label: 'dog', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'dug', imageKeyword: null, isTarget: false, errorTag: 'medial_short_vowel_sub' },
            { label: 'dig', imageKeyword: null, isTarget: false, errorTag: 'medial_short_vowel_sub' }
          ]
        },
        {
          code: 't84',
          taskType: 'teacher_spoken_to_word',
          promptText: null,
          promptImageKeyword: null,
          teacherScript: "Target: 'bus' | /b/ - /u/ - /s/ | 'Get on the school bus.'",
          choices: [
            { label: 'bus', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'bud', imageKeyword: null, isTarget: false, errorTag: 'final_consonant_sub' },
            { label: 'bun', imageKeyword: null, isTarget: false, errorTag: 'final_consonant_sub' }
          ]
        }
      ]
    },
    {
      lessonMeta: {
        lessonId: 'starter_stage_4',
        title: 'Stage 4 Starter: Consonant Digraphs (sh, ch, th, ck)',
        stageId: 'stage_4_digraphs',
        modality: 'hybrid_auto',
        interestTheme: 'water & animals',
        isStarter: true,
        createdAt: '2026-11-20'
      },
      items: [
        {
          code: 'b74',
          taskType: 'picture_to_word',
          promptText: null,
          promptImageKeyword: 'ship',
          promptImageData: STARTER_SVGS.ship,
          teacherScript: "Target: 'ship' | /sh/ - /i/ - /p/",
          choices: [
            { label: 'ship', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'sip', imageKeyword: null, isTarget: false, errorTag: 'digraph_to_single_consonant' },
            { label: 'chip', imageKeyword: null, isTarget: false, errorTag: 'digraph_confusion' }
          ]
        },
        {
          code: 'j35',
          taskType: 'picture_to_word',
          promptText: null,
          promptImageKeyword: 'duck',
          promptImageData: STARTER_SVGS.duck,
          teacherScript: "Target: 'duck' | /d/ - /u/ - /k/",
          choices: [
            { label: 'duck', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'dug', imageKeyword: null, isTarget: false, errorTag: 'digraph_to_single_consonant' },
            { label: 'deck', imageKeyword: null, isTarget: false, errorTag: 'medial_short_vowel_sub' }
          ]
        },
        {
          code: 'n52',
          taskType: 'teacher_spoken_to_word',
          promptText: null,
          promptImageKeyword: null,
          teacherScript: "Target: 'chin' | /ch/ - /i/ - /n/ | 'Touch your chin.'",
          choices: [
            { label: 'chin', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'tin', imageKeyword: null, isTarget: false, errorTag: 'digraph_to_single_consonant' },
            { label: 'thin', imageKeyword: null, isTarget: false, errorTag: 'digraph_confusion' }
          ]
        },
        {
          code: 'w68',
          taskType: 'teacher_spoken_to_word',
          promptText: null,
          promptImageKeyword: null,
          teacherScript: "Target: 'path' | /p/ - /a/ - /th/ | 'Walk on the park path.'",
          choices: [
            { label: 'path', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'pat', imageKeyword: null, isTarget: false, errorTag: 'digraph_to_single_consonant' },
            { label: 'pack', imageKeyword: null, isTarget: false, errorTag: 'digraph_confusion' }
          ]
        }
      ]
    },
    {
      lessonMeta: {
        lessonId: 'starter_stage_5',
        title: 'Stage 5 Starter: Initial & Final Blends',
        stageId: 'stage_5_blends',
        modality: 'hybrid_auto',
        interestTheme: 'pond & home',
        isStarter: true,
        createdAt: '2026-11-20'
      },
      items: [
        {
          code: 'c82',
          taskType: 'picture_to_word',
          promptText: null,
          promptImageKeyword: 'frog',
          promptImageData: STARTER_SVGS.frog,
          teacherScript: "Target: 'frog' | /f/ - /r/ - /o/ - /g/",
          choices: [
            { label: 'frog', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'fog', imageKeyword: null, isTarget: false, errorTag: 'blend_consonant_omission' },
            { label: 'clog', imageKeyword: null, isTarget: false, errorTag: 'blend_consonant_sub' }
          ]
        },
        {
          code: 'k27',
          taskType: 'picture_to_word',
          promptText: null,
          promptImageKeyword: 'lamp',
          promptImageData: STARTER_SVGS.lamp,
          teacherScript: "Target: 'lamp' | /l/ - /a/ - /m/ - /p/",
          choices: [
            { label: 'lamp', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'lap', imageKeyword: null, isTarget: false, errorTag: 'blend_consonant_omission' },
            { label: 'limp', imageKeyword: null, isTarget: false, errorTag: 'medial_short_vowel_sub' }
          ]
        },
        {
          code: 's46',
          taskType: 'teacher_spoken_to_word',
          promptText: null,
          promptImageKeyword: null,
          teacherScript: "Target: 'stop' | /s/ - /t/ - /o/ - /p/ | 'Red light means stop.'",
          choices: [
            { label: 'stop', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'top', imageKeyword: null, isTarget: false, errorTag: 'blend_consonant_omission' },
            { label: 'spot', imageKeyword: null, isTarget: false, errorTag: 'blend_consonant_sub' }
          ]
        },
        {
          code: 'v75',
          taskType: 'teacher_spoken_to_word',
          promptText: null,
          promptImageKeyword: null,
          teacherScript: "Target: 'clap' | /k/ - /l/ - /a/ - /p/ | 'Clap your hands.'",
          choices: [
            { label: 'clap', imageKeyword: null, isTarget: true, errorTag: null },
            { label: 'cap', imageKeyword: null, isTarget: false, errorTag: 'blend_consonant_omission' },
            { label: 'slap', imageKeyword: null, isTarget: false, errorTag: 'blend_consonant_sub' }
          ]
        }
      ]
    },
    {
      lessonMeta: {
        lessonId: 'starter_stage_6',
        title: 'Stage 6 Starter: CVCe Silent-E Long Vowels',
        stageId: 'stage_6_cvce',
        modality: 'hybrid_auto',
        interestTheme: 'outdoor play',
        isStarter: true,
        createdAt: '2026-11-20'
      },
      items: [
        {
          code: 'd47',
          taskType: 'picture_to_word',
          promptText: null
