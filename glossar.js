/**
 * glossar.js - Das gemeinsame Getriebe-Glossar.
 *
 * Bis v21 stand dieser Block wortgleich in index.html, specs.html,
 * build-log.html und performance.html. Vier Kopien, 24 KB jede - und sie
 * waren bereits auseinandergelaufen, ohne dass es auffiel:
 *
 *   - Der Eintrag "Main Drive" trug noch "22 / 27 Zaehne = Faktor 0,815",
 *     also genau die Uebersetzung, die v16 als widerspruechlich nachgewiesen
 *     hat. v16 hat Kapitel 2 korrigiert, v17 die Startseite und die
 *     Leistungsseite - das Glossar war die vierte Kopie und blieb stehen,
 *     bis es in v18 auffiel.
 *   - "Top Loader Only - visuell bestaetigt" behauptete eine Pruefung, die
 *     niemand belegen konnte.
 *
 * Derselbe Fehlermodus wie bei der festen Uebersetzungstabelle und den zwei
 * Kuehlsystem-Kapiteln: Inhalt kopiert, eine Kopie gepflegt, die anderen
 * nicht. Das Schwesterprojekt gt40-engine hat denselben Schritt in seiner
 * v44 gemacht, aus demselben Anlass.
 *
 * Einbindung: <div class="glossary-body" id="glossaryBody"></div> plus
 * <script src="glossar.js"></script>. Der Inhalt wird eingesetzt, bevor
 * search.js oder filterGlossary() ihn brauchen - deshalb laeuft das Einsetzen
 * sofort und nicht erst bei DOMContentLoaded, wenn das Ziel schon da ist.
 *
 * Neuer Begriff: hier eintragen, nicht in einer der HTML-Dateien.
 */
(function (global) {
  'use strict';

  var GLOSSAR_HTML = `
        <div class="glossary-category" data-cat="cat-grund">
            <div class="glossary-category-title">1. Grundbegriffe</div>
            <div class="glossary-entry" data-search="dog box klauengetriebe renngetriebe synchron">
                <div class="glossary-term">Dog Box (Klauengetriebe)</div>
                <div class="glossary-field" data-fidx="1"><span class="glossary-field-label">Was ist das?</span> Ein Getriebe ohne Synchronringe. Die G&auml;nge werden &uuml;ber Klauen (Dogs) formschl&uuml;ssig verbunden.</div>
                <div class="glossary-field" data-fidx="1"><span class="glossary-field-label">Einfach gesagt:</span> Statt sanft anzugleichen rasten die Z&auml;hne hart ineinander &ndash; schnell, laut, verschleissfreudig bei falscher Bedienung.</div>
                <div class="glossary-field" data-fidx="1"><span class="glossary-field-label">Warum?</span> Schaltzeit und Belastbarkeit. Ein Synchronring w&auml;re das schwache Glied im Rennbetrieb.</div>
                <div class="glossary-related">Verwandt: Dog Ring, Schiebemuffe, Innennabe</div>
            </div>
            <div class="glossary-entry" data-search="dog ring klauenring mitnehmer 34 37 zaehne keilwelle">
                <div class="glossary-term">Dog Ring (Klauenring)</div>
                <div class="glossary-field" data-fidx="2"><span class="glossary-field-label">Was ist das?</span> Der aufgekeilte Ring mit den Mitnehmerklauen, &uuml;ber den ein Gang eingelegt wird. Im RH02374: 34 Z&auml;hne am 2. Gang, 37 Z&auml;hne am 3. Gang und auf der Eingangswelle.</div>
                <div class="glossary-field" data-fidx="2"><span class="glossary-field-label">Einbaurichtung:</span> Die <strong>breitere Zahnfl&auml;che zeigt nach aussen, weg vom Zahnrad</strong>. Neuere Ringe: die gefaste Fl&auml;che liegt am Zahnrad an.</div>
                <div class="glossary-field" data-fidx="2"><span class="glossary-field-label">Warum?</span> Falsch herum eingebaut springt das Getriebe unter Last aus dem Gang.</div>
                <div class="glossary-related">Verwandt: Spirolox, Schiebemuffe, Innennabe</div>
            </div>
            <div class="glossary-entry" data-search="top loader bottom loader gehaeuse deckel bodendeckel">
                <div class="glossary-term">Top Loader / Bottom Loader</div>
                <div class="glossary-field" data-fidx="3"><span class="glossary-field-label">Was ist das?</span> Wo das Innenleben ins Geh&auml;use kommt: nur von oben (Top Loader Only) oder zus&auml;tzlich durch einen Bodendeckel.</div>
                <div class="glossary-field" data-fidx="3"><span class="glossary-field-label">Am RH02374:</span> Top Loader Only. Deshalb entf&auml;llt Schritt 9 der Zerlegung (kein Bodendeckel, kein Sicherungsring am Hauptantriebsclusterrad).</div>
                <div class="glossary-related">Verwandt: Top Cover, Bodendeckel</div>
            </div>
            <div class="glossary-entry" data-search="kupplung schlupf clutch slippage clutchless drag race">
                <div class="glossary-term">Kupplungsschlupf &ndash; wof&uuml;r die Regel gilt</div>
                <div class="glossary-field" data-fidx="4"><span class="glossary-field-label">Der Satz:</span> &bdquo;CLUTCH SLIPPAGE IS A MUST&ldquo; steht im Jerico Break-In-Sheet.</div>
                <div class="glossary-field" data-fidx="4"><span class="glossary-field-label">Wo er steht:</span> Ausschlie&szlig;lich unter der &Uuml;berschrift <em>FOR CLUTCHLESS DRAG RACE TRANSMISSIONS ONLY</em> &ndash; im Abschnitt zur Abstimmung der Kupplung eines <strong>clutchless Drag-Race-Getriebes</strong>.</div>
                <div class="glossary-field" data-fidx="4"><span class="glossary-field-label">Folge f&uuml;r RH02374:</span> Daraus l&auml;sst sich <strong>keine</strong> allgemeine Vorgabe f&uuml;r dieses Oval/Road-Race-Getriebe ableiten. Schaltstrategie und Kupplungsbenutzung sind gesondert zu kl&auml;ren.</div>
                <div class="glossary-related">Verwandt: Dog Box, Break-In</div>
            </div>
            <div class="glossary-entry" data-search="road race oval revision 2 dog ring low typ">
                <div class="glossary-term">Road Race (Rev. 2)</div>
                <div class="glossary-field" data-fidx="5"><span class="glossary-field-label">Was ist das?</span> Die Bauvariante des RH02374: Revision 2, Dog Ring Low. Jerico f&uuml;hrt die Baureihe unter &bdquo;Oval/Road Race&ldquo;; dieses Getriebe wird ausschlie&szlig;lich im Road Race eingesetzt.</div>
                <div class="glossary-field" data-fidx="5"><span class="glossary-field-label">Folge:</span> Im Manual gelten die Abschnitte &bdquo;Winston Cup und Road Race&ldquo; &ndash; nicht die Drag-Race-Varianten.</div>
                <div class="glossary-related">Verwandt: Kuehlerpflicht, 75W90</div>
            </div>
        </div>
        <div class="glossary-category" data-cat="cat-wellen">
            <div class="glossary-category-title">2. Wellen &amp; Zahnr&auml;der</div>
            <div class="glossary-entry" data-search="input shaft eingangswelle spline keilwelle kupplung 26">
                <div class="glossary-term">Eingangswelle (Input Shaft)</div>
                <div class="glossary-field" data-fidx="6"><span class="glossary-field-label">Was ist das?</span> Die Welle von der Kupplung ins Getriebe. Tr&auml;gt den 37-Z&auml;hne-Dog-Ring und das Hauptantriebsritzel.</div>
                <div class="glossary-field" data-fidx="6"><span class="glossary-field-label">Am RH02374:</span> Ford Input Shaft, 26 Spline &ndash; <strong>noch zu validieren</strong> (nachz&auml;hlen).</div>
                <div class="glossary-field" data-fidx="6"><span class="glossary-field-label">Drehrichtung:</span> Motordrehrichtung = Eingangswelle im Uhrzeigersinn.</div>
                <div class="glossary-related">Verwandt: Main Drive, Pilotlager, Bellhousing</div>
            </div>
            <div class="glossary-entry" data-search="main shaft hauptwelle ausgangswelle schlag rundlauf">
                <div class="glossary-term">Hauptwelle (Main Shaft)</div>
                <div class="glossary-field" data-fidx="7"><span class="glossary-field-label">Was ist das?</span> Die Ausgangswelle, auf der 1., 2. und 3. Gang mit ihren Nadellagern sitzen.</div>
                <div class="glossary-field" data-fidx="7"><span class="glossary-field-label">Schlagwerte:</span> Eine brauchbare Welle hat <strong>im Mittel ca. 0,0015&quot; (0,038 mm)</strong> Schlag je Lagersitz &ndash; das ist der &uuml;bliche Wert, keine Grenze. Nach dem Richten nennt Jerico eine harte Grenze: <strong>h&ouml;chstens 0,003&quot; (0,076 mm)</strong> je Lagersitz.</div>
                <div class="glossary-related">Verwandt: Nadellager, Anlaufscheibe, V-Bloecke</div>
            </div>
            <div class="glossary-entry" data-search="cluster countershaft vorgelegewelle zahnradsatz">
                <div class="glossary-term">Vorgelegewelle (Cluster Shaft)</div>
                <div class="glossary-field" data-fidx="8"><span class="glossary-field-label">Was ist das?</span> Der Zahnradsatz unterhalb der Hauptwelle, der die Drehzahl von der Eingangswelle auf die G&auml;nge &uuml;bersetzt.</div>
                <div class="glossary-field" data-fidx="8"><span class="glossary-field-label">Achtung beim Einbau:</span> Das hintere Ende darf <strong>b&uuml;ndig bis h&ouml;chstens wenige Tausendstel Zoll unter</strong> der hinteren Geh&auml;usefl&auml;che sitzen. Weiter eingetrieben fehlt dem hinteren Nadellager-Cluster der W&auml;rmeausdehnungsspielraum &ndash; mit Versagen genau dieses Lagers als Folge.</div>
                <div class="glossary-related">Verwandt: Sicherungsring, O-Ring, C1086Q</div>
            </div>
            <div class="glossary-entry" data-search="main drive hauptantrieb 22 27 uebersetzung ritzel">
                <div class="glossary-term">Main Drive (Hauptantrieb)</div>
                <div class="glossary-field" data-fidx="9"><span class="glossary-field-label">Was ist das?</span> Das Zahnradpaar Eingangswelle/Vorgelegewelle, das alle G&auml;nge gemeinsam durchlaufen.</div>
                <div class="glossary-field" data-fidx="9"><span class="glossary-field-label">Am RH02374:</span> abgez&auml;hlt <strong>25 / 24</strong> = Faktor 1,042. Gerechnet wird mit der Auswahl in den <a href="specs.html#sec-ratios">Spezifikationen, Kapitel 2</a>.</div>
                <div class="glossary-related">Verwandt: Gear Ratio, Ratio Chart</div>
            </div>
        </div>
        <div class="glossary-category" data-cat="cat-schaltung">
            <div class="glossary-category-title">3. Schaltung</div>
            <div class="glossary-entry" data-search="slider schiebemuffe muffe einrueckklauen nabe">
                <div class="glossary-term">Schiebemuffe (Slider)</div>
                <div class="glossary-field" data-fidx="10"><span class="glossary-field-label">Was ist das?</span> Die axial verschiebbare Muffe auf der Nabe, die in den Dog Ring des Gangs einrastet.</div>
                <div class="glossary-field" data-fidx="10"><span class="glossary-field-label">Verschleissgrenze:</span> Ersetzen, wenn die Einr&uuml;cknasen mehr als <strong>3/32&quot; bis 1/8&quot; (2,4&ndash;3,2 mm)</strong> abgerundet sind.</div>
                <div class="glossary-related">Verwandt: Dog Ring, Schaltgabel, 1-2 Nabe</div>
            </div>
            <div class="glossary-entry" data-search="schaltgabel shift fork schaltschiene rail klemmschraube loctite">
                <div class="glossary-term">Schaltgabel / Schaltschiene</div>
                <div class="glossary-field" data-fidx="11"><span class="glossary-field-label">Was ist das?</span> Die Gabel greift in die Schiebemuffe, die Schiene f&uuml;hrt sie. Beide sind mit einer Kegelkopf-Klemmschraube verbunden.</div>
                <div class="glossary-field" data-fidx="11"><span class="glossary-field-label">Anzug:</span> Alle drei Klemmschrauben <strong>28 lb./ft (38 Nm)</strong>, 1-2 und 3-4 mit Loctite.</div>
                <div class="glossary-related">Verwandt: Detent, Interlock</div>
            </div>
            <div class="glossary-entry" data-search="detent rastierung feder kugel sdp-a magnet">
                <div class="glossary-term">Detent (Rastierung)</div>
                <div class="glossary-field" data-fidx="12"><span class="glossary-field-label">Was ist das?</span> Federbelasteter Stift, der die Schaltschiene in ihrer Stellung h&auml;lt.</div>
                <div class="glossary-field" data-fidx="12"><span class="glossary-field-label">Praxis:</span> Einsetzen mit Taschenmagnet; ein Tropfen &Ouml;l h&auml;lt den Detent beim Abziehen des Magneten durch Unterdruck in der Bohrung.</div>
                <div class="glossary-related">Verwandt: Interlock-Pruefung, SDP-A</div>
            </div>
            <div class="glossary-entry" data-search="interlock verriegelung zwei gaenge gleichzeitig pruefung">
                <div class="glossary-term">Detent Interlock</div>
                <div class="glossary-field" data-fidx="13"><span class="glossary-field-label">Was ist das?</span> Die Sperre, die verhindert, dass zwei G&auml;nge gleichzeitig eingelegt werden.</div>
                <div class="glossary-field" data-fidx="13"><span class="glossary-field-label">Pr&uuml;fung:</span> F&uuml;nf Punkte nach dem Zusammenbau. L&auml;sst sich ein zweiter Gang einlegen, fehlt ein Detent zwischen diesen Schienen.</div>
                <div class="glossary-related">Verwandt: Detent, Schaltgabel</div>
            </div>
        </div>
        <div class="glossary-category" data-cat="cat-lager">
            <div class="glossary-category-title">4. Lager &amp; Sicherungen</div>
            <div class="glossary-entry" data-search="nadellager caged needle bearing kaefig c407q c1086q nadeln">
                <div class="glossary-term">Nadellager (Caged Needle Bearing)</div>
                <div class="glossary-field" data-fidx="14"><span class="glossary-field-label">Was ist das?</span> Lager aus losen oder gek&auml;figten Nadeln zwischen Welle und Zahnrad.</div>
                <div class="glossary-field" data-fidx="14"><span class="glossary-field-label">Z&auml;hlungen am RH02374:</span> Eingangswelle 15 Nadeln; R&uuml;ckw&auml;rtsgang-Zwischenrad #C407Q 44 Nadeln (22 je Seite); Vorgelegewelle #C1086Q 56 Nadeln (28 je Seite).</div>
                <div class="glossary-field" data-fidx="14"><span class="glossary-field-label">Regel:</span> Geht eine Nadel verloren, wird <strong>der ganze Satz</strong> ersetzt &ndash; nie eine einzelne.</div>
                <div class="glossary-related">Verwandt: Anlaufscheibe, RNTA, CNT-A</div>
            </div>
            <div class="glossary-entry" data-search="spirolox sicherungsring rst-187 rs-187 sperrhaken nut">
                <div class="glossary-term">Spirolox</div>
                <div class="glossary-field" data-fidx="15"><span class="glossary-field-label">Was ist das?</span> Ein gewickelter Sicherungsring ohne &Ouml;sen, der in einer Nut liegt.</div>
                <div class="glossary-field" data-fidx="15"><span class="glossary-field-label">Einbau:</span> Linken Sperrhaken flachdr&uuml;cken, gleichm&auml;ssig um den Umfang einf&uuml;hren, obere rechte Kante mit kleinem Schraubendreher im 45&deg;-Winkel einschlagen, danach Sperrhaken zur&uuml;cksetzen.</div>
                <div class="glossary-field" data-fidx="15"><span class="glossary-field-label">Teile:</span> #RST-187 an der 1-2 Nabe, je einer je Dog-Ring-Nabe.</div>
                <div class="glossary-related">Verwandt: Dog Ring, Sicherungsring</div>
            </div>
            <div class="glossary-entry" data-search="anlaufscheibe thrust washer rnta cnt-a scharfe kante">
                <div class="glossary-term">Anlaufscheibe (Thrust Washer)</div>
                <div class="glossary-field" data-fidx="16"><span class="glossary-field-label">Was ist das?</span> Scheibe, die die Axialkraft aufnimmt und die Nadeln in Position h&auml;lt.</div>
                <div class="glossary-field" data-fidx="16"><span class="glossary-field-label">Einbaurichtung:</span> R&uuml;ckw&auml;rtsgang-Zwischenrad (#RNTA): scharfe Kanten nach innen zu den Nadeln. Vorgelegewelle (#CNT-A): erste Scheibe scharfe Kanten nach oben, zweite nach innen.</div>
                <div class="glossary-related">Verwandt: Nadellager</div>
            </div>
            <div class="glossary-entry" data-search="abstandsring spacer 3.625 92.1 vorderes lager">
                <div class="glossary-term">Abstandsring 3,625&quot;</div>
                <div class="glossary-field" data-fidx="17"><span class="glossary-field-label">Was ist das?</span> Der Ring, der vor dem vorderen Lager sitzt (92,1 mm).</div>
                <div class="glossary-field" data-fidx="17"><span class="glossary-field-label">Wann?</span> Beim Zusammenbau Top Loader Only vor dem Einsetzen des vorderen Lagers auflegen.</div>
                <div class="glossary-related">Verwandt: Halteclip, 5100-177</div>
            </div>
        </div>
        <div class="glossary-category" data-cat="cat-betrieb">
            <div class="glossary-category-title">5. Betriebsstoffe &amp; Dichtmittel</div>
            <div class="glossary-entry" data-search="oel 75w90 synthetic getriebeoel mobil 1 menge fuellstand">
                <div class="glossary-term">75W90 Synthetic</div>
                <div class="glossary-field" data-fidx="18"><span class="glossary-field-label">Vorgabe:</span> Synthetic Multi-Viscosity Gear Oil SAE 75W90. <strong>Kein Straight 90W.</strong> Verbindlich ist die Spezifikation, nicht die Marke.</div>
                <div class="glossary-field" data-fidx="18"><span class="glossary-field-label">Menge:</span> Ca. 2 Quarts (~1,9 l), F&uuml;llstand 3/4&quot; unterhalb der seitlichen Einf&uuml;ll&ouml;ffnung. Nicht &uuml;berf&uuml;llen &ndash; erzeugt Hitze.</div>
                <div class="glossary-field" data-fidx="18"><span class="glossary-field-label">Im Manual:</span> Die Montageanleitung meint mit &bdquo;&Ouml;l&ldquo; durchgehend das dort verwendete Produkt Mobil 1 75W90.</div>
                <div class="glossary-related">Verwandt: Break-In, Kuehler</div>
            </div>
            <div class="glossary-entry" data-search="fett grease schaltfinger dichtung lagerbohrung montage">
                <div class="glossary-term">Mobil 1 Universal Grease</div>
                <div class="glossary-field" data-fidx="19"><span class="glossary-field-label">Wof&uuml;r?</span> Schaltfingerdichtungen, Anlauffl&auml;chen, Lagerbohrungen und zum Kleben der losen Nadeln beim Einlegen.</div>
                <div class="glossary-related">Verwandt: Nadellager, Schaltfinger</div>
            </div>
            <div class="glossary-entry" data-search="hylomar dichtmittel gasket maker silikon loctite ultra black">
                <div class="glossary-term">Hylomar</div>
                <div class="glossary-field" data-fidx="20"><span class="glossary-field-label">Wof&uuml;r?</span> Dichtfl&auml;chen von vorderem Lagerflansch und Tail Housing (Raupe). Adapterplatte der &Ouml;lpumpe: Hylomar oder Loctite Ultra Black.</div>
                <div class="glossary-field" data-fidx="20"><span class="glossary-field-label">Achtung:</span> &Uuml;berschuss entfernen &ndash; sonst Ausrichtungsfehler am Flansch.</div>
                <div class="glossary-related">Verwandt: Silikon, Hinterdichtung</div>
            </div>
        </div>
        <div class="glossary-category" data-cat="cat-messen">
            <div class="glossary-category-title">6. Messen &amp; Pr&uuml;fen</div>
            <div class="glossary-entry" data-search="schlag runout rundlauf messuhr v-bloecke richten">
                <div class="glossary-term">Schlag (Runout)</div>
                <div class="glossary-field" data-fidx="21"><span class="glossary-field-label">Messung:</span> Hauptwelle in V-Bl&ouml;cken am hinteren Lagersitz und am vorderen Eingangswellen-Nadellagersitz.</div>
                <div class="glossary-field" data-fidx="21"><span class="glossary-field-label">Werte:</span> &Uuml;blich sind im Mittel ca. 0,0015&quot; (0,038 mm) je Lagersitz &ndash; ein Durchschnitt, keine Grenze. Eine harte Grenze nennt Jerico nur f&uuml;r die gerichtete Welle: h&ouml;chstens 0,003&quot; (0,076 mm) je Lagersitz.</div>
                <div class="glossary-related">Verwandt: Hauptwelle, Messuhr</div>
            </div>
            <div class="glossary-entry" data-search="verschleiss klauen abgerundet 3/32 1/8 dog ring slider">
                <div class="glossary-term">Verschleissgrenze Klauen</div>
                <div class="glossary-field" data-fidx="22"><span class="glossary-field-label">Regel:</span> Dog Rings und Schiebemuffen ersetzen, wenn Z&auml;hne bzw. Einr&uuml;cknasen mehr als 3/32&quot; bis 1/8&quot; (2,4&ndash;3,2 mm) abgerundet sind.</div>
                <div class="glossary-related">Verwandt: Dog Ring, Slider</div>
            </div>
            <div class="glossary-entry" data-search="aluminium magnesium essigtest strahlen waermeausdehnung">
                <div class="glossary-term">Gehaeusematerial</div>
                <div class="glossary-field" data-fidx="23"><span class="glossary-field-label">Warum wichtig?</span> Aluminium und Magnesium dehnen sich unterschiedlich aus und vertragen unterschiedliche Strahl- und Lackvorbehandlung.</div>
                <div class="glossary-field" data-fidx="23"><span class="glossary-field-label">Folge im Manual:</span> Road Race: #44 Schlauchklemme plus zwei Metallhalter an der Hinterdichtung gegen Dichtungsverlust.</div>
                <div class="glossary-related">Verwandt: Tail Housing, Hinterdichtung, Magnesium erkennen</div>
            </div>
            <div class="glossary-entry" data-search="magnesium aluminium unterscheiden essigprobe dichte 1,74 2,70 korrosion brandklasse d">
                <div class="glossary-term">Magnesium erkennen</div>
                <div class="glossary-field" data-fidx="24"><span class="glossary-field-label">Essigprobe:</span> Stelle blank schleifen, Tropfen Essig aufbringen: Magnesium sch&auml;umt in Sekunden sichtbar, Aluminium bleibt reaktionslos (passivierende Oxidschicht). Der aussagekr&auml;ftigste Feldtest.</div>
                <div class="glossary-field" data-fidx="24"><span class="glossary-field-label">Dichte:</span> Magnesium 1,74 g/cm&sup3;, Aluminium 2,70 g/cm&sup3; &ndash; bei gleicher Geometrie ist ein Magnesiumteil rund ein Drittel leichter.</div>
                <div class="glossary-field" data-fidx="24"><span class="glossary-field-label">Korrosionsbild:</span> Magnesium bildet einen wei&szlig;en, pulvrigen, aufwerfenden Belag, besonders an jeder Stahl-Paarung (Kontaktkorrosion). Aluminiumoxid ist d&uuml;nn, grau und haftend.</div>
                <div class="glossary-field" data-fidx="24"><span class="glossary-field-label">Klang:</span> Aluminium klingt beim Anschlagen heller und l&auml;nger nach, Magnesium dumpfer. Nur als drittes Indiz brauchbar.</div>
                <div class="glossary-field" data-fidx="24"><span class="glossary-field-label">&#9888; Gefahr:</span> Magnesiumsp&auml;ne und -schleifstaub entz&uuml;nden sich an einem Funken und brennen als Metallbrand (Klasse D) &uuml;ber 2000 &deg;C. <strong>Wasser l&ouml;scht nicht, sondern verschlimmert</strong> &ndash; es wird gespalten, Wasserstoff entsteht, Verpuffung. CO&sub2; und Schaum versagen ebenfalls. Nicht trocken flexen, Sp&auml;ne feucht aufnehmen, Metallbrandl&ouml;scher (D) oder trockenen Sand bereithalten.</div>
                <div class="glossary-related">Verwandt: Gehaeusematerial, Strahlen</div>
            </div>
        </div>
        <div class="glossary-category" data-cat="cat-abk">
            <div class="glossary-category-title">7. Abk&uuml;rzungen &amp; Teilenummern</div>
            <div class="glossary-entry" data-search="rh02374 seriennummer serial tex racing">
                <div class="glossary-term">RH02374</div>
                <div class="glossary-field" data-fidx="25"><span class="glossary-field-label">Bedeutung:</span> Seriennummer dieses Getriebes. Aufgebaut von Tex Racing Ent. Inc. (Aufkleber am Geh&auml;use).</div>
                <div class="glossary-related">Verwandt: Identifikation</div>
            </div>
            <div class="glossary-entry" data-search="a-01 a-02 a-03 a-04 quellen klasse a oem">
                <div class="glossary-term">A-01 bis A-04</div>
                <div class="glossary-field" data-fidx="26"><span class="glossary-field-label">Bedeutung:</span> Quellenkennung aus dem Notion-Quellenregister: A-01 Assembly Manual, A-02 Break-In Sheet, A-03 Gear Ratio Chart, A-04 Transmission Guide.</div>
                <div class="glossary-related">Verwandt: Quellen</div>
            </div>
            <div class="glossary-entry" data-search="5100-177 5100-131 sicherungsring snap ring">
                <div class="glossary-term">#5100-177 / #5100-131</div>
                <div class="glossary-field" data-fidx="27"><span class="glossary-field-label">Bedeutung:</span> Sicherungsring vorderes Lager (#5100-177) und Sicherungsring der 3-4 Nabe (#5100-131).</div>
                <div class="glossary-related">Verwandt: Spirolox, Halteclip</div>
            </div>
            <div class="glossary-entry" data-search="c407q c1086q rnta cnt-a sdp-a teilenummern">
                <div class="glossary-term">#C407Q / #C1086Q / #RNTA / #CNT-A / #SDP-A</div>
                <div class="glossary-field" data-fidx="28"><span class="glossary-field-label">Bedeutung:</span> Nadels&auml;tze (C407Q R&uuml;ckw&auml;rtsgang, C1086Q Vorgelegewelle), Anlaufscheiben (RNTA, CNT-A) und die kurze Detentfeder (SDP-A).</div>
                <div class="glossary-related">Verwandt: Nadellager, Detent</div>
            </div>
        </div>
    `;

  function einsetzen() {
    var ziel = document.getElementById('glossaryBody');
    if (!ziel || ziel.dataset.gefuellt) return false;
    ziel.innerHTML = GLOSSAR_HTML;
    ziel.dataset.gefuellt = '1';
    return true;
  }

  global.GLOSSAR_HTML = GLOSSAR_HTML;
  global.glossarEinsetzen = einsetzen;

  if (typeof document !== 'undefined') {
    // Steht das Ziel schon im Dokument, sofort fuellen: search.js und
    // filterGlossary() greifen auf die Eintraege zu, ohne auf ein Ereignis
    // zu warten. Sonst nachholen, sobald das Dokument fertig ist.
    if (!einsetzen()) document.addEventListener('DOMContentLoaded', einsetzen);
  }
})(typeof window !== 'undefined' ? window : globalThis);
