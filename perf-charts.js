/**
 * perf-charts.js - Interaktive Getriebe-Diagramme fuer performance.html.
 *
 * Ersetzt die statischen SVG-Tafeln durch dynamische Canvas-Charts mit
 * Checkboxen zum Ein-/Ausblenden der Getriebe.
 *
 * Keine externen Abhaengigkeiten (kein Chart.js, kein D3).
 *
 * Woher die Zahlen kommen
 * -----------------------
 * Bis v16 stand hier eine zweite, feste Kopie der Uebersetzungen - und zwar
 * der widerlegten: [2.588, 1.714, 1.182]. Dass die Spezifikation inzwischen
 * rechnete, half nichts, die Diagramme rechneten weiter mit dem alten Stand.
 * Jetzt kommt jede Uebersetzung aus ratios.js, Setup A und - wenn
 * eingeschaltet - Setup B. Damit vergleicht die Seite zwei Auslegungen
 * gegeneinander und gegen die beiden Toploader.
 *
 * Abrollumfang, Achse und Schaltdrehzahl standen ebenfalls fest im Code,
 * obwohl es auf der Seite seit v9 Eingabefelder dafuer gibt. Wer eine andere
 * Achse eintrug, sah dieselben Diagramme wie vorher. Sie werden jetzt
 * gelesen; fehlt oder taugt ein Wert nicht, greift die Vorgabe.
 */
(function () {
  'use strict';

  // ---- Eingangsgroessen ----
  // Vorgaben = der dokumentierte Stand des Fahrzeugs. Die Felder auf der
  // Seite duerfen sie ueberschreiben, aber nie unbemerkt mit Unsinn.
  var VORGABE_UMFANG = 2.13;    // Abrollumfang [m], 225/65 R15
  var VORGABE_ACHSE = 3.50;     // Hinterachse, Ford 9"
  var VORGABE_SCHALT = 6000;    // Schaltdrehzahl [1/min]

  /** Zahl aus einem Eingabefeld, mit Plausibilitaetsgrenzen. */
  function feldZahl(name, vorgabe, min, max) {
    var el = document.querySelector('[data-field="' + name + '"]');
    if (!el) return vorgabe;
    var v = parseFloat(String(el.value || '').replace(',', '.'));
    if (!isFinite(v) || v < min || v > max) return vorgabe;
    return v;
  }

  function tireCirc() { return feldZahl('perf_umfang', VORGABE_UMFANG, 1.0, 4.0); }
  function axle() { return feldZahl('perf_achse', VORGABE_ACHSE, 2.0, 7.0); }
  function shiftRpm() { return feldZahl('perf_schaltdrehzahl', VORGABE_SCHALT, 3000, 9000); }

  var TOPLOADER_GB = [
    { id: 'close', name: 'Toploader Close', color: '#eb6834', ratios: [2.320, 1.690, 1.290, 1.000] },
    { id: 'wide',  name: 'Toploader Wide',  color: '#1baf7a', ratios: [2.780, 1.930, 1.360, 1.000] }
  ];

  /**
   * Die Getriebe, die gerade gezeichnet werden koennen: Setup A, Setup B
   * (nur wenn eingeschaltet), dann die beiden Toploader.
   */
  function gearboxes() {
    var raus = [];
    if (global_RATIOS()) {
      global_RATIOS().aktiveSetups().forEach(function (s) {
        raus.push({
          id: 'setup_' + s.key,
          name: 'Jerico ' + s.name,
          color: s.farbe,
          eigen: true,
          ratios: s.ratios
        });
      });
    }
    return raus.concat(TOPLOADER_GB);
  }

  function global_RATIOS() {
    return (typeof RATIOS !== 'undefined' && RATIOS && RATIOS.aktiveSetups) ? RATIOS : null;
  }

  // Angenommene Motorkurve (Nm bei Drehzahl)
  var TORQUE_CURVE = [
    [2000,430],[2250,450],[2500,470],[2750,484],[3000,497],
    [3250,505],[3500,513],[3750,516],[4000,520],[4250,515],
    [4500,510],[4750,498],[5000,485],[5250,468],[5500,445],
    [5750,424],[6000,400]
  ];

  function torqueAt(rpm) {
    for (var i = 0; i < TORQUE_CURVE.length - 1; i++) {
      if (rpm <= TORQUE_CURVE[i + 1][0]) {
        var a = TORQUE_CURVE[i], b = TORQUE_CURVE[i + 1];
        var t = (rpm - a[0]) / (b[0] - a[0]);
        return a[1] + t * (b[1] - a[1]);
      }
    }
    return TORQUE_CURVE[TORQUE_CURVE.length - 1][1];
  }

  /**
   * Leistung in PS aus Drehmoment und Drehzahl.
   *
   * Hier stand 7121. Das ist der Teiler fuer hp, nicht fuer PS - beschriftet
   * wurde aber PS, und die Seite nennt 350 PS (257 kW), was als PS stimmt.
   * Die Kurve ist also fuer PS gebaut: mit dem richtigen Teiler erreicht sie
   * 349,8 PS, mit 7121 nur 345,0. Die angezeigten Werte waren 1,4 % zu klein.
   *
   * Herleitung: P = M * 2*pi*n/60 [W], 1 PS = 75 kgf*m/s = 75 * 9,80665 W
   * = 735,49875 W. Teiler = 735,49875 * 60 / (2*pi) = 7023,5.
   * Fuer hp waere es 745,69987 * 60 / (2*pi) = 7120,9 - daher die alte Zahl.
   */
  var NM_RPM_JE_PS = 735.49875 * 60 / (2 * Math.PI);

  function psAt(rpm) { return torqueAt(rpm) * rpm / NM_RPM_JE_PS; }

  // Spitzenwerte aus der Kurve lesen, nicht als Zahl daneben schreiben: die
  // Seite nannte "~5200/min" fuer die Spitzenleistung, die Kurve erreicht sie
  // bei 5250. Zwei Orte, schon auseinandergelaufen.
  function gipfelLeistung() {
    var best = { rpm: TORQUE_CURVE[0][0], ps: psAt(TORQUE_CURVE[0][0]) };
    for (var r = TORQUE_CURVE[0][0]; r <= TORQUE_CURVE[TORQUE_CURVE.length - 1][0]; r += 10) {
      var ps = psAt(r);
      if (ps > best.ps) best = { rpm: r, ps: ps };
    }
    return best;
  }

  // Der Gipfel steht nicht als Zahl im Code, sondern wird aus der Kurve
  // gelesen - sonst behauptet die rote Linie 4000/min, waehrend die Kurve
  // ihren Hoechstwert woanders hat.
  var DREHMOMENT_GIPFEL = TORQUE_CURVE.reduce(function (best, p) {
    return p[1] > best[1] ? p : best;
  }, TORQUE_CURVE[0])[0];

  function speedKmh(rpm, gearRatio) {
    return (rpm * tireCirc() * 60) / (gearRatio * axle() * 1000);
  }

  /** Drehzahl nach dem Schalten von gi nach gi+1. */
  function rpmNachSchalten(ratios, gi, schalt) {
    return schalt * ratios[gi + 1] / ratios[gi];
  }

  // ---- Visibility State ----
  // Je Kennung, nicht je Position: ein abgeschaltetes Setup B darf die
  // Sichtbarkeit der Toploader nicht verschieben.
  var visible = { setup_a: true, setup_b: true, close: true, wide: true };
  function istSichtbar(gb) { return visible[gb.id] !== false; }

  // ---- Canvas Helpers ----
  var DPR = window.devicePixelRatio || 1;

  function setupCanvas(canvas, w, h) {
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
    return ctx;
  }

  function drawGrid(ctx, W, H, pad, xMin, xMax, yMin, yMax, xLabel, yLabel, xStep, yStep) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    var plotW = W - pad.l - pad.r;
    var plotH = H - pad.t - pad.b;

    // Y grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#718096';
    ctx.textAlign = 'right';
    for (var y = yMin; y <= yMax; y += yStep) {
      var py = pad.t + plotH - (y - yMin) / (yMax - yMin) * plotH;
      ctx.beginPath(); ctx.moveTo(pad.l, py); ctx.lineTo(W - pad.r, py); ctx.stroke();
      ctx.fillText(Math.round(y), pad.l - 6, py + 4);
    }
    // X grid
    ctx.textAlign = 'center';
    for (var x = xMin; x <= xMax; x += xStep) {
      var px = pad.l + (x - xMin) / (xMax - xMin) * plotW;
      ctx.beginPath(); ctx.moveTo(px, pad.t); ctx.lineTo(px, pad.t + plotH); ctx.stroke();
      ctx.fillText(Math.round(x), px, H - pad.b + 16);
    }
    // Axes
    ctx.strokeStyle = '#a0aec0';
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + plotH); ctx.lineTo(W - pad.r, pad.t + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + plotH); ctx.stroke();
    // Labels
    ctx.fillStyle = '#718096';
    ctx.textAlign = 'end';
    ctx.fillText(xLabel, W - pad.r, H - pad.b + 30);
    ctx.textAlign = 'start';
    ctx.fillText(yLabel, pad.l - 4, pad.t - 6);
    return { plotW: plotW, plotH: plotH };
  }

  function mapX(v, xMin, xMax, pad, plotW) { return pad.l + (v - xMin) / (xMax - xMin) * plotW; }
  function mapY(v, yMin, yMax, pad, plotH) { return pad.t + plotH - (v - yMin) / (yMax - yMin) * plotH; }

  // ---- Speed Chart ----
  function drawSpeedChart() {
    var canvas = document.getElementById('speedChart');
    if (!canvas) return;
    var W = canvas.parentElement.offsetWidth;
    var H = Math.min(W * 0.5, 380);
    var pad = { l: 56, r: 20, t: 30, b: 40 };
    var ctx = setupCanvas(canvas, W, H);
    var schalt = shiftRpm();
    var xMax = Math.ceil((schalt + 500) / 500) * 500;
    // Die Skala folgt der schnellsten sichtbaren Linie. Mit fester Obergrenze
    // 250 lief eine lange Achse aus dem Bild, ohne dass es auffiel.
    var vMax = 0;
    gearboxes().forEach(function (gb) {
      if (!istSichtbar(gb)) return;
      gb.ratios.forEach(function (r) {
        var v = speedKmh(schalt, r);
        if (v > vMax) vMax = v;
      });
    });
    var yMax = Math.max(80, Math.ceil(vMax / 40) * 40);
    var g = drawGrid(ctx, W, H, pad, 1000, xMax, 0, yMax, 'Drehzahl [1/min]', 'km/h', 1000, yMax / 5);

    var gangLabels = ['1.', '2.', '3.', '4.'];
    var dash = [[12, 4], [8, 4], [4, 4], []];

    gearboxes().forEach(function (gb) {
      if (!istSichtbar(gb)) return;
      gb.ratios.forEach(function (ratio, gi) {
        var x1 = mapX(1000, 1000, xMax, pad, g.plotW);
        var y1 = mapY(speedKmh(1000, ratio), 0, yMax, pad, g.plotH);
        var x2 = mapX(schalt, 1000, xMax, pad, g.plotW);
        var y2 = mapY(speedKmh(schalt, ratio), 0, yMax, pad, g.plotH);
        ctx.strokeStyle = gb.color;
        ctx.lineWidth = gb.eigen ? 2.5 : 1.8;
        ctx.globalAlpha = gb.eigen ? 1.0 : 0.7;
        ctx.setLineDash(dash[gi] || []);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.setLineDash([]);
        // Endpoint label
        var spd = Math.round(speedKmh(schalt, ratio));
        ctx.fillStyle = gb.color;
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'end';
        ctx.fillText(spd + ' km/h', x2 - 4, y2 - 4);
        ctx.globalAlpha = 1.0;
      });
    });

    // Gang-Linien-Legende (Strichstaerken)
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#718096';
    ctx.textAlign = 'start';
    for (var di = 0; di < 4; di++) {
      var lx = pad.l + 10 + di * 70;
      ctx.strokeStyle = '#718096';
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dash[di] || []);
      ctx.beginPath(); ctx.moveTo(lx, pad.t + 8); ctx.lineTo(lx + 20, pad.t + 8); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(gangLabels[di] + ' Gang', lx + 24, pad.t + 12);
    }

    // Schaltdrehzahl-Linie
    var sx = mapX(schalt, 1000, xMax, pad, g.plotW);
    ctx.strokeStyle = '#e53e3e';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(sx, pad.t); ctx.lineTo(sx, pad.t + g.plotH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e53e3e';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'end';
    ctx.fillText('Schaltdrehzahl', sx - 4, pad.t + g.plotH - 4);
  }

  // ---- Shift Points Chart ----
  function drawShiftChart() {
    var canvas = document.getElementById('shiftChart');
    if (!canvas) return;
    var W = canvas.parentElement.offsetWidth;
    var H = Math.min(W * 0.45, 340);
    var pad = { l: 56, r: 20, t: 40, b: 50 };
    var ctx = setupCanvas(canvas, W, H);
    var schalt = shiftRpm();
    var visibleGBs = gearboxes().filter(istSichtbar);
    var totalBars = visibleGBs.length;

    // Untergrenze aus dem tiefsten Fall, nicht fest auf 3000: ein weiter
    // 1. Gang faellt darunter, und der Balken waere dann nach unten offen.
    var tiefste = schalt;
    visibleGBs.forEach(function (gb) {
      for (var i = 0; i < 3; i++) {
        var v = rpmNachSchalten(gb.ratios, i, schalt);
        if (v < tiefste) tiefste = v;
      }
    });
    var yMin = Math.floor(Math.min(tiefste, 4000) / 500) * 500 - 500;
    var yMax = Math.ceil(schalt / 500) * 500;
    var g = drawGrid(ctx, W, H, pad, 0, 3, yMin, yMax, '', '1/min', 1, 500);

    // X-Axis labels
    var shiftLabels = ['1 \u2192 2', '2 \u2192 3', '3 \u2192 4'];
    ctx.fillStyle = '#718096';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    for (var si = 0; si < 3; si++) {
      var slx = mapX(si + 0.5, 0, 3, pad, g.plotW);
      ctx.fillText(shiftLabels[si], slx, H - pad.b + 34);
    }

    // Drehmomentgipfel-Linie
    var tpY = mapY(DREHMOMENT_GIPFEL, yMin, yMax, pad, g.plotH);
    ctx.strokeStyle = '#e53e3e';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(pad.l, tpY); ctx.lineTo(W - pad.r, tpY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e53e3e';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'start';
    ctx.fillText('Drehmomentgipfel ' + DREHMOMENT_GIPFEL + '/min', pad.l + 4, tpY - 4);

    if (totalBars === 0) return;

    var groupW = g.plotW / 3;
    var barW = Math.min(groupW / (totalBars + 1), 46);
    var gap = (groupW - barW * totalBars) / (totalBars + 1);

    visibleGBs.forEach(function (gb, bi) {
      gb.ratios.forEach(function (ratio, gi) {
        if (gi >= 3) return; // nur 3 Schaltungen
        var rpmAfter = rpmNachSchalten(gb.ratios, gi, schalt);
        var hpAfter = Math.round(psAt(rpmAfter));

        var cx = pad.l + gi * groupW + gap * (bi + 1) + barW * bi + barW / 2;
        var barTop = mapY(rpmAfter, yMin, yMax, pad, g.plotH);
        var barBot = mapY(yMin, yMin, yMax, pad, g.plotH);

        ctx.fillStyle = gb.color;
        ctx.globalAlpha = 0.85;
        var r = Math.min(4, barW / 4);
        roundRect(ctx, cx - barW / 2, barTop, barW, barBot - barTop, r);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Label above bar
        ctx.fillStyle = '#2d3748';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(rpmAfter), cx, barTop - 12);
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#718096';
        ctx.fillText(hpAfter + ' PS', cx, barTop - 1);
      });
    });

    // Legend
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    visibleGBs.forEach(function (gb, i) {
      var lx = pad.l + i * 150;
      ctx.fillStyle = gb.color;
      roundRect(ctx, lx, 6, 12, 12, 2);
      ctx.fill();
      ctx.fillStyle = '#4a5568';
      ctx.textAlign = 'start';
      ctx.fillText(gb.name, lx + 16, 16);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ---- RPM Drop Chart (Wasserfall) ----
  function drawRpmDropChart() {
    var canvas = document.getElementById('rpmDropChart');
    if (!canvas) return;
    var W = canvas.parentElement.offsetWidth;
    var H = Math.min(W * 0.4, 300);
    var pad = { l: 56, r: 20, t: 30, b: 40 };
    var ctx = setupCanvas(canvas, W, H);
    var schalt = shiftRpm();

    var visibleGBs = gearboxes().filter(istSichtbar);
    if (visibleGBs.length === 0) { ctx.clearRect(0, 0, W, H); return; }

    // Y: RPM drop (0 to max drop)
    var maxDrop = 0;
    visibleGBs.forEach(function (gb) {
      gb.ratios.forEach(function (r, i) {
        if (i < 3) {
          var drop = schalt - rpmNachSchalten(gb.ratios, i, schalt);
          if (drop > maxDrop) maxDrop = drop;
        }
      });
    });
    maxDrop = Math.ceil(maxDrop / 500) * 500;
    var g = drawGrid(ctx, W, H, pad, 0, 3, 0, maxDrop, '', 'Drehzahlverlust [1/min]', 1, 500);

    var shiftLabels = ['1 \u2192 2', '2 \u2192 3', '3 \u2192 4'];
    ctx.fillStyle = '#718096';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    for (var si = 0; si < 3; si++) {
      ctx.fillText(shiftLabels[si], mapX(si + 0.5, 0, 3, pad, g.plotW), H - pad.b + 34);
    }

    var groupW = g.plotW / 3;
    var barW = Math.min(groupW / (visibleGBs.length + 1), 46);
    var gap = (groupW - barW * visibleGBs.length) / (visibleGBs.length + 1);

    visibleGBs.forEach(function (gb, bi) {
      gb.ratios.forEach(function (ratio, gi) {
        if (gi >= 3) return;
        var drop = schalt - rpmNachSchalten(gb.ratios, gi, schalt);

        var cx = pad.l + gi * groupW + gap * (bi + 1) + barW * bi + barW / 2;
        var barTop = mapY(drop, 0, maxDrop, pad, g.plotH);
        var barBot = mapY(0, 0, maxDrop, pad, g.plotH);

        ctx.fillStyle = gb.color;
        ctx.globalAlpha = 0.85;
        roundRect(ctx, cx - barW / 2, barTop, barW, barBot - barTop, Math.min(4, barW / 4));
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.fillStyle = '#2d3748';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(drop), cx, barTop - 4);
      });
    });
  }

  // ---- Rebuild all charts ----
  /**
   * Die Zeilen "Nennleistung" und "max. Drehmoment" aus der Kurve schreiben.
   *
   * Sie standen als Zahlen im Markup - dieselbe Angabe an zwei Orten, und
   * schon auseinandergelaufen (Seite "~5200/min", Kurve 5250). Jetzt liefert
   * die Kurve beides; eine Aenderung an ihr kann die Zeilen nicht mehr
   * ueberholen.
   */
  function schreibeAnnahmen() {
    var lp = gipfelLeistung();
    var md = TORQUE_CURVE.reduce(function (b, p) { return p[1] > b[1] ? p : b; }, TORQUE_CURVE[0]);

    var zl = document.getElementById('perfAnnahmeLeistung');
    if (zl) {
      zl.innerHTML = '<strong>' + Math.round(lp.ps) + ' PS</strong> ('
        + Math.round(lp.ps * 735.49875 / 1000) + ' kW) bei ' + lp.rpm
        + '/min <span class="src src-d" title="technische Ableitung">D</span>';
    }
    var zm = document.getElementById('perfAnnahmeDrehmoment');
    if (zm) {
      zm.innerHTML = '<strong>' + md[1] + ' Nm</strong> ('
        + Math.round(md[1] / 1.3558179) + ' lb-ft) bei ' + md[0]
        + '/min <span class="src src-d" title="technische Ableitung">D</span>';
    }
  }

  function redrawAll() {
    schreibeAnnahmen();
    baueSchalter();
    drawSpeedChart();
    drawShiftChart();
    drawRpmDropChart();
    schreibeVergleich();
  }

  // ---- Toggle Handler ----
  // Die Checkboxen stehen zweimal auf der Seite, einmal ueber jedem
  // Diagrammblock. Mit 'cb-<id>' als Kennung gab es sie doppelt, und
  // getElementById erwischte nur die erste: ein Haken in Abschnitt 4 blieb
  // sichtbar, obwohl das Getriebe aus war. Jetzt traegt jeder Satz seine
  // Blocknummer, und umgeschaltet werden alle.
  window.toggleGearbox = function (id) {
    visible[id] = !visible[id];
    redrawAll();
  };

  /** Umschalter neu aufbauen - die Liste der Getriebe kann sich aendern. */
  function baueSchalter() {
    var ctrls = document.querySelectorAll('.gearbox-toggles');
    var liste = gearboxes();
    ctrls.forEach(function (el, blockNr) {
      el.innerHTML = '';
      liste.forEach(function (gb) {
        var label = document.createElement('label');
        label.className = 'gb-toggle';
        label.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-right:12px;cursor:pointer;font-size:0.82rem;user-select:none;';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = 'cb-' + blockNr + '-' + gb.id;
        cb.checked = istSichtbar(gb);
        cb.onchange = function () { toggleGearbox(gb.id); };
        var dot = document.createElement('span');
        dot.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:2px;background:' + gb.color + ';';
        label.appendChild(cb);
        label.appendChild(dot);
        label.appendChild(document.createTextNode(' ' + gb.name));
        el.appendChild(label);
      });
    });
  }

  /**
   * Abschnitt 5 aus den aktuellen Zahlen schreiben.
   *
   * Vorher stand hier Prosa mit eingetippten Werten: "faellt nur auf
   * 5076/min", "faellt auf 3974/min", "Kurzer 1. Gang (78 km/h)". Die
   * stammten aus den widerlegten Ratios und waeren bei jeder Aenderung der
   * Auswahl still falsch geworden - dieselbe Falle wie die feste Tabelle in
   * Kapitel 2.
   */
  function schreibeVergleich() {
    var ziel = document.getElementById('perfVergleich');
    if (!ziel) return;
    var schalt = shiftRpm();
    var liste = gearboxes();

    var kopf = '<th>Getriebe</th><th>1. Gang bei ' + schalt + '/min</th>'
             + '<th>1&rarr;2</th><th>2&rarr;3</th><th>3&rarr;4</th>'
             + '<th>Tiefster Punkt</th><th>Spreizung</th>';
    var zeilen = liste.map(function (gb) {
      var nach = [0, 1, 2].map(function (i) { return rpmNachSchalten(gb.ratios, i, schalt); });
      var tiefste = Math.min.apply(null, nach);
      var unterGipfel = tiefste < DREHMOMENT_GIPFEL;
      return '<tr>'
        + '<td><span style="display:inline-block;width:9px;height:9px;border-radius:2px;'
        + 'background:' + gb.color + ';margin-right:6px;"></span>' + gb.name + '</td>'
        + '<td>' + Math.round(speedKmh(schalt, gb.ratios[0])) + ' km/h</td>'
        + nach.map(function (v) { return '<td>' + Math.round(v) + '/min</td>'; }).join('')
        + '<td style="font-weight:700;color:' + (unterGipfel ? '#c53030' : '#276749') + ';">'
        + Math.round(tiefste) + '/min' + (unterGipfel ? ' &#9888;' : '') + '</td>'
        + '<td>' + (gb.ratios[0] / gb.ratios[3]).toFixed(2) + '</td>'
        + '</tr>';
    });

    // Wer faellt unter den Drehmomentgipfel, wer nicht - das ist die Aussage
    // des Abschnitts, und sie folgt aus der Tabelle statt daneben zu stehen.
    var sauber = liste.filter(function (gb) {
      return [0, 1, 2].every(function (i) {
        return rpmNachSchalten(gb.ratios, i, schalt) >= DREHMOMENT_GIPFEL;
      });
    }).map(function (gb) { return gb.name; });

    ziel.innerHTML =
      '<div class="table-wrapper"><table class="data-table"><thead><tr>' + kopf
      + '</tr></thead><tbody>' + zeilen.join('') + '</tbody></table></div>'
      + '<div class="info-box">Gerechnet mit <strong>' + tireCirc().toFixed(2) + ' m</strong> '
      + 'Abrollumfang, Achse <strong>' + axle().toFixed(2) + '</strong> und '
      + '<strong>' + schalt + '/min</strong> Schaltdrehzahl. '
      + (sauber.length
          ? 'Keine Schaltung unter den Drehmomentgipfel (' + DREHMOMENT_GIPFEL + '/min): <strong>'
            + sauber.join(', ') + '</strong>.'
          : 'Bei <strong>jeder</strong> dieser Auslegungen f&auml;llt mindestens eine Schaltung '
            + 'unter den Drehmomentgipfel (' + DREHMOMENT_GIPFEL + '/min).')
      + ' Der eigentliche Gewinn des Jerico liegt ohnehin nicht in den Stufen, sondern im '
      + 'Klauenschaltwerk: die Schaltung dauert Bruchteile der Zeit einer Synchronschaltung. '
      + 'Das gleicht tiefere Drehzahlspr&uuml;nge teilweise aus. '
      + '<span class="src src-d" title="technische Ableitung">D</span></div>';
  }

  // ---- Init ----
  function init() {
    redrawAll();

    // Auf jede Aenderung der Uebersetzungen reagieren. Ein Knopf "Werte
    // uebernehmen" waere kein Ersatz: wer ihn nicht drueckt, sieht alte
    // Zahlen und merkt es nicht.
    if (typeof RATIOS !== 'undefined' && RATIOS && RATIOS.beiAenderung) {
      RATIOS.beiAenderung(redrawAll);
    }
    // Abrollumfang, Achse und Schaltdrehzahl wirken genauso direkt.
    ['perf_umfang', 'perf_achse', 'perf_schaltdrehzahl'].forEach(function (name) {
      var el = document.querySelector('[data-field="' + name + '"]');
      if (el) el.addEventListener('input', redrawAll);
    });
  }

  // Nach dem Laden gespeicherter Werte neu zeichnen. applyData() setzt die
  // Felder ohne Change-Event, also muss der Aufruf von dort kommen.
  window.perfRedraw = redrawAll;

  // Responsive
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redrawAll, 150);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
