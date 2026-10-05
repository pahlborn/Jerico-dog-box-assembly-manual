// Tests fuer errorlog.js - das Fehlerprotokoll.
//
// Der Vorgaenger logErrorToGist() schrieb den Eintrag in denselben Gist, der
// gerade nicht beschreibbar war. Beim Sync-Fehler - dem haeufigsten Fall -
// protokollierte er also nichts. Dazu verwarf er Statuscode und Antworttext
// und behielt nur den Satz aus dem Toast.
//
// Der wichtigste Test hier ist deshalb der, bei dem der Gist mit 422
// antwortet: Das Protokoll muss trotzdem einen Eintrag haben, und zwar mit
// Status und Rohantwort. Alles andere ist Beiwerk.
//
// Lokal: node tests/errorlog.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT, startServer, stubGitHub, browserStarten, neuerKontext,
  suite, test, assert, assertEqual, summary
} from './helpers.mjs';

const { server, base } = await startServer();
const browser = await browserStarten();
const SEITEN = ['index.html', 'specs.html', 'build-log.html', 'performance.html'];

async function oeffne(datei, { gistPatch } = {}) {
  const ctx = await neuerKontext(browser);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await stubGitHub(page, gistPatch ? { gistPatchFehler: gistPatch } : {});
  await page.goto(base + '/' + datei);
  await page.waitForFunction(() => typeof ErrorLog !== 'undefined', null, { timeout: 30000 });
  await page.evaluate(() => ErrorLog.leeren());
  await page.waitForTimeout(250);
  return { ctx, page, errors, close: () => ctx.close() };
}

try {

// ---------------------------------------------------------------------------
suite('Das Protokoll liegt auf dem Geraet, nicht in der Cloud');

await test('Ein abgelehnter Gist-Schreibvorgang landet trotzdem im Protokoll', async () => {
  // Der Fall, an dem der Vorgaenger gescheitert ist.
  const p = await oeffne('build-log.html', {
    gistPatch: { status: 422, body: JSON.stringify({ message: 'Gist cannot be updated.' }) }
  });
  // dataLoaded ist in Jerico nicht global - app.js kapselt es. Der Export
  // von saveData ist das, was dieser Test wirklich braucht.
  await p.page.waitForFunction(() => typeof saveData === 'function', null, { timeout: 30000 });
  const r = await p.page.evaluate(async () => {
    // Jerico braucht beides: Token und Gist-Id. Ohne Id haelt
    // isGistConfigured() saveData auf, es wird gar nicht geschrieben - und
    // dann prueft dieser Test nichts. window.FIXED_GIST_ID wird beim Laden
    // aus dem Speicher gesetzt, hier also direkt nachziehen.
    localStorage.setItem('gh_token', 'testtoken');
    localStorage.setItem('jerico_gist_id', 'testgist');
    window.FIXED_GIST_ID = 'testgist';
    ErrorLog.leeren();
    await saveData();
    await new Promise((r) => setTimeout(r, 400));
    return ErrorLog.alle();
  });
  assert(r.length >= 1, 'Kein Eintrag trotz fehlgeschlagenem Schreibvorgang');
  const e = r[r.length - 1];
  assert(/Gist cannot be updated/.test(e.nachricht), 'Meldung fehlt: ' + e.nachricht);
  assertEqual(e.status, 422, 'Statuscode nicht erfasst');
  assert(/Gist cannot be updated/.test(e.antwort || ''), 'Rohantwort nicht erfasst');
  assertEqual(e.quelle, 'saveData', 'Quelle nicht erfasst');
  await p.close();
});

await test('Der Eintrag ueberlebt das Neuladen der Seite', async () => {
  const p = await oeffne('build-log.html');
  await p.page.evaluate(() => ErrorLog.add('Testfehler nach Neuladen'));
  await p.page.reload();
  await p.page.waitForFunction(() => typeof ErrorLog !== 'undefined', null, { timeout: 30000 });
  const n = await p.page.evaluate(() => ErrorLog.alle().filter((e) => /nach Neuladen/.test(e.nachricht)).length);
  assertEqual(n, 1, 'Eintrag war nach dem Neuladen weg');
  await p.close();
});

await test('Jeder Eintrag nennt Zeit, Seite, Version und Geraet', async () => {
  // Ohne diese vier laesst sich spaeter nicht sagen, wo der Fehler herkam.
  const p = await oeffne('specs.html');
  const e = await p.page.evaluate(() => { ErrorLog.add('Mit Kontext'); return ErrorLog.alle().pop(); });
  assert(/^\d{4}-\d{2}-\d{2}T/.test(e.zeit), 'Zeit fehlt: ' + e.zeit);
  assertEqual(e.seite, 'specs.html', 'Seite falsch: ' + e.seite);
  assert(/^v\d+$/.test(e.version), 'Version fehlt: ' + e.version);
  assert(e.geraet && e.geraet !== 'unbekannt', 'Geraete-Kennung fehlt: ' + e.geraet);
  await p.close();
});

// ---------------------------------------------------------------------------
suite('Was sonst niemand sieht');

await test('Ein unbehandelter Fehler wird aufgezeichnet', async () => {
  // Auf einem Telefon sieht niemand in die Konsole.
  const p = await oeffne('build-log.html');
  await p.page.evaluate(() => { setTimeout(() => { throw new Error('Platzt im Timer'); }, 0); });
  await p.page.waitForTimeout(300);
  const treffer = await p.page.evaluate(() =>
    ErrorLog.alle().filter((e) => /Platzt im Timer/.test(e.nachricht)));
  assertEqual(treffer.length, 1, 'Unbehandelter Fehler nicht protokolliert');
  assertEqual(treffer[0].quelle, 'window.onerror', 'Quelle nicht vermerkt');
  await p.close();
});

await test('Ein abgewiesenes Promise wird aufgezeichnet', async () => {
  const p = await oeffne('build-log.html');
  await p.page.evaluate(() => { Promise.reject(new Error('Niemand faengt mich')); });
  await p.page.waitForTimeout(300);
  const treffer = await p.page.evaluate(() =>
    ErrorLog.alle().filter((e) => /Niemand faengt mich/.test(e.nachricht)));
  assertEqual(treffer.length, 1, 'Abgewiesenes Promise nicht protokolliert');
  assertEqual(treffer[0].quelle, 'unhandledrejection', 'Quelle nicht vermerkt');
  await p.close();
});

// ---------------------------------------------------------------------------
suite('Grenzen und Robustheit');

await test('Der Ringpuffer laeuft nicht ueber', async () => {
  const p = await oeffne('build-log.html');
  const r = await p.page.evaluate(() => {
    ErrorLog.leeren();
    for (var i = 0; i < ErrorLog.MAX + 25; i++) ErrorLog.add('Eintrag ' + i);
    var a = ErrorLog.alle();
    return { anzahl: a.length, erster: a[0].nachricht, letzter: a[a.length - 1].nachricht };
  });
  assertEqual(r.anzahl, 100, 'Puffergroesse');
  assert(/Eintrag 25$/.test(r.erster), 'Aelteste nicht verdraengt: ' + r.erster);
  assert(/Eintrag 124$/.test(r.letzter), 'Juengster fehlt: ' + r.letzter);
  await p.close();
});

await test('Ein gesperrter Speicher legt die Seite nicht lahm', async () => {
  // In einem privaten Fenster wirft setItem. Das Protokoll darf daran nicht
  // die Seite mitreissen.
  const p = await oeffne('build-log.html');
  const r = await p.page.evaluate(() => {
    const echt = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
    let geworfen = false;
    try { ErrorLog.add('Bei gesperrtem Speicher'); } catch (e) { geworfen = true; }
    localStorage.setItem = echt;
    return geworfen;
  });
  assertEqual(r, false, 'ErrorLog.add hat geworfen');
  assertEqual(p.errors.length, 0, 'Page-Errors: ' + p.errors.join(' | '));
  await p.close();
});

await test('Lange Antworttexte werden gekuerzt, nicht verworfen', async () => {
  const p = await oeffne('build-log.html');
  const e = await p.page.evaluate(() => {
    ErrorLog.add('Lange Antwort', { antwort: 'x'.repeat(9000) });
    return ErrorLog.alle().pop();
  });
  assert(e.antwort.length < 9000, 'Nicht gekuerzt: ' + e.antwort.length);
  assert(e.antwort.length > 1000, 'Zu stark gekuerzt: ' + e.antwort.length);
  assert(/gekuerzt/.test(e.antwort), 'Kuerzung nicht kenntlich gemacht');
  await p.close();
});

// ---------------------------------------------------------------------------
suite('Ansicht und Erreichbarkeit');

for (const datei of SEITEN) {
  await test(datei + ': Modul geladen und im Werkzeugmenue erreichbar', async () => {
    const html = fs.readFileSync(path.join(REPO_ROOT, datei), 'utf8');
    assert(html.includes('src="errorlog.js"'), 'errorlog.js wird nicht geladen');
    assert(/onclick="showErrorLog\(\)/.test(html), 'Kein Menueeintrag');
    const p = await oeffne(datei);
    assertEqual(p.errors.length, 0, 'Page-Errors: ' + p.errors.join(' | '));
    await p.close();
  });
}

await test('Die Ansicht zeigt Eintraege, juengste zuerst', async () => {
  const p = await oeffne('build-log.html');
  const r = await p.page.evaluate(() => {
    ErrorLog.leeren();
    ErrorLog.add('Aeltester');
    ErrorLog.add('Juengster', { status: 422, antwort: '{"message":"Gist cannot be updated."}' });
    showErrorLog();
    const ov = document.getElementById('guide-errorlog');
    const z = ov.querySelectorAll('.el-eintrag');
    return { da: !!ov, anzahl: z.length, ersterText: z[0].textContent,
             zeigtStatus: /422/.test(ov.textContent),
             zeigtAntwort: /Gist cannot be updated/.test(ov.textContent) };
  });
  assert(r.da, 'Overlay fehlt');
  assertEqual(r.anzahl, 2, 'Eintraege in der Ansicht');
  assert(/Juengster/.test(r.ersterText), 'Reihenfolge falsch, oben steht: ' + r.ersterText);
  assert(r.zeigtStatus, 'Statuscode wird nicht angezeigt');
  assert(r.zeigtAntwort, 'Rohantwort wird nicht angezeigt');
  await p.close();
});

await test('Eine leere Ansicht sagt das auch', async () => {
  const p = await oeffne('build-log.html');
  const t = await p.page.evaluate(() => {
    ErrorLog.leeren(); showErrorLog();
    return document.getElementById('errorlogBody').textContent;
  });
  assert(/Keine Fehler aufgezeichnet/.test(t), 'Leermeldung fehlt: ' + t.slice(0, 80));
  await p.close();
});

await test('Text in einem Eintrag wird escaped', async () => {
  const p = await oeffne('build-log.html');
  const ok = await p.page.evaluate(() => {
    ErrorLog.leeren();
    ErrorLog.add('<img src=x onerror=alert(1)>');
    showErrorLog();
    const ov = document.getElementById('guide-errorlog');
    return ov.querySelectorAll('img').length === 0 && /<img/.test(ov.textContent);
  });
  assert(ok, 'Eintrag wurde als HTML interpretiert');
  await p.close();
});

await test('Der Text zum Kopieren traegt Status und Antwort', async () => {
  // Das ist die Fassung, die in einer Nachricht landet.
  const p = await oeffne('build-log.html');
  const t = await p.page.evaluate(() => {
    ErrorLog.leeren();
    ErrorLog.add('Sync-Fehler: Gist cannot be updated.',
      { quelle: 'saveData', status: 422, statusText: 'Unprocessable Entity',
        antwort: '{"message":"Gist cannot be updated."}' });
    return ErrorLog.alsText();
  });
  assert(/Status:\s+422/.test(t), 'Status fehlt im Text');
  assert(/Quelle:\s+saveData/.test(t), 'Quelle fehlt im Text');
  assert(/Antwort:.*Gist cannot be updated/.test(t), 'Antwort fehlt im Text');
  await p.close();
});

// ---------------------------------------------------------------------------
suite('Auslieferung');

await test('errorlog.js liegt im Service-Worker-Cache', async () => {
  const sw = fs.readFileSync(path.join(REPO_ROOT, 'sw.js'), 'utf8');
  assert(sw.includes('./errorlog.js'), 'fehlt in urlsToCache');
});

await test('Die alte Gist-eigene Protokollfunktion ist weg', async () => {
  // In Jerico stand sie in app.js, nicht im Seiten-Markup. Der Kommentar in
  // app.js darf sie beim Namen nennen - geprueft wird die Funktion selbst
  // und ihr Aufruf. (Dieser Test war zuerst zu grob und schlug am eigenen
  // Kommentar fehl.)
  const dateien = ['app.js'].concat(SEITEN);
  for (const datei of dateien) {
    const text = fs.readFileSync(path.join(REPO_ROOT, datei), 'utf8');
    assert(!/function\s+logErrorToGist/.test(text), datei + ' hat die Funktion noch');
    assert(!/logErrorToGist\s*\(/.test(text), datei + ' ruft sie noch auf');
  }
});

await test('Der Sync-Fehler reicht Statuscode und Rohantwort weiter', async () => {
  // Ohne diese Weitergabe steht im Protokoll nur der Toast-Satz - genau das
  // Manko des Vorgaengers. Geprueft am Code, weil der Weg sonst still
  // verlorengehen kann, ohne dass ein Lauf rot wird.
  const app = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');
  assert(/detail:\s*\{[^}]*quelle:\s*'saveData'/.test(app), 'saveData nennt keine Quelle');
  assert(/antwort:\s*roh/.test(app), 'Rohantwort wird nicht weitergereicht');
  assert(/status:\s*res\.status/.test(app), 'Statuscode wird nicht weitergereicht');
});

} finally {
  await browser.close();
  server.close();
  process.exit(summary());
}
