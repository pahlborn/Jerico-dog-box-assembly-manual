// Versionsdisziplin: wer eine ausgelieferte Datei aendert, zaehlt die Version
// hoch. Sonst nicht.
//
// Anlass: v13 ging zweimal raus. Zwei Staende an einem Nachmittag, beide unter
// derselben Nummer und derselben Cache-Version - im Journal stehen sie noch
// heute als zwei Eintraege mit demselben 'version: v13'. Ein Geraet, das den
// ersten Stand geladen hatte, bekam den zweiten nicht: der Service Worker sah
// denselben Cache-Namen. Aufgefallen ist es erst Wochen spaeter beim
// Nachlesen, weil kein Test danach gesucht hat.
//
// Die vorhandenen Tests sehen das nicht: sie pruefen, ob version.js, sw.js und
// changelog.js untereinander stimmen - nicht, ob sie zum ausgelieferten Stand
// passen. Dieser Test vergleicht daher den Commit gegen seine Basis.
//
// Aus dem Schwesterprojekt gt40-engine uebernommen, wo derselbe Fehler bei
// v54 passiert ist.
//
// Laeuft ohne Browser. Braucht Historie - im Workflow steht fetch-depth: 0.
//
// Lokal gegen einen beliebigen Stand:
//   node tests/release-guard.test.mjs <basis> <kopf>

import { execFileSync } from 'node:child_process';

// Die Buchfuehrung des Release selbst. Sie darf sich aendern, ohne dass
// deswegen schon wieder hochgezaehlt werden muesste.
const BUCHFUEHRUNG = ['version.js', 'sw.js', 'changelog.js'];

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function istAusgeliefert(pfad) {
  if (pfad.includes('/')) return false;              // nur die Wurzel
  if (BUCHFUEHRUNG.includes(pfad)) return false;
  return /\.(html|js|css)$/.test(pfad);
}

function versionIn(ref) {
  try {
    const s = git('show', ref + ':version.js');
    const m = s.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    return m ? m[1] : null;
  } catch { return null; }
}

function stempelIn(ref) {
  try {
    const s = git('show', ref + ':version.js');
    const m = s.match(/APP_BUILT\s*=\s*['"]([^'"]+)['"]/);
    return m ? m[1] : null;
  } catch { return null; }
}

// --- Basis bestimmen -------------------------------------------------------
let basis = process.argv[2];
const kopf = process.argv[3] || 'HEAD';
if (!basis) {
  const ziel = process.env.GITHUB_BASE_REF;            // gesetzt bei Pull Requests
  // Bei einem Pull Request steht der Ziel-Branch drin. Laesst er sich nicht
  // aufloesen - flache Klone, fehlende Remote-Refs -, tut es der erste
  // Elternteil: beim Merge-Ref eines PR ist das genau die Basis, bei einem
  // Push der Stand davor.
  if (ziel) {
    try { basis = git('merge-base', 'origin/' + ziel, kopf); } catch { basis = null; }
  }
  if (!basis) {
    try { basis = git('rev-parse', kopf + '^'); }
    catch {
      console.log('Kein Vorgaenger-Commit - nichts zu vergleichen.');
      process.exit(0);
    }
  }
}

// --- Vergleich -------------------------------------------------------------
const geaendert = git('diff', '--name-only', basis, kopf).split('\n').filter(Boolean);
const ausgeliefert = geaendert.filter(istAusgeliefert);

console.log('Basis : ' + git('rev-parse', '--short', basis) + '  ' + (versionIn(basis) || '?'));
console.log('Kopf  : ' + git('rev-parse', '--short', kopf) + '  ' + (versionIn(kopf) || '?'));

if (!ausgeliefert.length) {
  console.log('Keine ausgelieferte Datei geaendert - nichts zu pruefen.');
  process.exit(0);
}
console.log('Geaendert: ' + ausgeliefert.join(', '));

const fehler = [];
const alt = versionIn(basis);
const neu = versionIn(kopf);

if (alt && neu && alt === neu) {
  fehler.push(
    'APP_VERSION steht unveraendert auf ' + neu + ', obwohl ausgelieferte Dateien\n' +
    '  geaendert wurden. Damit gehen zwei verschiedene Staende unter derselben\n' +
    '  Nummer raus: die Release-Dokumentation kann den zweiten nicht nennen, und\n' +
    '  der Freigabezeitpunkt zeigt auf den ersten. Und der Service Worker liefert\n' +
    '  Geraeten mit dem alten Stand nichts Neues aus, weil CACHE_NAME gleich blieb.\n' +
    '  Zu tun: APP_VERSION und APP_BUILT in version.js hochzaehlen, CACHE_NAME in\n' +
    '  sw.js mitziehen, Eintrag in changelog.js ergaenzen.');
} else if (alt && neu) {
  // Hochgezaehlt - dann muss auch der Zeitstempel mitgehen. Nur pruefbar, wo
  // es einen gibt: APP_BUILT kam erst mit v16 dazu, davor ist beides null und
  // ein schlichter Vergleich wuerde faelschlich anschlagen.
  const sk = stempelIn(kopf);
  if (sk && sk === stempelIn(basis)) {
    fehler.push(
      'APP_VERSION ging von ' + alt + ' auf ' + neu + ', APP_BUILT blieb stehen.\n' +
      '  Der Freigabezeitpunkt wuerde einen aelteren Stand behaupten.');
  }
}

if (fehler.length) {
  console.error('\nVersionsdisziplin verletzt:\n');
  for (const f of fehler) console.error('- ' + f + '\n');
  process.exit(1);
}
console.log('Version und Zeitstempel passen zum ausgelieferten Stand.');
