/**
 * ratios.js - Uebersetzungsrechner aus Zahnradzahlen.
 *
 * Bisher stand in Kapitel 2 eine feste Tabelle. Sie war nicht nur
 * unveraenderlich, sie war auch in sich widerspruechlich: der eingetragene
 * Main Drive 22/27 (0.815) kann keine der drei dokumentierten Ratios
 * erzeugen, und 1./2. Gang verlangen einen anderen Main Drive als der 3.
 *
 *   1. Gang  33/17 mit 22/27  = 1.582   dokumentiert war 2.588
 *   2. Gang  27/21 mit 22/27  = 1.048   dokumentiert war 1.714
 *   3. Gang  24/24 mit 22/27  = 0.815   dokumentiert war 1.182
 *
 * Statt eine der drei Angaben zur Wahrheit zu erklaeren, rechnet die Seite
 * jetzt aus dem, was am Getriebe abgezaehlt wird. Was eingestellt ist, steht
 * in den Auswahlfeldern und wird wie jedes andere Messwertfeld gespeichert
 * und synchronisiert.
 *
 * Zwei Setups statt einem
 * -----------------------
 * Setup A ist das verbaute Getriebe. Setup B ist ein Entwurf - ein anderer
 * Satz, den man gegen das Verbaute stellt, bevor man ihn kauft. B ist
 * vorbelegt wie A und abgeschaltet: ein Vergleich, der nichts vergleicht,
 * zeigt keine zweite Linie, und erfunden wird fuer B nichts.
 *
 * Wer die Werte braucht, holt sie ueber RATIOS.setup('a'|'b'). Die
 * Leistungsseite tut das - sie hatte dieselben Ratios ein zweites Mal fest
 * im Code, und zwar die widerlegten.
 *
 * Quelle der Auswahlmoeglichkeiten: A-03 Gear Ratio Chart (4speed_chart.pdf).
 * Die Chart-Formel lautet:
 *
 *   Gesamtuebersetzung = (Cluster / Input) x (Hauptwelle / Cluster)
 *                        \_ Main Drive _/   \_  Gangradpaar  _/
 *
 * Nachgerechnet gegen die Chart-Spalte 24/24 (Main Drive 1.000): alle
 * Zeilenwerte stimmen auf drei Nachkommastellen.
 */
(function (global) {
  'use strict';

  // Main Drive Sets aus A-03, Reihenfolge wie im Chart (lang nach kurz).
  var MAIN_DRIVES = [
    [29, 20], [28, 20], [29, 21], [28, 21], [27, 21], [27, 22],
    [26, 22], [26, 23], [25, 23], [25, 24], [24, 24], [24, 25]
  ];

  // Gangradpaare je Gang, ebenfalls aus A-03. Das Flag markiert die im Chart
  // grau hinterlegten Zeilen: "Special Case Modification Required".
  var GANGRAEDER = {
    g1: [[34, 15], [33, 15], [34, 16], [33, 17], [32, 18], [31, 18],
         [32, 19], [31, 19], [30, 20, true], [30, 21, true]],
    g2: [[29, 20], [28, 20], [29, 21], [28, 21], [27, 21], [27, 22]],
    g3: [[26, 22], [26, 23], [25, 23], [25, 24], [24, 24], [24, 25],
         [23, 25], [23, 26]]
  };

  var TOPLOADER = {
    close: [2.32, 1.69, 1.29, 1.00],
    wide:  [2.78, 1.93, 1.36, 1.00]
  };

  // Stand bei Einfuehrung: Main Drive am RH02374 abgezaehlt. Die
  // Gangradpaare stammen aus der alten festen Tabelle und sind noch nicht
  // am Teil geprueft - deshalb die Warnung in der Ausgabe.
  var VORGABE = { md: '25/24', g1: '33/17', g2: '27/21', g3: '24/24' };

  // Die beiden Setups. 'praefix' ist der Feldname-Stamm: Setup A behaelt die
  // Namen aus v16, sonst wuerde gespeicherte Auswahl beim Update verwaisen.
  var SETUPS = {
    a: { key: 'a', praefix: 'ratio_',   name: 'Verbaut',   farbe: '#2a78d6',
         behaelter: 'ratioWahl',  titel: 'Setup A &ndash; verbaut' },
    b: { key: 'b', praefix: 'ratio_b_', name: 'Vergleich', farbe: '#8b5cf6',
         behaelter: 'ratioWahlB', titel: 'Setup B &ndash; Vergleich' }
  };
  var SCHALTER_B = 'ratio_b_aktiv';   // Checkbox: Setup B mitzeichnen

  function alsText(paar) { return paar[0] + '/' + paar[1]; }
  function alsZahl(paar) { return paar[0] / paar[1]; }

  function findePaar(liste, text) {
    for (var i = 0; i < liste.length; i++) {
      if (alsText(liste[i]) === text) return liste[i];
    }
    return null;
  }

  function auswahl(feld, liste, vorgabe, beschriftung) {
    var teile = ['<div class="ratio-feld"><label for="' + feld + '">' + beschriftung + '</label>',
                 '<select id="' + feld + '" data-field="' + feld + '" onchange="ratiosGeaendert()">'];
    liste.forEach(function (p) {
      var t = alsText(p);
      var sonderfall = p[2] ? ' &ndash; Sonderfall' : '';
      teile.push('<option value="' + t + '"' + (t === vorgabe ? ' selected' : '') + '>'
               + t + ' &nbsp;(' + alsZahl(p).toFixed(3) + ')' + sonderfall + '</option>');
    });
    teile.push('</select></div>');
    return teile.join('');
  }

  /** Auswahlfelder eines Setups bauen, falls die Seite den Behaelter hat. */
  function baueBedienung(s) {
    var ziel = document.getElementById(s.behaelter);
    if (!ziel || ziel.dataset.gebaut) return;
    var p = s.praefix;
    var kopf = '';
    if (s.key === 'b') {
      // Der Schalter steht beim Setup, nicht bei den Diagrammen: wer B
      // einstellt, will es dort auch an- und abschalten.
      kopf = '<label class="ratio-schalter"><input type="checkbox" id="' + SCHALTER_B
           + '" data-field="' + SCHALTER_B + '" onchange="ratiosGeaendert()"> '
           + 'Setup B vergleichen</label>';
    }
    ziel.innerHTML = kopf
      + auswahl(p + 'md', MAIN_DRIVES, VORGABE.md, 'Main Drive (Cluster / Input)')
      + auswahl(p + 'g1', GANGRAEDER.g1, VORGABE.g1, '1. Gang (Hauptwelle / Cluster)')
      + auswahl(p + 'g2', GANGRAEDER.g2, VORGABE.g2, '2. Gang (Hauptwelle / Cluster)')
      + auswahl(p + 'g3', GANGRAEDER.g3, VORGABE.g3, '3. Gang (Hauptwelle / Cluster)');
    ziel.dataset.gebaut = '1';
  }

  /** Element oder null - auch dann, wenn es gar kein document gibt. */
  function feldEl(id) {
    if (typeof document === 'undefined' || !document.getElementById) return null;
    return document.getElementById(id);
  }

  function gelesen(feld, liste, vorgabeSchluessel) {
    var el = feldEl(feld);
    return findePaar(liste, el ? el.value : '') || findePaar(liste, VORGABE[vorgabeSchluessel]);
  }

  /** Ist Setup B eingeschaltet? Ohne Checkbox auf der Seite: nein. */
  function bAktiv() {
    var el = feldEl(SCHALTER_B);
    return !!(el && el.checked);
  }

  /**
   * Die vier Gesamtuebersetzungen eines Setups.
   *
   * Funktioniert auch auf Seiten ohne Auswahlfelder: dann greift ueberall
   * die Vorgabe. So rechnet die Leistungsseite nie mit anderen Zahlen als
   * die Spezifikation - das war der Fehler, den sie bis v16 hatte.
   */
  function setup(key) {
    var s = SETUPS[key] || SETUPS.a;
    var p = s.praefix;
    var md = gelesen(p + 'md', MAIN_DRIVES, 'md');
    var paare = [gelesen(p + 'g1', GANGRAEDER.g1, 'g1'),
                 gelesen(p + 'g2', GANGRAEDER.g2, 'g2'),
                 gelesen(p + 'g3', GANGRAEDER.g3, 'g3')];
    var mdz = alsZahl(md);
    var gaenge = paare.map(function (pp) {
      return { paar: pp, ratio: mdz * alsZahl(pp), sonderfall: !!pp[2] };
    });
    gaenge.push({ paar: null, ratio: 1.000, sonderfall: false });   // 4. Gang ist direkt
    return {
      key: s.key, name: s.name, farbe: s.farbe,
      md: md, mdRatio: mdz, gaenge: gaenge,
      ratios: gaenge.map(function (g) { return g.ratio; }),
      sonderfall: gaenge.some(function (g) { return g.sonderfall; })
    };
  }

  /** Alles, was gezeichnet werden soll - Setup B nur, wenn eingeschaltet. */
  function aktiveSetups() {
    var raus = [setup('a')];
    if (bAktiv()) raus.push(setup('b'));
    return raus;
  }

  function spreizung(ratios) { return ratios[0] / ratios[3]; }

  function zelle(wert, stark) {
    return '<td' + (stark ? ' style="font-weight:700;"' : '') + '>' + wert + '</td>';
  }

  /** Ergebnistabelle: Zaehne und Ratio je aktivem Setup, dann die Toploader. */
  function baueErgebnis(ziel) {
    var setups = aktiveSetups();

    var kopf = '<th>Gang</th>';
    setups.forEach(function (s) {
      kopf += '<th>' + s.name + ' Z&auml;hne</th><th>' + s.name + ' Ratio</th>';
    });
    kopf += '<th>Sprung</th><th>TL Close</th><th>TL Wide</th>';

    var zeilen = [];
    for (var i = 0; i < 4; i++) {
      var r = '<tr>' + zelle((i + 1) + '.');
      setups.forEach(function (s) {
        var g = s.gaenge[i];
        r += zelle(g.paar ? alsText(g.paar) + (g.sonderfall ? ' &#9888;' : '') : '&mdash; direkt');
        r += zelle(g.ratio.toFixed(3), true);
      });
      // Der Sprung bezieht sich auf Setup A - die Spalte traegt sonst zwei
      // Zahlen und sagt keine mehr.
      var sprung = i > 0 ? (setups[0].gaenge[i - 1].ratio / setups[0].gaenge[i].ratio) : null;
      r += zelle(sprung ? sprung.toFixed(3) : '&mdash;');
      r += zelle(TOPLOADER.close[i].toFixed(2));
      r += zelle(TOPLOADER.wide[i].toFixed(2));
      zeilen.push(r + '</tr>');
    }

    var mdZeile = setups.map(function (s) {
      return s.name + ' ' + alsText(s.md) + ' = <strong>' + s.mdRatio.toFixed(3) + '</strong>';
    }).join(' &nbsp;&middot;&nbsp; ');

    var spZeile = setups.map(function (s) {
      return s.name + ' <strong>' + spreizung(s.ratios).toFixed(2) + '</strong>';
    }).join(' &nbsp;&middot;&nbsp; ');

    ziel.innerHTML =
      '<div class="table-wrapper"><table class="data-table"><thead><tr>' + kopf
      + '</tr></thead><tbody>' + zeilen.join('') + '</tbody></table></div>'
      + '<div class="spec-item"><span class="spec-label">Main Drive</span>'
      + '<span class="spec-value">' + mdZeile + '</span></div>'
      + '<div class="spec-item"><span class="spec-label">Gesamtspreizung 1. zu 4.</span>'
      + '<span class="spec-value">' + spZeile
      + ' &nbsp;&middot;&nbsp; TL Close ' + (TOPLOADER.close[0] / TOPLOADER.close[3]).toFixed(2)
      + ' &nbsp;&middot;&nbsp; TL Wide ' + (TOPLOADER.wide[0] / TOPLOADER.wide[3]).toFixed(2)
      + '</span></div>'
      + (setups.some(function (s) { return s.sonderfall; })
          ? '<div class="warning-box">&#9888; Ein gew&auml;hltes Gangradpaar ist im Chart grau '
            + 'hinterlegt: <strong>Special Case Modification Required</strong>. Es passt nicht '
            + 'ohne Geh&auml;usebearbeitung.</div>'
          : '');
  }

  // Wer von den Uebersetzungen abhaengt, meldet sich hier an. Ein manueller
  // Uebernehmen-Knopf waere kein Ersatz: die Leistungsseite muss nachziehen,
  // sobald eine Auswahl sich aendert, sonst zeigt sie wieder alte Zahlen.
  var hoerer = [];
  function beiAenderung(fn) { if (typeof fn === 'function') hoerer.push(fn); }

  /**
   * Einzeiler fuer den Steckbrief auf der Startseite.
   *
   * Dort stand bis v16 "2.588 / 1.714 / 1.182 / 1.000 - Main Drive 22/27":
   * genau der Widerspruch, den Kapitel 2 inzwischen aufloest, nur eine Seite
   * weiter unangetastet. Jetzt kommt die Zeile aus derselben Rechnung.
   */
  function baueKurzfassung(ziel) {
    var a = setup('a');
    ziel.innerHTML = a.ratios.map(function (r) { return r.toFixed(3); }).join(' / ')
      + ' &ndash; Main Drive ' + alsText(a.md)
      + ' <span class="src src-f" title="Gangradpaare am Teil nachzuzaehlen">F</span>';
  }

  function renderRatios() {
    baueBedienung(SETUPS.a);
    baueBedienung(SETUPS.b);
    var kurz = feldEl('ratioKurz');
    if (kurz) baueKurzfassung(kurz);
    // Der Main Drive steht auch im Warnhinweis von Kapitel 2. Eine eingetippte
    // 25/24 dort waere beim naechsten Umstellen still falsch.
    var mdKurz = feldEl('ratioMdKurz');
    if (mdKurz) mdKurz.textContent = alsText(setup('a').md);
    var ziel = document.getElementById('ratioErgebnis');
    if (ziel) baueErgebnis(ziel);
    hoerer.forEach(function (fn) {
      try { fn(); } catch (e) { console.error('[ratios] Hoerer fehlgeschlagen:', e); }
    });
  }

  function ratiosGeaendert() {
    renderRatios();
    if (typeof autoSave === 'function') autoSave();
  }

  global.RATIOS = { MAIN_DRIVES: MAIN_DRIVES, GANGRAEDER: GANGRAEDER,
                    TOPLOADER: TOPLOADER, VORGABE: VORGABE, SETUPS: SETUPS,
                    setup: setup, aktiveSetups: aktiveSetups,
                    spreizung: spreizung, beiAenderung: beiAenderung,
                    // rechne() aus v16: Setup A, Feldnamen unveraendert.
                    rechne: function () { return setup('a'); } };
  global.renderRatios = renderRatios;
  global.ratiosGeaendert = ratiosGeaendert;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', renderRatios);
  }
})(typeof window !== 'undefined' ? window : globalThis);
