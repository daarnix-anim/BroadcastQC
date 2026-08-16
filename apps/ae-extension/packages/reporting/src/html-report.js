/**
 * HTML QC Report Generator for Broadcast QC
 * Creates beautiful, self-contained, printable quality inspection reports.
 */

export class HTMLReportGenerator {
  /**
   * Генерация HTML страницы отчета
   * @param {Object} qcReport - полный отчет от BroadcastQCCore
   */
  static generate(qcReport) {
    if (!qcReport) return '<html><body>Нет данных отчета</body></html>';

    const comp = qcReport.composition || {};
    const sum = qcReport.summary || {};
    const issues = qcReport.issues || [];
    const dateStr = new Date(qcReport.timestamp || Date.now()).toLocaleString('ru-RU');

    let statusBadge = '<span class="badge badge-success">✓ ОТК ПРОЙДЕН</span>';
    if (sum.status === 'error') {
      statusBadge = '<span class="badge badge-error">✖ ОБНАРУЖЕНЫ ОШИБКИ</span>';
    } else if (sum.status === 'warning') {
      statusBadge = '<span class="badge badge-warning">⚠ ЕСТЬ ПРЕДУПРЕЖДЕНИЯ</span>';
    }

    const rows = issues.map((iss, i) => {
      let icon = '🔴';
      let sevClass = 'sev-error';
      if (iss.severity === 'warning') { icon = '🟡'; sevClass = 'sev-warning'; }
      if (iss.severity === 'info') { icon = 'ℹ️'; sevClass = 'sev-info'; }

      let categoryName = 'Орфография';
      if (iss.category === 'safe-zone') categoryName = 'Safe Zone';
      if (iss.category === 'typography') categoryName = 'Типографика';
      if (iss.category === 'reading-speed') categoryName = 'Скорость чтения';
      if (iss.category === 'health') categoryName = 'Аудит проекта';
      if (iss.category === 'ai-logic') categoryName = 'AI Анализ';

      return `
        <tr>
          <td>${i + 1}</td>
          <td><span class="${sevClass}">${icon} ${categoryName}</span></td>
          <td><b>${escapeHTML(iss.layerName)}</b></td>
          <td><code>${escapeHTML(iss.timecode)}</code></td>
          <td>${escapeHTML(iss.message)}</td>
          <td>${iss.suggestion ? `<code>${escapeHTML(iss.suggestion)}</code>` : '—'}</td>
        </tr>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Broadcast QC Отчёт — ${escapeHTML(comp.name || 'Композиция')}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --error: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
    }
    @media print {
      body { background: #fff !important; color: #000 !important; }
      .card, .stat-box { border: 1px solid #ccc !important; background: #fff !important; color: #000 !important; }
      th, td { border-bottom: 1px solid #ddd !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 30px 20px;
      line-height: 1.5;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .title-area h1 { margin: 0 0 6px; font-size: 24px; font-weight: 800; }
    .subtitle { color: var(--text-muted); font-size: 13px; }
    .badge {
      font-size: 13px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .badge-success { background: rgba(16, 185, 129, 0.2); color: var(--success); border: 1px solid var(--success); }
    .badge-warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); border: 1px solid var(--warning); }
    .badge-error { background: rgba(239, 68, 68, 0.2); color: var(--error); border: 1px solid var(--error); }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-box {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .stat-val { font-size: 24px; font-weight: 800; }
    .stat-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-top: 4px; }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--text-muted); font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    code { font-family: monospace; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: var(--accent); }
    .sev-error { color: var(--error); font-weight: 600; }
    .sev-warning { color: var(--warning); font-weight: 600; }
    .sev-info { color: var(--accent); font-weight: 600; }
    .footer { text-align: center; font-size: 11px; color: var(--text-muted); margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-area">
        <h1>Broadcast QC — Паспорт Контроля Качества</h1>
        <div class="subtitle">Композиция: <b>${escapeHTML(comp.name || 'Main')}</b> (${comp.width || 1920}x${comp.height || 1080} @ ${comp.frameRate || 30}fps, ${comp.duration || 0}s) • ${dateStr}</div>
      </div>
      <div>${statusBadge}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-val" style="color: var(--success);">${sum.totalLayersChecked || 0}</div>
        <div class="stat-label">Слоев проверено</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color: var(--error);">${sum.spellingErrors || 0}</div>
        <div class="stat-label">Ошибок текста</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color: var(--error);">${sum.safeZoneErrors || 0}</div>
        <div class="stat-label">Safe Zone выходов</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color: var(--warning);">${sum.totalWarnings || 0}</div>
        <div class="stat-label">Предупреждений</div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top: 0; margin-bottom: 16px;">Список замечаний и рекомендаций (${issues.length})</h3>
      ${issues.length === 0 ? '<div style="color: var(--success); padding: 10px 0;">✓ Замечаний не обнаружено. Все проверенные параметры соответствуют стандартам.</div>' : `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Категория</th>
            <th>Слой</th>
            <th>Таймкод</th>
            <th>Описание</th>
            <th>Рекомендация</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      `}
    </div>

    <div class="footer">
      Сгенерировано автоматически модулем <b>Broadcast QC 2.0</b> для Adobe After Effects 2026.
    </div>
  </div>
</body>
</html>`;
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
