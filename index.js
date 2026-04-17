const express = require('express');
const PdfMake = require('pdfmake');

const app = express();
app.use(express.json({ limit: '2mb' }));

// Load built-in Roboto fonts (supports Cyrillic)
const vfs = require('pdfmake/build/vfs_fonts');
const fontData = (vfs.pdfMake && vfs.pdfMake.vfs) ? vfs.pdfMake.vfs : vfs;

const printer = new PdfMake({
  Roboto: {
    normal: Buffer.from(fontData['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(fontData['Roboto-Medium.ttf'], 'base64'),
    italics: Buffer.from(fontData['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(fontData['Roboto-MediumItalic.ttf'], 'base64')
  }
});

// Colors
const C = {
  primary: '#2C5F7C',
  primaryLight: '#E8F4F8',
  accent: '#1A8A6E',
  accentLight: '#E6F7F2',
  dark: '#1A1A2E',
  text: '#333333',
  secondary: '#666666',
  muted: '#999999',
  border: '#E0E0E0',
  quoteBg: '#F7F9FB',
  white: '#FFFFFF'
};

// Helper: section header with colored left bar
function sectionHeader(title) {
  return {
    table: {
      widths: [4, '*'],
      body: [[
        { text: '', fillColor: C.primary },
        { text: title.toUpperCase(), style: 'sectionTitle', margin: [10, 8, 10, 8], fillColor: C.primaryLight }
      ]]
    },
    layout: 'noBorders',
    margin: [0, 20, 0, 10]
  };
}

// Helper: quote block with left border
function quoteBlock(text) {
  return {
    table: {
      widths: [3, '*'],
      body: [[
        { text: '', fillColor: C.primary },
        { text: '\u00AB' + text + '\u00BB', style: 'quote', margin: [10, 6, 10, 6], fillColor: C.quoteBg }
      ]]
    },
    layout: 'noBorders',
    margin: [20, 4, 20, 4]
  };
}

// Helper: recommendation with number badge
function recommendation(num, text) {
  return {
    columns: [
      {
        width: 28,
        table: {
          widths: [28],
          heights: [28],
          body: [[{ text: String(num), alignment: 'center', fontSize: 14, bold: true, color: C.white, margin: [0, 4, 0, 0], fillColor: C.accent }]]
        },
        layout: 'noBorders'
      },
      { text: text, style: 'body', width: '*', margin: [10, 2, 0, 0] }
    ],
    margin: [0, 6, 0, 6]
  };
}

// Helper: area analysis block
function areaBlock(title, text) {
  return [
    { text: '\u25CF  ' + title, style: 'areaTitle', margin: [10, 8, 0, 4] },
    { text: text, style: 'body', margin: [26, 0, 0, 4] }
  ];
}

// Build structured PDF content
function buildStructuredContent(data, userName, date) {
  const content = [];

  // === HEADER ===
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: 'МЕНТАЛЬНАЯ', fontSize: 28, bold: true, color: C.white, alignment: 'center' },
          { text: 'ДИАГНОСТИКА', fontSize: 28, bold: true, color: C.white, alignment: 'center', margin: [0, -4, 0, 0] },
          { text: 'Персональный отчёт', fontSize: 13, color: '#B8D8E8', alignment: 'center', margin: [0, 6, 0, 0] }
        ],
        fillColor: C.dark,
        margin: [0, 20, 0, 20]
      }]]
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 0]
  });

  // Name + date bar
  content.push({
    table: {
      widths: ['*', 'auto'],
      body: [[
        { text: [{ text: 'Участник: ', bold: true }, userName], margin: [10, 6, 0, 6], fillColor: C.primaryLight, color: C.primary },
        { text: date, margin: [10, 6, 10, 6], fillColor: C.primaryLight, color: C.secondary, alignment: 'right' }
      ]]
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 15]
  });

  // === GREETING ===
  content.push({ text: data.greeting, style: 'body', margin: [0, 5, 0, 10] });

  // === PROFILE ===
  content.push(sectionHeader('Ментальный профиль'));
  content.push({ text: data.profile, style: 'body', margin: [0, 0, 0, 5] });

  // === MAIN PATTERN ===
  content.push(sectionHeader('Главный паттерн'));
  content.push({ text: data.main_pattern, style: 'body', margin: [0, 0, 0, 8] });

  // Quotes
  if (data.quotes && data.quotes.length > 0) {
    data.quotes.forEach(q => content.push(quoteBlock(q)));
  }

  // === AREAS ===
  content.push(sectionHeader('Анализ'));
  if (data.areas && data.areas.length > 0) {
    data.areas.forEach(a => {
      const blocks = areaBlock(a.title, a.text);
      blocks.forEach(b => content.push(b));
    });
  }

  // === HIDDEN RESOURCE ===
  content.push(sectionHeader('Скрытый ресурс'));
  content.push({
    table: {
      widths: ['*'],
      body: [[{ text: data.hidden_resource, style: 'body', margin: [12, 10, 12, 10], fillColor: C.accentLight }]]
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 5]
  });

  // === RECOMMENDATIONS ===
  content.push(sectionHeader('Рекомендации'));
  if (data.recommendations && data.recommendations.length > 0) {
    data.recommendations.forEach((r, i) => content.push(recommendation(i + 1, r)));
  }

  // === BRIDGE ===
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: C.border }],
    margin: [0, 20, 0, 15]
  });
  content.push({ text: data.bridge, style: 'body', margin: [0, 0, 0, 10] });

  // CTA block
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: 'Полная диагностика с Игорем Левентером', bold: true, fontSize: 13, color: C.primary, alignment: 'center' },
          { text: 'Подробный опросник \u2192 Личный анализ \u2192 Встреча-разбор', fontSize: 10, color: C.secondary, alignment: 'center', margin: [0, 4, 0, 4] },
          { text: '$59', fontSize: 22, bold: true, color: C.accent, alignment: 'center', margin: [0, 2, 0, 4] },
          { text: 'Кодовое слово: \u00ABХочу пройти диагностику\u00BB', fontSize: 10, color: C.text, alignment: 'center' },
          { text: 'Напиши Игорю \u2014 @I_Leventer', fontSize: 10, color: C.primary, alignment: 'center', margin: [0, 2, 0, 0] }
        ],
        margin: [0, 14, 0, 14],
        fillColor: C.primaryLight
      }]]
    },
    layout: 'noBorders',
    margin: [0, 10, 0, 15]
  });

  // Footer
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: C.border }],
    margin: [0, 5, 0, 10]
  });
  content.push({ text: 'Игорь Левентер \u2014 ментальный тренер', alignment: 'center', style: 'footer' });
  content.push({ text: 'Telegram: @I_Leventer', alignment: 'center', style: 'footerLink', margin: [0, 3, 0, 0] });

  return content;
}

// Build plain text PDF (fallback)
function buildPlainContent(report, userName, date) {
  const paragraphs = report.split('\n').filter(p => p.trim().length > 0);
  return [
    { text: 'МЕНТАЛЬНАЯ ДИАГНОСТИКА', style: 'header', alignment: 'center', margin: [0, 0, 0, 5] },
    { text: 'Персональный отчёт', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: C.primary }], margin: [0, 0, 0, 20] },
    { columns: [{ text: [{ text: 'Участник: ', bold: true }, userName], width: '*' }, { text: date, alignment: 'right', width: 'auto', color: C.secondary }], margin: [0, 0, 0, 20] },
    ...paragraphs.map(p => ({ text: p.trim(), style: 'body', margin: [0, 0, 0, 10] })),
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: C.border }], margin: [0, 20, 0, 15] },
    { text: 'Игорь Левентер \u2014 ментальный тренер', alignment: 'center', style: 'footer' },
    { text: 'Telegram: @I_Leventer', alignment: 'center', style: 'footerLink', margin: [0, 3, 0, 0] }
  ];
}

function createPdf(content) {
  const docDefinition = {
    content,
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4 },
    styles: {
      header: { fontSize: 22, bold: true, color: C.primary },
      subheader: { fontSize: 14, color: C.secondary },
      sectionTitle: { fontSize: 12, bold: true, color: C.primary, letterSpacing: 1 },
      body: { fontSize: 10.5, color: C.text, lineHeight: 1.5 },
      quote: { fontSize: 10, italics: true, color: C.secondary, lineHeight: 1.4 },
      areaTitle: { fontSize: 11, bold: true, color: C.dark },
      footer: { fontSize: 10, color: C.muted, bold: true },
      footerLink: { fontSize: 10, color: C.primary }
    },
    pageMargins: [40, 30, 40, 30]
  };

  return printer.createPdfKitDocument(docDefinition);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Simple PDF generation (returns file)
app.post('/generate-pdf', (req, res) => {
  try {
    const { name, report, report_data } = req.body;
    if (!report && !report_data) return res.status(400).json({ error: 'report is required' });

    const userName = name || 'Участник';
    const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    let content;
    if (report_data) {
      const data = typeof report_data === 'string' ? JSON.parse(report_data) : report_data;
      content = buildStructuredContent(data, userName, date);
    } else {
      content = buildPlainContent(report, userName, date);
    }

    const pdfDoc = createPdf(content);
    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="report.pdf"`);
      res.send(pdfBuffer);
    });
    pdfDoc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Generate PDF and send directly to Telegram
app.post('/generate-and-send', async (req, res) => {
  try {
    const { name, report, report_data, chat_id, bot_token } = req.body;
    if ((!report && !report_data) || !chat_id || !bot_token) {
      return res.status(400).json({ error: 'report/report_data, chat_id, and bot_token are required' });
    }

    const userName = name || 'Участник';
    const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    let content;
    if (report_data) {
      const data = typeof report_data === 'string' ? JSON.parse(report_data) : report_data;
      content = buildStructuredContent(data, userName, date);
    } else {
      content = buildPlainContent(report, userName, date);
    }

    const pdfDoc = createPdf(content);
    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      pdfDoc.on('end', resolve);
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Send to Telegram
    const FormData = require('form-data');
    const https = require('https');
    const form = new FormData();
    form.append('chat_id', String(chat_id));
    form.append('document', pdfBuffer, { filename: `report-${userName}.pdf`, contentType: 'application/pdf' });
    form.append('caption', '\uD83D\uDCCA Твой персональный ментальный отчёт готов!');

    const tgUrl = `https://api.telegram.org/bot${bot_token}/sendDocument`;
    const response = await new Promise((resolve, reject) => {
      const url = new URL(tgUrl);
      const options = { hostname: url.hostname, path: url.pathname, method: 'POST', headers: form.getHeaders() };
      const req2 = https.request(options, (resp) => {
        let data = '';
        resp.on('data', d => data += d);
        resp.on('end', () => resolve(JSON.parse(data)));
      });
      req2.on('error', reject);
      form.pipe(req2);
    });

    res.json({ ok: true, telegram_response: response });
  } catch (err) {
    console.error('Generate-and-send error:', err);
    res.status(500).json({ error: 'Failed: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PDF service running on port ${PORT}`);
});
