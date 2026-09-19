/**
 * skaluj.ai — PANEL: udostepnienie arkusza jako JSON
 *
 * GDZIE WKLEIC: otworz swoj arkusz -> menu Rozszerzenia -> Apps Script
 *               (skrypt MUSI byc zalozony z poziomu arkusza, bo czyta "aktywny" arkusz)
 *
 * PRZED WDROZENIEM: zmien TOKEN ponizej na wlasny, dlugi ciag znakow.
 * Ten sam TOKEN wpiszesz potem w Cloudflare jako sekret SHEET_TOKEN.
 */

const TOKEN = 'ZMIEN-MNIE-na-dlugi-losowy-ciag-np-8f3k2mZq9PxL5vR1';

// Nazwy zakladek w arkuszu. Musza sie zgadzac co do litery.
const TABS = ['Leady', 'Mailing', 'Chatbot'];

function doGet(e) {
  const token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';
  if (token !== TOKEN) {
    return out_({ error: 'unauthorized' });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = {};

  TABS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) { data[name] = []; return; }

    const values = sh.getDataRange().getValues();
    if (values.length < 2) { data[name] = []; return; }

    const head = values[0].map(function (h) { return String(h).trim(); });

    data[name] = values.slice(1)
      .filter(function (row) { return row.join('').trim() !== ''; })
      .map(function (row) {
        const obj = {};
        head.forEach(function (h, i) {
          if (!h) return;
          let v = row[i];
          if (v instanceof Date) {
            v = Utilities.formatDate(v, 'Europe/Warsaw', 'yyyy-MM-dd HH:mm');
          }
          obj[h] = (v === null || v === undefined) ? '' : v;
        });
        return obj;
      })
      .reverse(); // najnowsze na gorze
  });

  data.generatedAt = Utilities.formatDate(new Date(), 'Europe/Warsaw', 'yyyy-MM-dd HH:mm');
  return out_(data);
}

function out_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
