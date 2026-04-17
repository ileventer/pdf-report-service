const express = require('express');
const PdfMake = require('pdfmake');

const app = express();
app.use(express.json({ limit: '1mb' }));

// Load built-in Roboto fonts (supports Cyrillic)
const vfs = require('pdfmake/build/vfs_fonts');
// pdfmake exports fonts either as vfs.pdfMake.vfs or directly
const fontData = (vfs.pdfMake && vfs.pdfMake.vfs) ? vfs.pdfMake.vfs : vfs;

const printer = new PdfMake({
  Roboto: {
    normal: Buffer.from(fontData['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(fontData['Roboto-Medium.ttf'], 'base64'),
    italics: Buffer.from(fontData['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(fontData['Roboto-MediumItalic.ttf'], 'base64')
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/generate-pdf', (req, res) => {
  try {
    const { name, report } = req.body;

    if (!report) {
      return res.status(400).json({ error: 'report is required' });
    }

    const userName = name || 'Участник';
    const date = new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Split report into paragraphs
    const paragraphs = report.split('\n').filter(p => p.trim().length > 0);

    const content = [
      {
        text: 'МЕНТАЛЬНАЯ ДИАГНОСТИКА',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 5]
      },
      {
        text: 'Персональный отчёт',
        style: 'subheader',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#2C5F7C' }],
        margin: [0, 0, 0, 20]
      },
      {
        columns: [
          { text: [{ text: 'Участник: ', bold: true }, userName], width: '*' },
          { text: date, alignment: 'right', width: 'auto', color: '#666666' }
        ],
        margin: [0, 0, 0, 20]
      },
      ...paragraphs.map(p => ({
        text: p.trim(),
        style: 'body',
        margin: [0, 0, 0, 10]
      })),
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#CCCCCC' }],
        margin: [0, 20, 0, 15]
      },
      {
        text: 'Игорь Левентер — ментальный тренер',
        alignment: 'center',
        style: 'footer'
      },
      {
        text: 'Telegram: @I_Leventer',
        alignment: 'center',
        style: 'footerLink',
        margin: [0, 3, 0, 0]
      }
    ];

    const docDefinition = {
      content,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 11,
        lineHeight: 1.4
      },
      styles: {
        header: {
          fontSize: 22,
          bold: true,
          color: '#2C5F7C'
        },
        subheader: {
          fontSize: 14,
          color: '#666666'
        },
        body: {
          fontSize: 11,
          color: '#333333',
          lineHeight: 1.5
        },
        footer: {
          fontSize: 10,
          color: '#999999',
          bold: true
        },
        footerLink: {
          fontSize: 10,
          color: '#2C5F7C'
        }
      },
      pageMargins: [40, 40, 40, 40]
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
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
    const { name, report, chat_id, bot_token } = req.body;

    if (!report || !chat_id || !bot_token) {
      return res.status(400).json({ error: 'report, chat_id, and bot_token are required' });
    }

    const userName = name || 'Участник';
    const date = new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const paragraphs = report.split('\n').filter(p => p.trim().length > 0);

    const content = [
      { text: 'МЕНТАЛЬНАЯ ДИАГНОСТИКА', style: 'header', alignment: 'center', margin: [0, 0, 0, 5] },
      { text: 'Персональный отчёт', style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#2C5F7C' }], margin: [0, 0, 0, 20] },
      { columns: [ { text: [{ text: 'Участник: ', bold: true }, userName], width: '*' }, { text: date, alignment: 'right', width: 'auto', color: '#666666' } ], margin: [0, 0, 0, 20] },
      ...paragraphs.map(p => ({ text: p.trim(), style: 'body', margin: [0, 0, 0, 10] })),
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#CCCCCC' }], margin: [0, 20, 0, 15] },
      { text: 'Игорь Левентер — ментальный тренер', alignment: 'center', style: 'footer' },
      { text: 'Telegram: @I_Leventer', alignment: 'center', style: 'footerLink', margin: [0, 3, 0, 0] }
    ];

    const docDefinition = {
      content,
      defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.4 },
      styles: {
        header: { fontSize: 22, bold: true, color: '#2C5F7C' },
        subheader: { fontSize: 14, color: '#666666' },
        body: { fontSize: 11, color: '#333333', lineHeight: 1.5 },
        footer: { fontSize: 10, color: '#999999', bold: true },
        footerLink: { fontSize: 10, color: '#2C5F7C' }
      },
      pageMargins: [40, 40, 40, 40]
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));

    await new Promise((resolve, reject) => {
      pdfDoc.on('end', resolve);
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Send to Telegram using multipart/form-data
    const FormData = require('form-data');
    const https = require('https');
    const form = new FormData();
    form.append('chat_id', String(chat_id));
    form.append('document', pdfBuffer, { filename: `report-${userName}.pdf`, contentType: 'application/pdf' });
    form.append('caption', '📊 Твой персональный ментальный отчёт готов!');

    const tgUrl = `https://api.telegram.org/bot${bot_token}/sendDocument`;

    const response = await new Promise((resolve, reject) => {
      const url = new URL(tgUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: form.getHeaders()
      };
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
