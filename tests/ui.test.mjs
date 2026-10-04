// Tests fuer das Grundgeruest: Version, Seitenaufbau, Kapitelstatus, Befunde,
// Messwerte und die Fortschrittsanzeige auf der Startseite.
//
// Lokal: npm test

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  startServer, stubGitHub, REPO_ROOT,
  suite, test, assert, assertEqual, summary
} from './helpers.mjs';

const { server, base } = await startServer();
// CHROMIUM_PATH erlaubt einen vorinstallierten Browser (z.B. in Containern),
// sonst nimmt Playwright den selbst heruntergeladenen.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const PAGES = ['index.html', 'specs.html', 'build-log.html', 'performance.html'];

async function open(file) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await stubGitHub(page);
  await page.goto(base + '/' + file);
  await page.waitForTimeout(900);
  return { ctx, page, errors, close: () => ctx.close() };
}

try {

// ---------------------------------------------------------------------------
suite('Version: eine Quelle, die nicht auseinanderlaufen kann');

await test('version.js und sw.js nennen dieselbe Version', async () => {
  // Ohne diese Pruefung liefert der Service Worker irgendwann einen anderen
  // Stand aus, als der Header anzeigt.
  const sw = fs.readFileSync(path.join(REPO_ROOT, 'sw.js'), 'utf8');
  const vjs = fs.readFileSync(path.join(REPO_ROOT, 'version.js'), 'utf8');
  const cacheName = (sw.match(/CACHE_NAME\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  const appVersion = (vjs.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  assert(cacheName, 'CACHE_NAME nicht gefunden');
  assert(appVersion, 'APP_VERSION nicht gefunden');
  assertEqual(cacheName, 'jerico-' + appVersion,
    'sw.js (' + cacheName + ') passt nicht zu version.js (' + appVersion + ')');
});

await test('changelog.js kennt die aktuelle Version', async () => {
  const cl = fs.readFileSync(path.join(REPO_ROOT, 'changelog.js'), 'utf8');
  const vjs = fs.readFileSync(path.join(REPO_ROOT, 'version.js'), 'utf8');
  const appVersion = (vjs.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  assert(cl.includes("version: '" + appVersion + "'"),
    'Kein Changelog-Eintrag fuer ' + appVersion);
});

await test('version.js nennt einen Freigabezeitpunkt', async () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'version.js'), 'utf8');
  const iso = (src.match(/APP_BUILT\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  assert(iso, 'APP_BUILT fehlt in version.js');
  assert(!isNaN(new Date(iso).getTime()), 'APP_BUILT ist kein gueltiges Datum: ' + iso);
});

await test('die Versionsfolge hat keine Luecke und keine Nummer zweimal', async () => {
  // v13 ging zweimal raus, zwoelf Minuten auseinander, beide mit derselben
  // Cache-Version. Im Journal standen dafuer zwei Eintraege mit demselben
  // 'version: v13' - und kein Test hat danach gesucht. Die Pruefung darueber
  // sieht nur, ob die oberste Nummer zu APP_VERSION passt; das war die ganze
  // Zeit erfuellt.
  const cl = fs.readFileSync(path.join(REPO_ROOT, 'changelog.js'), 'utf8');
  const versionen = [...cl.matchAll(/version: '(v\d+)'/g)].map((m) => m[1]);
  assert(versionen.length > 5, 'Nur ' + versionen.length + ' Eintraege gefunden');

  const nummern = versionen.map((v) => Number(v.slice(1)));
  const doppelt = versionen.filter((v, i) => versionen.indexOf(v) !== i);
  assertEqual(doppelt, [], 'Nummer mehrfach im Journal: ' + doppelt.join(', '));

  const luecken = [];
  for (let i = 0; i < nummern.length - 1; i++) {
    for (let n = nummern[i] - 1; n > nummern[i + 1]; n--) luecken.push('v' + n);
  }
  assertEqual(luecken, [], 'Ohne Eintrag: ' + luecken.join(', '));
  assert(nummern.every((n, i) => i === 0 || n < nummern[i - 1]),
    'Die Eintraege stehen nicht absteigend: ' + nummern.join(', '));
});

await test('der Freigabezeitpunkt passt zum obersten Journal-Eintrag', async () => {
  // Es gibt keinen Build-Schritt, der APP_BUILT stempeln koennte. Ohne diese
  // Pruefung bleibt er beim naechsten Hochzaehlen stehen und behauptet ein
  // falsches Freigabedatum.
  const vjs = fs.readFileSync(path.join(REPO_ROOT, 'version.js'), 'utf8');
  const cl = fs.readFileSync(path.join(REPO_ROOT, 'changelog.js'), 'utf8');
  const built = (vjs.match(/APP_BUILT\s*=\s*['"]([^'"]+)['"]/) || [])[1];
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(built),
    'APP_BUILT ist kein ISO-8601 mit Zonenangabe: ' + built);

  const ersterBlock = cl.slice(cl.indexOf('var RELEASES'), cl.indexOf('var RELEASES') + 400);
  const datum = (ersterBlock.match(/date:\s*'([^']+)'/) || [])[1];
  const zeit = (ersterBlock.match(/time:\s*'([^']+)'/) || [])[1];
  assertEqual(built.slice(0, 10), datum, 'APP_BUILT und das Datum des obersten Eintrags');
  assert(zeit, 'Der oberste Journal-Eintrag hat keine Uhrzeit');
  assertEqual(built.slice(11, 16), zeit, 'Uhrzeit in version.js und changelog.js');
});

await test('der Freigabezeitpunkt sieht in jeder Zeitzone gleich aus', async () => {
  // formatBuilt() rechnete mit new Date() in die Zeitzone des Betrachters um.
  // Derselbe Release stand in Berlin auf 05.01.2026, 07:09 und in Los Angeles
  // auf 04.01.2026, 22:09 - einen Tag vorher. Der Zeitpunkt gehoert zum
  // Release, nicht zum Leser.
  const p = await open('index.html');
  const r = await p.page.evaluate(() => ({
    mitZeit: formatBuilt('2026-01-05T07:09:00+01:00'),
    ohneZeit: formatBuilt('2026-01-05'),
    muell: formatBuilt('keine Zeitangabe'),
    quelle: formatBuilt.toString()
  }));
  await p.close();
  assertEqual(r.mitZeit, '05.01.2026, 07:09', 'Formatierung mit Uhrzeit');
  assertEqual(r.ohneZeit, '05.01.2026', 'Datum ohne Uhrzeit');
  assertEqual(r.muell, '', 'Unlesbare Eingabe liefert keinen leeren String');
  // Und der Weg dahin: new Date() wuerde die Zonenverschiebung zurueckholen,
  // ohne dass die Werte oben sich aendern - der Test liefe auf einem Rechner
  // in Berlin gruen und in Los Angeles rot.
  assert(!/new Date/.test(r.quelle),
    'formatBuilt benutzt new Date() - der Zeitpunkt rutscht in die Zeitzone des Betrachters');
});

await test('Vollbild-Overlays sperren die Seite iOS-tauglich', async () => {
  // body{overflow:hidden} allein reicht auf iOS nicht - ohne festgesetzten
  // body wandert die Seite unter dem Overlay weg.
  const js = fs.readFileSync(path.join(REPO_ROOT, 'gallery.js'), 'utf8');
  assert(/function sperreSeite/.test(js), 'sperreSeite() fehlt');
  assert(/b\.style\.position = 'fixed'/.test(js), 'Sperre setzt den body nicht fest');
  const app = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');
  assert(/sperreSeite/.test(app), 'Glossar benutzt die Sperre nicht');
});

await test('Zusammenbau zeigt keine Befunde-Zeile in der Kopfzeile', async () => {
  const text = fs.readFileSync(path.join(REPO_ROOT, 'build-log.html'), 'utf8');
  assert(!/findings-overview/.test(text), 'Befunde-Zeile steht noch in der Kopfzeile');
});

await test('keine doppelten Element-IDs auf einer Seite', async () => {
  // Zwei Kuehlsystem-Kapitel trugen beide id="sec-cooling" und beide die
  // Galerie-ID spec_cooling_photos. Doppelte IDs brechen Ankerlinks, und der
  // Fotozaehler aktualisierte sich nur an einer der beiden Stellen.
  for (const datei of PAGES) {
    const text = fs.readFileSync(path.join(REPO_ROOT, datei), 'utf8');
    const ids = [...text.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const gesehen = new Set();
    const doppelt = [];
    for (const id of ids) {
      if (gesehen.has(id)) doppelt.push(id);
      gesehen.add(id);
    }
    assertEqual(doppelt, [], datei + ': doppelte IDs');
  }
});

await test('Montageschritte stehen im Build Log, nicht in den Specs', async () => {
  // Die Spezifikationen beschreiben, was das Getriebe ist. Was man tut,
  // gehoert an den Arbeitsschritt.
  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');
  const bl = fs.readFileSync(path.join(REPO_ROOT, 'build-log.html'), 'utf8');
  assert(bl.includes('Laufradwelle aus der Pumpe herausdr'),
    'Zerlegeschritte der Oelpumpe fehlen im Build Log');
  assert(!specs.includes('Laufradwelle aus der Pumpe herausdr'),
    'Zerlegeschritte stehen noch in den Spezifikationen');

  // Einfahren und Einbau sind Handgriffe, keine Werte. Sie standen als
  // kuerzere Zweitfassung in Kapitel 8, obwohl Schritt 11 und 12 sie
  // ausfuehrlicher und zweisprachig fuehren.
  //
  // Geprueft wird die Anweisung, nicht das Stichwort: die Specs duerfen auf
  // den Schritt verweisen ("siehe Schritt 11, Bellhousing-Ausrichtung"),
  // nur die Handlung selbst gehoert dort nicht mehr hin.
  for (const [nadel, was] of [
    ['Hinterachse aufbocken', 'Vorwaermen'],
    ['Fahrerlager', 'Einfahr-Fahrweise'],
    ['Pilotlagerbohrung', 'Bellhousing und Pilotbohrung'],
    ['flexibles Gummilager', 'Getriebelager']
  ]) {
    assert(bl.includes(nadel), was + ' fehlt im Build Log');
  }
  for (const [nadel, was] of [
    ['Hinterachse aufbocken', 'Vorwaermen'],
    ['Fahrerlager', 'Einfahr-Fahrweise'],
    ['vor Einbau verifizieren', 'Bellhousing-Anweisung'],
    ['nie starr', 'Getriebelager-Anweisung']
  ]) {
    assert(!specs.includes(nadel), was + ' steht wieder in den Spezifikationen');
  }

  // Die Werte dagegen gehoeren auf die Specs-Seite und an den Schritt.
  for (const wert of ['75W90', '2 Quarts']) {
    assert(specs.includes(wert), wert + ' fehlt in den Spezifikationen');
    assert(bl.includes(wert), wert + ' fehlt im Build Log');
  }
});

await test('Specs-Kapitel stehen in einer Gruppe, die zu ihnen passt', async () => {
  // "Offene Validierungen" stand unter "Betrieb". Offene Punkte sind kein
  // Betrieb, sondern Projektstand - und damit weder Spec noch Build.
  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');
  const reihenfolge = [...specs.matchAll(/grp-(\w+)"|<h2>(\d+)\./g)]
    .map((m) => m[1] ? 'GRUPPE:' + m[1] : 'kap' + m[2]);
  const nachStand = reihenfolge.slice(reihenfolge.indexOf('GRUPPE:stand') + 1);
  assertEqual(nachStand, ['kap9'],
    'Gruppe Projektstand enthaelt nicht genau Kapitel 9: ' + nachStand.join(','));
  const betrieb = reihenfolge.slice(reihenfolge.indexOf('GRUPPE:betrieb') + 1,
                                    reihenfolge.indexOf('GRUPPE:stand'));
  assertEqual(betrieb, ['kap7', 'kap8'], 'Gruppe Betrieb: ' + betrieb.join(','));
});

await test('Kuehlsystem-Messwerte behalten ihre Feldnamen', async () => {
  // Die Werte haengen am data-field, nicht an der Position. Ein umbenanntes
  // Feld verliert still, was jemand eingetragen hat.
  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');
  for (const f of ['cool_length_base', 'cool_length_pump', 'cool_length_diff',
                   'cool_cooler_product', 'cool_an_size', 'comment_cooling']) {
    const n = (specs.match(new RegExp('data-field="' + f + '"', 'g')) || []).length;
    assertEqual(n, 1, 'Feld ' + f + ' kommt ' + n + ' mal vor, erwartet genau einmal');
  }
});

await test('Nachschlagekarte und Specs nennen dieselben Werte', async () => {
  // Der eigentliche Zweck der Datendatei: die Karte ist eine zweite Ansicht
  // derselben Werte, keine zweite Quelle. Laufen sie auseinander, wird dieser
  // Test rot - statt dass an der Werkbank zwei Zahlen stehen.
  const p = await open('specs.html');
  const daten = await p.page.evaluate(() => {
    const raus = {};
    REFERENCE.gruppen.forEach((g) => {
      raus[g.id] = g.zeilen.map((z) => z.map((c) => c.replace(/<[^>]+>/g, '')));
    });
    return raus;
  });
  await p.close();

  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');
  // Vergleich auf der gerenderten Zeichenkette, nicht auf dem Markup: die
  // Specs setzen Entitaeten teils anders, der Wert ist derselbe.
  const flach = (t) => t.replace(/<[^>]+>/g, '').replace(/&[a-z]+;|&#\d+;/g, ' ')
                        .replace(/\s+/g, ' ').trim().toLowerCase();
  const heuhaufen = flach(specs);

  const fehlend = [];
  for (const [gruppe, zeilen] of Object.entries(daten)) {
    for (const zeile of zeilen) {
      // Erste Spalte ist die Bezeichnung - die muss in specs.html vorkommen.
      const nadel = flach(zeile[0]);
      if (nadel.length > 8 && !heuhaufen.includes(nadel)) {
        fehlend.push(gruppe + ': ' + zeile[0]);
      }
    }
  }
  assertEqual(fehlend, [], 'Karte nennt Zeilen, die specs.html nicht kennt');
});

await test('Nachschlagekarte ist auf jeder Seite erreichbar', async () => {
  for (const datei of PAGES) {
    const text = fs.readFileSync(path.join(REPO_ROOT, datei), 'utf8');
    assert(text.includes('reference.js'), datei + ': reference.js nicht eingebunden');
    assert(text.includes('showReference()'), datei + ': kein Knopf fuer die Karte');
  }
  // Das Overlay entsteht erst beim Oeffnen - es soll nicht in jeder Seite
  // als totes Markup liegen, so wie das Glossar.
  const p = await open('build-log.html');
  const vorher = await p.page.evaluate(() => !!document.getElementById('guide-reference'));
  assertEqual(vorher, false, 'Karte liegt schon vor dem Oeffnen im DOM');
  const offen = await p.page.evaluate(() => {
    showReference();
    const el = document.getElementById('guide-reference');
    return { da: !!el, zeilen: document.querySelectorAll('#guide-reference tr.ref-row').length };
  });
  assert(offen.da, 'Karte wurde nicht gebaut');
  assert(offen.zeilen > 25, 'Karte hat nur ' + offen.zeilen + ' Zeilen');
  await p.close();
});

await test('Uebersetzungsrechner deckt sich mit dem Gear Ratio Chart (A-03)', async () => {
  // Gegen die Chart-Spalte 24/24 geprueft: dort ist der Main Drive 1.000,
  // die Spalte zeigt also das reine Gangradverhaeltnis. Weicht eine Zeile ab,
  // rechnet die Seite mit Zahnradzahlen, die es so nicht gibt.
  const p = await open('specs.html');
  const abweichungen = await p.page.evaluate(() => {
    const soll = {
      g1: [2.267, 2.200, 2.125, 1.941, 1.778, 1.722, 1.684, 1.632, 1.500, 1.429],
      g2: [1.450, 1.400, 1.381, 1.333, 1.286, 1.227],
      g3: [1.182, 1.130, 1.087, 1.042, 1.000, 0.960, 0.920, 0.885]
    };
    const sollMD = [1.450, 1.400, 1.381, 1.333, 1.286, 1.227,
                    1.182, 1.130, 1.087, 1.042, 1.000, 0.960];
    const raus = [];
    for (const [g, liste] of Object.entries(soll)) {
      RATIOS.GANGRAEDER[g].forEach((paar, i) => {
        if (Math.abs(paar[0] / paar[1] - liste[i]) > 0.0015) {
          raus.push(g + ' ' + paar[0] + '/' + paar[1]);
        }
      });
    }
    RATIOS.MAIN_DRIVES.forEach((paar, i) => {
      if (Math.abs(paar[0] / paar[1] - sollMD[i]) > 0.0015) {
        raus.push('MD ' + paar[0] + '/' + paar[1]);
      }
    });
    return raus;
  });
  assertEqual(abweichungen, [], 'Zahnradzahlen weichen von A-03 ab');
  await p.close();
});

await test('Uebersetzungen werden gerechnet und gespeichert, nicht fest hinterlegt', async () => {
  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');
  // Die alte feste Tabelle trug einen Main Drive, der ihre eigenen Ratios
  // nicht erzeugen kann. Sie darf nicht zurueckkommen.
  assert(!/<td>Main Drive<\/td><td>22 \/ 27<\/td>/.test(specs),
    'Die widerspruechliche feste Uebersetzungstabelle steht wieder drin');

  const p = await open('specs.html');
  const vorher = await p.page.evaluate(() => {
    const felder = ['ratio_md', 'ratio_g1', 'ratio_g2', 'ratio_g3']
      .map((f) => document.getElementById(f));
    return {
      alleDa: felder.every((e) => e && e.tagName === 'SELECT' && e.dataset.field),
      md: felder[0].value,
      zeilen: document.querySelectorAll('#ratioErgebnis tbody tr').length,
      ersterGang: document.querySelector('#ratioErgebnis tbody tr td:nth-child(3)').textContent
    };
  });
  assert(vorher.alleDa, 'Nicht alle vier Auswahlfelder sind da');
  assertEqual(vorher.md, '25/24', 'Verbauter Main Drive nicht vorbelegt');
  assertEqual(vorher.zeilen, 4, 'Ergebnistabelle hat nicht vier Gaenge');

  // Eine andere Auswahl muss die Ratios neu rechnen.
  const nachher = await p.page.evaluate(() => {
    const el = document.getElementById('ratio_md');
    el.value = '29/20';
    ratiosGeaendert();
    return document.querySelector('#ratioErgebnis tbody tr td:nth-child(3)').textContent;
  });
  assert(nachher !== vorher.ersterGang,
    'Ratio aendert sich nicht bei anderem Main Drive: ' + nachher);
  // 29/20 x 33/17 = 2.815, der Chart-Wert oben links.
  assertEqual(nachher, '2.815', 'Gerechnete Ratio stimmt nicht mit A-03');
  await p.close();
});

await test('die Leistungsseite rechnet mit der Auswahl, nicht mit festen Werten', async () => {
  // Die widerlegten Ratios standen ein zweites Mal fest in perf-charts.js.
  // Dass Kapitel 2 rechnete, half nichts - die Diagramme taten es nicht.
  const pc = fs.readFileSync(path.join(REPO_ROOT, 'perf-charts.js'), 'utf8');
  const code = pc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ['2.588', '1.714', '1.182'].forEach((z) => {
    assert(!code.includes(z), 'Die widerlegte Ratio ' + z + ' steht wieder im Code');
  });

  const p = await open('performance.html');
  const r = await p.page.evaluate(() => {
    const zahl = (s) => parseFloat(String(s).replace(/[^0-9.]/g, ''));
    const zeilen = () => [...document.querySelectorAll('#perfVergleich tbody tr')]
      .map((tr) => [...tr.cells].map((td) => td.textContent.trim()));

    const vorher = zeilen();
    // Andere Achse: alle Geschwindigkeiten muessen sich aendern, die
    // Drehzahlen nach dem Schalten nicht - die haengen nur an den Ratios.
    const achse = document.querySelector('[data-field="perf_achse"]');
    achse.value = '4.11';
    achse.dispatchEvent(new Event('input'));
    const nachAchse = zeilen();

    achse.value = '3.50';
    achse.dispatchEvent(new Event('input'));
    // Setup B einschalten und laenger machen.
    document.getElementById('ratio_b_aktiv').checked = true;
    document.getElementById('ratio_b_md').value = '29/20';
    document.getElementById('ratio_b_g1').value = '34/15';
    ratiosGeaendert();
    const mitB = zeilen();

    return {
      vorherZeilen: vorher.length,
      tempoVorher: zahl(vorher[0][1]),
      tempoAchse: zahl(nachAchse[0][1]),
      drehzahlVorher: zahl(vorher[0][2]),
      drehzahlAchse: zahl(nachAchse[0][2]),
      mitBZeilen: mitB.length,
      namen: mitB.map((z) => z[0]),
      tempoB: zahl(mitB[1][1]),
      schalterTexte: [...document.querySelectorAll('.gearbox-toggles')]
        .map((e) => e.querySelectorAll('input[type=checkbox]').length)
    };
  });
  await p.close();

  assertEqual(r.vorherZeilen, 3, 'Ohne Setup B gehoeren drei Zeilen in die Tabelle');
  // 25/24 x 33/17 = 2.022; bei 6000/min, 2.13 m, Achse 3.50 sind das 108 km/h.
  assertEqual(r.tempoVorher, 108, 'Geschwindigkeit im 1. Gang mit Achse 3.50');
  // Mit 4.11 statt 3.50: 108 x 3.50/4.11 = 92.
  assertEqual(r.tempoAchse, 92, 'Die Achsuebersetzung wirkt nicht auf die Geschwindigkeit');
  assertEqual(r.drehzahlVorher, r.drehzahlAchse,
    'Die Achse darf die Drehzahl nach dem Schalten nicht veraendern');

  assertEqual(r.mitBZeilen, 4, 'Mit Setup B gehoeren vier Zeilen in die Tabelle');
  assert(r.namen[1].indexOf('Vergleich') !== -1,
    'Setup B steht nicht als zweite Zeile: ' + r.namen.join(' | '));
  // 29/20 x 34/15 = 3.287 -> 6000/min ergibt 67 km/h.
  assertEqual(r.tempoB, 67, 'Setup B rechnet nicht mit der eigenen Auswahl');
  assert(r.schalterTexte.every((n) => n === 4),
    'Nicht jeder Diagrammblock hat vier Umschalter: ' + r.schalterTexte.join(','));
});

await test('die Startseite nennt die gerechneten Uebersetzungen', async () => {
  // Der Steckbrief trug "2.588 / 1.714 / 1.182 / 1.000 - Main Drive 22/27"
  // fest im Markup: der Widerspruch stand eine Seite neben seiner Aufloesung.
  const idx = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  assert(!idx.includes('2.588'), 'Die widerlegten Ratios stehen wieder im Markup');
  const p = await open('index.html');
  const txt = await p.page.evaluate(() => {
    const el = document.getElementById('ratioKurz');
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  await p.close();
  assert(txt, 'Kein #ratioKurz im Steckbrief');
  assert(txt.indexOf('2.022 / 1.339 / 1.042 / 1.000') === 0,
    'Steckbrief zeigt: ' + txt);
  assert(txt.includes('25/24'), 'Der Main Drive fehlt: ' + txt);
});

await test('Kardanwelle: ein Verfahren, nicht sieben Mahnungen', async () => {
  // Der Hinweis "messen, nicht rechnen" stand an sieben Stellen und nannte
  // nirgends das Verfahren. Geprueft wird die Anweisung, nicht das Stichwort:
  // ein Verweis auf den Schritt darf bleiben, die Handgriffe gehoeren dorthin.
  const bl = fs.readFileSync(path.join(REPO_ROOT, 'build-log.html'), 'utf8');
  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');

  assert(/id="p6_driveshaft_card"/.test(bl), 'Der Messschritt fehlt');
  // Die drei Angaben, ohne die die Messung falsch wird.
  assert(bl.includes('h&auml;ngende Achse'),
    'Der wichtigste Fehler - haengende Achse - ist nicht benannt');
  assert(/3\/4&quot; bis 1&quot;/.test(bl), 'Die Einschubreserve des Slip Yoke fehlt');
  assert(bl.includes('Mitte Kreuzgelenk vorn bis Mitte Kreuzgelenk hinten'),
    'Die Messstrecke ist nicht benannt');
  // Und die beiden Gegenproben.
  assert(bl.includes('Gegenprobe durch Einfedern') && bl.includes('Gegenprobe durch Ausfedern'),
    'Die Gegenproben gegen Aufsetzen und zu wenig Spline-Eingriff fehlen');
  ['p6_ds_length', 'p6_ds_length2', 'p6_ds_yoke_out', 'p6_ds_spline', 'p6_ds_pinion']
    .forEach((f) => assert(bl.includes('data-field="' + f + '"'), 'Messfeld fehlt: ' + f));

  // In den Specs steht die Mahnung nur noch einmal je Ort, mit Verweis.
  const mahnungen = (specs.match(/messen, nicht rechnen/g) || []).length;
  assertEqual(mahnungen, 0, 'Die Mahnung steht noch in den Specs statt des Verweises');
  assert(specs.includes('build-log.html#p6_driveshaft_card'),
    'Die Specs verweisen nicht auf das Verfahren');

  const p = await open('build-log.html');
  const nummern = await p.page.evaluate(() => {
    const phase = document.getElementById('phase6body');
    return [...phase.querySelectorAll('.step-title')].map((e) => parseInt(e.textContent, 10));
  });
  await p.close();
  assertEqual(nummern, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    'Phase 6 ist nicht lueckenlos durchnummeriert: ' + nummern.join(','));
});

await test('Spezifikationswerte folgen der Eingabe im Build Log', async () => {
  // In den Specs stand "26 Spline - Validierung ausstehend" als fester Text,
  // waehrend im Build Log das Feld p1_spline_count danebenlag. Wer abzaehlte
  // und eintrug, sah dieselbe Vorbelegung und dieselbe Warnung: die Eingabe
  // hatte keine Wirkung. Geprueft wird beides - der offene Zustand nennt den
  // Weg nach vorn, der ermittelte zeigt den eingetragenen Wert.
  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');
  assert(!/26 Spline &ndash; &#9888; Validierung ausstehend/.test(specs),
    'Der feste Spline-Text steht wieder in den Specs');

  const p = await open('specs.html');

  const offen = await p.page.evaluate(() => {
    const el = document.querySelector('[data-befund="p1_spline_count"]');
    return el ? { text: el.textContent.replace(/\s+/g, ' ').trim(), zustand: el.dataset.zustand } : null;
  });
  assert(offen, 'Keine gebundene Anzeige fuer p1_spline_count');
  assertEqual(offen.zustand, 'offen', 'Ohne Eingabe muesste der Zustand offen sein');
  assert(offen.text.includes('Vorgabe 26'), 'Die Vorgabe fehlt: ' + offen.text);
  assert(offen.text.includes('im Build Log eintragen'),
    'Der offene Zustand nennt keinen Weg nach vorn: ' + offen.text);
  // Die Einheit gehoert an den Messwert, nicht an die Vorgabe - sonst stand
  // dort "22" / 56 cm (Sekundaerquelle) mm". Geprueft wird gegen die
  // Attribute, nicht gegen ein geratenes Textmuster: die erste Fassung dieses
  // Tests suchte /cm\)? mm/ und traf die Stelle nicht, weil vor dem " mm" ein
  // ")" stand. Sie war damit wertlos - die Gegenprobe hat es gezeigt.
  const laenge = await p.page.evaluate(() => {
    const el = document.querySelector('[data-befund="p1_len_total"]');
    if (!el) return null;
    return {
      text: el.textContent.replace(/\s+/g, ' ').trim(),
      vorgabe: el.dataset.vorgabe,
      einheit: el.dataset.einheit
    };
  });
  assert(laenge && laenge.einheit, 'Kein Laengenfeld mit Einheit zum Pruefen');
  // Die Vorgabe muss unmittelbar vor dem Weg nach vorn enden. Steht die
  // Einheit dazwischen, ist sie an die falsche Stelle geraten.
  const nachVorgabe = laenge.text.split('Vorgabe ' + laenge.vorgabe.replace('&quot;', '"'))[1] || '';
  assert(!nachVorgabe.trim().startsWith(laenge.einheit),
    'Einheit haengt an der Vorgabe: ' + laenge.text);

  // Jetzt eintragen - und zwar einen anderen Wert als die Vorbelegung, sonst
  // laesst sich nicht unterscheiden, ob die Anzeige rechnet oder raet.
  const ermittelt = await p.page.evaluate(() => {
    renderBefunde({ p1_spline_count: '24', p1_yoke_count: '31' });
    const lies = (f) => {
      const el = document.querySelector('[data-befund="' + f + '"]');
      return { text: el.textContent.replace(/\s+/g, ' ').trim(), zustand: el.dataset.zustand };
    };
    return { spline: lies('p1_spline_count'), yoke: lies('p1_yoke_count') };
  });
  await p.close();

  assertEqual(ermittelt.spline.zustand, 'ermittelt', 'Eingetragener Wert bleibt offen');
  assert(ermittelt.spline.text.indexOf('24 Spline') === 0,
    'Specs zeigen nicht den eingetragenen Wert: ' + ermittelt.spline.text);
  assert(!ermittelt.spline.text.includes('Vorgabe'),
    'Die Vorgabe steht noch daneben: ' + ermittelt.spline.text);
  assert(!ermittelt.spline.text.includes('offen'),
    'Die Warnung bleibt trotz Eingabe stehen: ' + ermittelt.spline.text);
  assert(/\bB$/.test(ermittelt.spline.text),
    'Quellenklasse wechselt nicht auf B (Ist-Befund): ' + ermittelt.spline.text);
  assert(ermittelt.yoke.text.indexOf('31 Tooth') === 0,
    'Yoke zeigt nicht 31, sondern: ' + ermittelt.yoke.text);
});

await test('Baureihe, Bauart und Aufbau sind waehlbar, nicht festgeschrieben', async () => {
  // In den Specs stand "Road Race, Revision 2 (Dog Ring Low) - Jerico-
  // Baureihenbezeichnung Oval/Road Race" als Satz, und "Tex Racing Ent. Inc."
  // ebenso. Beides laesst sich am Getriebe ablesen, also wird es ausgewaehlt
  // und eingetragen - A-01 nennt die Baureihen, und die Zerlegesequenz haengt
  // daran.
  const bl = fs.readFileSync(path.join(REPO_ROOT, 'build-log.html'), 'utf8');
  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');
  assert(!/Jerico-Baureihenbezeichnung/.test(specs),
    'Der feste Typ-Satz steht wieder in den Specs');
  assert(!/>Tex Racing Ent. Inc. \(Aufkleber/.test(specs),
    'Der Aufbauer steht wieder als fester Text');

  const p = await open('build-log.html');
  const felder = await p.page.evaluate(() => {
    const sel = (f) => {
      const el = document.querySelector('select[data-field="' + f + '"]');
      return el ? [...el.options].map((o) => o.value || o.text).filter(Boolean) : null;
    };
    return {
      familie: sel('p1_typ_familie'),
      gehaeuse: sel('p1_typ_gehaeuse'),
      rev: sel('p1_typ_rev'),
      aufbau: !!document.querySelector('input[data-field="p1_aufbau"]')
    };
  });
  await p.close();

  assert(felder.familie, 'Keine Auswahl fuer die Baureihe');
  // Die vier Baureihen, die A-01 nennt - nicht erfundene.
  ['Top & Bottom Loader Road Race', 'Winston Cup', 'Clutch-assisted Drag Race', 'Endurance']
    .forEach((b) => assert(felder.familie.some((x) => x.indexOf(b.split(' ')[0]) === 0 || x === b),
      'Baureihe fehlt in der Auswahl: ' + b + ' (vorhanden: ' + felder.familie.join(' | ') + ')'));
  assert(felder.gehaeuse && felder.gehaeuse.length >= 3, 'Keine Auswahl fuer die Gehaeusebauart');
  assert(felder.rev && felder.rev.length >= 2, 'Keine Auswahl fuer die Ausfuehrung');
  assert(felder.aufbau, 'Kein Eingabefeld fuer den Aufbauer');

  // Und die Specs zeigen, was gewaehlt wurde.
  const sp = await open('specs.html');
  const gezeigt = await sp.page.evaluate(() => {
    renderBefunde({ p1_typ_familie: 'Winston Cup', p1_aufbau: 'Jerico Performance' });
    const lies = (f) => document.querySelector('[data-befund="' + f + '"]').textContent
      .replace(/\s+/g, ' ').trim();
    return { familie: lies('p1_typ_familie'), aufbau: lies('p1_aufbau') };
  });
  await sp.close();
  assert(gezeigt.familie.indexOf('Winston Cup') === 0,
    'Specs zeigen nicht die gewaehlte Baureihe: ' + gezeigt.familie);
  assert(gezeigt.aufbau.indexOf('Jerico Performance') === 0,
    'Specs zeigen nicht den eingetragenen Aufbauer: ' + gezeigt.aufbau);
});

await test('eine abweichende Seriennummer wird gemeldet', async () => {
  // Steht am Gehaeuse eine andere Nummer als die dokumentierte, liegt ein
  // anderes Getriebe auf der Werkbank als das, was diese Seiten beschreiben.
  // Das darf nicht still durchgehen - dafuer ist data-abweichung="warnen" da.
  const p = await open('specs.html');
  const r = await p.page.evaluate(() => {
    const lies = () => {
      const el = document.querySelector('[data-befund="p1_case_number"]');
      return { text: el.textContent.replace(/\s+/g, ' ').trim(), zustand: el.dataset.zustand };
    };
    renderBefunde({ p1_case_number: 'RH02374' });
    const gleich = lies();
    renderBefunde({ p1_case_number: 'RH09999' });
    const anders = lies();
    renderBefunde({ p1_case_number: ' rh02374 ' });
    const schreibweise = lies();
    return { gleich: gleich, anders: anders, schreibweise: schreibweise };
  });
  await p.close();

  assertEqual(r.gleich.zustand, 'ermittelt', 'Die dokumentierte Nummer darf nicht warnen');
  assert(!r.gleich.text.includes('weicht'), 'Warnung bei passender Nummer: ' + r.gleich.text);
  assertEqual(r.anders.zustand, 'abweichend', 'Abweichende Nummer wird nicht gemeldet');
  assert(r.anders.text.includes('weicht von der dokumentierten RH02374 ab'),
    'Die Meldung nennt die dokumentierte Nummer nicht: ' + r.anders.text);
  // Gross-/Kleinschreibung und Leerzeichen sind keine Abweichung.
  assertEqual(r.schreibweise.zustand, 'ermittelt',
    'Andere Schreibweise wird als Abweichung gemeldet: ' + r.schreibweise.text);
});

await test('Ausruecklager und Schaltgestaenge nennen ein Verfahren', async () => {
  // Beide standen in den Specs nur als Mahnung - "Typ und Retainer-Durchmesser
  // noch zu klaeren", "Bohrmuster Jerico != Toploader, Anpassung noetig" - und
  // nirgends, wie man es ermittelt.
  const bl = fs.readFileSync(path.join(REPO_ROOT, 'build-log.html'), 'utf8');
  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');

  assert(/id="p1_clutch_card"/.test(bl), 'Schritt zum Ausruecklager fehlt');
  assert(/id="p1_shifter_card"/.test(bl), 'Schritt zum Schaltgestaenge fehlt');

  // Ausruecklager: die zwei Messungen, die die Entscheidung tragen, und das
  // Toleranzfenster des hydraulischen Falls.
  assert(bl.includes('F&uuml;hrungsrohr'), 'Das Fuehrungsrohr ist nicht benannt');
  assert(/0,100&quot; bis 0,250&quot;/.test(bl),
    'Das Fenster fuer Mass A minus B fehlt');
  assert(bl.includes('Oberkante der Druckplattenfinger'),
    'Der Messpunkt fuer Mass A fehlt');
  ['p1_tob_retainer_od', 'p1_tob_bore', 'p1_tob_dim_a', 'p1_tob_dim_b']
    .forEach((f) => assert(bl.includes('data-field="' + f + '"'), 'Messfeld fehlt: ' + f));

  // Schaltgestaenge: die Primaerquelle sagt, dass vor dem Deckel eingestellt
  // wird. Das ist die Anweisung, die man sonst zu spaet erfaehrt.
  assert(bl.includes('Einstellen geh&ouml;rt vor den Deckel'),
    'Der Hinweis aus A-01 zum Einstellen vor dem Top Cover fehlt');
  assert(bl.includes('14,5&quot; und 25&quot;'), 'Der Bereich der Aufnahmepositionen fehlt');
  ['p1_sh_tunnel', 'p1_sh_position', 'p1_sh_muster', 'p1_sh_freigang']
    .forEach((f) => assert(bl.includes('data-field="' + f + '"'), 'Messfeld fehlt: ' + f));

  // Und die Specs mahnen nicht mehr, sondern binden an die Felder.
  assert(!/noch zu kl&auml;ren/.test(specs), 'Die Mahnung zum Ausruecklager steht noch');
  assert(!/Anpassung n&ouml;tig/.test(specs), 'Die Mahnung zum Schaltgestaenge steht noch');

  const p = await open('build-log.html');
  const nummern = await p.page.evaluate(() => {
    const phase = document.getElementById('phase1body');
    return [...phase.querySelectorAll('.step-title')].map((e) => parseInt(e.textContent, 10));
  });
  await p.close();
  assertEqual(nummern, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'Phase 1 ist nicht lueckenlos durchnummeriert: ' + nummern.join(','));
});

await test('Zaehne zaehlen steht als Schritt im Build Log', async () => {
  // Der Main Drive laesst sich nicht durch Drehen messen - im 4. Gang ist das
  // Getriebe direkt. Dass das dasteht, ist der Kern der Anleitung.
  const bl = fs.readFileSync(path.join(REPO_ROOT, 'build-log.html'), 'utf8');
  const specs = fs.readFileSync(path.join(REPO_ROOT, 'specs.html'), 'utf8');
  assert(/id="p3_ratios_card"/.test(bl), 'Schritt zum Zaehlen fehlt');
  assert(bl.includes('Durch Drehen geht es nicht'),
    'Der Hinweis, dass Drehen den Main Drive nicht liefert, fehlt');
  assert(bl.includes('Zweimal z&auml;hlen'), 'Die Zweitzaehlung fehlt');
  // Beide Seiten verweisen aufeinander: Werte hier, Handgriff dort.
  assert(bl.includes('specs.html#sec-ratios'), 'Build Log verweist nicht auf den Rechner');
  assert(specs.includes('build-log.html#p3_ratios_card'),
    'Specs verweisen nicht auf die Zaehlanleitung');

  const p = await open('build-log.html');
  const nummern = await p.page.evaluate(() => {
    const phase = document.getElementById('phase3body');
    return [...phase.querySelectorAll('.step-title')]
      .map((e) => parseInt(e.textContent, 10));
  });
  await p.close();
  assertEqual(nummern, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    'Phase 3 ist nicht lueckenlos durchnummeriert: ' + nummern.join(','));
});

await test('sw.js listet nur Dateien, die es gibt', async () => {
  const sw = fs.readFileSync(path.join(REPO_ROOT, 'sw.js'), 'utf8');
  const urls = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]);
  assert(urls.length > 5, 'Dateiliste im Service Worker sieht leer aus');
  for (const rel of urls) {
    if (!rel) continue;   // der Ordner selbst
    assert(fs.existsSync(path.join(REPO_ROOT, rel)), 'fehlt im Repo: ' + rel);
  }
});

await test('sw.js cacht jede Seite', async () => {
  // Die Gegenrichtung zum Test darueber: eine neue Seite, die nicht in der
  // Liste steht, ist offline nicht erreichbar - und das faellt erst in der
  // Werkstatt ohne Empfang auf.
  const sw = fs.readFileSync(path.join(REPO_ROOT, 'sw.js'), 'utf8');
  for (const seite of PAGES) {
    assert(sw.includes("'./" + seite + "'"), seite + ' fehlt in urlsToCache');
  }
});

await test('search.js sucht nur in Seiten, die es gibt', async () => {
  // Die Liste stammte aus dem Motor-Projekt und zeigte auf dessen docs/-Seiten.
  // Jede Suche loeste sechs 404 aus, still in der Konsole.
  const js = fs.readFileSync(path.join(REPO_ROOT, 'search.js'), 'utf8');
  const urls = [...js.matchAll(/\{\s*url:\s*'([^']+)'/g)].map((m) => m[1]);
  assert(urls.length > 1, 'Seitenliste in search.js sieht leer aus');
  for (const rel of urls) {
    assert(fs.existsSync(path.join(REPO_ROOT, rel)), 'search.js verweist auf fehlende Datei: ' + rel);
  }
  assertEqual(urls.slice().sort(), PAGES.slice().sort());
});

await test('Service Worker und Manifest kommen ohne absolute Pfade aus', async () => {
  // GitHub Pages unterscheidet Gross- und Kleinschreibung im Pfad. Ein
  // absoluter Pfad mit dem Repo-Namen ist damit eine Fehlerquelle, die erst
  // auf der veroeffentlichten Seite auffaellt - und dort den Offline-Betrieb
  // komplett aushebelt.
  for (const datei of ['sw.js', 'manifest.json']) {
    const text = fs.readFileSync(path.join(REPO_ROOT, datei), 'utf8');
    const treffer = text.match(/["']\/[A-Za-z0-9._-]+\//g) || [];
    assertEqual(treffer, [], datei + ' enthaelt absolute Pfade');
  }
});

// ---------------------------------------------------------------------------
suite('Seitengeruest');

for (const file of PAGES) {
  await test(file + ': laedt ohne Javascript-Fehler', async () => {
    const p = await open(file);
    assertEqual(p.errors, [], 'Fehler auf ' + file);
    await p.close();
  });

  await test(file + ': Version steht im Titelblock', async () => {
    const p = await open(file);
    const shown = await p.page.evaluate(() => {
      const el = document.getElementById('appVersion');
      if (!el) return null;
      return { text: el.textContent.trim(), imTitel: !!el.closest('.header-title') };
    });
    assert(shown, 'Kein #appVersion auf ' + file);
    assert(/^v\d+ \u00b7 \d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}$/.test(shown.text),
      'Version sieht falsch aus: ' + shown.text);
    assert(shown.imTitel, 'Version steht nicht im Titelblock');
    await p.close();
  });

  await test(file + ': Navigation zeigt alle vier Seiten', async () => {
    const p = await open(file);
    const hrefs = await p.page.$$eval('.nav-item', (els) => els.map((e) => e.getAttribute('href')));
    assertEqual(hrefs.sort(), ['build-log.html', 'index.html', 'performance.html', 'specs.html']);
    const aktiv = await p.page.$$eval('.nav-item.active', (els) => els.length);
    assertEqual(aktiv, 1, 'Genau eine Seite muss aktiv sein');
    await p.close();
  });

  await test(file + ': ohne Token meldet die Kopfzeile "Lokal"', async () => {
    const p = await open(file);
    const txt = await p.page.textContent('#syncBadge');
    assert(txt.includes('Lokal'), 'Sync-Abzeichen zeigt: ' + txt);
    await p.close();
  });
}

// ---------------------------------------------------------------------------
suite('Build Log: Kapitel, Status und Fortschritt');

await test('sechs Phasen mit je eigenem Fortschrittsbalken', async () => {
  const p = await open('build-log.html');
  const phasen = await p.page.$$eval('.phase-banner', (els) => els.length);
  assertEqual(phasen, 6);
  for (let i = 1; i <= 6; i++) {
    assert(await p.page.$('#prog' + i), 'Balken fuer Phase ' + i + ' fehlt');
  }
  await p.close();
});

await test('jedes Kapitel hat Status, Befunde und Anleitung', async () => {
  const p = await open('build-log.html');
  const zahlen = await p.page.evaluate(() => ({
    karten: document.querySelectorAll('.step-card').length,
    status: document.querySelectorAll('.step-status[data-field]').length,
    befunde: document.querySelectorAll('.findings[data-findings]').length,
    anleitung: document.querySelectorAll('.step-guide').length
  }));
  assert(zahlen.karten > 40, 'Zu wenige Kapitel: ' + zahlen.karten);
  assertEqual(zahlen.status, zahlen.karten, 'Nicht jedes Kapitel hat einen Status');
  assertEqual(zahlen.befunde, zahlen.karten, 'Nicht jedes Kapitel hat eine Befundliste');
  assertEqual(zahlen.anleitung, zahlen.karten, 'Nicht jedes Kapitel hat eine Anleitung');
  await p.close();
});

await test('Kapitel-Kennungen sind eindeutig', async () => {
  const p = await open('build-log.html');
  const ids = await p.page.$$eval('.step-status[data-field]', (els) => els.map((e) => e.dataset.field));
  const doppelt = ids.filter((id, i) => ids.indexOf(id) !== i);
  assertEqual(doppelt, [], 'Doppelte Kapitel-Kennungen');
  await p.close();
});

await test('Status durchlaeuft offen, in Arbeit, erledigt', async () => {
  const p = await open('build-log.html');
  const werte = await p.page.evaluate(() => {
    const btn = document.querySelector('.step-status[data-field]');
    const out = [btn.value];
    for (let i = 0; i < 3; i++) { btn.click(); out.push(btn.value); }
    return out;
  });
  assertEqual(werte, ['', 'wip', 'done', ''], 'Statusfolge stimmt nicht');
  await p.close();
});

await test('"in Arbeit" zaehlt halb im Fortschritt', async () => {
  // Sonst steht der Balken tagelang still, obwohl gearbeitet wird.
  const p = await open('build-log.html');
  const breite = await p.page.evaluate(() => {
    const phase = document.getElementById('phase1');
    const btns = phase.querySelectorAll('.step-status[data-field]');
    btns[0].click();                        // -> wip
    updateProgress();
    const wip = document.getElementById('prog1').style.width;
    btns[0].click();                        // -> done
    updateProgress();
    return { wip: wip, done: document.getElementById('prog1').style.width, n: btns.length };
  });
  const halb = (0.5 / breite.n * 100);
  assert(Math.abs(parseFloat(breite.wip) - halb) < 0.01, 'wip zaehlt nicht halb: ' + breite.wip);
  assert(parseFloat(breite.done) > parseFloat(breite.wip), 'erledigt zaehlt nicht mehr als in Arbeit');
  await p.close();
});

await test('Befund anlegen, umschalten und entfernen', async () => {
  const p = await open('build-log.html');
  p.page.on('dialog', (d) => d.accept());
  const ergebnis = await p.page.evaluate(() => {
    const kapitel = document.querySelector('.findings[data-findings]').dataset.findings;
    addFinding(kapitel);
    const nachAnlegen = Findings.forChapter(kapitel).length;
    const id = Findings.forChapter(kapitel)[0].id;
    Findings.update(id, { text: 'Zahn am 3. Gang ausgebrochen' });
    cycleFinding(kapitel, id);
    const status = Findings.forChapter(kapitel)[0].status;
    Findings.remove(id);
    return { nachAnlegen, status, nachLoeschen: Findings.forChapter(kapitel).length };
  });
  assertEqual(ergebnis.nachAnlegen, 1, 'Befund wurde nicht angelegt');
  assertEqual(ergebnis.status, 'wip', 'Status wurde nicht weitergeschaltet');
  assertEqual(ergebnis.nachLoeschen, 0, 'Befund wurde nicht entfernt');
  await p.close();
});

// ---------------------------------------------------------------------------
suite('Messwerte');

await test('Messwert wird lokal gespeichert und wieder angezeigt', async () => {
  const p = await open('build-log.html');
  await p.page.evaluate(() => {
    const el = document.querySelector('[data-field="p3_runout_rear"]');
    el.value = '.0012';
    autoSave();
  });
  await p.page.waitForTimeout(800);
  const gespeichert = await p.page.evaluate(
    () => JSON.parse(localStorage.getItem('jericoBuildLog') || '{}').p3_runout_rear);
  assertEqual(gespeichert, '.0012', 'Messwert nicht im Speicher');

  await p.page.reload();
  await p.page.waitForTimeout(900);
  const wieder = await p.page.inputValue('[data-field="p3_runout_rear"]');
  assertEqual(wieder, '.0012', 'Messwert nach dem Neuladen weg');
  await p.close();
});

await test('geleertes Feld bleibt geleert', async () => {
  // Frueher hat ein leeres Feld beim naechsten Laden den alten Wert zurueckbekommen.
  const p = await open('build-log.html');
  await p.page.evaluate(() => {
    const el = document.querySelector('[data-field="p3_runout_front"]');
    el.value = '.002'; autoSave();
  });
  await p.page.waitForTimeout(800);
  await p.page.evaluate(() => {
    const el = document.querySelector('[data-field="p3_runout_front"]');
    el.value = ''; autoSave();
  });
  await p.page.waitForTimeout(800);
  await p.page.reload();
  await p.page.waitForTimeout(900);
  const wieder = await p.page.inputValue('[data-field="p3_runout_front"]');
  assertEqual(wieder, '', 'Geleertes Feld kam zurueck');
  await p.close();
});

await test('Speicher liegt unter eigener Kennung, nicht beim Motor-Build', async () => {
  // Beide Seiten liegen auf derselben Origin - gleiche Schluessel wuerden sich
  // gegenseitig ueberschreiben.
  const quellen = ['app.js', 'findings.js', 'gallery.js'];
  for (const datei of quellen) {
    const text = fs.readFileSync(path.join(REPO_ROOT, datei), 'utf8');
    for (const schluessel of ['engineBuildLog', 'engineFindings', 'engineGalleryMeta', 'engineBuildLang']) {
      assert(!text.includes("'" + schluessel + "'"), datei + ' benutzt noch ' + schluessel);
    }
  }
});

// ---------------------------------------------------------------------------
suite('Startseite: Fortschritt aus dem Build Log');

await test('Phasenuebersicht zeigt den gespeicherten Stand', async () => {
  const p = await open('build-log.html');
  const ersteId = await p.page.evaluate(() => {
    const btn = document.querySelector('#phase1 .step-status[data-field]');
    btn.click(); btn.click();          // -> done
    autoSave();
    return btn.dataset.field;
  });
  await p.page.waitForTimeout(800);
  await p.page.goto(base + '/index.html');
  await p.page.waitForTimeout(900);
  const zeile = await p.page.textContent('#dashCount1');
  assert(zeile.startsWith('1 / '), 'Startseite zeigt ' + zeile + ' fuer ' + ersteId);
  await p.close();
});

await test('Phasenzuordnung der Startseite passt zum Build Log', async () => {
  const idx = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const bl = fs.readFileSync(path.join(REPO_ROOT, 'build-log.html'), 'utf8');
  const map = JSON.parse((idx.match(/var PHASEN = (\{.*?\});/s) || [])[1]);
  const imLog = [...bl.matchAll(/class="step-status" data-field="([^"]+)"/g)].map((m) => m[1]);
  const inMap = Object.values(map).flat();
  assertEqual(inMap.length, imLog.length, 'Startseite kennt eine andere Anzahl Kapitel');
  for (const id of inMap) assert(imLog.includes(id), 'Unbekanntes Kapitel auf der Startseite: ' + id);
});

// ---------------------------------------------------------------------------
suite('Inhaltliche Korrekturen gegen die Primaerquellen');

// Diese Pruefungen halten Korrekturen fest, die aus einem Abgleich mit den
// Original-PDFs von Jerico stammen. Sie verhindern, dass eine der Aussagen
// beim naechsten Ueberarbeiten unbemerkt zurueckkommt.

await test('keine Seite behauptet Kupplungsschlupf als Vorgabe fuer dieses Getriebe', async () => {
  // "CLUTCH SLIPPAGE IS A MUST" steht im Break-In-Sheet ausschliesslich unter
  // "FOR CLUTCHLESS DRAG RACE TRANSMISSIONS ONLY".
  for (const datei of PAGES) {
    const text = fs.readFileSync(path.join(REPO_ROOT, datei), 'utf8');
    assert(!/Kein Schlupf = Getriebeschaden/.test(text), datei + ': alte Kupplungs-Aussage');
    assert(!/muss die Kupplung kurz schlupfen/.test(text), datei + ': alte Kupplungs-Aussage');
  }
});

await test('0,0015" steht nicht als Grenzwert', async () => {
  // Original: "Normal shaft runout will average 0.0015" per any one journal."
  for (const datei of PAGES) {
    const text = fs.readFileSync(path.join(REPO_ROOT, datei), 'utf8');
    assert(!/max\.? 0,0015/.test(text), datei + ': 0,0015" als Maximum');
    assert(!/Normal max\. 0,0015/.test(text), datei + ': 0,0015" als Maximum');
  }
});

await test('Vorgelegewelle: buendig bis wenige Tausendstel, nicht "niemals tiefer"', async () => {
  const text = fs.readFileSync(path.join(REPO_ROOT, 'build-log.html'), 'utf8');
  assert(!/niemals tiefer/.test(text), 'zu strenge Vorgabe steht wieder drin');
  assert(/wenige Tausendstel/.test(text), 'die zulaessige Toleranz fehlt');
});

await test('kein unbelegter Herstellerstatus, keine pauschale Quellenaussage', async () => {
  for (const datei of PAGES) {
    const text = fs.readFileSync(path.join(REPO_ROOT, datei), 'utf8');
    assert(!/wahrscheinlich inaktiv/.test(text), datei + ': unbelegte Aussage zum Hersteller');
    // Auf das Muster pruefen, nicht auf einen Wortlaut: die enge Fassung hat
    // "Alle Angaben auf dieser Seite stammen aus Klasse A" in specs.html
    // acht Versionen lang uebersehen.
    assert(!/Alle (Werte|Angaben)[^<.]{0,60}stammen aus/.test(text),
      datei + ': pauschale Quellenaussage');
    assert(!/B = verifizierte Sekund/.test(text),
      datei + ': veraltetes Quellenklassen-Schema A/B/C statt A bis F');
  }
});

await test('Specs erklaeren die Quellenklassen und benutzen sie', async () => {
  const p = await open('specs.html');
  const zahlen = await p.page.evaluate(() => ({
    legende: !!document.querySelector('.src-a'),
    benutzt: document.querySelectorAll('.spec-value .src, .spec-item .src').length
  }));
  assert(zahlen.legende, 'Legende der Quellenklassen fehlt');
  assert(zahlen.benutzt >= 5, 'Quellenklassen werden kaum benutzt: ' + zahlen.benutzt);
  await p.close();
});

// ---------------------------------------------------------------------------
suite('Sprache und Glossar');

await test('Umschalten auf Englisch blendet die deutschen Spans aus', async () => {
  const p = await open('build-log.html');
  const sichtbar = await p.page.evaluate(() => {
    setLang('en');
    const de = document.querySelector('.step-title span.de');
    const en = document.querySelector('.step-title span.en');
    return { de: getComputedStyle(de).display, en: getComputedStyle(en).display };
  });
  assertEqual(sichtbar.de, 'none', 'Deutscher Text bleibt sichtbar');
  assert(sichtbar.en !== 'none', 'Englischer Text bleibt versteckt');
  await p.close();
});

await test('Glossar oeffnet und filtert', async () => {
  const p = await open('build-log.html');
  const treffer = await p.page.evaluate(() => {
    showGuide('guide-glossary');
    document.getElementById('glossarySearch').value = 'spirolox';
    filterGlossary();
    const sichtbare = [...document.querySelectorAll('.glossary-entry:not(.hidden)')];
    return {
      sichtbar: sichtbare.length,
      gesamt: document.querySelectorAll('.glossary-entry').length,
      // Gesucht wird im ganzen Eintrag, also auch in den Verweisen - der
      // Eintrag "Spirolox" selbst muss aber dabei sein.
      mitBegriff: sichtbare.some((e) => e.querySelector('.glossary-term').textContent.includes('Spirolox'))
    };
  });
  assert(treffer.gesamt > 15, 'Glossar ist zu duenn: ' + treffer.gesamt);
  assert(treffer.sichtbar > 0 && treffer.sichtbar < treffer.gesamt,
    'Suche filtert nicht: ' + treffer.sichtbar + ' von ' + treffer.gesamt);
  assert(treffer.mitBegriff, 'Der Eintrag "Spirolox" fehlt in den Treffern');
  await p.close();
});

} finally {
  await browser.close();
  server.close();
}

process.exit(summary() ? 1 : 0);
