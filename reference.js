/**
 * reference.js - Betriebsmittel, Anzugswerte und Service als Nachschlagekarte.
 *
 * Erreichbar auf jeder Seite ueber den Knopf rechts. Aufgebaut wie das
 * Glossar - ein Overlay, keine eigene Seite: wer an der Werkbank einen
 * Drehmomentwert sucht, soll seinen Schritt im Build Log nicht verlieren.
 *
 * Warum Daten und nicht HTML: Das Glossar liegt als fertiges Markup in jeder
 * Seite, viermal dieselben 25 KB. Bei Werten, die auch anderswo stehen, ist
 * das eine Falle - zwei Kuehlsystem-Kapitel und das Quellenregister sind
 * genau daran auseinandergelaufen.
 *
 * Wo der Wert zuhause ist
 * -----------------------
 * Seit v19 nicht mehr in den Spezifikationen: die Kapitel Anzugsmomente,
 * Schmierstoffe und Kleinteile sind aufgeloest, jeder Wert steht an dem
 * Schritt im Build Log, an dem er gebraucht wird. So haelt es das
 * Schwesterprojekt gt40-engine auch.
 *
 * Diese Karte ist die Zusammenstellung zum Nachschlagen - eine zweite
 * ANSICHT, keine zweite QUELLE. Damit das nachpruefbar bleibt, nennt jede
 * Gruppe neben ihren Zeilen ein Feld 'belege': je Zeile eine Zeichenkette,
 * die in build-log.html vorkommen muss. tests/ui.test.mjs prueft beides -
 * dass jeder Beleg dort steht, und dass belege und zeilen gleich lang sind.
 * Ohne die zweite Pruefung koennten die beiden Listen gegeneinander
 * verrutschen, und die erste pruefte dann die falschen Paare.
 *
 * Neuer Wert: Zeile hier, Beleg hier, und der Wert an den Schritt im Build
 * Log. Fehlt eines davon, wird der Test rot statt die Anleitung still falsch.
 */
(function (global) {
  'use strict';

  var REFERENCE = {
    titel: 'Betriebsmittel &amp; Anzugswerte',
    untertitel: 'Jerico RH02374 &ndash; Zusammenstellung zum Nachschlagen; jeder Wert steht am Schritt im Build Log',
    gruppen: [
      {
        id: 'ref-torque',
        titel: '&#128295; Anzugsmomente',
        hinweis: 'Die Pumpenschrauben stehen in <strong>lb./in</strong>, nicht lb./ft &ndash; '
               + '90 lb./in sind 10,2 Nm, nicht 122 Nm. Nach jeder Stufe die Hauptwelle drehen '
               + 'und auf Klemmen pr&uuml;fen.',
        spalten: ['Schraube / Position', 'lb./ft', 'Nm'],
        breiten: ['auto', '90px', '90px'],
        zeilen: [
          ['R&uuml;ckw&auml;rtsgang-Schaltgabel-Klemmschraube (5/16-24 &times; 1&quot;)', '28', '38'],
          ['3-4 Schaltgabel-Klemmschraube (5/16-24 &times; 1&frac14;&quot;, Loctite)', '28', '38'],
          ['1-2 Schaltgabel-Klemmschraube (5/16-24 &times; &frac34;&quot;, Loctite)', '28', '38'],
          ['Zweiteiliger Hinterlager-Halteclip (1/4-28 &times; &#8542;&quot;)', '22', '30'],
          ['Seitliche Detentschraube (3/8-16 &times; &frac12;&quot; mit AN-Scheibe)', '22', '30'],
          ['Vorderer Lagerflansch (5/16-18 &times; 1&quot; mit AN-Scheiben)', '22', '30'],
          ['Tail Housing (7/16-14 &times; 1&frac12;&quot;)', '25 &rarr; 35', '34 &rarr; 47'],
          ['&Ouml;lpumpen-Adapterplatte (7/16-14 &times; 1&frac12;&quot;)', '25 &rarr; 35', '34 &rarr; 47'],
          ['Oberer Deckel (5/16-18 &times; 1&quot;)', '22', '30'],
          ['Bodendeckel (5/16-18 &times; 1&quot;) &ndash; entf&auml;llt bei Top Loader Only', '22', '30'],
          ['&Ouml;lpumpe an Tail Housing (1/4-20 &times; 1&quot;)',
           '35 &rarr; 60 &rarr; 90 lb./in', '4 &rarr; 6,8 &rarr; 10,2']
        ],
        // Je Zeile die Zeichenkette, die im Build Log stehen muss. Gewaehlt
        // ist die Gewindeangabe: sie ist der Teil, der sich nicht umformuliert.
        // null heisst "steht dort absichtlich nicht" - der Bodendeckel
        // entfaellt bei diesem Getriebe, Top Loader Only.
        belege: [
          '5/16-24 &times; 1&quot;',
          '5/16-24 &times; 1&frac14;&quot;',
          '5/16-24 &times; &frac34;&quot;',
          '1/4-28 &times; &#8542;&quot;',
          '3/8-16 &times; &frac12;&quot;',
          '5/16-18 &times; 1&quot;',
          '7/16-14 &times; 1&frac12;&quot;',
          '7/16-14 &times; 1&frac12;&quot;',
          '5/16-18 &times; 1&quot;',
          null,
          '1/4-20 &times; 1&quot;'
        ]
      },
      {
        id: 'ref-lubes',
        titel: '&#128167; Schmierstoffe &amp; Dichtmittel',
        hinweis: 'Die Herstellervorgabe ist die <strong>Spezifikation</strong>, nicht die Marke. '
               + 'Mobil 1 ist das im Assembly Manual verwendete Produkt, kein Zwang.',
        spalten: ['Anwendung', 'Betriebsmittel'],
        breiten: ['auto', '45%'],
        zeilen: [
          ['Alle Zahnrad-Lagerfl&auml;chen, Nadellager', 'Synthetisches 75W90 &ndash; im Manual: Mobil 1 75W90'],
          ['Schaltfingerdichtungen, Anlauffl&auml;chen, Lagerbohrungen', 'Universalfett &ndash; im Manual: Mobil 1 Universal Grease'],
          ['Schaltfingerwellen, Schaltschienen', 'Synthetisches 75W90 &ndash; im Manual: Mobil 1 75W90'],
          ['Viton O-Ring beim Einbau', 'd&uuml;nner &Ouml;lfilm'],
          ['Andere O-Ringe', 'trocken einbauen'],
          ['Vorderer Lagerflansch / Tail Housing Dichtfl&auml;chen', 'Hylomar Gasket Maker'],
          ['Adapterplatte &Ouml;lpumpe', 'Hylomar oder Loctite Ultra Black'],
          ['Hinterdichtung im Geh&auml;use', 'd&uuml;nne Silikonschicht'],
          ['Schaltgabel-Klemmschrauben 1-2 und 3-4', 'Loctite']
        ],
        // Hier belegt das Betriebsmittel selbst, nicht die Anwendung: die
        // Anwendung ist am Schritt anders formuliert, das Mittel ist dasselbe.
        belege: [
          'Mobil 1 75W90',
          'Mobil 1 Universal Grease',
          'Mobil 1 75W90',
          'Viton mit d&uuml;nnem &Ouml;lfilm',
          'trocken einbauen',
          'Hylomar',
          'Loctite Ultra Black',
          'Silikonschicht',
          'Loctite'
        ]
      },
      {
        id: 'ref-service',
        titel: '&#128738; &Ouml;l, Bef&uuml;llung &amp; Serviceintervalle',
        hinweis: 'Die Intervalle sind ereignisbezogen, nicht nach Kilometern &ndash; so steht es '
               + 'im Break-In-Sheet (A-02). <strong>Wie</strong> eingefahren wird, steht im Build Log '
               + 'bei Schritt 11 und 12 &ndash; diese Karte nennt nur, was man nachschl&auml;gt.',
        spalten: ['Punkt', 'Vorgabe'],
        breiten: ['38%', 'auto'],
        zeilen: [
          ['&Ouml;lsorte (Herstellervorgabe A-02)', 'Synthetic Multi-Viscosity Gear Oil SAE 75W90 &ndash; <strong>kein Straight 90W</strong>'],
          ['Im Assembly Manual verwendetes Produkt', 'Mobil 1 75W90'],
          ['Menge', 'ca. 2 Quarts (~1,9 l)'],
          ['F&uuml;llstand', '3/4&quot; unter der seitlichen Einf&uuml;ll&ouml;ffnung &ndash; nicht &uuml;berf&uuml;llen'],
          ['&Ouml;lwechsel nach Einfahren', 'vor dem ersten Renneinsatz'],
          ['&Ouml;lwechsel nach erstem Renntag', 'Pflicht &ndash; entfernt Einfahrr&uuml;ckst&auml;nde und Metallpartikel'],
          ['Danach', '&Ouml;l und Zahnr&auml;der so h&auml;ufig pr&uuml;fen wie den Motor &ndash; und immer, wenn das &Ouml;l nach Hitze riecht']
        ],
        belege: [
          '75W90',
          'Mobil 1 75W90',
          '2 Quarts',
          '3/4&quot; unterhalb',
          'Einfahr&ouml;l ablassen',
          'Nach dem ersten Renntag erneut',
          'so h&auml;ufig pr&uuml;fen wie den Motor'
        ]
      },
      {
        id: 'ref-werkzeug',
        titel: '&#128296; Werkzeug &amp; Verbrauchsmaterial',
        hinweis: 'Was f&uuml;r welchen Griff gebraucht wird, steht am Schritt. Dies ist die Liste '
               + 'f&uuml;r den Einkauf und zum Zusammenlegen, bevor es losgeht.',
        spalten: ['Zweck', 'Ger&auml;t / Material'],
        breiten: ['38%', 'auto'],
        zeilen: [
          ['Schrauben', 'Innensechskant-Satz zollbasiert; Drehmomentschl&uuml;ssel <strong>bis 50 Nm</strong> und ein kleiner <strong>bis 12 Nm</strong> f&uuml;r die &Ouml;lpumpe'],
          ['Messen', 'Messuhr mit Magnetstativ, zwei V-Bl&ouml;cke, Mikrometer, Messschieber'],
          ['Kleinteile', 'Taschenmagnet f&uuml;r die Detents, Juwelier-Schraubendreher f&uuml;r Spirolox, Messingdorn, Dornsatz'],
          ['Dichtungen', 'Dichtungstreibe f&uuml;r Schaltfinger- und Hinterdichtung'],
          ['Zerlegen', 'Gummihammer, Hebelstangen paarweise, Schleifstift mit Schleifrolle'],
          ['Reinigen', 'Druckluft, L&ouml;sungsmittelbad, Auffangwanne, Teilewaschb&uuml;rsten'],
          ['Verbrauchsmaterial', 'Mobil 1 75W90, Mobil 1 Universal Grease, Hylomar, Loctite, Silikon, neue Spirolox-Ringe, Dichtungen, 9/16&quot; Stopfen']
        ],
        belege: [
          'Drehmomentschl&uuml;ssel',
          'V-Bl&ouml;cke',
          'Taschenmagnet',
          'Dichtungstreibe',
          'Hebelstangen',
          'L&ouml;sungsmittelbad',
          'Mobil 1 Universal Grease'
        ]
      }
    ]
  };

  global.REFERENCE = REFERENCE;

  /* ---- Overlay bauen. Erst beim ersten Oeffnen, nicht beim Laden: die
     Karte liegt sonst auf jeder Seite im DOM, ohne je gebraucht zu werden. */
  function baueOverlay() {
    if (document.getElementById('guide-reference')) return;

    var teile = [];
    teile.push('<div class="guide-overlay" id="guide-reference">');
    teile.push('<div class="glossary-search">');
    teile.push('  <div class="glossary-search-row">');
    teile.push('    <button class="guide-back" onclick="hideGuide(\'guide-reference\')">&larr;</button>');
    teile.push('    <input type="search" id="referenceSearch" placeholder="Wert oder Bauteil suchen..." oninput="filterReference()">');
    teile.push('    <span class="glossary-count" id="referenceCount"></span>');
    teile.push('  </div>');
    teile.push('</div>');
    teile.push('<div class="guide-content" id="referenceBody">');
    teile.push('  <div class="info-box" style="margin-bottom:0.8rem;"><strong>' + REFERENCE.titel
             + '.</strong> ' + REFERENCE.untertitel
             + '. Zum Ausdrucken bei ge&ouml;ffneter Karte <strong>Strg+P</strong>.</div>');

    REFERENCE.gruppen.forEach(function (g) {
      teile.push('<div class="ref-group" id="' + g.id + '">');
      teile.push('  <h3 class="ref-group-titel">' + g.titel + '</h3>');
      teile.push('  <div class="table-wrapper"><table class="data-table"><thead><tr>');
      g.spalten.forEach(function (sp, k) {
        var w = (g.breiten && g.breiten[k] && g.breiten[k] !== 'auto')
              ? ' style="width:' + g.breiten[k] + ';"' : '';
        teile.push('<th' + w + '>' + sp + '</th>');
      });
      teile.push('  </tr></thead><tbody>');
      g.zeilen.forEach(function (z) {
        teile.push('<tr class="ref-row">' + z.map(function (c, k) {
          // Letzte Spalte einer dreispaltigen Tafel ist der Nm-Wert - hervorheben.
          var stark = (z.length === 3 && k === 2) ? ' style="font-weight:700;"' : '';
          return '<td' + stark + '>' + c + '</td>';
        }).join('') + '</tr>');
      });
      teile.push('  </tbody></table></div>');
      if (g.hinweis) teile.push('  <div class="info-box">' + g.hinweis + '</div>');
      teile.push('</div>');
    });

    teile.push('  <div class="ref-leer" id="referenceLeer" style="display:none;">Kein Treffer.</div>');
    teile.push('</div>');
    teile.push('</div>');

    var huelle = document.createElement('div');
    huelle.innerHTML = teile.join('\n');
    document.body.appendChild(huelle.firstChild);
  }

  function showReference() {
    baueOverlay();
    showGuide('guide-reference');
    var feld = document.getElementById('referenceSearch');
    if (feld) { feld.value = ''; filterReference(); }
  }

  /* ---- Filter ueber alle Zeilen, wie im Glossar. Eine Gruppe ohne Treffer
     verschwindet mit, sonst bleiben leere Ueberschriften stehen. */
  function filterReference() {
    var feld = document.getElementById('referenceSearch');
    var q = (feld ? feld.value : '').trim().toLowerCase();
    var treffer = 0;

    REFERENCE.gruppen.forEach(function (g) {
      var block = document.getElementById(g.id);
      if (!block) return;
      var sichtbar = 0;
      block.querySelectorAll('tr.ref-row').forEach(function (tr) {
        var passt = !q || tr.textContent.toLowerCase().indexOf(q) !== -1;
        tr.style.display = passt ? '' : 'none';
        if (passt) sichtbar++;
      });
      block.style.display = sichtbar ? '' : 'none';
      treffer += sichtbar;
    });

    var zaehler = document.getElementById('referenceCount');
    if (zaehler) zaehler.textContent = q ? (treffer + ' Treffer') : '';
    var leer = document.getElementById('referenceLeer');
    if (leer) leer.style.display = (q && !treffer) ? '' : 'none';
  }

  global.showReference = showReference;
  global.filterReference = filterReference;
})(typeof window !== 'undefined' ? window : globalThis);
