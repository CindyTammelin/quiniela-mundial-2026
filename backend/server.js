const express = require('express');
const cors    = require('cors');
const { Resend } = require('resend');

const app    = express();
const resend = new Resend(process.env.RESEND_API_KEY || 're_eNq8DwBP_GTT4vTXN8RUpLUkT44xsVRpC');

// ── Config ────────────────────────────────────────────────
const FROM_EMAIL   = process.env.FROM_EMAIL   || 'onboarding@resend.dev';
const FROM_NAME    = process.env.FROM_NAME    || 'Quiniela Mundial 2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://cindytammelin.github.io/quiniela-mundial-2026';

// ── Middleware ────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '2mb' }));

// ── Health check ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Quiniela Mundial 2026 Backend', time: new Date().toISOString() });
});

// ── Helper: build leaderboard HTML table ──────────────────
function buildLeaderboardHTML(players) {
  const sorted = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
  const medals = ['🥇', '🥈', '🥉'];
  const rows = sorted.slice(0, 10).map((p, i) => {
    const picks = Object.keys(p.picks || {}).filter(k => p.picks[k]?.type).length;
    return `
      <tr style="background:${i % 2 === 0 ? '#f8faff' : '#ffffff'}">
        <td style="padding:10px 14px;font-size:1.1rem">${medals[i] || '#' + (i + 1)}</td>
        <td style="padding:10px 14px;font-weight:700;color:#0a1628">${p.name}</td>
        <td style="padding:10px 14px;color:#4a5f8a">${picks} picks</td>
        <td style="padding:10px 14px;font-family:monospace;font-size:1.1rem;font-weight:700;color:#0d2e6e">${p.points || 0} pts</td>
      </tr>`;
  }).join('');
  return `
    <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;border:1px solid #c8d4ee">
      <thead>
        <tr style="background:#0d2e6e;color:#fff">
          <th style="padding:10px 14px;text-align:left">#</th>
          <th style="padding:10px 14px;text-align:left">Jugador</th>
          <th style="padding:10px 14px;text-align:left">Picks</th>
          <th style="padding:10px 14px;text-align:left">Puntos</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Helper: build results HTML ────────────────────────────
function buildResultsHTML(results, matches) {
  const withResults = matches.filter(m => results[m.id]);
  if (!withResults.length) return '<p style="color:#4a5f8a">No hay resultados publicados aún.</p>';
  return withResults.map(m => {
    const r = results[m.id];
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8faff;border-radius:8px;margin-bottom:8px;border:1px solid #c8d4ee">
      <span style="font-weight:700">${m.hf || ''} ${m.home}</span>
      <span style="font-family:monospace;font-size:1.2rem;font-weight:700;color:#0d2e6e;padding:4px 16px;background:#eef2fb;border-radius:6px">${r.home} – ${r.away}</span>
      <span style="font-weight:700">${m.away} ${m.af || ''}</span>
    </div>`;
  }).join('');
}

// ── Email template ────────────────────────────────────────
function emailTemplate(title, subtitle, bodyHTML, ctaText, ctaUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2fb;font-family:'Segoe UI',system-ui,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <!-- Header -->
    <div style="background:#0d2e6e;border-radius:14px 14px 0 0;padding:28px 32px;text-align:center;border-bottom:4px solid #f5c518">
      <div style="font-size:2.5rem;margin-bottom:8px">⚽</div>
      <h1 style="color:#f5c518;margin:0;font-size:1.4rem;font-weight:700;letter-spacing:0.5px">Quiniela Mundial 2026</h1>
      <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:0.85rem">FIFA World Cup 2026</p>
    </div>
    <!-- Body -->
    <div style="background:#ffffff;padding:32px;border-left:1px solid #c8d4ee;border-right:1px solid #c8d4ee">
      <h2 style="color:#0a1628;margin:0 0 8px;font-size:1.2rem">${title}</h2>
      <p style="color:#4a5f8a;margin:0 0 24px;font-size:0.9rem">${subtitle}</p>
      ${bodyHTML}
      ${ctaText ? `
      <div style="text-align:center;margin:28px 0 8px">
        <a href="${ctaUrl}" style="display:inline-block;background:#0d2e6e;color:#f5c518;padding:13px 32px;border-radius:10px;font-weight:700;font-size:0.95rem;text-decoration:none;letter-spacing:0.5px">${ctaText}</a>
      </div>` : ''}
    </div>
    <!-- Footer -->
    <div style="background:#071a44;border-radius:0 0 14px 14px;padding:18px 32px;text-align:center">
      <p style="color:rgba(255,255,255,0.5);margin:0;font-size:0.75rem">Quiniela Mundial 2026 &nbsp;·&nbsp; <a href="${ctaUrl}" style="color:#f5c518;text-decoration:none">Ver quiniela</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ── POST /api/notify-results ──────────────────────────────
// Called by admin when saving results
app.post('/api/notify-results', async (req, res) => {
  try {
    const { results, players, matches } = req.body;
    if (!players || !players.length) return res.json({ sent: 0, message: 'No players' });

    const resultsHTML    = buildResultsHTML(results || {}, matches || []);
    const leaderboardHTML = buildLeaderboardHTML(players);

    // Send individual email to each player with their score
    const emails = players.map(player => {
      const points = player.points || 0;
      const picks  = Object.keys(player.picks || {}).filter(k => player.picks[k]?.type).length;
      const sorted = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
      const pos    = sorted.findIndex(p => p.email === player.email) + 1;

      const bodyHTML = `
        <div style="background:#eef2fb;border-radius:10px;padding:20px;margin-bottom:20px;text-align:center">
          <div style="font-size:0.78rem;color:#4a5f8a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Tu posición actual</div>
          <div style="font-size:2.5rem;font-weight:700;color:#0d2e6e">#${pos}</div>
          <div style="font-size:1.1rem;font-weight:700;color:#0d2e6e;margin-top:4px">${points} puntos &nbsp;·&nbsp; ${picks} picks</div>
        </div>
        <h3 style="color:#0a1628;margin:0 0 12px;font-size:1rem">Resultados publicados</h3>
        ${resultsHTML}
        <h3 style="color:#0a1628;margin:20px 0 12px;font-size:1rem">Tabla de posiciones</h3>
        ${leaderboardHTML}`;

      return {
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to:   [player.email],
        subject: `⚽ Nuevos resultados — Estás en el puesto #${pos} con ${points} pts`,
        html: emailTemplate(
          `¡Hola ${player.name}!`,
          'Se publicaron nuevos resultados. Aquí tienes tu posición y los marcadores.',
          bodyHTML,
          'Ver mi quiniela completa',
          FRONTEND_URL
        )
      };
    });

    // Send in batches of 10 (Resend rate limit)
    let sent = 0;
    for (let i = 0; i < emails.length; i += 10) {
      const batch = emails.slice(i, i + 10);
      await Promise.all(batch.map(e => resend.emails.send(e).catch(err => console.error('Email error:', err))));
      sent += batch.length;
      if (i + 10 < emails.length) await new Promise(r => setTimeout(r, 1100));
    }

    res.json({ sent, message: `Emails sent to ${sent} players` });
  } catch (err) {
    console.error('/api/notify-results error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/send-blast ──────────────────────────────────
// Reminder or general leaderboard blast
app.post('/api/send-blast', async (req, res) => {
  try {
    const { type, players, results, matches } = req.body;
    if (!players || !players.length) return res.json({ sent: 0, message: 'No players' });

    const leaderboardHTML = buildLeaderboardHTML(players);

    const emails = players.map(player => {
      let subject, title, subtitle, bodyHTML, cta;

      if (type === 'reminder') {
        const picks = Object.keys(player.picks || {}).filter(k => player.picks[k]?.type).length;
        subject  = '⏰ Recuerda hacer tus pronósticos — Quiniela Mundial 2026';
        title    = `¡${player.name}, faltan partidos por pronosticar!`;
        subtitle = `Llevas ${picks} pick(s). ¡No te quedes sin puntos!`;
        bodyHTML = `
          <div style="background:#fff8e1;border-radius:10px;padding:20px;margin-bottom:20px;border-left:4px solid #f5c518">
            <p style="margin:0;color:#0a1628;font-size:0.95rem">El Mundial 2026 está por comenzar. Asegúrate de tener todos tus pronósticos listos antes de que arranquen los partidos.</p>
          </div>
          <h3 style="color:#0a1628;margin:0 0 12px;font-size:1rem">Tabla de posiciones actual</h3>
          ${leaderboardHTML}`;
        cta = '¡Hacer mis pronósticos ahora!';
      } else {
        // type === 'results'
        const points = player.points || 0;
        const sorted = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
        const pos    = sorted.findIndex(p => p.email === player.email) + 1;
        subject  = `🏆 Tabla de posiciones — Estás en el #${pos} con ${points} pts`;
        title    = `¡Hola ${player.name}!`;
        subtitle = `Aquí tienes la tabla de posiciones actualizada.`;
        bodyHTML = `
          <div style="background:#eef2fb;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
            <div style="font-size:0.78rem;color:#4a5f8a;text-transform:uppercase;letter-spacing:1px">Tu posición</div>
            <div style="font-size:2.5rem;font-weight:700;color:#0d2e6e">#${pos}</div>
            <div style="font-weight:700;color:#0d2e6e">${points} pts</div>
          </div>
          ${leaderboardHTML}`;
        cta = 'Ver quiniela completa';
      }

      return {
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to:      [player.email],
        subject,
        html:    emailTemplate(title, subtitle, bodyHTML, cta, FRONTEND_URL)
      };
    });

    let sent = 0;
    for (let i = 0; i < emails.length; i += 10) {
      const batch = emails.slice(i, i + 10);
      await Promise.all(batch.map(e => resend.emails.send(e).catch(err => console.error('Email error:', err))));
      sent += batch.length;
      if (i + 10 < emails.length) await new Promise(r => setTimeout(r, 1100));
    }

    res.json({ sent, message: `Blast sent to ${sent} players` });
  } catch (err) {
    console.error('/api/send-blast error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Quiniela backend running on port ${PORT}`));
