// garden.js — Garden rendering & growth logic

const THEMES = {
  flower: {
    label:      "Flower",
    stages:     ["Seed 🌱", "Sprout 🌿", "Bud 🌸", "Bloom 💐", "Full Bloom 🌺"],
    buildHTML:  buildFlower,
  },
  tree: {
    label:      "Forest",
    stages:     ["Sapling 🌱", "Twig 🌿", "Young Tree 🌳", "Tree 🌲", "Ancient Tree 🌳✨"],
    buildHTML:  buildTree,
  },
  cactus: {
    label:      "Cactus",
    stages:     ["Pebble 🪨", "Sprout 🌱", "Cactus 🌵", "Blooming 🌵🌸", "Giant 🌵✨"],
    buildHTML:  buildCactus,
  },
  cat: {
    label:      "Cat",
    stages:     ["Kitten 🐾", "Curious 😺", "Playful 😸", "Content 😻", "Majestic 👑"],
    buildHTML:  buildCat,
  },
  fox: {
    label:      "Fox",
    stages:     ["Kit 🦊", "Curious 🦊", "Frisky 🦊", "Clever 🦊✨", "Mystic 🌟🦊"],
    buildHTML:  buildFox,
  },
  crystal: {
    label:      "Crystal",
    stages:     ["Shard 💎", "Cluster 💜", "Formation 💎", "Geode 🌌", "Prism ✨💎✨"],
    buildHTML:  buildCrystal,
  },
};

// Minutes needed to reach each level
const LEVEL_THRESHOLDS = [0, 25, 75, 150, 300];

export class Garden {
  constructor(stageEl, labelEl, xpBarEl) {
    this.stageEl = stageEl;
    this.labelEl = labelEl;
    this.xpBarEl = xpBarEl;

    this.theme = localStorage.getItem("bloomdoro-theme") || "flower";
    this.totalMinutes = parseInt(localStorage.getItem("bloomdoro-minutes") || "0", 10);
    this.level = this._calcLevel();

    this._render();
  }

  setTheme(theme) {
    if (!THEMES[theme]) return;
    this.theme = theme;
    localStorage.setItem("bloomdoro-theme", theme);
    this._render();
  }

  addMinutes(n) {
    this.totalMinutes += n;
    localStorage.setItem("bloomdoro-minutes", this.totalMinutes);

    const newLevel = this._calcLevel();
    const leveled = newLevel > this.level;
    this.level = newLevel;

    this._updateXP();
    this._updateLabel();
    if (leveled) this._celebrate();
    return leveled;
  }

  getLevel()       { return this.level; }
  getTotalMinutes(){ return this.totalMinutes; }

  // ── Private ────────────────────────────────

  _calcLevel() {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (this.totalMinutes >= LEVEL_THRESHOLDS[i]) return i;
    }
    return 0;
  }

  _xpFraction() {
    const cur  = LEVEL_THRESHOLDS[this.level]  ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const next = LEVEL_THRESHOLDS[this.level + 1];
    if (!next) return 1;
    return Math.min((this.totalMinutes - cur) / (next - cur), 1);
  }

  _render() {
    const t = THEMES[this.theme];
    if (!t) return;

    const wrapper = document.createElement("div");
    wrapper.className = "entity-wrap";
    wrapper.innerHTML = t.buildHTML(this.level);

    this.stageEl.innerHTML = "";
    this.stageEl.appendChild(wrapper);
    this._addStars();
    this._updateLabel();
    this._updateXP();
  }

  _updateLabel() {
    const stages = THEMES[this.theme]?.stages ?? [];
    this.labelEl.textContent = stages[this.level] ?? stages[stages.length - 1];
  }

  _updateXP() {
    const pct = this._xpFraction() * 100;
    this.xpBarEl.style.width = `${pct}%`;
  }

  _celebrate() {
    const el = document.createElement("div");
    el.className = "level-up-text";
    el.textContent = `✨ Level Up! ${THEMES[this.theme].stages[this.level]}`;
    this.stageEl.closest(".garden-stage").appendChild(el);
    setTimeout(() => el.remove(), 2200);
    this._render();
  }

  _addStars() {
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const size = Math.random() * 2.5 + 1;
      s.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 90 + 5}%;
        top:${Math.random() * 55 + 2}%;
        --dur:${(Math.random() * 3 + 2).toFixed(1)}s;
        --delay:${(Math.random() * 3).toFixed(1)}s;
      `;
      this.stageEl.appendChild(s);
    }
  }
}

// ════════════════════════════════════════════
// HTML BUILDERS — one per theme
// ════════════════════════════════════════════

function buildFlower(level) {
  const petalCount = [0, 5, 6, 7, 8][level];
  const petalSize  = [0, 14, 20, 26, 32][level];
  const stemH      = [20, 60, 90, 120, 150][level];

  let petals = "";
  for (let i = 0; i < petalCount; i++) {
    const angle = (360 / petalCount) * i;
    const dist  = petalSize * 0.9;
    petals += `<div class="petal" style="
      width:${petalSize}px; height:${petalSize * 1.5}px;
      transform: rotate(${angle}deg) translate(0, -${dist}px);
    "></div>`;
  }

  return `
    <div class="flower-entity flower-stage-${level}" style="position:relative;">
      <div class="flower-head">${petals}<div class="flower-center"></div></div>
      <div class="flower-stem" style="height:${stemH}px;">
        <div class="flower-leaf left"></div>
        <div class="flower-leaf right"></div>
      </div>
    </div>`;
}

function buildTree(level) {
  const trunkW = [8, 12, 16, 20, 26][level];
  const trunkH = [24, 60, 90, 120, 155][level];
  const f1W    = [20, 55, 90, 120, 160][level];
  const f1H    = [20, 55, 80, 100, 130][level];
  const f1Bot  = trunkH * 0.85;
  const f2 = level >= 2;
  const f2W    = [0, 0, 60, 80, 110][level];
  const f2H    = [0, 0, 55, 75, 95][level];

  return `
    <div class="tree-entity tree-stage-${level}" style="position:relative; display:flex; align-items:flex-end; justify-content:center;">
      <div class="tree-trunk" style="width:${trunkW}px; height:${trunkH}px;"></div>
      <div class="tree-foliage" style="width:${f1W}px; height:${f1H}px; bottom:${f1Bot}px;"></div>
      ${f2 ? `<div class="tree-foliage-2" style="width:${f2W}px; height:${f2H}px; bottom:${f1Bot + f1H * 0.6}px; background:linear-gradient(180deg,#4ade80,#22c55e); border-radius:50% 50% 45% 45%; position:absolute; left:50%; transform:translateX(-50%);"></div>` : ""}
    </div>`;
}

function buildCactus(level) {
  const bW = [18, 26, 34, 44, 56][level];
  const bH = [28, 60, 90, 120, 155][level];
  const aW = [0, 18, 28, 38, 50][level];
  const aH = [0, 10, 14, 18, 22][level];
  const showFlower = level >= 3;

  return `
    <div class="cactus-entity cactus-stage-${level}" style="position:relative;">
      ${showFlower ? `<div class="cactus-flower">🌸</div>` : ""}
      <div class="cactus-body" style="width:${bW}px; height:${bH}px; position:relative;">
        ${level >= 1 ? `
          <div class="cactus-arm left"  style="width:${aW}px; height:${aH}px;"></div>
          <div class="cactus-arm right" style="width:${aW}px; height:${aH}px;"></div>
        ` : ""}
      </div>
    </div>`;
}

function buildCat(level) {
  const bW = [30, 50, 70, 90, 110][level];
  const bH = [24, 40, 55, 72, 88][level];
  const hW = [28, 46, 64, 82, 100][level];
  const tH = [20, 32, 46, 58, 72][level];

  return `
    <div class="cat-entity cat-stage-${level}" style="position:relative;">
      <div class="cat-head" style="width:${hW}px; height:${hW}px; position:relative;">
        <div class="cat-ear left"></div>
        <div class="cat-ear right"></div>
        <div class="cat-eye left"></div>
        <div class="cat-eye right"></div>
        <div class="cat-nose"></div>
      </div>
      <div class="cat-body" style="width:${bW}px; height:${bH}px; position:relative;">
        <div class="cat-tail" style="height:${tH}px;"></div>
      </div>
      ${level >= 3 ? `<div class="cat-zz">💤</div>` : ""}
    </div>`;
}

function buildFox(level) {
  const bW = [28, 48, 68, 88, 108][level];
  const bH = [22, 38, 54, 70, 86][level];
  const hW = [26, 44, 62, 80, 98][level];
  const tW = [16, 24, 34, 46, 60][level];
  const tH = [20, 30, 44, 58, 72][level];

  return `
    <div class="fox-entity fox-stage-${level}" style="position:relative;">
      <div class="fox-head" style="width:${hW}px; height:${hW}px; position:relative;">
        <div class="fox-ear left"></div>
        <div class="fox-ear right"></div>
        <div class="fox-snout"></div>
        <div class="fox-eye left"></div>
        <div class="fox-eye right"></div>
      </div>
      <div class="fox-body" style="width:${bW}px; height:${bH}px; position:relative;">
        <div class="fox-tail" style="width:${tW}px; height:${tH}px;"></div>
      </div>
    </div>`;
}

function buildCrystal(level) {
  const counts = [1, 2, 3, 4, 5];
  const n = counts[level];
  let shards = "";
  for (let i = 0; i < n; i++) shards += `<div class="crystal-shard"></div>`;

  // sparkles for higher levels
  const sparkles = level >= 3
    ? `<div class="crystal-sparkle" style="top:-10px;left:30%;animation-delay:0s">✦</div>
       <div class="crystal-sparkle" style="top:-20px;left:60%;animation-delay:0.7s">✦</div>
       <div class="crystal-sparkle" style="top:-5px;left:80%;animation-delay:1.4s">✦</div>`
    : "";

  return `
    <div class="crystal-entity crystal-stage-${level}" style="position:relative;">
      <div class="crystal-cluster">${shards}</div>
      ${sparkles}
    </div>`;
}

export { THEMES };
