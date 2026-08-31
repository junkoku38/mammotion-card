/**
 * Mammotion Card
 * Carte Lovelace pour tondeuse robot Mammotion (Luba, Luba 2 AWD, Yuka).
 * Double anneau progression / batterie, phases, courbe de session,
 * zones et contrôle segmenté.
 *
 * https://github.com/junkoku38/mammotion-card
 */

const CARD_VERSION = "1.5.0";

console.info(
  `%c MAMMOTION-CARD %c v${CARD_VERSION} `,
  "color:#101610;background:#c9f0a8;font-weight:700;border-radius:3px 0 0 3px;padding:2px 6px",
  "color:#c9f0a8;background:#12151c;border-radius:0 3px 3px 0;padding:2px 6px"
);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const I = {
  mower: `<path d="M19.5 12c.28 0 .55.03.81.08L18.4 6.05A3 3 0 0 0 15.56 4H8.44a3 3 0 0 0-2.84 2.05L3.69 12.1c.26-.06.53-.1.81-.1A3.5 3.5 0 0 1 8 15.5c0 .17-.01.33-.04.5h8.08a3.5 3.5 0 0 1 3.46-4zM7.5 6h9l1.33 4H6.17L7.5 6zM4.5 13a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm15 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/>`,
  alert: `<path d="M12 2 1 21h22L12 2zm0 5 7.5 12.9h-15L12 7zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z"/>`,
};

const COL = { progress: "#c9f0a8", battery: "#7fb3ff", warn: "#ffc76b", alert: "#ff6b5c", dim: "rgba(255,255,255,.3)" };

const fireEvent = (node, type, detail = {}) => {
  const ev = new Event(type, { bubbles: true, cancelable: false, composed: true });
  ev.detail = detail;
  node.dispatchEvent(ev);
};

const domainOf = (id) => (id ? String(id).split(".")[0] : null);
const DEAD = ["unavailable", "unknown", "", null, undefined];
const isDead = (v) => DEAD.includes(v);

const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]/g, "_");

const MOW_WORDS = ["mowing", "mow", "working", "tonte", "cutting"];
const PAUSE_WORDS = ["paused", "pause", "suspend"];
const DOCK_WORDS = ["docked", "charging", "home", "base", "idle", "standby"];
const RETURN_WORDS = ["returning", "return", "going_home", "retour"];
const ERR_WORDS = ["error", "fault", "stuck", "erreur"];

function smoothPath(pts, tension = 0.28) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i], p2 = pts[i + 1], p3 = i + 2 < pts.length ? pts[i + 2] : p2;
    d += ` C${(p1[0] + ((p2[0] - p0[0]) * tension) / 2).toFixed(1)},${(p1[1] + ((p2[1] - p0[1]) * tension) / 2).toFixed(1)} ${(p2[0] - ((p3[0] - p1[0]) * tension) / 2).toFixed(1)},${(p2[1] - ((p3[1] - p1[1]) * tension) / 2).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function buildSpark(values, w, h, color, gid) {
  const clean = values.filter((v) => v != null && !Number.isNaN(v));
  if (clean.length < 2) return `<svg class="sp" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="rgba(255,255,255,.10)" stroke-width="1.4" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/></svg>`;
  let lo = Math.min(...clean), hi = Math.max(...clean);
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const n = values.length, pts = [];
  values.forEach((v, i) => { if (v != null && !Number.isNaN(v)) pts.push([(i * w) / (n - 1), h - 3 - ((v - lo) / (hi - lo)) * (h - 6)]); });
  const line = smoothPath(pts);
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  const X = pts[pts.length-1][0].toFixed(1), Y = pts[pts.length-1][1].toFixed(1);
  return `<svg class="sp" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".22"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><line x1="${X}" y1="${Y}" x2="${X}" y2="${Y}" stroke="${color}" stroke-width="4.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}


async function ensureHaForm() {
  if (customElements.get("ha-form")) return true;
  try {
    const helpers = await window.loadCardHelpers();
    const card = helpers.createCardElement({ type: "entities", entities: [] });
    if (card?.constructor?.getConfigElement) await card.constructor.getConfigElement();
  } catch (err) { console.warn("mammotion-card : ha-form indisponible", err); }
  return !!customElements.get("ha-form");
}

class MammotionCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; this._els = {}; this._history = null; this._fetchedAt = 0; this._busy = false; this._tick = null; }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._config = { name: "Tondeuse", hours: 4, points: 60, refresh: 300, show_battery_chart: true, show_phases: true, zones: [], ...config };
    this._built = false; this._history = null; this._fetchedAt = 0;
    if (this.shadowRoot) this.shadowRoot.innerHTML = "";
  }

  static async getConfigElement() {
    await ensureHaForm();
    return document.createElement("mammotion-card-editor");
  }

  static getStubConfig(hass) {
    const stub = { type: "custom:mammotion-card", name: "Tondeuse" };
    if (!hass?.states) return stub;
    const mower = Object.keys(hass.states).find((id) => id.startsWith("lawn_mower.") && !isDead(hass.states[id]?.state));
    if (mower) { stub.mower = mower; const dev = hass.entities?.[mower]?.device_id;
      const same = (re, d) => Object.keys(hass.states).find((id) => hass.entities?.[id]?.device_id === dev && re.test(id) && id.startsWith(d));
      const batt = same(/batterie$|battery$/, "sensor."); if (batt) stub.battery = batt;
      const prog = same(/progression$|progress$/, "sensor."); if (prog) stub.progress = prog;
    }
    return stub;
  }

  getCardSize() { return 12; }

  set hass(hass) { const first = !this._hass; this._hass = hass; if (!this._built) this._build(); this._update(); if (first) this._fetchHistory(); }
  connectedCallback() { this._tick = setInterval(() => { this._update(); if (Date.now() - this._fetchedAt > this._config.refresh * 1000) this._fetchHistory(); }, 20000); }
  disconnectedCallback() { if (this._tick) clearInterval(this._tick); this._tick = null; }

  _s(id) { return this._st(id)?.state ?? null; }
  _st(id) { return id && this._hass ? this._hass.states[id] : null; }
  _num(id) { if (typeof id === "number") return id; const s = this._st(id); if (!s || isDead(s.state)) return null; const v = Number(s.state); return Number.isNaN(v) ? null : v; }
  _txt(id, fallback = "—") { const s = this._st(id); if (!s || isDead(s.state)) return fallback; return s.state; }
  _more(id) { if (id) fireEvent(this, "hass-more-info", { entityId: id }); }
  _fmt(v, dec) { if (v == null || Number.isNaN(v)) return "—"; const d = dec !== undefined ? dec : Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2; return new Intl.NumberFormat(this._hass?.locale?.language || "fr", { minimumFractionDigits: 0, maximumFractionDigits: d }).format(v); }
  _hhmm(d) { return d.toLocaleTimeString(this._hass?.locale?.language || "fr", { hour: "2-digit", minute: "2-digit" }); }
  _dur(min) { if (min == null || Number.isNaN(min)) return "—"; const m = Math.max(0, Math.round(min)); const h = Math.floor(m / 60); const r = m % 60; if (h === 0) return `${r} min`; return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, "0")}`; }

  _mowerState() { const c = this._config; const s = this._st(c.mower) || this._st(c.state_entity); return s ? norm(s.state) : ""; }
  _mode() {
    const v = this._mowerState();
    /* Une erreur code non nul prime sur l'état publishé : Mammotion laisse
       parfois l'état sur « paused » pendant une faute bloquante (caméra
       masquée, coincidence...). Le code est la vérité, l'état un souhait. */
    const errCode = this._txt(this._config.error_code, null);
    const errActive = errCode && !["0","none","no_error","unknown","—","null",""].includes(norm(errCode));
    if (errActive || ERR_WORDS.some((w) => v.includes(w))) return "error";
    if (PAUSE_WORDS.some((w) => v.includes(w))) return "paused";
    if (RETURN_WORDS.some((w) => v.includes(w))) return "returning";
    if (MOW_WORDS.some((w) => v.includes(w))) return "mowing";
    if (DOCK_WORDS.some((w) => v.includes(w))) return "docked";
    return "docked";
  }
  /* Session : temps écoulé / temps total, quand l'intégration les publie.
     La progression terrain (progress) reste au premier plan, mais la
     session répond à « quand est-ce que ça finit, réellement ? ». */
  _sessionRatio() {
    const c = this._config;
    const el = this._num(c.elapsed_time), tot = this._num(c.total_time);
    if (el == null || tot == null || tot <= 0) return null;
    return Math.max(0, Math.min(1, el / tot));
  }
  /* Erreur affichable : texte nettoyé (Mammotion préfixe « common: ») et
     daté si l'heure est publiée — « il y a 2 j » est plus utile qu'un
     horodatage brut. */
  _errorText() {
    const c = this._config;
    let txt = this._txt(c.error, null);
    if (txt) txt = String(txt).replace(/^common:\s*/i, "").replace(/_/g, " ").trim();
    const t = this._st(c.error_time)?.state;
    let when = "";
    if (t && !isDead(t)) {
      const ts = new Date(t).getTime();
      if (!Number.isNaN(ts)) {
        const d = (Date.now() - ts) / 86400000;
        when = d < 1 ? "aujourd'hui" : d < 2 ? "hier" : `il y a ${Math.round(d)} j`;
      }
    }
    if (txt && when) return `${txt} (${when})`;
    return txt || when || null;
  }
  _ago(t) { if (!t || isDead(t)) return null; const ts = new Date(t).getTime(); if (Number.isNaN(ts)) return null; const d = (Date.now() - ts) / 86400000; return d < 1 ? "aujourd'hui" : d < 2 ? "hier" : `il y a ${Math.round(d)} j`; }
  _progress() { const c = this._config; let p = this._num(c.progress); if (p != null) return Math.max(0, Math.min(1, p > 1 ? p / 100 : p)); return null; }
  _remainingMinutes() { const c = this._config; const s = this._st(c.remaining_time); if (!s || isDead(s.state)) return null; const raw = s.state; if (/\d{4}-\d{2}-\d{2}T/.test(raw)) { const d = (new Date(raw).getTime() - Date.now()) / 60000; return d > 0 ? d : 0; } const v = Number(raw); if (Number.isNaN(v)) return null; return v; }

  async _fetchHistory() {
    const c = this._config; if (!c.battery || !c.show_battery_chart || this._busy || !this._hass) return;
    this._busy = true;
    try { const end = new Date(); const start = new Date(end.getTime() - c.hours * 3600 * 1000);
      const res = await this._hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), end_time: end.toISOString(), minimal_response: true, no_attributes: true, entity_ids: [c.battery] });
      this._history = { data: res || {}, start: start.getTime(), end: end.getTime() };
    } catch (err) { console.warn("mammotion-card : historique indisponible", err); this._history = { data: {}, start: 0, end: 0 };
    } finally { this._busy = false; this._fetchedAt = Date.now(); this._renderChart(); }
  }

  _series(entityId) {
    const h = this._history; if (!h || !entityId || !h.data[entityId]) return null;
    const samples = [];
    h.data[entityId].forEach((p) => { const t = p.lu != null ? p.lu * 1000 : new Date(p.last_updated).getTime(); const v = Number(p.s !== undefined ? p.s : p.state); if (!Number.isNaN(v) && t) samples.push([t, v]); });
    if (samples.length < 2) return null; samples.sort((a, b) => a[0] - b[0]);
    const n = this._config.points, step = (h.end - h.start) / (n - 1);
    const out = new Array(n).fill(null); let idx = 0, last = samples[0][1];
    for (let i = 0; i < n; i++) { const t = h.start + i * step; let sum = 0, cnt = 0;
      while (idx < samples.length && samples[idx][0] <= t) { last = samples[idx][1]; sum += samples[idx][1]; cnt++; idx++; }
      out[i] = cnt ? sum / cnt : last; }
    return out;
  }


  async _mountCamera() {
    const c = this._config;
    if (!c.camera || !this._hass || !this._els.camSlot) return;
    const host = this._els.camSlot;
    if (host._mounted) return;
    try {
      if (typeof window.loadCardHelpers !== "function") throw new Error("loadCardHelpers indisponible");
      const helpers = await window.loadCardHelpers();
      const el = helpers.createCardElement({
        type: "picture-entity", entity: c.camera, camera_view: "live",
        show_name: false, show_state: false, tap_action: { action: "none" },
      });
      el.hass = this._hass;
      host.innerHTML = "";
      host.appendChild(el);
      host._mounted = true;
      host._camEl = el;
    } catch (err) {
      console.warn("mammotion-card : camera indisponible", err);
      // repli : image statique
      const cam = this._st(c.camera);
      const pic = cam?.attributes?.entity_picture;
      if (pic) { host.innerHTML = `<img src="${pic}" style="width:100%;border-radius:12px"/>`; host._mounted = true; }
    }
  }

  _build() {
    this.shadowRoot.innerHTML = `<style>${MammotionCard.styles}</style>${this._template()}`;
    this._built = true;
    const $ = (s) => this.shadowRoot.querySelector(s); const e = this._els; const c = this._config;
    e.card = $("ha-card"); e.dot = $(".ms .md"); e.name = $(".ms .nm"); e.state = $(".ms b"); e.chips = $(".mk");
    e.errBanner = $(".errw"); e.errTxt = $(".errw span");
    e.ringProg = $(".dr .rp"); e.ringBatt = $(".dr .rb"); e.big = $(".mw"); e.bigSub = $(".msb"); e.legend = $(".mlg");
    e.segw = $(".segw"); e.phases = $(".phw"); e.pbSlot = $(".phw .slot"); e.phRow = $(".phr");
    e.chartMeta = $(".chartw .est"); e.chartSlot = $(".chartw .slot");
    e.zones = $(".zrs"); e.zonesMeta = $(".zonesw .est"); e.cells = $(".bg4");
    e.footLeft = $(".sf .left"); e.footRight = $(".sf .right");
    e.camSlot = $(".cam-slot"); e.extraBtns = $(".extra-btns"); e.actBtns = $(".activity-btns");
    e.mowGrid = this.shadowRoot.querySelector("#mow-grid");
    e.connGrid = this.shadowRoot.querySelector("#conn-grid");
    e.swList = this.shadowRoot.querySelector("#sw-list");
    $(".mstage").addEventListener("click", () => this._more(c.mower || c.state_entity));
    if (e.errBanner) e.errBanner.addEventListener("click", () => this._more(c.error || c.error_code || c.mower));
    e.segw.querySelectorAll(".sgi").forEach((el) => el.addEventListener("click", () => this._action(el.dataset.a)));
  }

  _template() {
    const c = this._config;
    /* Organisation : état → actions groupées → infos live → données →
       réglages. Les actions éparpillées (segmenté en haut, activités et
       extras noyés sous les phases/caméra) demandaient de chercher ;
       elles vivent désormais ensemble, juste sous l'état. */
    return `<ha-card><div class="glow"></div>
      <div class="mh"><div class="ms"><span class="md"></span><span class="nm"></span> · <b>—</b></div><div class="mk"></div></div>
      <div class="errw hidden"><svg viewBox="0 0 24 24">${I.alert}</svg><span></span></div>
      <div class="mstage"><svg class="dr" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="82" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="8"/>
        <circle class="rp" cx="90" cy="90" r="82" fill="none" stroke="${COL.progress}" stroke-width="8" stroke-linecap="round" transform="rotate(-90 90 90)"/>
        <circle cx="90" cy="90" r="66" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="5"/>
        <circle class="rb" cx="90" cy="90" r="66" fill="none" stroke="${COL.battery}" stroke-width="5" stroke-linecap="round" opacity=".75" transform="rotate(-90 90 90)"/>
      </svg><div class="mc"><svg class="mi" viewBox="0 0 24 24">${I.mower}</svg><div class="mw">—</div><div class="msb">—</div></div></div>
      <div class="mlg"></div>
      <div class="segw"><div class="pill"></div>
        <div class="sgi" data-a="start"><span>Tondre</span></div>
        <div class="sgi" data-a="pause"><span>Pause</span></div>
        <div class="sgi" data-a="dock"><span>Base</span></div>
      </div>
      <div class="activity-btns hidden"></div>
      <div class="extra-btns hidden"></div>
      ${c.show_phases ? `<div class="phw"><div class="slot"></div><div class="phr"></div></div>` : ""}
      <div class="cam-slot"></div>
      <div class="bg4"></div>
      ${c.battery && c.show_battery_chart ? `<div class="chartw"><div class="lbl"><span class="k">Batterie · ${Number(c.hours)||4} h</span><span class="est"></span></div><div class="slot"></div></div>` : ""}
      ${c.zones.length ? `<div class="zonesw"><div class="lbl"><span class="k">Zones</span><span class="est"></span></div><div class="zrs"></div></div>` : ""}

      <details class="acc acc-mow">
        <summary class="accs"><span class="k">Réglages de tonte</span><svg class="car" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></summary>
        <div class="accb" id="mow-grid"></div>
      </details>

      <details class="acc acc-conn">
        <summary class="accs"><span class="k">Connexion et positionnement</span><svg class="car" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></summary>
        <div class="accb" id="conn-grid"></div>
      </details>

      <details class="acc acc-sw">
        <summary class="accs"><span class="k">Commutateurs</span><svg class="car" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></summary>
        <div class="accb" id="sw-list"></div>
      </details>

      <div class="sf"><span class="left"></span><span class="right"></span></div></ha-card>`;
  }

  _action(kind) {
    const c = this._config; if (!this._hass) return;
    if (c.mower && c.mower.startsWith("lawn_mower.")) {
      const svc = { start: "start_mowing", pause: "pause", dock: "dock" }[kind];
      if (svc) this._hass.callService("lawn_mower", svc, { entity_id: c.mower });
      return;
    }
    const btnMap = { start: c.start_button, pause: c.pause_button, dock: c.dock_button };
    const btn = btnMap[kind]; if (!btn) return;
    const d = domainOf(btn);
    if (d === "button" || d === "input_button") this._hass.callService(d, "press", { entity_id: btn });
    else if (d !== "script" && d !== "automation") this._hass.callService("homeassistant", "turn_on", { entity_id: btn });
  }

  _renderPhases(activeIdx) {
    const e = this._els; if (!e.pbSlot) return;
    const phases = [ { name: "Tonte", w: 0.72 }, { name: "Retour base", w: 0.12 }, { name: "Charge", w: 0.16 } ];
    const W = 342, H = 8, gap = 3, total = phases.reduce((a,b) => a + b.w, 0);
    let x = 0; const parts = [];
    phases.forEach((p, i) => {
      const pw = ((W - (phases.length - 1) * gap) * p.w) / total;
      const fill = i < activeIdx ? 1 : i === activeIdx ? 0.55 : 0;
      parts.push(`<rect x="${x.toFixed(1)}" y="0" width="${pw.toFixed(1)}" height="${H}" rx="4" fill="rgba(255,255,255,.07)"/>`);
      if (fill > 0) parts.push(`<rect x="${x.toFixed(1)}" y="0" width="${Math.max(6, pw * fill).toFixed(1)}" height="${H}" rx="4" fill="#eef1f6" opacity="${fill < 1 ? 0.92 : 0.45}"/>`);
      x += pw + gap;
    });
    e.pbSlot.innerHTML = `<svg class="pb" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${parts.join("")}</svg>`;
    e.phRow.innerHTML = phases.map((p, i) => `<span class="ph ${i === activeIdx ? "on" : i < activeIdx ? "done" : ""}">${esc(p.name)}</span>`).join("");
  }

  _renderChart() {
    const c = this._config, e = this._els; if (!e.chartSlot) return;
    const serie = this._series(c.battery);
    e.chartSlot.innerHTML = buildSpark(serie || [], 342, 40, COL.progress, "gB");
    if (serie && e.chartMeta) { const clean = serie.filter((v) => v != null); const delta = clean[clean.length-1] - clean[0]; e.chartMeta.textContent = `${delta >= 0 ? "+" : "−"}${this._fmt(Math.abs(delta), 0)} % sur ${c.hours} h`; }
  }

  _renderZones() {
    const c = this._config, e = this._els; if (!e.zones) return;
    e.zones.innerHTML = c.zones.map((z, i) => {
      let pct = this._num(z.entity); if (pct != null && pct <= 1) pct *= 100;
      const area = this._num(z.area); const name = z.name || this._st(z.entity)?.attributes?.friendly_name || `Zone ${i+1}`;
      const done = pct != null && pct >= 99.5;
      return `<div class="zr" data-i="${i}"><span class="zn">${esc(name)}</span><span class="zb"><i style="width:${Math.max(0, Math.min(100, pct ?? 0))}%"></i></span><span class="zp${done ? " done" : ""}">${pct != null ? `${Math.round(pct)} %` : "—"}</span><span class="zs">${area ? `${this._fmt(area, 0)} m²` : ""}</span></div>`;
    }).join("");
    e.zones.querySelectorAll(".zr").forEach((el) => el.addEventListener("click", () => this._more(c.zones[Number(el.dataset.i)].entity)));
    if (e.zonesMeta) { const totalArea = c.zones.reduce((a, z) => a + (this._num(z.area) || 0), 0); e.zonesMeta.textContent = `${c.zones.length} zone${c.zones.length > 1 ? "s" : ""}${totalArea ? ` · ${this._fmt(totalArea, 0)} m²` : ""}`; }
  }

  _update() {
    const c = this._config, e = this._els; if (!this._hass || !this._built) return;
    const mode = this._mode(), progress = this._progress(), batt = this._num(c.battery), rem = this._remainingMinutes();
    const charging = this._s(c.charging) === "on";
    e.card.className = `m-${mode}`;
    const dotColor = mode === "error" ? COL.alert : mode === "mowing" ? COL.progress : mode === "paused" ? COL.warn : COL.battery;
    e.dot.style.background = dotColor; e.dot.style.boxShadow = `0 0 8px ${dotColor}99`;
    const labels = { mowing: "Tonte", paused: "En pause", returning: "Retour base", docked: charging ? "En charge" : "À la base", error: "Erreur" };
    e.name.textContent = c.name; e.state.textContent = labels[mode];
    const chips = []; const rtk = this._txt(c.rtk_status, null); if (rtk) chips.push(rtk);
    const sat = this._num(c.satellites); if (sat != null) chips.push(`${Math.round(sat)} sat`);
    e.chips.innerHTML = chips.map((t) => `<span class="lk">${esc(t)}</span>`).join("");
    const C1 = 2 * Math.PI * 82, C2 = 2 * Math.PI * 66;
    e.ringProg.setAttribute("stroke-dasharray", `${(C1 * (progress ?? 0)).toFixed(1)} ${C1.toFixed(1)}`);
    e.ringBatt.setAttribute("stroke-dasharray", `${(C2 * ((batt ?? 0) / 100)).toFixed(1)} ${C2.toFixed(1)}`);
    e.ringBatt.setAttribute("stroke", batt != null && batt <= 20 ? COL.warn : COL.battery);
    if (mode === "mowing" && rem != null) { const h = Math.floor(rem / 60), m = Math.round(rem % 60); e.big.innerHTML = h > 0 ? `${h}<span>h</span>${String(m).padStart(2,"0")}` : `${m}<span>min</span>`; }
    else if (mode === "mowing" && progress != null) e.big.innerHTML = `${Math.round(progress * 100)}<span>%</span>`;
    else if (batt != null) e.big.innerHTML = `${Math.round(batt)}<span>%</span>`;
    else e.big.textContent = labels[mode];
    const sub = [];
    if (progress != null && mode === "mowing") sub.push(`${Math.round(progress * 100)} %`);
    /* Zone en cours : le numéro nu n'est pas parlant, on le préfixe. */
    const zone = this._num(c.current_zone);
    if (zone != null && (mode === "mowing" || mode === "returning" || mode === "paused")) sub.push(`Zone ${Math.round(zone)}`);
    /* Session : écoulé/total répond à « quand ça finit », complément de la
       progression terrain qui mesure les mètres, pas le temps. */
    const sr = this._sessionRatio();
    if (sr != null && sr > 0) sub.push(`session ${Math.round(sr * 100)} %`);
    const area = this._num(c.area); if (area != null) sub.push(`${this._fmt(area, 0)} m²`);
    e.bigSub.textContent = sub.join(" · ") || "";
    const finish = rem != null && rem > 0 ? new Date(Date.now() + rem * 60000) : null;
    e.legend.innerHTML = `<span><i style="background:${COL.progress}"></i>Progression</span><span><i style="background:${COL.battery}"></i>Batterie ${batt != null ? `${Math.round(batt)} %` : "—"}</span><span class="mr">${finish ? `fin ${this._hhmm(finish)}` : ""}</span>`;
    const activeSeg = mode === "mowing" ? 0 : mode === "paused" ? 1 : 2;
    e.segw.querySelector(".pill").style.left = `calc(${activeSeg} * (100% - 8px) / 3 + 4px)`;
    e.segw.querySelectorAll(".sgi").forEach((el, i) => el.classList.toggle("on", i === activeSeg));
    if (e.phases) this._renderPhases(mode === "mowing" ? 0 : mode === "returning" ? 1 : 2);
    this._renderZones();
    const cells = [
      { k: "Surface", v: this._num(c.area) != null ? `${this._fmt(this._num(c.area), 0)} m²` : "—" },
      { k: "Durée", v: this._dur(this._num(c.session_duration)) },
      { k: "Lame", v: this._num(c.blade_height) != null ? `${this._fmt(this._num(c.blade_height), 0)} mm` : "—" },
      { k: "RTK", v: rtk || "—" },
      { k: "Cycles", v: this._num(c.battery_cycles) != null ? `${Math.round(this._num(c.battery_cycles))}` : "—" },
      { k: "Total", v: this._num(c.total_work_time) != null ? `${this._fmt(this._num(c.total_work_time), 0)} h` : "—" },
    ];
    e.cells.innerHTML = cells.map((x) => `<div class="bc4"><span>${esc(x.k)}</span><b>${esc(x.v)}</b></div>`).join("");
    const errCode = this._txt(c.error_code, null);
    /* Une erreur n'est active que si le mode est error, ou si un code d'erreur
       numerique non nul est present. Le texte de derniere_erreur reste stocke
       meme apres resolution, donc il ne peut pas seul indiquer une erreur active. */
    const hasErr = mode === "error" || (errCode && !["0","none","no_error","unknown","—","null"].includes(norm(errCode)));
    /* Bannière : l'erreur doit sauter aux yeux dès l'ouverture de la carte,
       pas se noyer dans le pied. Rouge = regarder la tondeuse maintenant. */
    if (e.errBanner) {
      e.errBanner.classList.toggle("hidden", !hasErr);
      if (hasErr) e.errTxt.textContent = this._errorText() || errCode || "Erreur active";
    }
    e.footLeft.innerHTML = `<i class="${hasErr ? "warn" : ""}"></i>${hasErr ? esc(this._errorText() || errCode || "Erreur active") : "Aucune erreur"}`;
    const wear = this._num(c.blade_wear), km = this._num(c.odometer);
    /* Lame : les heures d'utilisation sont plus parlantes qu'un pourcentage
       de Mammotion. 60 h est la durée de vie constructeur typique. */
    const bladeH = this._num(c.blade_hours);
    const wearBits = [];
    if (bladeH != null) wearBits.push(`Lame ${this._fmt(bladeH, 1)} h${bladeH >= 60 ? " ⚠" : ""}`);
    else if (wear != null) wearBits.push(`Lames · ${this._fmt(wear, 0)} %`);
    if (km != null) wearBits.unshift(`${this._fmt(km, 0)} km`);
    if (!this._history) this._renderChart();


    /* Sections repliables */
    const fmtVal = (id, suffix = "") => { const v = this._txt(id, null); return v && v !== "—" ? v + suffix : "—"; };
    const fmtNum = (id, suffix = "") => { const v = this._num(id); return v != null ? this._fmt(v, v < 10 ? 1 : 0) + suffix : "—"; };
    const cell = (label, value) => `<div class="gc"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;

    // Reglages de tonte
    if (e.mowGrid) {
      const items = [];
      if (c.speed) items.push(cell("Vitesse", fmtNum(c.speed, " m/s")));
      if (c.spacing) items.push(cell("Espacement", fmtNum(c.spacing, " cm")));
      if (c.angle) items.push(cell("Angle", fmtVal(c.angle)));
      if (c.trajectory_mode) items.push(cell("Trajectoire", fmtVal(c.trajectory_mode)));
      if (c.mowing_order) items.push(cell("Ordre", fmtVal(c.mowing_order)));
      if (c.obstacle_detection) items.push(cell("Obstacles", fmtVal(c.obstacle_detection)));
      if (c.wildlife_safety) items.push(cell("Faune", fmtVal(c.wildlife_safety)));
      if (c.rain_detection_mowing) items.push(cell("Pluie (tonte)", fmtVal(c.rain_detection_mowing)));
      if (c.rain_detection_during) items.push(cell("Pluie (pendant)", fmtVal(c.rain_detection_during)));
      e.mowGrid.innerHTML = items.join("");
      e.mowGrid.closest(".acc").classList.toggle("hidden", !items.length);
    }

    // Connexion et positionnement
    if (e.connGrid) {
      const items = [];
      if (c.activity_mode) items.push(cell("Mode activité", fmtVal(c.activity_mode)));
      if (c.position_type) items.push(cell("Position", fmtVal(c.position_type)));
      if (c.rtk_status) items.push(cell("RTK", fmtVal(c.rtk_status)));
      if (c.satellites) items.push(cell("Satellites", fmtNum(c.satellites)));
      if (c.satellites_l1) items.push(cell("Sat L1", fmtNum(c.satellites_l1)));
      if (c.satellites_l2) items.push(cell("Sat L2", fmtNum(c.satellites_l2)));
      if (c.wifi_signal) items.push(cell("Wi-Fi", fmtNum(c.wifi_signal, " dBm")));
      if (c.cellular_signal) items.push(cell("4G", fmtNum(c.cellular_signal, " dBm")));
      if (c.bluetooth_signal) items.push(cell("BT", fmtNum(c.bluetooth_signal, " dBm")));
      if (c.idle_hours) {
        const idle = this._txt(c.idle_hours, null);
        if (idle && idle !== "—") items.push(cell("Non travaillé", idle));
      }
      if (c.firmware) {
        const f = this._st(c.firmware);
        const pending = f?.state === "on";
        items.push(cell("Firmware", pending ? "MAJ dispo" : (f?.attributes?.installed_version || "—")));
      }
      e.connGrid.innerHTML = items.join("");
      e.connGrid.closest(".acc").classList.toggle("hidden", !items.length);
    }

    // Commutateurs
    if (e.swList) {
      const sws = [];
      const swList = [
        ["Bluetooth", c.bluetooth_switch], ["Cloud", c.cloud_switch],
        ["LED latérales", c.led_switch], ["Voix", c.voice_switch],
        ["MAJ auto", c.auto_update_switch],
      ];
      for (const [label, id] of swList) {
        if (!id) continue;
        const on = this._s(id) === "on";
        sws.push(`<div class="sw-row" data-e="${esc(id)}"><span class="sw-n">${esc(label)}</span><span class="sw-t${on ? " on" : ""}"></span></div>`);
      }
      e.swList.innerHTML = sws.join("");
      e.swList.closest(".acc").classList.toggle("hidden", !sws.length);
      e.swList.querySelectorAll(".sw-row").forEach((row) => {
        row.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const id = row.dataset.e;
          const d = domainOf(id);
          if (["switch","input_boolean","light"].includes(d)) this._hass.callService(d, "toggle", { entity_id: id });
        });
      });
    }

    /* Camera */
    if (c.camera && this._els.camSlot) {
      if (this._els.camSlot._camEl) this._els.camSlot._camEl.hass = this._hass;
      else this._mountCamera();
    }

    /* Boutons supplementaires */
    if (this._els.extraBtns) {
      const btns = [];
      if (c.edge_button) btns.push({ label: "Bordure", id: c.edge_button });
      if (c.leave_dock_button) btns.push({ label: "Quitter la base", id: c.leave_dock_button });
      if (c.restart_button) btns.push({ label: "Redémarrer", id: c.restart_button, ghost: true });
      if (c.sync_map_button) btns.push({ label: "Synchro cartes", id: c.sync_map_button, ghost: true });
      if (c.sync_schedule_button) btns.push({ label: "Synchro plannings", id: c.sync_schedule_button, ghost: true });
      if (c.sync_rtk_button) btns.push({ label: "Synchro RTK", id: c.sync_rtk_button, ghost: true });
      this._els.extraBtns.innerHTML = btns.map((b, i) =>
        `<div class="eb${b.ghost ? " ghost" : ""}" data-i="${i}">${esc(b.label)}</div>`
      ).join("");
      this._els.extraBtns.classList.toggle("hidden", !btns.length);
      this._els.extraBtns.querySelectorAll(".eb").forEach((el) => {
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const b = btns[Number(el.dataset.i)];
          const d = domainOf(b.id);
          if (d === "button" || d === "input_button") this._hass.callService(d, "press", { entity_id: b.id });
        });
      });
    }

    /* Boutons d'activités : lancement direct des tontes pré-configurées
       (espacement 20, 25...) — le raccourci le plus utilisé au quotidien
       après Démarrer/Pause. */
    if (this._els.actBtns) {
      const acts = [];
      if (c.activity_1_button) acts.push({ label: c.activity_1_label || "Activité 1", id: c.activity_1_button });
      if (c.activity_2_button) acts.push({ label: c.activity_2_label || "Activité 2", id: c.activity_2_button });
      if (c.activity_3_button) acts.push({ label: c.activity_3_label || "Activité 3", id: c.activity_3_button });
      this._els.actBtns.innerHTML = acts.map((b, i) =>
        `<div class="eb act" data-i="${i}">${esc(b.label)}</div>`
      ).join("");
      this._els.actBtns.classList.toggle("hidden", !acts.length);
      this._els.actBtns.querySelectorAll(".eb").forEach((el) => {
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const b = acts[Number(el.dataset.i)];
          const d = domainOf(b.id);
          if (d === "button" || d === "input_button") this._hass.callService(d, "press", { entity_id: b.id });
        });
      });
    }

    /* Heures non travaillées : déjà intégré dans la section connexion. */

    /* Cycles et temps total dans le pied */
    const cycles = this._num(c.battery_cycles);
    const workTime = this._num(c.total_work_time);
    const footBits = [...wearBits];
    if (workTime != null) footBits.push(`${this._fmt(workTime, 0)} h travail`);
    if (cycles != null) footBits.push(`${Math.round(cycles)} cycles`);
    e.footRight.textContent = footBits.join(" · ");
  }
}

MammotionCard.styles = `
:host{--mm-bg:#12151c;--mm-green:#c9f0a8;--mm-blue:#7fb3ff;--mm-warn:#ffc76b;--mm-alert:#ff6b5c;display:block;}
*{box-sizing:border-box;}
ha-card{border-radius:var(--ha-card-border-radius,26px);padding:20px 18px 16px;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.07);background:var(--mm-bg);color:#eef1f6;font-family:var(--primary-font-family,"Inter","Segoe UI",Roboto,sans-serif);transition:border-color .35s;}
ha-card::after{content:"";position:absolute;left:20px;right:20px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);}
.glow{position:absolute;inset:0;pointer-events:none;transition:.5s;background:radial-gradient(85% 50% at 50% 6%,rgba(201,240,168,.14),transparent 62%);}
.m-docked .glow,.m-returning .glow{background:radial-gradient(85% 50% at 50% 6%,rgba(127,179,255,.13),transparent 62%);}
.m-paused .glow{background:radial-gradient(85% 50% at 50% 6%,rgba(255,199,107,.13),transparent 62%);}
.m-error{border-color:rgba(255,107,92,.38);}
.m-error .glow{background:radial-gradient(88% 55% at 50% 6%,rgba(255,107,92,.22),transparent 62%);}
.mh{display:flex;align-items:center;justify-content:space-between;gap:8px;position:relative;z-index:1;}
/* Bannière d'erreur : au-dessus de tout, rouge — une faute bloquante
   demande un déplacement physique de la tondeuse, elle ne se règle pas
   en cliquant. */
.errw{display:flex;align-items:center;gap:10px;margin-top:12px;padding:11px 13px;border-radius:13px;
  background:rgba(255,107,92,.13);border:1px solid rgba(255,107,92,.38);position:relative;z-index:1;
  font-size:11px;font-weight:600;color:#ffb3aa;cursor:pointer;}
.errw.hidden{display:none;}
.errw svg{width:16px;height:16px;fill:#ff8a7a;flex-shrink:0;}
.errw span{min-width:0;}
.ms{display:flex;align-items:center;gap:7px;font-size:11.5px;color:rgba(255,255,255,.55);min-width:0;}
.ms .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ms b{color:#eef1f6;font-weight:600;white-space:nowrap;}
.md{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.mk{display:flex;gap:5px;flex-shrink:0;}
.lk{font-size:8.5px;font-weight:600;letter-spacing:.7px;color:rgba(255,255,255,.5);background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:6px;padding:3px 6px;white-space:nowrap;}
.mstage{position:relative;width:180px;margin:20px auto 0;z-index:1;cursor:pointer;}
.dr{display:block;width:180px;height:180px;}
.dr circle{transition:stroke-dasharray .6s ease,stroke .3s;}
.mc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;pointer-events:none;}
.mi{width:21px;height:21px;fill:var(--mm-green);}
.m-docked .mi,.m-returning .mi{fill:var(--mm-blue);}
.m-paused .mi{fill:var(--mm-warn);}
.m-error .mi{fill:var(--mm-alert);}
.mw{font-size:38px;font-weight:200;letter-spacing:-2px;line-height:1;font-variant-numeric:tabular-nums;}
.mw span{font-size:15px;font-weight:300;color:rgba(255,255,255,.4);margin:0 2px;letter-spacing:0;}
.msb{font-size:10px;color:rgba(255,255,255,.38);font-variant-numeric:tabular-nums;}
.mlg{display:flex;align-items:center;gap:12px;font-size:9px;color:rgba(255,255,255,.36);margin-top:12px;position:relative;z-index:1;}
.mlg i{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:5px;}
.mlg .mr{margin-left:auto;font-variant-numeric:tabular-nums;}
.segw{position:relative;display:flex;margin-top:16px;padding:4px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);z-index:1;}
.pill{position:absolute;top:4px;bottom:4px;left:4px;width:calc((100% - 8px)/3);border-radius:13px;background:rgba(255,255,255,.13);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),0 4px 14px rgba(0,0,0,.3);transition:left .32s cubic-bezier(.4,1.3,.5,1);}
.sgi{position:relative;flex:1;text-align:center;padding:11px 0;cursor:pointer;}
.sgi span{font-size:11px;font-weight:600;color:rgba(255,255,255,.45);}
.sgi.on span{color:#eef1f6;}
.phw{margin-top:18px;position:relative;z-index:1;}
.pb{display:block;width:100%;height:8px;}
.phr{display:flex;justify-content:space-between;margin-top:7px;}
.ph{font-size:8.5px;letter-spacing:.4px;text-transform:uppercase;font-weight:600;color:rgba(255,255,255,.24);}
.ph.done{color:rgba(255,255,255,.44);}
.ph.on{color:#eef1f6;}
.k{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.42);font-weight:600;}
.est{font-size:9.5px;color:rgba(255,255,255,.34);font-variant-numeric:tabular-nums;}
.lbl{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:9px;}
.chartw{margin-top:18px;position:relative;z-index:1;}
.sp{display:block;width:100%;height:40px;}
.zonesw{margin-top:18px;position:relative;z-index:1;}
.zrs{display:flex;flex-direction:column;gap:1px;}
.zr{display:flex;align-items:center;gap:9px;padding:6px 0;cursor:pointer;}
.zn{font-size:11px;color:rgba(255,255,255,.55);width:106px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.zb{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;}
.zb i{display:block;height:100%;border-radius:2px;background:var(--mm-green);opacity:.75;transition:width .4s;}
.zp{font-size:10.5px;font-weight:600;width:34px;text-align:right;color:rgba(255,255,255,.62);font-variant-numeric:tabular-nums;}
.zp.done{color:var(--mm-green);}
.zs{font-size:9.5px;width:46px;text-align:right;color:rgba(255,255,255,.3);font-variant-numeric:tabular-nums;}
.bg4{display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:6px;margin-top:18px;position:relative;z-index:1;}
.bc4{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.075);border-radius:12px;padding:9px 5px;text-align:center;}
.bc4 span{display:block;font-size:7.5px;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.38);font-weight:600;}
.bc4 b{display:block;font-size:12.5px;font-weight:600;margin-top:5px;font-variant-numeric:tabular-nums;}
.camw{margin-top:14px;position:relative;z-index:1;}
.cam-slot{border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.07);
  --ha-card-background:transparent;--ha-card-border-width:0;--ha-card-box-shadow:none;--ha-card-border-radius:0;}
.cam-slot:empty{display:none;}
.cam-slot > *{display:block;width:100%;}
.cam-slot img{display:block;width:100%;border-radius:12px;}

.extra-btns{display:flex;gap:7px;margin-top:8px;position:relative;z-index:1;}
.extra-btns.hidden{display:none;}
.activity-btns{display:flex;gap:7px;margin-top:8px;position:relative;z-index:1;}
.activity-btns.hidden{display:none;}
.eb{flex:1;text-align:center;font-size:11px;font-weight:600;padding:10px 0;border-radius:12px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);color:rgba(255,255,255,.72);cursor:pointer;transition:.15s;}
.eb:hover{background:rgba(255,255,255,.1);}
.eb.ghost{background:rgba(255,107,92,.10);border-color:rgba(255,107,92,.28);color:#ffb3aa;}
.activity-btns .eb{background:rgba(201,240,168,.08);border-color:rgba(201,240,168,.22);color:var(--mm-green);}
.activity-btns .eb:hover{background:rgba(201,240,168,.16);}


/* Sections repliables */
.acc{border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
  padding:0 13px;margin-top:14px;position:relative;z-index:1;transition:.2s;}
.acc[open]{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.11);}
.acc.hidden{display:none;}
.accs{display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:12px 0;cursor:pointer;list-style:none;}
.accs::-webkit-details-marker{display:none;}
.car{width:11px;height:11px;fill:rgba(255,255,255,.35);transition:transform .2s;}
.acc[open] .car{transform:rotate(180deg);}
.accb{padding:2px 0 12px;}
.accb:empty{padding:0;}

.gc{display:inline-flex;flex-direction:column;gap:2px;padding:7px 10px;border-radius:9px;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);margin:3px;min-width:90px;}
.gc span{font-size:8px;letter-spacing:.6px;text-transform:uppercase;color:rgba(255,255,255,.36);font-weight:600;}
.gc b{font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;}

#mow-grid,#conn-grid{display:flex;flex-wrap:wrap;gap:3px;}

.sw-row{display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:8px 0;cursor:pointer;}
.sw-row+.sw-row{border-top:1px solid rgba(255,255,255,.03);}
.sw-n{font-size:11px;color:rgba(255,255,255,.55);}
.sw-t{width:32px;height:18px;border-radius:10px;background:rgba(255,255,255,.1);position:relative;transition:.15s;}
.sw-t::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
  background:rgba(255,255,255,.4);transition:.15s;}
.sw-t.on{background:rgba(201,240,168,.3);}
.sw-t.on::after{left:16px;background:var(--mm-green);}

.sf{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:15px;padding-top:12px;border-top:1px solid rgba(255,255,255,.07);font-size:10px;color:rgba(255,255,255,.4);position:relative;z-index:1;}
.sf .left{display:flex;align-items:center;gap:6px;min-width:0;}
.sf .left i{width:5px;height:5px;border-radius:50%;background:var(--mm-green);flex-shrink:0;}
.sf .left i.warn{background:var(--mm-alert);}
.sf .right{text-align:right;font-variant-numeric:tabular-nums;flex-shrink:0;}
`;


/* ------------------------------------------------------------------ */
/* Éditeur visuel                                                      */
/* ------------------------------------------------------------------ */

const FLAT_KEYS = [
  "name","mower","state_entity","battery","progress","remaining_time","session_duration",
  "elapsed_time","total_time","area","current_zone","charging","blade_height","satellites","rtk_status","error","error_code","error_time",
  "odometer","blade_wear","blade_hours","start_button","pause_button","dock_button",
  "camera","restart_button","edge_button","leave_dock_button","battery_cycles","total_work_time",
  "sync_map_button","sync_schedule_button","sync_rtk_button","idle_hours",
  "speed","spacing","angle","trajectory_mode","mowing_order","obstacle_detection",
  "wildlife_safety","rain_detection_mowing","rain_detection_during",
  "activity_mode","position_type","satellites_l1","satellites_l2",
  "wifi_signal","cellular_signal","bluetooth_signal","firmware",
  "bluetooth_switch","cloud_switch","led_switch","voice_switch","auto_update_switch",
  "activity_1_button","activity_2_button","activity_3_button",
  "hours","points","refresh","show_battery_chart","show_phases",
];
const MANAGED_KEYS = [...FLAT_KEYS, "type", "zones", "activity_1_label", "activity_2_label", "activity_3_label"];

const LABELS = {
  name: "Nom", mower: "Tondeuse (lawn_mower)", state_entity: "État (repli, si pas lawn_mower)",
  battery: "Batterie", progress: "Progression",
  remaining_time: "Temps restant", session_duration: "Durée de session",
  elapsed_time: "Temps écoulé (session)", total_time: "Temps total (session)",
  area: "Surface en cours", current_zone: "Zone en cours",
  charging: "En charge (binary_sensor)",
  satellites: "Satellites", rtk_status: "Statut RTK",
  error: "Dernière erreur (texte)", error_code: "Code d'erreur (actif)",
  error_time: "Heure de la dernière erreur",
  odometer: "Kilométrage total", blade_wear: "Usure des lames",
  blade_hours: "Heures d'utilisation de la lame",
  start_button: "Bouton Démarrer (repli)", pause_button: "Bouton Pause (repli)",
  dock_button: "Bouton Base (repli)",
  camera: "Caméra (flux live)",
  restart_button: "Bouton Redémarrer",
  edge_button: "Bouton Bordure",
  leave_dock_button: "Bouton Quitter la base",
  battery_cycles: "Cycles de batterie",
  total_work_time: "Temps de travail total",
  sync_map_button: "Bouton Synchroniser les cartes",
  sync_schedule_button: "Bouton Synchroniser les plannings",
  sync_rtk_button: "Bouton Synchroniser RTK et base",
  idle_hours: "Heures non travaillées (texte)",
  speed: "Vitesse de tonte", spacing: "Espacement des trajectoires",
  angle: "Angle de trajectoire", trajectory_mode: "Mode de trajectoire",
  mowing_order: "Ordre de tonte", obstacle_detection: "Détection d'obstacles",
  wildlife_safety: "Sécurité faune", rain_detection_mowing: "Pluie (tonte)",
  rain_detection_during: "Pluie (pendant tonte)",
  activity_mode: "Mode d'activité", position_type: "Type de position",
  satellites_l1: "Satellites L1", satellites_l2: "Satellites L2",
  wifi_signal: "Signal Wi-Fi", cellular_signal: "Signal 4G",
  bluetooth_signal: "Signal Bluetooth", firmware: "Firmware",
  bluetooth_switch: "Bluetooth (switch)", cloud_switch: "Cloud (switch)",
  led_switch: "LED latérales (switch)", voice_switch: "Voix (switch)",
  auto_update_switch: "MAJ auto (switch)",
  activity_1_button: "Bouton Activité 1",
  activity_2_button: "Bouton Activité 2",
  activity_3_button: "Bouton Activité 3",
  hours: "Fenêtre d'historique", points: "Échantillons", refresh: "Relecture",
  show_battery_chart: "Afficher la courbe de batterie", show_phases: "Afficher les phases",
};

const HELPERS = {
  mower: "Entité lawn_mower principale.",
  progress: "Capteur de progression en % (0-100).",
  error_code: "Code d'erreur numérique. 0 ou none = pas d'erreur active. Le texte de dernière erreur reste stocké même après résolution.",
  start_button: "Utilisé si l'entité n'est pas un lawn_mower (button ou script, script rejeté).",
};

const SCHEMA = [
  { name: "name", selector: { text: {} } },
  { name: "mower", selector: { entity: { filter: [{ domain: ["lawn_mower", "vacuum"] }] } } },
  {
    type: "expandable", name: "", title: "Capteurs", icon: "mdi:gauge",
    schema: [
      { name: "battery", selector: { entity: { filter: [{ domain: "sensor", device_class: "battery" }] } } },
      { name: "progress", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "remaining_time", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "elapsed_time", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "total_time", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "session_duration", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "area", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "current_zone", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "charging", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
      { name: "satellites", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "rtk_status", selector: { entity: { filter: [{ domain: "sensor" }] } } },
    ],
  },
  {
    type: "expandable", name: "", title: "Réglages de tonte", icon: "mdi:grass",
    schema: [
      { name: "speed", selector: { entity: { filter: [{ domain: ["sensor", "number"] }] } } },
      { name: "spacing", selector: { entity: { filter: [{ domain: "number" }] } } },
      { name: "angle", selector: { entity: { filter: [{ domain: "select" }] } } },
      { name: "trajectory_mode", selector: { entity: { filter: [{ domain: "select" }] } } },
      { name: "mowing_order", selector: { entity: { filter: [{ domain: "select" }] } } },
      { name: "obstacle_detection", selector: { entity: { filter: [{ domain: "select" }] } } },
      { name: "wildlife_safety", selector: { entity: { filter: [{ domain: "select" }] } } },
      { name: "rain_detection_mowing", selector: { entity: { filter: [{ domain: ["switch","select"] }] } } },
      { name: "rain_detection_during", selector: { entity: { filter: [{ domain: ["switch","select"] }] } } },
    ],
  },
  {
    type: "expandable", name: "", title: "Erreurs et stats", icon: "mdi:alert-circle-outline",
    schema: [
      { name: "error", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "error_code", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "error_time", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "odometer", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "blade_wear", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "blade_hours", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "battery_cycles", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "total_work_time", selector: { entity: { filter: [{ domain: "sensor" }] } } },
    ],
  },
  { name: "camera", selector: { entity: { filter: [{ domain: "camera" }] } } },
  { name: "state_entity", selector: { entity: { filter: [{ domain: ["sensor", "lawn_mower"] }] } } },
  {
    type: "expandable", name: "", title: "Connexion et positionnement", icon: "mdi:map-marker-radius",
    schema: [
      { name: "activity_mode", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "position_type", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "satellites_l1", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "satellites_l2", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "wifi_signal", selector: { entity: { filter: [{ domain: "sensor", device_class: "signal_strength" }] } } },
      { name: "cellular_signal", selector: { entity: { filter: [{ domain: "sensor", device_class: "signal_strength" }] } } },
      { name: "bluetooth_signal", selector: { entity: { filter: [{ domain: "sensor", device_class: "signal_strength" }] } } },
      { name: "idle_hours", selector: { entity: { filter: [{ domain: "sensor" }] } } },
      { name: "firmware", selector: { entity: { filter: [{ domain: "update" }] } } },
    ],
  },
  {
    type: "expandable", name: "", title: "Commutateurs", icon: "mdi:toggle-switch",
    schema: [
      { name: "bluetooth_switch", selector: { entity: { filter: [{ domain: "switch" }] } } },
      { name: "cloud_switch", selector: { entity: { filter: [{ domain: "switch" }] } } },
      { name: "led_switch", selector: { entity: { filter: [{ domain: "switch" }] } } },
      { name: "voice_switch", selector: { entity: { filter: [{ domain: "switch" }] } } },
      { name: "auto_update_switch", selector: { entity: { filter: [{ domain: "switch" }] } } },
    ],
  },
  {
    type: "expandable", name: "", title: "Boutons (repli)", icon: "mdi:gesture-tap-button",
    schema: [
      { name: "start_button", selector: { entity: { filter: [{ domain: ["button", "input_button"] }] } } },
      { name: "pause_button", selector: { entity: { filter: [{ domain: ["button", "input_button"] }] } } },
      { name: "dock_button", selector: { entity: { filter: [{ domain: ["button", "input_button"] }] } } },
      { name: "edge_button", selector: { entity: { filter: [{ domain: "button" }] } } },
      { name: "leave_dock_button", selector: { entity: { filter: [{ domain: "button" }] } } },
      { name: "restart_button", selector: { entity: { filter: [{ domain: "button" }] } } },
      { name: "activity_1_button", selector: { entity: { filter: [{ domain: "button" }] } } },
      { name: "activity_2_button", selector: { entity: { filter: [{ domain: "button" }] } } },
      { name: "activity_3_button", selector: { entity: { filter: [{ domain: "button" }] } } },
      { name: "sync_map_button", selector: { entity: { filter: [{ domain: "button" }] } } },
      { name: "sync_schedule_button", selector: { entity: { filter: [{ domain: "button" }] } } },
      { name: "sync_rtk_button", selector: { entity: { filter: [{ domain: "button" }] } } },
    ],
  },
  {
    type: "expandable", name: "", title: "Affichage", icon: "mdi:tune",
    schema: [
      {
        type: "grid", name: "",
        schema: [
          { name: "hours", selector: { number: { min: 1, max: 72, mode: "box", unit_of_measurement: "h" } } },
          { name: "points", selector: { number: { min: 8, max: 400, mode: "box" } } },
          { name: "refresh", selector: { number: { min: 30, max: 3600, mode: "box", unit_of_measurement: "s" } } },
        ],
      },
      { name: "show_battery_chart", selector: { boolean: {} } },
      { name: "show_phases", selector: { boolean: {} } },
    ],
  },
];

class MammotionCardEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._config = {}; }
  setConfig(config) { this._config = config ? { ...config } : {}; this._render(); }
  set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; this._render(); }
  connectedCallback() { ensureHaForm().then(() => this._render()); }
  _data() { const c = this._config || {}; const d = {}; FLAT_KEYS.forEach((k) => { if (c[k] !== undefined) d[k] = c[k]; }); return d; }
  _merge(v) {
    const out = { ...this._config };
    FLAT_KEYS.forEach((k) => { const val = v[k]; if (val === "" || val === undefined || val === null) delete out[k]; else out[k] = val; });
    return out;
  }
  _unmanaged() {
    const extra = Object.keys(this._config || {}).filter((k) => !MANAGED_KEYS.includes(k));
    if (Array.isArray(this._config.zones) && this._config.zones.length) extra.push("zones");
    return extra;
  }
  _render() {
    if (!this.shadowRoot) return;
    if (!customElements.get("ha-form")) {
      this.shadowRoot.innerHTML = `<style>${MammotionCardEditor.styles}</style><div class="warn">ha-form indisponible.</div>`;
      return;
    }
    if (!this._form) {
      this.shadowRoot.innerHTML = `<style>${MammotionCardEditor.styles}</style><div class="wrap"></div><div class="note"></div>`;
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => LABELS[s.name] || s.name;
      this._form.computeHelper = (s) => HELPERS[s.name] || "";
      this._form.addEventListener("value-changed", (ev) => { ev.stopPropagation(); fireEvent(this, "config-changed", { config: this._merge(ev.detail.value) }); });
      this.shadowRoot.querySelector(".wrap").appendChild(this._form);
    }
    this._form.hass = this._hass; this._form.schema = SCHEMA; this._form.data = this._data();
    const extra = this._unmanaged();
    const note = this.shadowRoot.querySelector(".note");
    if (extra.length) { note.innerHTML = `<div class="keep">Conservé sans être éditable ici : <b></b>.</div>`; note.querySelector("b").textContent = extra.join(", "); }
    else note.innerHTML = "";
  }
}
MammotionCardEditor.styles = `:host{display:block;}.warn{padding:10px;border-radius:8px;background:var(--warning-color,#dfb37a);color:#1c1c1c;font-size:12px;}.keep{margin-top:12px;padding:10px;border-radius:8px;background:rgba(143,176,201,.16);border:1px solid rgba(143,176,201,.4);font-size:12px;}`;

if (!customElements.get("mammotion-card-editor")) customElements.define("mammotion-card-editor", MammotionCardEditor);

if (!customElements.get("mammotion-card")) customElements.define("mammotion-card", MammotionCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "mammotion-card", name: "Mammotion Card", description: "Tondeuse Mammotion : double anneau progression/batterie, phases, zones et contrôles.", preview: true, documentationURL: "https://github.com/junkoku38/mammotion-card" });