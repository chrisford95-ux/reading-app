/* ==========================================================================
   ClearRead AAC — Step 6: reports.js
   Longitudinal IEP Mastery SVG Chart, Modality Split, Error Diagnostics,
   Auto-Drafted IEP Progress Note, & Session / Raw Trial CSV Exports
   ========================================================================== */
(function () {
  const App = (window.ReadingApp = window.ReadingApp || {});

  const INPUT_LABELS = {
    direct_touch: 'Direct Touch',
    eye_gaze_dwell: 'Eye-Gaze Dwell',
    scan_1_switch: '1-Switch Auto Scan',
    scan_2_switch: '2-Switch Step Scan'
  };

  /* -------------------- HELPERS -------------------- */
  function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatTag(tag) {
    return tag ? String(tag).replace(/_/g, ' ') : '—';
  }

  function median(nums) {
    if (!nums.length) return 0;
    const s = [...nums].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
  }

  function csvCell(val) {
    const s = String(val ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function downloadCsv(rows, filename) {
    const text = rows.map(r => r.map(csvCell).join(',')).join('\n');
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* -------------------- DATA FILTERING & METRICS -------------------- */
  function getFilteredData() {
    const profile = App.Data?.getActiveProfile?.();
    const allSessions = App.Data?.getSessionsForActive?.() || [];
    const stageFilter = document.getElementById('report-filter-stage')?.value || 'all';
    const modFilter = document.getElementById('report-filter-modality')?.value || 'all';
    const daysVal = document.getElementById('report-filter-days')?.value || '90';
    const cutoff = daysVal === 'all' ? 0 : Date.now() - Number(daysVal) * 86400000;

    // Stage + Date filtered sessions (used for modality comparison split)
    const baseSessions = allSessions
      .filter(s => {
        const ts = new Date(s.completedAt || 0).getTime();
        if (cutoff && ts < cutoff) return false;
        if (stageFilter !== 'all' && s.stageId !== stageFilter) return false;
        return Array.isArray(s.trials) && s.trials.length > 0;
      })
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));

    // Apply modality trial filter
    const sessions = [];
    baseSessions.forEach(s => {
      const trials = s.trials.filter(t => {
        if (modFilter === 'all') return true;
        const isSpoken = t.taskType === 'teacher_spoken_to_word';
        return modFilter === 'teacher_spoken_to_word' ? isSpoken : !isSpoken;
      });
      if (trials.length) sessions.push({ ...s, trials });
    });

    return { profile, baseSessions, sessions, stageFilter, modFilter };
  }

  function summarizeTrials(trials) {
    const total = trials.length;
    if (!total) {
      return { total: 0, indCorrect: 0, promptedCorrect: 0, supCorrect: 0, indPct: 0, supPct: 0, slips: 0, medLatency: 0, errors: [] };
    }
    let indCorrect = 0, promptedCorrect = 0, supCorrect = 0, slips = 0;
    const latencies = [];
    const errMap = new Map();

    trials.forEach(t => {
      if (t.isCorrectFirstTouch) {
        supCorrect++;
        if (t.prompted) promptedCorrect++;
        else indCorrect++;
      } else {
        const tag = t.errorTag || 'orthographic_near_miss';
        if (!errMap.has(tag)) errMap.set(tag, { tag, count: 0, examples: [] });
        const rec = errMap.get(tag);
        rec.count++;
        if (rec.examples.length < 3) {
          const ex = `'${t.selectedLabel}' for '${t.targetLabel}'`;
          if (!rec.examples.includes(ex)) rec.examples.push(ex);
        }
      }
      slips += Number(t.motorSlips) || 0;
      if (Number(t.latencyMs) > 0) latencies.push(Number(t.latencyMs));
    });

    const errors = [...errMap.values()].sort((a, b) => b.count - a.count);
    return {
      total,
      indCorrect,
      promptedCorrect,
      supCorrect,
      indPct: Math.round((indCorrect / total) * 1000) / 10,
      supPct: Math.round((supCorrect / total) * 1000) / 10,
      slips,
      medLatency: median(latencies),
      errors
    };
  }

  /* -------------------- SVG MASTERY TRAJECTORY CHART -------------------- */
  function renderTrajectoryChart(sessions, goalPct) {
    const box = document.getElementById('report-trajectory-chart');
    if (!box) return;
    if (!sessions.length) {
      box.innerHTML = '<p class="hint">Complete at least one session for this student to plot mastery over time.</p>';
      return;
    }

    const W = 580, H = 225, padL = 42, padR = 18, padT = 26, padB = 34;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const yFor = pct => padT + plotH - (Math.max(0, Math.min(100, pct)) / 100) * plotH;
    const xFor = i => (sessions.length === 1 ? padL + plotW / 2 : padL + (i / (sessions.length - 1)) * plotW);

    const pts = sessions.map((s, i) => {
      const m = summarizeTrials(s.trials);
      const dt = new Date(s.completedAt);
      const label = `${dt.getMonth() + 1}/${dt.getDate()}`;
      return { x: xFor(i), yInd: yFor(m.indPct), ySup: yFor(m.supPct), indPct: m.indPct, supPct: m.supPct, label, title: s.lessonTitle };
    });

    const gridLines = [0, 25, 50, 75, 100].map(v => {
      const y = yFor(v);
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--border)" stroke-width="1" opacity="0.6"/>
              <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--text-muted)">${v}%</text>`;
    }).join('');

    const goalY = yFor(goalPct);
    const indPath = pts.map(p => `${p.x.toFixed(1)},${p.yInd.toFixed(1)}`).join(' ');
    const supPath = pts.map(p => `${p.x.toFixed(1)},${p.ySup.toFixed(1)}`).join(' ');
    const labelStep = Math.max(1, Math.ceil(pts.length / 8));

    const dotsAndLabels = pts.map((p, i) => `
      <circle cx="${p.x}" cy="${p.ySup}" r="3.5" fill="var(--warning)" opacity="0.85"><title>${escapeHtml(p.title)} (${p.label}) — With Prompting: ${p.supPct}%</title></circle>
      <circle cx="${p.x}" cy="${p.yInd}" r="5.5" fill="var(--primary)" stroke="var(--surface)" stroke-width="2"><title>${escapeHtml(p.title)} (${p.label}) — Independent: ${p.indPct}%</title></circle>
      ${i % labelStep === 0 || i === pts.length - 1 ? `<text x="${p.x}" y="${H - 10}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${p.label}</text>` : ''}
    `).join('');

    box.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-height:250px;display:block;" role="img" aria-label="Mastery trajectory chart">
        <g font-size="11" fill="var(--text-muted)">
          <circle cx="${padL + 6}" cy="11" r="4" fill="var(--primary)"/><text x="${padL + 15}" y="15">Independent</text>
          <line x1="${padL + 95}" y1="11" x2="${padL + 115}" y2="11" stroke="var(--warning)" stroke-width="2.5" stroke-dasharray="4 3"/><text x="${padL + 121}" y="15">With Prompting</text>
          <line x1="${padL + 225}" y1="11" x2="${padL + 245}" y2="11" stroke="var(--success)" stroke-width="2" stroke-dasharray="6 4"/><text x="${padL + 251}" y="15">IEP Goal (${goalPct}%)</text>
        </g>
        ${gridLines}
        <line x1="${padL}" y1="${goalY}" x2="${W - padR}" y2="${goalY}" stroke="var(--success)" stroke-width="2" stroke-dasharray="6 4"/>
        ${pts.length > 1 ? `<polyline fill="none" stroke="var(--warning)" stroke-width="2.2" stroke-dasharray="5 4" points="${supPath}"/>` : ''}
        ${pts.length > 1 ? `<polyline fill="none" stroke="var(--primary)" stroke-width="3" points="${indPath}"/>` : ''}
        ${dotsAndLabels}
      </svg>`;
  }

  /* -------------------- MODALITY SPLIT & ERROR PATTERNS -------------------- */
  function renderModalityAndErrors(baseSessions, filteredTrials) {
    const modEl = document.getElementById('report-modality-split');
    const errEl = document.getElementById('report-error-breakdown');

    if (modEl) {
      const allBaseTrials = baseSessions.flatMap(s => s.trials);
      const spoken = summarizeTrials(allBaseTrials.filter(t => t.taskType === 'teacher_spoken_to_word'));
      const visual = summarizeTrials(allBaseTrials.filter(t => t.taskType !== 'teacher_spoken_to_word'));

      const barRow = (label, stats, color) => `
        <div style="margin-bottom:0.8rem;">
          <div style="display:flex;justify-content:space-between;font-size:0.88rem;margin-bottom:0.25rem;">
            <strong>${label}</strong>
            <span>${stats.total ? `${stats.indPct}% (${stats.indCorrect}/${stats.total})` : 'No trials yet'}</span>
          </div>
          <div style="height:12px;background:var(--surface-alt);border-radius:999px;overflow:hidden;border:1px solid var(--border);">
            <div style="height:100%;width:${stats.total ? stats.indPct : 0}%;background:${color};transition:width 0.3s;"></div>
          </div>
        </div>`;

      modEl.innerHTML =
        barRow('Teacher Read-Aloud (Key Codes)', spoken, 'var(--primary)') +
        barRow('Silent Visual Reading (Pictures / Passages)', visual, 'var(--success)');
    }

    if (errEl) {
      const stats = summarizeTrials(filteredTrials);
      const missedTotal = stats.total - stats.supCorrect;
      if (!stats.errors.length) {
        errEl.innerHTML = '<p class="hint" style="margin:0;">No decoding errors logged in this filter window.</p>';
      } else {
        errEl.innerHTML = `<div style="font-size:0.82rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.5rem;">Top Error Patterns (${missedTotal} missed trial${missedTotal === 1 ? '' : 's'})</div>` +
          stats.errors.slice(0, 4).map(e => {
            const share = Math.round((e.count / Math.max(1, missedTotal)) * 100);
            return `
              <div style="margin-bottom:0.55rem;font-size:0.88rem;">
                <div style="display:flex;justify-content:space-between;">
                  <strong>${escapeHtml(formatTag(e.tag))}</strong>
                  <span>${e.count} (${share}%)</span>
                </div>
                <div class="hint" style="margin:0;font-size:0.78rem;">Examples: ${escapeHtml(e.examples.join(', '))}</div>
              </div>`;
          }).join('');
      }
    }
  }

  /* -------------------- AUTO-DRAFTED IEP NARRATIVE -------------------- */
  function renderNarrative(profile, sessions, stats, stageFilter) {
    const el = document.getElementById('report-iep-narrative');
    if (!el) return;
    if (!sessions.length) {
      el.textContent = `No completed sessions logged for Student ${profile?.displayCode || ''} matching the current filters.`;
      return;
    }

    const stageLabel = stageFilter === 'all' ? 'All Assessed Phonics Stages' : (App.STAGE_META?.[stageFilter]?.name || stageFilter);
    const startDate = sessions[0].completedAt.slice(0, 10);
    const endDate = sessions[sessions.length - 1].completedAt.slice(0, 10);
    const inputLabel = INPUT_LABELS[profile?.accessConfig?.inputMode] || 'Direct Touch';
    const goalPct = profile?.targetMasteryPct ?? 80;

    const sessionPcts = sessions.map(s => summarizeTrials(s.trials).indPct);
    const minPct = Math.min(...sessionPcts);
    const maxPct = Math.max(...sessionPcts);
    const dateSpan = startDate === endDate ? `on ${endDate}` : `between ${startDate} and ${endDate}`;

    const lines = [
      `IEP Progress Summary — Student ${profile?.displayCode || 'STU'} (${stageLabel})`,
      `Across ${sessions.length} session${sessions.length === 1 ? '' : 's'} (${stats.total} trials) ${dateSpan} using ${inputLabel}, Student ${profile?.displayCode} achieved ${stats.indPct}% independent first-touch accuracy${sessions.length > 1 ? ` (range: ${minPct}%–${maxPct}%)` : ''} and ${stats.supPct}% accuracy with teacher prompting against an IEP goal benchmark of ${goalPct}%.`
    ];

    if (stats.errors.length) {
      const top = stats.errors[0];
      const missedTotal = stats.total - stats.supCorrect;
      const share = Math.round((top.count / Math.max(1, missedTotal)) * 100);
      lines.push(`• Primary Error Pattern: ${top.count} of ${missedTotal} missed trials (${share}%) involved ${formatTag(top.tag)} (e.g., selecting ${top.examples.join('; ')}).`);
    } else {
      lines.push(`• Decoding Accuracy: Student demonstrated 100% first-touch accuracy with zero decoding errors in this window.`);
    }

    if (sessions.length >= 2) {
      const firstMed = (summarizeTrials(sessions[0].trials).medLatency / 1000).toFixed(1);
      const lastMed = (summarizeTrials(sessions[sessions.length - 1].trials).medLatency / 1000).toFixed(1);
      lines.push(`• Access & Pacing: Median response latency shifted from ${firstMed}s to ${lastMed}s (${stats.slips} motor slip${stats.slips === 1 ? '' : 's'} excluded via repeat control).`);
    } else {
      lines.push(`• Access & Pacing: Median response latency was ${(stats.medLatency / 1000).toFixed(1)}s (${stats.slips} motor slip${stats.slips === 1 ? '' : 's'} excluded).`);
    }

    el.textContent = lines.join('\n');
  }

  /* -------------------- SESSION HISTORY TABLE -------------------- */
  function renderSessionsTable(sessions) {
    const tbody = document.getElementById('report-sessions-table');
    if (!tbody) return;
    if (!sessions.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="hint">No sessions recorded for this filter window.</td></tr>';
      return;
    }

    tbody.innerHTML = [...sessions].reverse().map(s => {
      const m = summarizeTrials(s.trials);
      const topErr = m.errors[0] ? `${formatTag(m.errors[0].tag)} (${m.errors[0].count})` : 'None';
      return `
        <tr>
          <td>${escapeHtml(s.completedAt.slice(0, 10))}</td>
          <td><strong>${escapeHtml(s.lessonTitle)}</strong></td>
          <td>${escapeHtml(App.STAGE_META?.[s.stageId]?.short || s.stageId)}</td>
          <td>${escapeHtml(INPUT_LABELS[s.inputMode] || s.inputMode)}</td>
          <td style="font-weight:700;color:var(--primary);">${m.indPct}% (${m.indCorrect}/${m.total})</td>
          <td>${m.supPct}%</td>
          <td>${m.slips}</td>
          <td>${escapeHtml(topErr)}</td>
        </tr>`;
    }).join('');
  }

  /* -------------------- MAIN DASHBOARD RENDER -------------------- */
  function renderDashboard() {
    const { profile, baseSessions, sessions, stageFilter } = getFilteredData();
    const allTrials = sessions.flatMap(s => s.trials);
    const stats = summarizeTrials(allTrials);
    const goalPct = profile?.targetMasteryPct ?? 80;

    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setT('kpi-independent-acc', stats.total ? `${stats.indPct}%` : '--%');
    setT('kpi-independent-sub', `${stats.indCorrect} / ${stats.total} unprompted trials`);
    setT('kpi-supported-acc', stats.total ? `${stats.supPct}%` : '--%');
    setT('kpi-supported-sub', `${stats.supCorrect} / ${stats.total} (incl. ${stats.promptedCorrect} prompted)`);
    setT('kpi-motor-slips', String(stats.slips));
    setT('kpi-median-latency', stats.medLatency ? `${(stats.medLatency / 1000).toFixed(1)}s` : '--s');

    renderTrajectoryChart(sessions, goalPct);
    renderModalityAndErrors(baseSessions, allTrials);
    renderNarrative(profile, sessions, stats, stageFilter);
    renderSessionsTable(sessions);
  }

  /* -------------------- CSV EXPORTS -------------------- */
  function exportSessionCsv() {
    const { profile, sessions } = getFilteredData();
    if (!sessions.length) return App.showError('No sessions available to export in the current filter window.');

    const rows = [[
      'student_code', 'session_date', 'lesson_title', 'stage_id', 'run_mode', 'input_mode',
      'total_items', 'independent_correct', 'prompted_correct', 'independent_pct',
      'supported_pct', 'motor_slips', 'median_latency_ms', 'top_error_tag', 'top_error_count'
    ]];

    sessions.forEach(s => {
      const m = summarizeTrials(s.trials);
      rows.push([
        s.studentCode || profile?.displayCode || '',
        s.completedAt.slice(0, 10),
        s.lessonTitle,
        s.stageId,
        s.runMode,
        s.inputMode,
        m.total,
        m.indCorrect,
        m.promptedCorrect,
        m.indPct,
        m.supPct,
        m.slips,
        m.medLatency,
        m.errors[0]?.tag || '',
        m.errors[0]?.count || 0
      ]);
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(rows, `clearread_sessions_${profile?.displayCode || 'student'}_${stamp}.csv`);
  }

  function exportTrialCsv() {
    const { profile, sessions } = getFilteredData();
    if (!sessions.length) return App.showError('No trials available to export in the current filter window.');

    const rows = [[
      'student_code', 'session_date', 'lesson_title', 'stage_id', 'run_mode', 'input_mode',
      'item_code', 'task_type', 'target_label', 'selected_label', 'first_touch_correct',
      'attempt_count', 'error_tag', 'prompted', 'motor_slips', 'position_index', 'latency_ms'
    ]];

    sessions.forEach(s => {
      s.trials.forEach(t => {
        rows.push([
          s.studentCode || profile?.displayCode || '',
          s.completedAt.slice(0, 10),
          s.lessonTitle,
          t.stageId || s.stageId,
          s.runMode,
          s.inputMode,
          t.itemCode,
          t.taskType,
          t.targetLabel,
          t.selectedLabel,
          t.isCorrectFirstTouch,
          t.attemptCount,
          t.errorTag || '',
          Boolean(t.prompted),
          t.motorSlips || 0,
          t.selectedPositionIndex,
          t.latencyMs
        ]);
      });
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(rows, `clearread_trials_${profile?.displayCode || 'student'}_${stamp}.csv`);
  }

  /* -------------------- DOM WIRING -------------------- */
  function initReports() {
    ['report-filter-stage', 'report-filter-modality', 'report-filter-days'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', renderDashboard);
    });
    document.getElementById('btn-export-session-csv')?.addEventListener('click', exportSessionCsv);
    document.getElementById('btn-export-trial-csv')?.addEventListener('click', exportTrialCsv);
    document.getElementById('btn-print-report')?.addEventListener('click', () => window.print());
    document.getElementById('btn-copy-narrative')?.addEventListener('click', () => {
      const text = document.getElementById('report-iep-narrative')?.textContent || '';
      navigator.clipboard.writeText(text);
      const btn = document.getElementById('btn-copy-narrative');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1400);
      }
    });
    renderDashboard();
  }

  App.Reports = { renderDashboard, exportSessionCsv, exportTrialCsv };
  App.modulesLoaded.reports = true;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initReports);
  else initReports();
})();
