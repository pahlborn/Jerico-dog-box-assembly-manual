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

  function baueBedienung() {
    var ziel = document.getElementById('ratioWahl');
    if (!ziel || ziel.dataset.gebaut) return;
    ziel.innerHTML =
        auswahl('ratio_md', MAIN_DRIVES, VORGABE.md, 'Main Drive (Cluster / Input)')
      + auswahl('ratio_g1', GANGRAEDER.g1, VORGABE.g1, '1. Gang (Hauptwelle / Cluster)')
      + auswahl('ratio_g2', GANGRAEDER.g2, VORGABE.g2, '2. Gang (Hauptwelle / Cluster)')
      + auswahl('ratio_g3', GANGRAEDER.g3, VORGABE.g3, '3. Gang (Hauptwelle / Cluster)');
    ziel.dataset.gebaut = '1';
  }

  function gelesen(feld, liste) {
    var el = document.getElementById(feld);
    return findePaar(liste, el ? el.value : '') || findePaar(liste, VORGABE[feld.slice(6)]);
  }

  /** Die vier Gesamtuebersetzungen aus der aktuellen Auswahl. */
  function rechne() {
    var md = gelesen('ratio_md', MAIN_DRIVES);
    var paare = [gelesen('ratio_g1', GANGRAEDER.g1),
                 gelesen('ratio_g2', GANGRAEDER.g2),
                 gelesen('ratio_g3', GANGRAEDER.g3)];
    var mdz = alsZahl(md);
    var raus = paare.map(function (p) {
      return { paar: p, ratio: mdz * alsZahl(p), sonderfall: !!p[2] };
    });
    raus.push({ paar: null, ratio: 1.000, sonderfall: false });   // 4. Gang ist immer direkt
    return { md: md, mdRatio: mdz, gaenge: raus };
  }

  function zelle(wert, stark) {
    return '<td' + (stark ? ' style="font-weight:700;"' : '') + '>' + wert + '</td>';
  }

  function renderRatios() {
    baueBedienung();
    var ziel = document.getElementById('ratioErgebnis');
    if (!ziel) return;
    var e = rechne();

    var zeilen = [];
    var sonderfall = false;
    e.gaenge.forEach(function (g, i) {
      if (g.sonderfall) sonderfall = true;
      var sprung = i > 0 ? (e.gaenge[i - 1].ratio / g.ratio) : null;
      zeilen.push('<tr>'
        + zelle((i + 1) + '.')
        + zelle(g.paar ? alsText(g.paar) + (g.sonderfall ? ' &#9888;' : '') : '&mdash; direkt')
        + zelle(g.ratio.toFixed(3), true)
        + zelle(sprung ? sprung.toFixed(3) : '&mdash;')
        + zelle(TOPLOADER.close[i].toFixed(2))
        + zelle(TOPLOADER.wide[i].toFixed(2))
        + '</tr>');
    });

    var spreizung = e.gaenge[0].ratio / e.gaenge[3].ratio;
    var spCloseTl = TOPLOADER.close[0] / TOPLOADER.close[3];
    var spWideTl = TOPLOADER.wide[0] / TOPLOADER.wide[3];

    ziel.innerHTML =
      '<div class="table-wrapper"><table class="data-table"><thead><tr>'
      + '<th>Gang</th><th>Z&auml;hne</th><th>Ratio</th><th>Sprung</th>'
      + '<th>TL Close</th><th>TL Wide</th></tr></thead><tbody>'
      + zeilen.join('') + '</tbody></table></div>'
      + '<div class="spec-item"><span class="spec-label">Main Drive</span><span class="spec-value">'
      + alsText(e.md) + ' = <strong>' + e.mdRatio.toFixed(3) + '</strong></span></div>'
      + '<div class="spec-item"><span class="spec-label">Gesamtspreizung 1. zu 4.</span>'
      + '<span class="spec-value"><strong>' + spreizung.toFixed(2) + '</strong>'
      + ' &nbsp;&middot;&nbsp; TL Close ' + spCloseTl.toFixed(2)
      + ' &nbsp;&middot;&nbsp; TL Wide ' + spWideTl.toFixed(2) + '</span></div>'
      + (sonderfall
          ? '<div class="warning-box">&#9888; Das gew&auml;hlte Gangradpaar ist im Chart grau '
            + 'hinterlegt: <strong>Special Case Modification Required</strong>. Es passt nicht '
            + 'ohne Geh&auml;usebearbeitung.</div>'
          : '');
  }

  function ratiosGeaendert() {
    renderRatios();
    if (typeof autoSave === 'function') autoSave();
  }

  global.RATIOS = { MAIN_DRIVES: MAIN_DRIVES, GANGRAEDER: GANGRAEDER,
                    TOPLOADER: TOPLOADER, VORGABE: VORGABE, rechne: rechne };
  global.renderRatios = renderRatios;
  global.ratiosGeaendert = ratiosGeaendert;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', renderRatios);
  }
})(typeof window !== 'undefined' ? window : globalThis);
