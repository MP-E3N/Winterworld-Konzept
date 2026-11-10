// @ts-check
/**
 * sprites.js — Vorgerenderte Bildchen für Dreck und Spuren im Schnee.
 *
 * ZWECK:    Spieltest M2b: Statt jeden Rußfleck und jedes Schlackekorn als einzelnen Kreis zu malen,
 *           werden beim ersten Gebrauch einmal viele unterschiedliche Bildchen erzeugt (Rußwolken,
 *           große Rußfelder, Schlackehäufchen, Ascheschleier, Radabdrücke). Jeder Fleck im Schnee ist dann EIN Bild —
 *           zufällig gewählt und skaliert (Radabdrücke zusätzlich in Fahrtrichtung gedreht). Bei 24–48
 *           Varianten je Sorte wiederholt sich kein Muster sichtbar, und es sind viel weniger Zeichenbefehle.
 *           Je Sorte liegen alle Varianten auf einem Atlas-Bild. Gemalt werden sie nur einmal — in die
 *           Dreck-Kacheln von render/schmutz.js.
 * LIEST:    nichts (Zufall nur für die Optik)
 * SCHREIBT: eigene kleine Canvas-Bilder (kein Spielzustand)
 * REGEL:    KONZEPT.md §6 („alles per Code gezeichnet“)
 * DEBUG:    `(await import('/render/sprites.js')).spritesAnsehen()` hängt alle Bildchen unten an die Seite.
 */

/** Anzahl Varianten je Sorte. */
const ANZAHL = { russ: 48, russfeld: 40, schlacke: 40, asche: 24, abdruck: 16 };
/** Bildgröße je Variante (Pixel, quadratisch). Großflächige Rußfelder doppelt so fein. */
const GROESSE = 64, GROESSE_FELD = 128;
/** Varianten je Atlas-Zeile und Lücke zwischen den Feldern (gegen Farbsäume beim Skalieren). */
const SPALTEN = 8, LUECKE = 2;

/** @typedef {'russ' | 'russfeld' | 'schlacke' | 'asche' | 'abdruck'} Sorte */
/** Ein Ausschnitt aus einem Atlas. @typedef {{bild: HTMLCanvasElement, sx: number, sy: number, g: number}} Ausschnitt */
/** @type {Partial<Record<Sorte, Ausschnitt[]>>} */
const saetze = {};

/**
 * Ein Bildchen der Sorte als Ausschnitt aus dem Atlas (beim ersten Aufruf wird der ganze Atlas erzeugt).
 * WARUM Atlas: Alle Varianten einer Sorte liegen auf EINEM Bild. Die Grafikkarte muss dann nicht
 * bei jedem Fleck die Textur wechseln — das war bei tausenden einzelnen Canvas der Engpass.
 * @param {Sorte} sorte @param {number} nr  beliebige Ganzzahl (wird auf die Anzahl gefaltet)
 * @returns {Ausschnitt}
 */
export function sprite(sorte, nr) {
  const liste = saetze[sorte] ?? (saetze[sorte] = erzeugen(sorte));
  return liste[((nr % liste.length) + liste.length) % liste.length];
}

/** Anzahl Varianten einer Sorte. @param {Sorte} sorte */
export function varianten(sorte) { return ANZAHL[sorte]; }

// ── Erzeugen ──────────────────────────────────────────────

/**
 * Malt alle Varianten einer Sorte und legt sie in einen Atlas.
 * @param {Sorte} sorte @returns {Ausschnitt[]}
 */
function erzeugen(sorte) {
  const n = ANZAHL[sorte], g = sorte === 'russfeld' ? GROESSE_FELD : GROESSE;
  const gross = atlas(g, Math.ceil(n / SPALTEN));
  /** @type {Ausschnitt[]} */
  const satz = [];
  const einzel = document.createElement('canvas');
  einzel.width = einzel.height = g;
  const e = /** @type {CanvasRenderingContext2D} */ (einzel.getContext('2d'));
  for (let i = 0; i < n; i++) {
    e.clearRect(0, 0, g, g);
    if (sorte === 'russ') russMalen(e);
    else if (sorte === 'russfeld') russfeldMalen(e);
    else if (sorte === 'schlacke') schlackeMalen(e);
    else if (sorte === 'asche') ascheMalen(e);
    else abdruckMalen(e);
    const spalte = i % SPALTEN, zeile = Math.floor(i / SPALTEN);
    const gx = spalte * (g + LUECKE), gy = zeile * (g + LUECKE);
    gross.ctx.drawImage(einzel, gx, gy);
    satz.push({ bild: gross.bild, sx: gx, sy: gy, g });
  }
  return satz;
}

/**
 * Leeres Atlas-Bild für SPALTEN × zeilen Felder.
 * @param {number} g  Feldgröße (Pixel) @param {number} zeilen
 * @returns {{bild: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
 */
function atlas(g, zeilen) {
  const bild = document.createElement('canvas');
  bild.width = SPALTEN * (g + LUECKE);
  bild.height = zeilen * (g + LUECKE);
  const ctx = /** @type {CanvasRenderingContext2D} */ (bild.getContext('2d'));
  ctx.imageSmoothingQuality = 'high';
  return { bild, ctx };
}

/** Zufall zwischen a und b. @param {number} a @param {number} b */
function z(a, b) { return a + Math.random() * (b - a); }

/** Annähernd normalverteilt um 0 (−1 … 1). */
function glocke() { return (Math.random() + Math.random() + Math.random()) / 1.5 - 1; }

/**
 * Rußwolke: ein bis drei weiche Schleier, dazu viele harte Körnchen — manchmal in eine Richtung
 * verweht (Streifen).
 * @param {CanvasRenderingContext2D} g
 */
function russMalen(g) {
  const m = GROESSE / 2;
  const streifen = Math.random() < 0.4 ? z(1.4, 2.4) : 1;
  const richtung = z(0, Math.PI);
  for (let n = Math.floor(z(1, 4)); n > 0; n--) {
    const x = m + glocke() * 10, y = m + glocke() * 10, r = z(9, 22);
    const v = g.createRadialGradient(x, y, 0, x, y, r);
    v.addColorStop(0, `rgba(36, 30, 27, ${z(0.25, 0.45)})`);
    v.addColorStop(1, 'rgba(36, 30, 27, 0)');
    g.fillStyle = v;
    g.beginPath(); g.ellipse(x, y, r * streifen, r, richtung, 0, Math.PI * 2); g.fill();
  }
  for (let n = Math.floor(z(15, 55)); n > 0; n--) {
    const a = glocke() * 24 * streifen, b = glocke() * 24;
    const x = m + a * Math.cos(richtung) - b * Math.sin(richtung);
    const y = m + a * Math.sin(richtung) + b * Math.cos(richtung);
    g.fillStyle = `rgba(${Math.floor(z(18, 45))}, ${Math.floor(z(15, 36))}, ${Math.floor(z(14, 30))}, ${z(0.45, 0.9)})`;
    const r = z(0.5, 2.2);
    g.beginPath(); g.ellipse(x, y, r * z(0.7, 1.5), r, z(0, 3), 0, Math.PI * 2); g.fill();
  }
}

/**
 * Großes Rußfeld (Spieltest M2b): ein zusammenhängender, unregelmäßiger grauer Schleier über fast
 * die ganze Fläche, darin mehrere dichte Körnchen-Nester und verstreute Einzelkörner. Deckt viel
 * Fläche mit EINEM Bild ab — weniger Flecken, weniger Schnee dazwischen.
 * @param {CanvasRenderingContext2D} g
 */
function russfeldMalen(g) {
  const m = GROESSE_FELD / 2;
  const streck = z(1, 1.8), richtung = z(0, Math.PI);
  /** Punkt in der (gestreckten) Fläche. @param {number} weite @returns {[number, number]} */
  const punkt = (weite) => {
    const a = glocke() * weite * streck, b = glocke() * weite;
    return [m + a * Math.cos(richtung) - b * Math.sin(richtung), m + a * Math.sin(richtung) + b * Math.cos(richtung)];
  };
  for (let n = Math.floor(z(7, 13)); n > 0; n--) {
    const [x, y] = punkt(34), r = z(16, 34);
    const v = g.createRadialGradient(x, y, 0, x, y, r);
    v.addColorStop(0, `rgba(38, 32, 29, ${z(0.16, 0.3)})`);
    v.addColorStop(1, 'rgba(38, 32, 29, 0)');
    g.fillStyle = v;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  for (let nest = Math.floor(z(3, 7)); nest > 0; nest--) {
    const [nx, ny] = punkt(30), weite = z(6, 16);
    for (let n = Math.floor(z(20, 60)); n > 0; n--) {
      g.fillStyle = `rgba(${Math.floor(z(16, 42))}, ${Math.floor(z(13, 34))}, ${Math.floor(z(12, 28))}, ${z(0.45, 0.9)})`;
      const rr = z(0.6, 2.6);
      g.beginPath(); g.arc(nx + glocke() * weite, ny + glocke() * weite, rr, 0, Math.PI * 2); g.fill();
    }
  }
  for (let n = Math.floor(z(40, 90)); n > 0; n--) {
    const [x, y] = punkt(50);
    g.fillStyle = `rgba(30, 25, 22, ${z(0.3, 0.75)})`;
    g.fillRect(x, y, z(0.8, 2), z(0.8, 2));
  }
}

/**
 * Schlackehäufchen: kantige Körner mit hellerer Kante, etwas Staub.
 * @param {CanvasRenderingContext2D} g
 */
function schlackeMalen(g) {
  const m = GROESSE / 2;
  for (let n = Math.floor(z(10, 30)); n > 0; n--) {
    g.fillStyle = `rgba(40, 34, 30, ${z(0.2, 0.5)})`;
    g.fillRect(m + glocke() * 26, m + glocke() * 26, z(0.6, 1.6), z(0.6, 1.6));
  }
  for (let n = Math.floor(z(3, 10)); n > 0; n--) {
    const x = m + glocke() * 20, y = m + glocke() * 20, r = z(2, 6.5);
    const ecken = Math.floor(z(4, 7));
    g.beginPath();
    for (let e = 0; e < ecken; e++) {
      const w = (e / ecken) * Math.PI * 2 + z(-0.3, 0.3), rr = r * z(0.6, 1.1);
      if (e === 0) g.moveTo(x + Math.cos(w) * rr, y + Math.sin(w) * rr); else g.lineTo(x + Math.cos(w) * rr, y + Math.sin(w) * rr);
    }
    g.closePath();
    const t = Math.floor(z(18, 40));
    g.fillStyle = `rgb(${t + 6}, ${t}, ${t - 4})`;
    g.fill();
    g.strokeStyle = `rgba(${t + 50}, ${t + 40}, ${t + 34}, 0.7)`;
    g.lineWidth = 0.8;
    g.stroke();
  }
}

/**
 * Ascheschleier: große, blasse, unregelmäßige Flecken, feiner heller Staub.
 * @param {CanvasRenderingContext2D} g
 */
function ascheMalen(g) {
  const m = GROESSE / 2;
  for (let n = Math.floor(z(3, 7)); n > 0; n--) {
    const x = m + glocke() * 14, y = m + glocke() * 14, r = z(8, 20);
    const v = g.createRadialGradient(x, y, 0, x, y, r);
    v.addColorStop(0, `rgba(105, 100, 96, ${z(0.15, 0.3)})`);
    v.addColorStop(1, 'rgba(105, 100, 96, 0)');
    g.fillStyle = v;
    g.beginPath(); g.ellipse(x, y, r, r * z(0.5, 1), z(0, 3), 0, Math.PI * 2); g.fill();
  }
  for (let n = Math.floor(z(30, 80)); n > 0; n--) {
    g.fillStyle = `rgba(${Math.floor(z(70, 130))}, ${Math.floor(z(66, 122))}, ${Math.floor(z(62, 115))}, ${z(0.2, 0.5)})`;
    g.fillRect(m + glocke() * 28, m + glocke() * 28, z(0.5, 1.4), z(0.5, 1.4));
  }
}

/**
 * Radabdruck (Bild liegt längs = Fahrtrichtung nach rechts): festgedrückter Schnee mit
 * zerfransten Rändern, quer laufenden Profilrillen, Krümeln und hellem aufgeworfenem Rand.
 * @param {CanvasRenderingContext2D} g
 */
function abdruckMalen(g) {
  const b = GROESSE, h = GROESSE;
  // Grund: gepresster Schnee, Ränder unregelmäßig
  for (let n = 0; n < 9; n++) {
    g.fillStyle = 'rgba(92, 106, 124, 0.10)';
    g.fillRect(z(-2, 4), 6 + z(-3, 3), b - z(-2, 6), h - 12 + z(-3, 3));
  }
  // Profilrillen quer zur Fahrtrichtung (Abstand ≈ Rillenabstand der Räder), leicht gewellt
  const abstand = z(16, 22);
  for (let x = z(0, abstand); x < b; x += abstand * z(0.85, 1.15)) {
    g.strokeStyle = `rgba(70, 82, 100, ${z(0.25, 0.45)})`;
    g.lineWidth = z(3, 6);
    g.beginPath();
    g.moveTo(x, 8);
    g.quadraticCurveTo(x + z(-4, 4), h / 2, x + z(-3, 3), h - 8);
    g.stroke();
  }
  // Krümel: dunkle und helle Pünktchen
  for (let n = Math.floor(z(25, 50)); n > 0; n--) {
    const hell = Math.random() < 0.5;
    g.fillStyle = hell ? `rgba(250, 252, 255, ${z(0.4, 0.8)})` : `rgba(80, 92, 108, ${z(0.25, 0.5)})`;
    g.fillRect(z(0, b), z(6, h - 6), z(0.8, 2), z(0.8, 2));
  }
  // Aufgeworfener heller Rand oben und unten
  for (const y of [5, h - 5]) {
    for (let n = 0; n < 7; n++) {
      g.fillStyle = `rgba(248, 251, 255, ${z(0.25, 0.5)})`;
      g.beginPath(); g.ellipse(z(0, b), y + z(-2, 2), z(4, 10), z(1.5, 3), 0, 0, Math.PI * 2); g.fill();
    }
  }
  // Anfang und Ende weich ausblenden: Die Stempel überlappen sich und laufen so ohne Kante
  // ineinander (sonst sieht die Spur wie eine Leiter aus).
  g.globalCompositeOperation = 'destination-in';
  const v = g.createLinearGradient(0, 0, b, 0);
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(0.3, 'rgba(0, 0, 0, 1)');
  v.addColorStop(0.7, 'rgba(0, 0, 0, 1)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = v;
  g.fillRect(0, 0, b, h);
  g.globalCompositeOperation = 'source-over';
}

/** Debug: alle Bildchen sichtbar an die Seite hängen. */
export function spritesAnsehen() {
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:0;bottom:0;background:#e8eef3;padding:4px;z-index:99;max-width:100vw';
  for (const sorte of /** @type {Sorte[]} */ (['russ', 'russfeld', 'schlacke', 'asche', 'abdruck'])) {
    box.appendChild(sprite(sorte, 0).bild);
  }
  document.body.appendChild(box);
}
