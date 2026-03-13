// utils/pdfExport.ts

import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Event } from '../database/db';

// ─── Colores por urgencia ─────────────────────────────────────────────────────

const URGENCY_COLOR: Record<string, string> = {
  low:    '#4CAF50',
  medium: '#FF9800',
  high:   '#F44336',
};

const URGENCY_LABEL: Record<string, Record<string, string>> = {
  low:    { es: 'Baja',   en: 'Low',    pl: 'Niski'   },
  medium: { es: 'Media',  en: 'Medium', pl: 'Średni'  },
  high:   { es: 'Alta',   en: 'High',   pl: 'Wysoki'  },
};

// ─── Traducciones mínimas para el PDF ────────────────────────────────────────

const PDF_STRINGS: Record<string, Record<string, string>> = {
  title:     { es: 'MRP Agenda — Exportación',  en: 'MRP Agenda — Export',      pl: 'MRP Agenda — Eksport'       },
  generated: { es: 'Generado el',               en: 'Generated on',              pl: 'Wygenerowano'               },
  client:    { es: 'Cliente',                   en: 'Client',                    pl: 'Klient'                     },
  urgency:   { es: 'Urgencia',                  en: 'Urgency',                   pl: 'Pilność'                    },
  notes:     { es: 'Notas',                     en: 'Notes',                     pl: 'Notatki'                    },
  completed: { es: 'Completado',                en: 'Completed',                 pl: 'Ukończono'                  },
  noEvents:  { es: 'No hay eventos.',           en: 'No events.',                pl: 'Brak wydarzeń.'             },
  emailSubject: { es: 'Mi agenda — MRP Agenda', en: 'My agenda — MRP Agenda',    pl: 'Mój terminarz — MRP Agenda' },
};

function s(key: string, locale: string): string {
  return PDF_STRINGS[key]?.[locale] ?? PDF_STRINGS[key]?.['es'] ?? key;
}

// ─── Generador de HTML ────────────────────────────────────────────────────────

export function buildHTML(events: Event[], locale: string): string {
  const now = new Date().toLocaleDateString(
    locale === 'pl' ? 'pl-PL' : locale === 'en' ? 'en-GB' : 'es-ES',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const rows = events.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#888;padding:24px;">${s('noEvents', locale)}</td></tr>`
    : events.map((evt) => {
        const urgColor = evt.urgency ? URGENCY_COLOR[evt.urgency] ?? '#888' : '#888';
        const urgLabel = evt.urgency
          ? (URGENCY_LABEL[evt.urgency]?.[locale] ?? evt.urgency)
          : '—';
        const completed = Boolean(evt.completed);

        return `
          <tr style="${completed ? 'opacity:0.55;' : ''}">
            <td style="border-left:4px solid ${urgColor}; padding-left:10px;">
              <span style="${completed ? 'text-decoration:line-through;color:#888;' : 'font-weight:600;'}">${evt.title}</span>
            </td>
            <td>${evt.date}${evt.time ? `<br/><small style="color:#888">${evt.time}</small>` : ''}</td>
            <td>${evt.client || '—'}</td>
            <td><span style="color:${urgColor};font-weight:600;">${urgLabel}</span></td>
            <td>${evt.extra_info || '—'}</td>
          </tr>`;
      }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #fff; color: #111; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #6C63FF; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #888; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: #6C63FF; color: #fff; }
    thead th { padding: 10px 12px; text-align: left; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f7f7f7; }
    tbody td { padding: 10px 12px; vertical-align: top; border-bottom: 1px solid #eee; }
    footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; }
  </style>
</head>
<body>
  <h1>${s('title', locale)}</h1>
  <p class="meta">${s('generated', locale)}: ${now} · ${events.length} evento${events.length !== 1 ? 's' : ''}</p>
  <table>
    <thead>
      <tr>
        <th>Título</th>
        <th>Fecha / Hora</th>
        <th>${s('client', locale)}</th>
        <th>${s('urgency', locale)}</th>
        <th>${s('notes', locale)}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>MRP Agenda · Adán Romero Marrero · 2026</footer>
</body>
</html>`;
}

// ─── Generar URI del PDF ──────────────────────────────────────────────────────

export async function generatePDF(events: Event[], locale: string): Promise<string> {
  const html = buildHTML(events, locale);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

// ─── Compartir via share sheet ────────────────────────────────────────────────

export async function sharePDF(events: Event[], locale: string): Promise<void> {
  const uri = await generatePDF(events, locale);
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing not available on this device');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: s('title', locale),
    UTI: 'com.adobe.pdf',
  });
}

// ─── Enviar por correo ────────────────────────────────────────────────────────

export async function mailPDF(events: Event[], locale: string): Promise<void> {
  const available = await MailComposer.isAvailableAsync();
  if (!available) throw new Error('Mail not available on this device');

  const uri = await generatePDF(events, locale);

  await MailComposer.composeAsync({
    subject: s('emailSubject', locale),
    body: '',
    attachments: [uri],
  });
}