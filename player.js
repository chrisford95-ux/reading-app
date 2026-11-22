/* ==========================================================================
   ClearRead AAC — Step 5: player.js
   Field-of-3 Student Player, Lift-to-Select, Eye-Gaze Dwell + Grace Window,
   1-/2-Switch Scan, Practice 2-Miss Green Hint, Hotkeys, & Session Summary
   ========================================================================== */
(function () {
  const App = (window.ReadingApp = window.ReadingApp || {});

  let session = null;
  let timers = { lockout: null, advance: null, scan: null, codeHold: null };
  let dwell = { idx: null, elapsed: 0, lastTs: 0, raf: null, graceTimer: null };
  let scanState = { focusIdx: 0, loops: 0, paused: false };

  /* -------------------- HELPERS -------------------- */
  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function median(nums) {
    if (!nums.length) return 0;
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  }

  function clearAllTimers() {
    clearTimeout(timers.lockout);
    clearTimeout(timers.advance);
    clearInterval(timers.scan);
    clearTimeout(timers.codeHold);
    cancelDwell(true);
    timers = { lockout: null, advance: null, scan: null, codeHold: null };
  }

  function isModalOpen() {
    return !document.getElementById('modal-early-exit')?.classList.contains('hidden');
  }

  /* -------------------- DWELL ENGINE (MICRO-SACCADE GRACE) -------------------- */
  function setDwellVisual(cardIdx, ratio) {
    const rect = document.querySelector(`.choice-card[data-idx="${cardIdx}"] .dwell-ring-rect`);
    if (rect) rect.style.strokeDashoffset = String(Math.max(0, 100 - ratio * 100));
  }

  function cancelDwell(resetAll) {
    if (dwell.raf) cancelAnimationFrame(dwell.raf);
    clearTimeout(dwell.graceTimer);
    if (resetAll && dwell.idx !== null) setDwellVisual(dwell.idx, 0);
    dwell = { idx: null, elapsed: 0, lastTs: 0, raf: null, graceTimer: null };
  }

  function startDwell(cardIdx) {
    if (!session || session.waitingAdvance || session.lockedOut || session.dimmed.has(cardIdx)) return;
    const cfg = session.profile.accessConfig || {};
    const targetMs = Math.max(400, Number(cfg.dwellDurationMs) || 1100);

    // Resume seamlessly if gaze returns within the micro-saccade grace window
    if (dwell.idx === cardIdx && dwell.graceTimer) {
      clearTimeout(dwell.graceTimer);
      dwell.graceTimer = null;
      dwell.lastTs = performance.now();
    } else {
      cancelDwell(true);
      dwell = { idx: cardIdx, elapsed: 0, lastTs: performance.now(), raf: null, graceTimer: null };
    }

    const tick = now => {
      if (!session || session.waitingAdvance || session.lockedOut || dwell.idx !== cardIdx) return;
      dwell.elapsed += now - dwell.lastTs;
      dwell.lastTs = now;
      const ratio = Math.min(1, dwell.elapsed / targetMs);
      setDwellVisual(cardIdx, ratio);
      if (ratio >= 1) {
        cancelDwell(true);
        handleSelection(cardIdx, false);
      } else {
        dwell.raf = requestAnimationFrame(tick);
      }
    };
    dwell.raf = requestAnimationFrame(tick);
  }

  function pauseDwell(cardIdx) {
    if (dwell.idx !== cardIdx) return;
    if (dwell.raf) { cancelAnimationFrame(dwell.raf); dwell.raf = null; }
    const graceMs = Number(session?.profile?.accessConfig?.dwellGraceWindowMs ?? 250);
    clearTimeout(dwell.graceTimer);
    dwell.graceTimer = setTimeout(() => {
      setDwellVisual(cardIdx, 0);
      dwell = { idx: null, elapsed: 0, lastTs: 0, raf: null, graceTimer: null };
    }, graceMs);
  }

  /* -------------------- 1- & 2-SWITCH SCANNING ENGINE -------------------- */
  function getActiveCardIndices() {
    return [0, 1, 2].filter(i => !session?.dimmed.has(i));
  }

  function renderScanFocus() {
    document.querySelectorAll('#player-choice-grid .choice-card').forEach(el => {
      el.classList.toggle('card-scan-focus', Number(el.dataset.idx) === scanState.focusIdx);
    });
  }

  function stepScan(isAutoTick) {
    if (!session || session.waitingAdvance || isModalOpen()) return;
    const avail = getActiveCardIndices();
    if (!avail.length) return;
    const pos = avail.indexOf(scanState.focusIdx);
    const nextPos = (pos + 1) % avail.length;
    scanState.focusIdx = avail[nextPos];

    if (isAutoTick && nextPos === 0) {
      scanState.loops++;
      const maxLoops = Number(session.profile.accessConfig?.maxScanLoops) || 3;
      if (scanState.loops >= maxLoops) {
        clearInterval(timers.scan);
        timers.scan = null;
        scanState.paused = true;
        document.getElementById('badge-lockout')?.classList.remove('hidden');
        return;
      }
    }
    renderScanFocus();
  }

  function startScanningIfNeeded() {
    clearInterval(timers.scan);
    timers.scan = null;
    if (!session || session.waitingAdvance) return;
    const mode = session.profile.accessConfig?.inputMode;
    if (mode !== 'scan_1_switch' && mode !== 'scan_2_switch') return;

    const avail = getActiveCardIndices();
    if (!avail.length) return;
    scanState = { focusIdx: avail[0], loops: 0, paused: false };
    renderScanFocus();

    if (mode === 'scan_1_switch') {
      const intervalMs = Math.max(800, Number(session.profile.accessConfig?.scanIntervalMs) || 2000);
      timers.scan = setInterval(() => stepScan(true), intervalMs);
    }
  }

  /* -------------------- LOCKOUT GUARD -------------------- */
  function triggerLockout(customMs) {
    const ms = customMs !== undefined ? customMs : Number(session?.profile?.accessConfig?.postTapLockoutMs ?? 1000);
    if (!session || ms <= 0) return;
    session.lockedOut = true;
    document.getElementById('badge-lockout')?.classList.remove('hidden');
    clearTimeout(timers.lockout);
    timers.lockout = setTimeout(() => {
      if (!session) return;
      session.lockedOut = false;
      if (!session.waitingAdvance && !scanState.paused) {
        document.getElementById('badge-lockout')?.classList.add('hidden');
      }
    }, ms);
  }

  /* -------------------- SESSION LAUNCH & ITEM RENDER -------------------- */
  function startSession(lesson) {
    if (!lesson || !Array.isArray(lesson.items) || !lesson.items.length) {
      return App.showError('This lesson has no items to run.');
    }
    clearAllTimers();
    const profile = App.Data.getActiveProfile();
    const runMode = document.getElementById('session-run-mode')?.value || 'practice';
    const shuffleItems = document.getElementById('opt-shuffle-items')?.checked ?? true;
    const shuffleCards = document.getElementById('opt-shuffle-cards')?.checked ?? true;
    const showProgress = document.getElementById('opt-show-progress')?.checked ?? true;

    const items = shuffleItems ? shuffle(lesson.items) : [...lesson.items];
    session = {
      sessionId: 'ses_' + Math.random().toString(36).slice(2, 9),
      lesson,
      profile,
      runMode,
      shuffleCards,
      showProgress,
      items,
      index: 0,
      trials: [],
      // Active item state
      choices: [],
      dimmed: new Set(),
      attempts: 0,
      firstTrialCapture: null,
      prompted: false,
      motorSlips: 0,
      itemStartTs: 0,
      lockedOut: false,
      waitingAdvance: false
    };

    document.getElementById('student-player-view')?.classList.remove('hidden');
    renderCurrentItem(false);
  }

  function renderProgress() {
    const track = document.getElementById('player-progress-track');
    if (!track || !session) return;
    track.classList.toggle('hidden', !session.showProgress);
    if (!session.showProgress) return;
    track.innerHTML = session.items
      .map((_, i) => {
        const cls = i < session.index ? 'done' : i === session.index ? 'current' : '';
        return `<span class="progress-dot ${cls}"></span>`;
      })
      .join('');
  }

  function renderCurrentItem(isRepeat) {
    clearAllTimers();
    if (!session) return;
    const item = session.items[session.index];
    if (!item) return finishSession(true);

    if (!isRepeat) {
      session.motorSlips = 0;
      session.prompted = false;
    }
    session.choices = session.shuffleCards || isRepeat ? shuffle(item.choices) : [...item.choices];
    session.dimmed = new Set();
    session.attempts = 0;
    session.firstTrialCapture = null;
    session.waitingAdvance = false;
    session.lockedOut = false;
    session.itemStartTs = performance.now();

    // Topbar indicators
    const codeEl = document.getElementById('player-item-code');
    if (codeEl) codeEl.textContent = item.code || 'k4';
    document.getElementById('badge-prompted')?.classList.toggle('hidden', !session.prompted);
    document.getElementById('badge-lockout')?.classList.add('hidden');
    document.getElementById('player-advance-bar')?.classList.add('hidden');

    // Prompt Area (hidden for pure Teacher Read-Aloud Key Code items)
    const promptArea = document.getElementById('player-prompt-area');
    if (promptArea) {
      if (item.promptImageData) {
        promptArea.innerHTML = `<img src="${item.promptImageData}" alt="Prompt visual" />`;
        promptArea.classList.remove('hidden');
      } else if (item.promptText) {
        const isPassage = item.promptText.length > 36;
        promptArea.innerHTML = `<div style="${isPassage ? 'font-size:clamp(1.25rem,2.4vw,1.9rem);line-height:1.45;font-weight:600;' : ''}">${escapeHtml(item.promptText)}</div>`;
        promptArea.classList.remove('hidden');
      } else {
        promptArea.innerHTML = '';
        promptArea.classList.add('hidden');
      }
    }

    // Field of 3 Choice Cards
    const grid = document.getElementById('player-choice-grid');
    const inputMode = session.profile.accessConfig?.inputMode || 'direct_touch';
    const isDwell = inputMode === 'eye_gaze_dwell';
    const isDirect = inputMode === 'direct_touch';
    const touchTrigger = session.profile.accessConfig?.touchTrigger || 'on_release';

    if (grid) {
      grid.innerHTML = session.choices
        .map((c, idx) => {
          // Picture choices hide text labels to prevent word-matching shortcuts
          const inner = c.imageData
            ? `<img src="${c.imageData}" alt="${escapeHtml(c.label)}" class="choice-card-img" />`
            : `<span class="choice-card-label">${escapeHtml(c.label)}</span>`;
          const dwellSvg = isDwell
            ? `<svg class="dwell-ring-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <rect class="dwell-ring-rect" x="3" y="3" width="94" height="94" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" />
               </svg>`
            : '';
          return `<button type="button" class="choice-card" data-idx="${idx}">${dwellSvg}${inner}</button>`;
        })
        .join('');

      grid.querySelectorAll('.choice-card').forEach(card => {
        const idx = Number(card.dataset.idx);
        if (isDwell) {
          card.addEventListener('pointerenter', () => startDwell(idx));
          card.addEventListener('pointerleave', () => pauseDwell(idx));
          // Still allow teacher/student direct tap fallback
          card.addEventListener('click', () => handleSelection(idx, false));
        } else if (isDirect) {
          if (touchTrigger === 'on_press') {
            card.addEventListener('pointerdown', e => { e.preventDefault(); handleSelection(idx, false); });
          } else {
            // Genuine Lift-to-Select: registers whichever card sits under the finger on release
            card.addEventListener('pointerup', e => {
              const targetCard = document.elementFromPoint(e.clientX, e.clientY)?.closest('.choice-card');
              if (targetCard) handleSelection(Number(targetCard.dataset.idx), false);
            });
          }
        } else {
          // Switch scanning modes still allow teacher touch fallback
          card.addEventListener('click', () => handleSelection(idx, false));
        }
      });
    }

    renderProgress();
    startScanningIfNeeded();
  }

  /* -------------------- CHOICE EVALUATION & PRACTICE SCAFFOLDING -------------------- */
  function handleSelection(cardIdx, viaPartnerHotkey) {
    if (!session || session.waitingAdvance || isModalOpen()) return;
    if (session.lockedOut && !viaPartnerHotkey) return;
    if (session.dimmed.has(cardIdx)) return;

    const item = session.items[session.index];
    const choice = session.choices[cardIdx];
    if (!choice) return;

    cancelDwell(true);
    session.attempts++;
    if (session.attempts === 1) {
      session.firstTrialCapture = {
        selectedLabel: choice.label,
        isCorrectFirstTouch: Boolean(choice.isTarget),
        errorTag: choice.isTarget ? null : choice.errorTag || 'orthographic_near_miss',
        selectedPositionIndex: cardIdx,
        latencyMs: Math.max(100, Math.round(performance.now() - session.itemStartTs))
      };
    }

    const cardEl = document.querySelector(`#player-choice-grid .choice-card[data-idx="${cardIdx}"]`);

    if (session.runMode === 'assessment') {
      commitTrial(item);
      afterItemResolved();
      return;
    }

    // Practice Mode: Dim wrong choices + Green border highlight after 2 misses
    if (choice.isTarget) {
      cardEl?.classList.add('card-hint-correct');
      commitTrial(item);
      afterItemResolved();
    } else {
      session.dimmed.add(cardIdx);
      cardEl?.classList.add('card-dimmed');
      cardEl?.classList.remove('card-scan-focus');

      if (session.dimmed.size >= 2) {
        const targetIdx = session.choices.findIndex(c => c.isTarget);
        const targetEl = document.querySelector(`#player-choice-grid .choice-card[data-idx="${targetIdx}"]`);
        targetEl?.classList.add('card-hint-correct');
      }
      if (!viaPartnerHotkey) triggerLockout();
      startScanningIfNeeded();
    }
  }

  function commitTrial(item) {
    const target = item.choices.find(c => c.isTarget);
    const cap = session.firstTrialCapture || {};
    session.trials.push({
      itemCode: item.code,
      stageId: session.lesson.lessonMeta?.stageId || 'custom',
      taskType: item.taskType,
      targetLabel: target?.label || '?',
      selectedLabel: cap.selectedLabel || '?',
      isCorrectFirstTouch: Boolean(cap.isCorrectFirstTouch),
      attemptCount: session.attempts,
      errorTag: cap.errorTag || null,
      prompted: session.prompted,
      motorSlips: session.motorSlips,
      selectedPositionIndex: cap.selectedPositionIndex ?? 0,
      latencyMs: cap.latencyMs ?? 0
    });
  }

  function afterItemResolved() {
    clearInterval(timers.scan);
    timers.scan = null;
    cancelDwell(true);
    session.waitingAdvance = true;

    const advMode = session.profile.pacingConfig?.advanceMode || 'teacher_manual';
    const isLast = session.index >= session.items.length - 1;

    if (advMode === 'teacher_manual') {
      const bar = document.getElementById('player-advance-bar');
      const btn = document.getElementById('btn-player-next');
      if (btn) btn.textContent = isLast ? 'Finish Session (Space)' : 'Next Item (Space)';
      bar?.classList.remove('hidden');
    } else {
      const delay = session.runMode === 'assessment' ? 650 : Number(session.profile.pacingConfig?.autoAdvanceDelayMs) || 1500;
      document.getElementById('badge-lockout')?.classList.remove('hidden');
      timers.advance = setTimeout(advanceItem, delay);
    }
  }

  function advanceItem() {
    if (!session) return;
    session.index++;
    if (session.index >= session.items.length) finishSession(true);
    else renderCurrentItem(false);
  }

  /* -------------------- CLINICAL CONTROLS: REPEAT (R), PROMPT (P), EXIT -------------------- */
  function repeatMotorSlip() {
    if (!session || isModalOpen()) return;
    // If item was already resolved (e.g., Assessment slip on Manual Advance), undo the logged trial
    if (session.waitingAdvance && session.trials.length > session.index) {
      session.trials.pop();
    }
    session.motorSlips++;
    renderCurrentItem(true);
  }

  function togglePrompted() {
    if (!session || isModalOpen()) return;
    session.prompted = !session.prompted;
    document.getElementById('badge-prompted')?.classList.toggle('hidden', !session.prompted);
    if (session.waitingAdvance && session.trials[session.index]) {
      session.trials[session.index].prompted = session.prompted;
    }
  }

  function openEarlyExit() {
    if (!session) return;
    clearInterval(timers.scan);
    cancelDwell(true);
    document.getElementById('modal-early-exit')?.classList.remove('hidden');
  }

  /* -------------------- FINISH SESSION & POST-SESSION SUMMARY -------------------- */
  function finishSession(saveData) {
    clearAllTimers();
    document.getElementById('student-player-view')?.classList.add('hidden');
    document.getElementById('modal-early-exit')?.classList.add('hidden');

    if (!session) return;
    const finished = session;
    session = null;

    if (!saveData || !finished.trials.length) return;

    const record = {
      sessionId: finished.sessionId,
      studentId: finished.profile.studentId,
      studentCode: finished.profile.displayCode,
      lessonId: finished.lesson.lessonMeta?.lessonId || 'custom',
      lessonTitle: finished.lesson.lessonMeta?.title || 'Untitled Lesson',
      stageId: finished.lesson.lessonMeta?.stageId || 'custom',
      modality: finished.lesson.lessonMeta?.modality || 'hybrid_auto',
      runMode: finished.runMode,
      inputMode: finished.profile.accessConfig?.inputMode || 'direct_touch',
      completedAt: new Date().toISOString(),
      trials: finished.trials
    };

    App.Data.logSession(record);
    renderSessionSummary(record);
  }

  function renderSessionSummary(rec) {
    const body = document.getElementById('session-summary-body');
    const modal = document.getElementById('modal-session-summary');
    if (!body || !modal) return;

    const total = rec.trials.length;
    const indCorrect = rec.trials.filter(t => t.isCorrectFirstTouch && !t.prompted).length;
    const supCorrect = rec.trials.filter(t => t.isCorrectFirstTouch).length;
    const slips = rec.trials.reduce((acc, t) => acc + (t.motorSlips || 0), 0);
    const medSec = (median(rec.trials.map(t => t.latencyMs)) / 1000).toFixed(1);
    const indPct = Math.round((indCorrect / total) * 100);
    const supPct = Math.round((supCorrect / total) * 100);

    // Position bias detector
    const posCounts = [0, 0, 0];
    rec.trials.forEach(t => { if (posCounts[t.selectedPositionIndex] !== undefined) posCounts[t.selectedPositionIndex]++; });
    const posNames = ['Left', 'Center', 'Right'];
    const maxPos = Math.max(...posCounts);
    const biasNote = total >= 4 && maxPos / total >= 0.7
      ? `<div class="status-box err" style="margin-bottom:1rem;"><strong>Position Bias Alert:</strong> Student selected the <strong>${posNames[posCounts.indexOf(maxPos)]}</strong> card on ${maxPos}/${total} trials (${Math.round((maxPos / total) * 100)}%).</div>`
      : '';

    body.innerHTML = `
      <p class="hint" style="margin-top:0;"><strong>${escapeHtml(rec.studentCode)}</strong> • ${escapeHtml(rec.lessonTitle)} (${escapeHtml(rec.runMode)} mode)</p>
      ${biasNote}
      <div class="kpi-row" style="margin-bottom:1rem;">
        <div class="card kpi-card"><span class="kpi-label">Independent 1st-Touch</span><strong class="kpi-value">${indPct}%</strong><span class="kpi-sub">${indCorrect}/${total} unprompted</span></div>
        <div class="card kpi-card"><span class="kpi-label">With Prompting</span><strong class="kpi-value">${supPct}%</strong><span class="kpi-sub">${supCorrect}/${total} total</span></div>
        <div class="card kpi-card"><span class="kpi-label">Motor Slips / Speed</span><strong class="kpi-value">${medSec}s</strong><span class="kpi-sub">${slips} slip${slips === 1 ? '' : 's'} excluded</span></div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Code</th><th>Target</th><th>1st Choice</th><th>Result</th><th>Error Tag</th><th>Flags</th></tr></thead>
          <tbody>
            ${rec.trials.map(t => `
              <tr>
                <td><code>${escapeHtml(t.itemCode)}</code></td>
                <td><strong>${escapeHtml(t.targetLabel)}</strong></td>
                <td>${escapeHtml(t.selectedLabel)}</td>
                <td style="color:${t.isCorrectFirstTouch ? 'var(--success)' : 'var(--danger)'};font-weight:700;">${t.isCorrectFirstTouch ? 'Correct' : 'Missed'}</td>
                <td>${escapeHtml(t.errorTag || '—')}</td>
                <td>${t.prompted ? '<span class="micro-badge badge-amber">Prompted</span> ' : ''}${t.motorSlips ? `<span class="micro-badge badge-slate">${t.motorSlips} slip</span>` : ''}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    modal.classList.remove('hidden');
  }

  /* -------------------- KEYBOARD & UI WIRING -------------------- */
  function handleKeydown(e) {
    if (!session) return;
    if (isModalOpen()) {
      if (e.key === 'Escape') {
        document.getElementById('modal-early-exit')?.classList.add('hidden');
        startScanningIfNeeded();
      }
      return;
    }

    const key = e.key;
    if (key === 'Escape') { e.preventDefault(); openEarlyExit(); return; }
    if (key === 'r' || key === 'R') { e.preventDefault(); repeatMotorSlip(); return; }
    if (key === 'p' || key === 'P') { e.preventDefault(); togglePrompted(); return; }
    if (key === '1' || key === '2' || key === '3') { e.preventDefault(); handleSelection(Number(key) - 1, true); return; }

    if (session.waitingAdvance) {
      if (key === ' ' || key === 'ArrowRight' || key === 'Enter') { e.preventDefault(); advanceItem(); }
      return;
    }

    const mode = session.profile.accessConfig?.inputMode;
    if (mode === 'scan_1_switch' && (key === ' ' || key === 'Enter')) {
      e.preventDefault();
      if (scanState.paused) {
        document.getElementById('badge-lockout')?.classList.add('hidden');
        startScanningIfNeeded();
      } else {
        handleSelection(scanState.focusIdx, false);
      }
    } else if (mode === 'scan_2_switch') {
      if (key === ' ') { e.preventDefault(); stepScan(false); }
      else if (key === 'Enter') { e.preventDefault(); handleSelection(scanState.focusIdx, false); }
    }
  }

  function initPlayerEvents() {
    document.addEventListener('keydown', handleKeydown);
    document.getElementById('btn-player-next')?.addEventListener('click', advanceItem);
    document.getElementById('btn-player-repeat')?.addEventListener('click', repeatMotorSlip);
    document.getElementById('btn-player-prompt')?.addEventListener('click', togglePrompted);
    document.getElementById('btn-player-exit')?.addEventListener('click', openEarlyExit);

    // 3-second hold on Key Code tag opens safe early exit (for tablet-only sessions)
    const codeBtn = document.getElementById('player-item-code');
    const cancelHold = () => { clearTimeout(timers.codeHold); timers.codeHold = null; };
    codeBtn?.addEventListener('pointerdown', () => {
      cancelHold();
      timers.codeHold = setTimeout(openEarlyExit, 3000);
    });
    codeBtn?.addEventListener('pointerup', cancelHold);
    codeBtn?.addEventListener('pointerleave', cancelHold);
    codeBtn?.addEventListener('pointercancel', cancelHold);

    // Early Exit modal buttons
    document.getElementById('btn-exit-resume')?.addEventListener('click', () => {
      document.getElementById('modal-early-exit')?.classList.add('hidden');
      startScanningIfNeeded();
    });
    document.getElementById('btn-exit-discard')?.addEventListener('click', () => finishSession(false));
    document.getElementById('btn-exit-save')?.addEventListener('click', () => finishSession(true));

    document.getElementById('btn-summary-to-reports')?.addEventListener('click', () => {
      document.getElementById('modal-session-summary')?.classList.add('hidden');
      App.switchTab('reports');
    });
  }

  /* -------------------- PUBLIC API -------------------- */
  App.Player = { startSession, finishSession };
  App.modulesLoaded.player = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPlayerEvents);
  else initPlayerEvents();
})();
