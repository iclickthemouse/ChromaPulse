// ===== ChromaPulse — Color Palette Generator =====

// --- State ---
let currentPalette = [];
let lockedIndices = new Set();
let currentHarmony = 'random';
let colorCount = 5;
let activePickerIndex = -1;
let debugLog = []; // LLM query history

// --- DOM refs ---
const paletteContainer = document.getElementById('palette-container');
const harmonySelector = document.getElementById('harmony-selector');
const colorCountSelect = document.getElementById('color-count');
const btnGenerate = document.getElementById('btn-generate');
const btnSave = document.getElementById('btn-save');
const btnExport = document.getElementById('btn-export');
const btnPresets = document.getElementById('btn-presets');
const btnTrending = document.getElementById('btn-trending');
const btnSettings = document.getElementById('btn-settings');
const btnLockAll = document.getElementById('btn-lock-all');
const presetsPanel = document.getElementById('presets-panel');
const trendingPanel = document.getElementById('trending-panel');
const debugPanel = document.getElementById('debug-panel');
const overlay = document.getElementById('overlay');
const saveDialog = document.getElementById('save-dialog');
const settingsDialog = document.getElementById('settings-dialog');
const presetNameInput = document.getElementById('preset-name');
const toastEl = document.getElementById('toast');
const promptInput = document.getElementById('prompt-input');
const btnPromptGenerate = document.getElementById('btn-prompt-generate');

// --- Color Utilities ---
function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function luminance(r, g, b) {
    const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function textColorFor(r, g, b) {
    return luminance(r, g, b) > 0.35 ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)';
}

// --- Pantone Matching ---
function findClosestPantone(r, g, b) {
    let minDist = Infinity, closest = 'Unknown';
    for (const [name, pr, pg, pb] of PANTONE_DB) {
        const dr = r - pr, dg = g - pg, db = b - pb;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) { minDist = dist; closest = name; }
    }
    return 'PANTONE ' + closest;
}

// --- HTML escape for safe rendering ---
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Harmony Engines ---
function randomHue() { return Math.random() * 360; }
function randomSat() { return 40 + Math.random() * 50; }
function randomLit() { return 30 + Math.random() * 45; }
function clampHue(h) { return ((h % 360) + 360) % 360; }
function varyS(s) { return Math.max(15, Math.min(95, s + (Math.random() - 0.5) * 20)); }
function varyL(l) { return Math.max(20, Math.min(85, l + (Math.random() - 0.5) * 25)); }

function generateHarmony(type, count) {
    const baseH = randomHue();
    const baseS = randomSat();
    const baseL = randomLit();
    let hues = [];

    switch (type) {
        case 'analogous':
            for (let i = 0; i < count; i++) hues.push(clampHue(baseH + (i - Math.floor(count / 2)) * 25));
            break;
        case 'complementary':
            hues = distributeHues([baseH, clampHue(baseH + 180)], count);
            break;
        case 'triadic':
            hues = distributeHues([baseH, clampHue(baseH + 120), clampHue(baseH + 240)], count);
            break;
        case 'split-complementary':
            hues = distributeHues([baseH, clampHue(baseH + 150), clampHue(baseH + 210)], count);
            break;
        case 'tetradic':
            hues = distributeHues([baseH, clampHue(baseH + 90), clampHue(baseH + 180), clampHue(baseH + 270)], count);
            break;
        case 'monochromatic':
            for (let i = 0; i < count; i++) hues.push(baseH + (Math.random() - 0.5) * 8);
            break;
        case 'compound':
            hues = distributeHues([baseH, clampHue(baseH + 30), clampHue(baseH + 180), clampHue(baseH + 210)], count);
            break;
        case 'shades':
            for (let i = 0; i < count; i++) hues.push(baseH);
            break;
        default:
            for (let i = 0; i < count; i++) hues.push(randomHue());
            break;
    }

    return hues.map((h, i) => {
        let s, l;
        if (type === 'monochromatic') {
            s = Math.max(20, Math.min(90, baseS + (Math.random() - 0.5) * 25));
            l = 20 + (i / (count - 1 || 1)) * 60 + (Math.random() - 0.5) * 10;
        } else if (type === 'shades') {
            s = baseS;
            l = 15 + (i / (count - 1 || 1)) * 65;
        } else {
            s = varyS(baseS);
            l = varyL(baseL);
        }
        const [r, g, b] = hslToRgb(clampHue(h), Math.round(s), Math.round(l));
        return { r, g, b, hex: rgbToHex(r, g, b) };
    });
}

function distributeHues(baseHues, count) {
    const result = [...baseHues];
    while (result.length < count) {
        const idx = result.length % baseHues.length;
        result.push(clampHue(baseHues[idx] + (Math.random() - 0.5) * 30));
    }
    return result.slice(0, count);
}

// --- Palette Generation ---
function generatePalette() {
    const newColors = generateHarmony(currentHarmony, colorCount);
    currentPalette = newColors.map((c, i) => {
        if (lockedIndices.has(i) && currentPalette[i]) return currentPalette[i];
        return c;
    });
    while (currentPalette.length < colorCount) {
        const [r, g, b] = hslToRgb(randomHue(), randomSat(), randomLit());
        currentPalette.push({ r, g, b, hex: rgbToHex(r, g, b) });
    }
    currentPalette = currentPalette.slice(0, colorCount);
    renderPalette();
}

// --- Render (full rebuild) ---
function renderPalette() {
    paletteContainer.innerHTML = '';
    currentPalette.forEach((color, i) => {
        const col = document.createElement('div');
        col.className = 'color-column';
        col.style.backgroundColor = color.hex;
        col.style.animationDelay = `${i * 0.04}s`;
        col.dataset.index = i;

        const textColor = textColorFor(color.r, color.g, color.b);
        const pantone = findClosestPantone(color.r, color.g, color.b);
        const [h, s, l] = rgbToHsl(color.r, color.g, color.b);

        col.innerHTML = `
            <div class="color-info">
                <div class="hex-display" style="color:${textColor}" title="Click to copy" data-hex="${color.hex}">${color.hex}</div>
                <div class="pantone-display" style="color:${textColor}">${pantone}</div>
                <div class="rgb-display">RGB(${color.r}, ${color.g}, ${color.b}) · HSL(${h}°, ${s}%, ${l}%)</div>
                <div class="color-actions">
                    <button class="color-action-btn ${lockedIndices.has(i) ? 'locked' : ''}" data-action="lock" data-index="${i}" title="${lockedIndices.has(i) ? 'Unlock' : 'Lock'}">${lockedIndices.has(i) ? '🔒' : '🔓'}</button>
                    <button class="color-action-btn" data-action="copy" data-hex="${color.hex}" title="Copy HEX">📋</button>
                    <button class="color-action-btn" data-action="pick" data-index="${i}" title="Pick Color">🎨</button>
                    <button class="color-action-btn" data-action="remix" data-hex="${color.hex}" title="Remix palette from this color">🔄</button>
                </div>
                <input type="color" class="color-picker-input" data-index="${i}" value="${color.hex}">
            </div>
        `;
        paletteContainer.appendChild(col);
    });
    attachColorEvents();
}

// --- Inline update for a single column (no DOM rebuild) ---
function updateColumnInline(idx) {
    const color = currentPalette[idx];
    const col = paletteContainer.children[idx];
    if (!col) return;

    col.style.backgroundColor = color.hex;

    const textColor = textColorFor(color.r, color.g, color.b);
    const pantone = findClosestPantone(color.r, color.g, color.b);
    const [h, s, l] = rgbToHsl(color.r, color.g, color.b);

    const hexEl = col.querySelector('.hex-display');
    const pantoneEl = col.querySelector('.pantone-display');
    const rgbEl = col.querySelector('.rgb-display');

    if (hexEl) {
        hexEl.textContent = color.hex;
        hexEl.dataset.hex = color.hex;
        hexEl.style.color = textColor;
    }
    if (pantoneEl) {
        pantoneEl.textContent = pantone;
        pantoneEl.style.color = textColor;
    }
    if (rgbEl) {
        rgbEl.textContent = `RGB(${color.r}, ${color.g}, ${color.b}) · HSL(${h}°, ${s}%, ${l}%)`;
    }
}

// --- Event attachment (separate from render) ---
function attachColorEvents() {
    // Hex copy
    document.querySelectorAll('.hex-display').forEach(el => {
        el.addEventListener('click', e => { e.stopPropagation(); copyToClipboard(el.dataset.hex); });
    });

    // Lock
    document.querySelectorAll('[data-action="lock"]').forEach(el => {
        el.addEventListener('click', e => { e.stopPropagation(); toggleLock(parseInt(el.dataset.index)); });
    });

    // Copy button
    document.querySelectorAll('[data-action="copy"]').forEach(el => {
        el.addEventListener('click', e => { e.stopPropagation(); copyToClipboard(el.dataset.hex); });
    });

    // Color picker trigger
    document.querySelectorAll('[data-action="pick"]').forEach(el => {
        el.addEventListener('click', e => {
            e.stopPropagation();
            const idx = parseInt(el.dataset.index);
            activePickerIndex = idx;
            const picker = document.querySelector(`.color-picker-input[data-index="${idx}"]`);
            if (picker) picker.click();
        });
    });

    // Color picker — use 'input' for live preview but DON'T re-render
    document.querySelectorAll('.color-picker-input').forEach(el => {
        el.addEventListener('input', e => {
            const idx = parseInt(el.dataset.index);
            const [r, g, b] = hexToRgb(e.target.value);
            currentPalette[idx] = { r, g, b, hex: rgbToHex(r, g, b) };
            updateColumnInline(idx); // Inline update — no DOM rebuild
        });

        // On 'change' (picker closed), do a full re-render to sync everything
        el.addEventListener('change', e => {
            const idx = parseInt(el.dataset.index);
            const [r, g, b] = hexToRgb(e.target.value);
            currentPalette[idx] = { r, g, b, hex: rgbToHex(r, g, b) };
            activePickerIndex = -1;
            renderPalette();
        });
    });

    // Remix from color
    document.querySelectorAll('[data-action="remix"]').forEach(el => {
        el.addEventListener('click', e => {
            e.stopPropagation();
            remixFromColor(el.dataset.hex);
        });
    });
}

function toggleLock(index) {
    if (lockedIndices.has(index)) lockedIndices.delete(index);
    else lockedIndices.add(index);
    renderPalette();
}

// --- Clipboard ---
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(`Copied ${text}`);
    } catch {
        showToast('Copy failed — try clicking again');
    }
}

// --- Toast ---
let toastTimer;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2000);
}

// --- Presets (localStorage) ---
function getPresets() {
    try { return JSON.parse(localStorage.getItem('chromapulse_presets') || '[]'); }
    catch { return []; }
}

function savePreset(name) {
    const presets = getPresets();
    presets.unshift({ name, colors: currentPalette.map(c => c.hex), date: Date.now() });
    localStorage.setItem('chromapulse_presets', JSON.stringify(presets));
    showToast(`Saved "${name}"`);
    renderPresets();
}

function deletePreset(index) {
    const presets = getPresets();
    presets.splice(index, 1);
    localStorage.setItem('chromapulse_presets', JSON.stringify(presets));
    renderPresets();
    showToast('Preset deleted');
}

function loadPreset(colors) {
    currentPalette = colors.map(hex => {
        const [r, g, b] = hexToRgb(hex);
        return { r, g, b, hex };
    });
    colorCount = colors.length;
    colorCountSelect.value = colorCount;
    lockedIndices.clear();
    renderPalette();
    closeAllPanels();
    showToast('Preset loaded');
}

function renderPresets() {
    const list = document.getElementById('presets-list');
    const presets = getPresets();
    if (presets.length === 0) {
        list.innerHTML = '<p class="empty-state">No presets saved yet.<br>Generate a palette and hit Save!</p>';
        return;
    }
    list.innerHTML = presets.map((p, i) => `
        <div class="preset-card" data-preset-index="${i}">
            <div class="preset-name">
                <span>${escapeHtml(p.name)}</span>
                <button class="preset-delete" data-delete="${i}" title="Delete">🗑️</button>
            </div>
            <div class="preset-colors">${p.colors.map(c => `<div style="background:${c}"></div>`).join('')}</div>
        </div>
    `).join('');

    list.querySelectorAll('.preset-card').forEach(el => {
        el.addEventListener('click', e => {
            if (e.target.closest('.preset-delete')) return;
            const idx = parseInt(el.dataset.presetIndex);
            loadPreset(presets[idx].colors);
        });
    });
    list.querySelectorAll('.preset-delete').forEach(el => {
        el.addEventListener('click', e => {
            e.stopPropagation();
            deletePreset(parseInt(el.dataset.delete));
        });
    });
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// --- Trending Palettes ---
const TRENDING_PALETTES = [
    { name: "Mocha Mousse 2025", tag: "Pantone COTY 2025", colors: ["#6E6B62", "#A69279", "#D4C5A9", "#E8DCC8", "#F5F0E8"] },
    { name: "Digital Lavender", tag: "2025 Trend", colors: ["#E6E0F8", "#C4B5E3", "#9B8EC4", "#7B6FA0", "#5A4D7A"] },
    { name: "Sunset Gradient", tag: "Popular", colors: ["#FF6B6B", "#FF8E72", "#FFB347", "#FFD93D", "#6BCB77"] },
    { name: "Ocean Depths", tag: "Nature", colors: ["#0B1628", "#1B3A5C", "#2E86AB", "#48BFE3", "#89ECDA"] },
    { name: "Cyber Neon", tag: "Tech", colors: ["#0D0221", "#0F084B", "#26408B", "#A6CFD5", "#C2E7D9"] },
    { name: "Soft Pastels", tag: "Classic", colors: ["#FFE5EC", "#E0F0EA", "#D5E5FF", "#FFF3D6", "#F0E0FF"] },
    { name: "Terracotta Earth", tag: "2025 Trend", colors: ["#8B4513", "#CD853F", "#DEB887", "#F5DEB3", "#FAEBD7"] },
    { name: "Aurora Borealis", tag: "Nature", colors: ["#0B0C10", "#1F2833", "#45A29E", "#66FCF1", "#C5C6C7"] },
    { name: "Cherry Blossom", tag: "Seasonal", colors: ["#FFB7C5", "#FF8FAB", "#E05A86", "#B03060", "#5C1A33"] },
    { name: "Muted Sage", tag: "2025 Trend", colors: ["#4A5043", "#6B7B5E", "#9CAF88", "#C2D4B4", "#E8F0E0"] },
    { name: "Retro Pop", tag: "Vintage", colors: ["#F72585", "#7209B7", "#3A0CA3", "#4361EE", "#4CC9F0"] },
    { name: "Warm Neutrals", tag: "Interior", colors: ["#3C2415", "#6B4226", "#A67B5B", "#D4B896", "#F2E6D9"] },
    { name: "Electric Violet", tag: "Tech", colors: ["#1A0533", "#2D0A4E", "#5C2D91", "#A855F7", "#D8B4FE"] },
    { name: "Coastal Breeze", tag: "Nature", colors: ["#1B4965", "#62B6CB", "#BEE9E8", "#CAE9FF", "#5FA8D3"] },
    { name: "Golden Hour", tag: "Photography", colors: ["#F7DC6F", "#F0B27A", "#E59866", "#D35400", "#873600"] },
    { name: "Nordic Frost", tag: "2025 Trend", colors: ["#D1E8E2", "#A9D6C8", "#6DB1A7", "#3E8C84", "#1A4F4F"] },
    { name: "Peach Fuzz 2024", tag: "Pantone COTY 2024", colors: ["#FFBE98", "#FFD1A9", "#FFE5CC", "#FFEEDD", "#FFF5F0"] },
    { name: "Very Peri 2022", tag: "Pantone COTY 2022", colors: ["#6667AB", "#7B7DC8", "#9698D6", "#B1B3E0", "#D0D1ED"] },
    { name: "Brutalist Concrete", tag: "Architecture", colors: ["#2C2C2C", "#5C5C5C", "#8C8C8C", "#BDBDBD", "#E0E0E0"] },
    { name: "Dopamine Brights", tag: "2025 Trend", colors: ["#FF1744", "#FF9100", "#FFEA00", "#00E676", "#2979FF"] },
];

function renderTrending() {
    const list = document.getElementById('trending-list');
    list.innerHTML = TRENDING_PALETTES.map((p, i) => `
        <div class="trending-card" data-trending-index="${i}">
            <div class="trending-name">${p.name}</div>
            <div class="trending-colors">${p.colors.map(c => `<div style="background:${c}"></div>`).join('')}</div>
            <span class="trending-tag">${p.tag}</span>
        </div>
    `).join('');
    list.querySelectorAll('.trending-card').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.trendingIndex);
            loadPreset(TRENDING_PALETTES[idx].colors);
        });
    });
}

// ============ PROMPT-BASED PALETTE GENERATION ============

// --- Keyword → Color Mapping (offline, no API needed) ---
const PROMPT_COLOR_MAP = {
    // Nature
    sunset: { hRange: [0, 40], sRange: [60, 95], lRange: [40, 65] },
    sunrise: { hRange: [20, 50], sRange: [70, 95], lRange: [50, 70] },
    ocean: { hRange: [190, 220], sRange: [50, 85], lRange: [30, 55] },
    sea: { hRange: [185, 215], sRange: [45, 80], lRange: [35, 60] },
    forest: { hRange: [100, 150], sRange: [30, 60], lRange: [20, 40] },
    jungle: { hRange: [90, 150], sRange: [40, 70], lRange: [20, 45] },
    desert: { hRange: [25, 45], sRange: [40, 70], lRange: [55, 75] },
    sand: { hRange: [30, 50], sRange: [30, 55], lRange: [65, 80] },
    sky: { hRange: [195, 220], sRange: [50, 80], lRange: [60, 80] },
    mountain: { hRange: [200, 230], sRange: [10, 30], lRange: [35, 55] },
    meadow: { hRange: [85, 130], sRange: [40, 70], lRange: [45, 65] },
    garden: { hRange: [80, 160], sRange: [40, 70], lRange: [40, 65] },
    flower: { hRange: [300, 360], sRange: [50, 85], lRange: [50, 70] },
    rose: { hRange: [340, 360], sRange: [50, 80], lRange: [45, 65] },
    lavender: { hRange: [260, 280], sRange: [30, 60], lRange: [55, 75] },
    autumn: { hRange: [15, 45], sRange: [50, 80], lRange: [35, 55] },
    fall: { hRange: [15, 45], sRange: [50, 80], lRange: [35, 55] },
    spring: { hRange: [80, 150], sRange: [50, 80], lRange: [55, 75] },
    winter: { hRange: [195, 230], sRange: [15, 40], lRange: [60, 85] },
    summer: { hRange: [40, 60], sRange: [60, 90], lRange: [55, 75] },
    snow: { hRange: [200, 220], sRange: [5, 20], lRange: [85, 95] },
    ice: { hRange: [190, 210], sRange: [20, 50], lRange: [75, 90] },
    fire: { hRange: [0, 25], sRange: [80, 100], lRange: [40, 60] },
    flame: { hRange: [0, 30], sRange: [85, 100], lRange: [45, 60] },
    earth: { hRange: [20, 40], sRange: [30, 55], lRange: [30, 50] },
    stone: { hRange: [20, 40], sRange: [5, 20], lRange: [40, 60] },
    water: { hRange: [195, 220], sRange: [50, 80], lRange: [45, 65] },
    rain: { hRange: [200, 225], sRange: [20, 45], lRange: [50, 70] },
    cloud: { hRange: [210, 230], sRange: [5, 15], lRange: [75, 90] },
    night: { hRange: [220, 260], sRange: [30, 60], lRange: [10, 25] },
    midnight: { hRange: [230, 260], sRange: [40, 70], lRange: [8, 20] },
    aurora: { hRange: [130, 180], sRange: [60, 90], lRange: [40, 65] },
    tropical: { hRange: [150, 180], sRange: [60, 90], lRange: [40, 60] },
    beach: { hRange: [40, 60], sRange: [40, 70], lRange: [65, 80] },
    coral: { hRange: [0, 15], sRange: [60, 85], lRange: [55, 70] },

    // Moods
    calm: { hRange: [190, 230], sRange: [20, 45], lRange: [55, 75] },
    peaceful: { hRange: [170, 210], sRange: [20, 45], lRange: [60, 80] },
    warm: { hRange: [15, 45], sRange: [50, 80], lRange: [50, 65] },
    cozy: { hRange: [20, 40], sRange: [40, 65], lRange: [40, 55] },
    cool: { hRange: [190, 230], sRange: [35, 65], lRange: [45, 65] },
    energetic: { hRange: [0, 60], sRange: [75, 100], lRange: [50, 65] },
    bold: { hRange: [0, 360], sRange: [80, 100], lRange: [40, 55] },
    soft: { hRange: [300, 360], sRange: [20, 40], lRange: [75, 90] },
    pastel: { hRange: [0, 360], sRange: [30, 55], lRange: [75, 88] },
    muted: { hRange: [0, 360], sRange: [10, 30], lRange: [45, 65] },
    vibrant: { hRange: [0, 360], sRange: [80, 100], lRange: [45, 60] },
    dark: { hRange: [0, 360], sRange: [20, 50], lRange: [10, 25] },
    light: { hRange: [0, 360], sRange: [15, 40], lRange: [80, 95] },
    moody: { hRange: [230, 280], sRange: [20, 50], lRange: [15, 35] },
    romantic: { hRange: [330, 360], sRange: [40, 70], lRange: [55, 75] },
    elegant: { hRange: [0, 360], sRange: [5, 25], lRange: [20, 40] },
    luxurious: { hRange: [35, 50], sRange: [60, 85], lRange: [35, 50] },
    luxury: { hRange: [35, 50], sRange: [60, 85], lRange: [35, 50] },
    playful: { hRange: [0, 360], sRange: [65, 95], lRange: [55, 70] },
    happy: { hRange: [40, 65], sRange: [70, 95], lRange: [55, 70] },
    sad: { hRange: [210, 240], sRange: [15, 35], lRange: [30, 45] },
    angry: { hRange: [0, 10], sRange: [75, 100], lRange: [35, 50] },
    dreamy: { hRange: [260, 300], sRange: [30, 55], lRange: [65, 80] },
    mysterious: { hRange: [260, 300], sRange: [30, 55], lRange: [15, 30] },
    fresh: { hRange: [100, 160], sRange: [50, 80], lRange: [50, 70] },
    vintage: { hRange: [20, 50], sRange: [20, 40], lRange: [50, 70] },
    retro: { hRange: [0, 40], sRange: [45, 70], lRange: [45, 65] },
    minimal: { hRange: [0, 360], sRange: [0, 10], lRange: [50, 90] },
    clean: { hRange: [0, 360], sRange: [0, 15], lRange: [85, 97] },

    // Aesthetics
    neon: { hRange: [0, 360], sRange: [90, 100], lRange: [50, 60] },
    cyber: { hRange: [180, 300], sRange: [80, 100], lRange: [40, 55] },
    cyberpunk: { hRange: [280, 340], sRange: [80, 100], lRange: [35, 50] },
    vaporwave: { hRange: [270, 330], sRange: [50, 80], lRange: [50, 70] },
    synthwave: { hRange: [280, 340], sRange: [70, 95], lRange: [30, 50] },
    gothic: { hRange: [260, 300], sRange: [20, 45], lRange: [10, 25] },
    rustic: { hRange: [20, 40], sRange: [25, 50], lRange: [35, 55] },
    industrial: { hRange: [200, 220], sRange: [5, 15], lRange: [30, 50] },
    bohemian: { hRange: [15, 45], sRange: [40, 65], lRange: [45, 65] },
    scandinavian: { hRange: [0, 360], sRange: [5, 15], lRange: [80, 95] },
    japanese: { hRange: [340, 360], sRange: [25, 50], lRange: [65, 80] },
    zen: { hRange: [80, 120], sRange: [10, 30], lRange: [60, 80] },
    modern: { hRange: [0, 360], sRange: [40, 70], lRange: [35, 55] },
    futuristic: { hRange: [180, 260], sRange: [60, 90], lRange: [40, 55] },
    space: { hRange: [230, 280], sRange: [40, 70], lRange: [10, 30] },
    galaxy: { hRange: [250, 300], sRange: [50, 80], lRange: [15, 35] },
    cosmic: { hRange: [260, 310], sRange: [50, 80], lRange: [20, 40] },

    // Materials
    gold: { hRange: [40, 50], sRange: [70, 90], lRange: [45, 55] },
    golden: { hRange: [40, 50], sRange: [70, 90], lRange: [45, 55] },
    silver: { hRange: [210, 220], sRange: [5, 15], lRange: [65, 80] },
    copper: { hRange: [20, 30], sRange: [60, 80], lRange: [40, 50] },
    bronze: { hRange: [25, 35], sRange: [50, 70], lRange: [35, 45] },
    marble: { hRange: [0, 360], sRange: [3, 10], lRange: [85, 95] },
    wood: { hRange: [25, 35], sRange: [30, 55], lRange: [30, 45] },
    leather: { hRange: [20, 35], sRange: [35, 55], lRange: [25, 40] },

    // Food
    chocolate: { hRange: [15, 25], sRange: [40, 65], lRange: [20, 35] },
    coffee: { hRange: [20, 30], sRange: [35, 55], lRange: [25, 40] },
    caramel: { hRange: [30, 40], sRange: [60, 80], lRange: [40, 55] },
    mint: { hRange: [150, 170], sRange: [40, 65], lRange: [60, 75] },
    berry: { hRange: [310, 340], sRange: [50, 75], lRange: [30, 50] },
    citrus: { hRange: [40, 60], sRange: [80, 100], lRange: [55, 65] },
    peach: { hRange: [20, 35], sRange: [60, 85], lRange: [70, 80] },
    wine: { hRange: [340, 355], sRange: [40, 65], lRange: [25, 35] },
    honey: { hRange: [38, 48], sRange: [75, 95], lRange: [50, 60] },

    // Places
    paris: { hRange: [330, 350], sRange: [25, 45], lRange: [55, 75] },
    tokyo: { hRange: [280, 340], sRange: [60, 90], lRange: [35, 55] },
    morocco: { hRange: [15, 40], sRange: [55, 80], lRange: [40, 60] },
    india: { hRange: [0, 60], sRange: [70, 95], lRange: [45, 60] },
    nordic: { hRange: [190, 220], sRange: [10, 30], lRange: [70, 88] },
    mediterranean: { hRange: [195, 220], sRange: [50, 75], lRange: [50, 65] },
    cabin: { hRange: [20, 35], sRange: [25, 45], lRange: [30, 50] },
    christmas: { hRange: [0, 10], sRange: [60, 85], lRange: [35, 50] },
};

// Multi-word compound concepts
const COMPOUND_PROMPTS = {
    'cozy autumn': ['#8B4513', '#CD853F', '#D2691E', '#DEB887', '#F5DEB3'],
    'ocean sunset': ['#FF6B35', '#FF8C42', '#2E86AB', '#1B4965', '#FFD166'],
    'candy shop': ['#FF69B4', '#FF1493', '#FFB6C1', '#FFA07A', '#FFDAB9'],
    'dark academia': ['#2C1810', '#4A3728', '#6B4423', '#8B6914', '#C4A35A'],
    'cottagecore': ['#F5E6D3', '#D4A574', '#A8C686', '#E8B4B8', '#F9E4C8'],
    'northern lights': ['#0B0C10', '#1F2833', '#45A29E', '#66FCF1', '#9B59B6'],
    'rainy day': ['#465C69', '#7B8794', '#9AA5B4', '#BCCCDC', '#D9E2EC'],
    'tropical paradise': ['#00B4D8', '#0077B6', '#CAF0F8', '#90E0EF', '#48CAE4'],
    'deep space': ['#0B0D17', '#1B2838', '#2D4059', '#4E6E8E', '#7C98B3'],
    'fairy tale': ['#EE82EE', '#DA70D6', '#DDA0DD', '#E6E6FA', '#FFF0F5'],
    'art deco': ['#1A1A2E', '#16213E', '#0F3460', '#E94560', '#D4AF37'],
    'minimalist': ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#9E9E9E', '#212121'],
    'studio ghibli': ['#87CEEB', '#98FB98', '#F5DEB3', '#FFB6C1', '#E6E6FA'],
    'pop art': ['#FF1744', '#FFEA00', '#2979FF', '#000000', '#FFFFFF'],
};

function generateFromPrompt(prompt) {
    const lower = prompt.toLowerCase().trim();
    if (!lower) return null;

    // Check compound prompts first
    for (const [key, colors] of Object.entries(COMPOUND_PROMPTS)) {
        if (lower.includes(key)) return colors;
    }

    // Find all matching keywords
    const matches = [];
    for (const [keyword, ranges] of Object.entries(PROMPT_COLOR_MAP)) {
        if (lower.includes(keyword)) {
            matches.push(ranges);
        }
    }

    if (matches.length === 0) return null;

    // Generate palette from matched keyword ranges
    const palette = [];
    for (let i = 0; i < colorCount; i++) {
        const rangeSet = matches[i % matches.length];
        const h = rangeSet.hRange[0] + Math.random() * (rangeSet.hRange[1] - rangeSet.hRange[0]);
        const s = rangeSet.sRange[0] + Math.random() * (rangeSet.sRange[1] - rangeSet.sRange[0]);
        const l = rangeSet.lRange[0] + Math.random() * (rangeSet.lRange[1] - rangeSet.lRange[0]);
        palette.push(rgbToHex(...hslToRgb(clampHue(h), Math.round(s), Math.round(l))));
    }
    return palette;
}

// --- Ollama Local LLM Integration ---
function getOllamaConfig() {
    try {
        return JSON.parse(localStorage.getItem('chromapulse_ollama') || '{}');
    } catch {
        return {};
    }
}

function saveOllamaConfig(config) {
    localStorage.setItem('chromapulse_ollama', JSON.stringify(config));
    updateAIStatus();
}

function getActiveModel() {
    const cfg = getOllamaConfig();
    if (cfg.model === 'custom') return cfg.customModel || 'qwen3.5:35b-a3b';
    return cfg.model || 'qwen3.5:35b-a3b';
}

function getOllamaHost() {
    return (getOllamaConfig().host || 'http://localhost:11434').replace(/\/+$/, '');
}

function isOllamaEnabled() {
    const cfg = getOllamaConfig();
    return cfg.enabled === true && !!getActiveModel();
}

function getProviderType() {
    const cfg = getOllamaConfig();
    return cfg.provider || 'ollama';
}

function updateAIStatus() {
    const status = document.getElementById('ai-status');
    if (!status) return;
    if (isOllamaEnabled()) {
        const provider = getProviderType();
        const providerLabel = provider === 'ollama' ? 'Ollama' : provider === 'openai' ? 'OpenAI' : provider === 'groq' ? 'Groq' : provider === 'openrouter' ? 'OpenRouter' : provider;
        status.innerHTML = `Mode: <strong>${providerLabel}</strong> — ${getActiveModel()} ${provider === 'ollama' ? '(local)' : '(cloud)'}`;
    } else {
        status.innerHTML = 'Mode: <strong>Smart Keywords</strong> (offline)';
    }
}

async function testOllamaConnection() {
    const host = getOllamaHost();
    const status = document.getElementById('ai-status');

    try {
        status.innerHTML = '<span class="spinner"></span> Testing connection...';
        const resp = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const models = (data.models || []).map(m => m.name);

        if (models.length === 0) {
            status.innerHTML = '🔌 Connected! But no models installed. Run <code>ollama pull qwen3.5:35b-a3b</code>';
            return false;
        }

        const selectedModel = getActiveModel();

        // Exact match — Ollama models include the tag (e.g. "qwen3.5:35b-a3b" or "qwen3.5:latest")
        // Normalize: if selected has no ":", Ollama stores it as "name:latest"
        const normalizedSelected = selectedModel.includes(':') ? selectedModel : selectedModel + ':latest';
        const exactMatch = models.some(m => m === normalizedSelected || m === selectedModel);

        if (exactMatch) {
            status.innerHTML = `✅ Connected! <strong>${selectedModel}</strong> is installed and ready.`;
            return true;
        } else {
            const modelList = models.map(m => `<code>${m}</code>`).join(', ');
            status.innerHTML = `❌ <strong>${selectedModel}</strong> is NOT installed.<br>
                <span style="font-size:0.72rem;">Installed models: ${modelList}</span><br>
                <span style="font-size:0.72rem;">Run: <code>ollama pull ${selectedModel}</code> to install it.</span>`;
            return false;
        }
    } catch (err) {
        console.error('Ollama test failed:', err);
        if (err.name === 'TimeoutError') {
            status.innerHTML = '❌ Connection timed out. Is Ollama running?';
        } else {
            status.innerHTML = '❌ Cannot connect to Ollama. Make sure it\'s running at <strong>' + host + '</strong>';
        }
        return false;
    }
}

// Harmony descriptions for LLM prompting — detailed rules for each mode
const HARMONY_INSTRUCTIONS = {
    random: '',
    analogous: `HARMONY CONSTRAINT — ANALOGOUS:
Pick a base hue from the description. All ${colorCount} colors MUST have hues within a 30-60° range of that base on the color wheel.
Example: if base is blue (220°), use only hues from ~190° to ~250°. Vary saturation (40-90%) and lightness (25-75%) for contrast.
The palette should feel unified and smooth with NO opposing colors.`,

    complementary: `HARMONY CONSTRAINT — COMPLEMENTARY:
Pick a primary hue from the description. Then find its complement (180° opposite on the color wheel).
Split the ${colorCount} colors between the primary hue side and the complementary side.
Example: if primary is blue (220°), complement is orange (40°). Use both families.
The palette should have strong visual contrast between warm and cool.`,

    triadic: `HARMONY CONSTRAINT — TRIADIC:
Pick a base hue, then add two more hues each 120° apart on the color wheel.
The 3 hue families: base, base+120°, base+240°. Distribute the ${colorCount} colors across these 3 families.
Example: red (0°), green (120°), blue (240°). Vary saturation and lightness within each family.`,

    'split-complementary': `HARMONY CONSTRAINT — SPLIT-COMPLEMENTARY:
Pick a base hue. Instead of the direct complement (180°), use the two hues flanking the complement at ±30°.
So the 3 hue families are: base, base+150°, base+210°.
Example: blue (220°) → yellow-orange (10°) and red-orange (70°). Distribute ${colorCount} colors across these.`,

    tetradic: `HARMONY CONSTRAINT — TETRADIC (RECTANGULAR):
Use 4 hues arranged as two complementary pairs, forming a rectangle on the wheel.
The 4 hue families: base, base+60°, base+180°, base+240°. Distribute ${colorCount} colors across these.
Example: red (0°), yellow (60°), cyan (180°), blue (240°). Let one pair dominate.`,

    monochromatic: `HARMONY CONSTRAINT — MONOCHROMATIC:
ALL ${colorCount} colors MUST use the EXACT SAME hue (±5°). Only vary saturation and lightness.
Create a range from very light/pastel to very dark/rich, all in one hue family.
Example: all blues → #E3F2FD (light), #64B5F6 (medium), #1565C0 (dark), #0D47A1 (very dark), #082B5A (deepest).`,

    compound: `HARMONY CONSTRAINT — COMPOUND (SPLIT-ANALOGOUS):
Combine analogous + one accent from the complementary side.
Use 3-4 colors from analogous hues (within 30° of base), plus 1-2 accent colors from near the complement (~150-210° away).
This gives mostly harmonious colors with a pop of contrast.`,

    shades: `HARMONY CONSTRAINT — SHADES:
ALL ${colorCount} colors MUST be the EXACT SAME hue and similar saturation, differing ONLY in lightness.
Go from lightest to darkest in even steps. Think of it as one color with increasing black mixed in.
Example for blue: #BBDEFB → #64B5F6 → #2196F3 → #1565C0 → #0D47A1 (light to dark, same hue).`
};

async function generateWithOllama(prompt, harmonyMode) {
    if (!isOllamaEnabled()) return { colors: null, raw: null, model: null, elapsed: 0, error: null };

    const host = getOllamaHost();
    const model = getActiveModel();

    const systemMsg = `You are a color palette designer. Return exactly ${colorCount} hex color codes as a JSON array.
For BRANDS: use actual brand colors. For SPORTS TEAMS: use official team colors. For MOVIES/TV: use colors that evoke that IP. For MOODS: use color psychology. For PLACES: use that location's characteristic colors.
Return ONLY a JSON array like ["#FF0000","#00FF00"]. No explanation, no markdown.`;

    // Build user message with harmony context
    const harmonyCtx = HARMONY_INSTRUCTIONS[harmonyMode] || '';
    let userMsg = `Description: "${prompt}"`;
    if (harmonyCtx) {
        userMsg = `${harmonyCtx}\n\n${userMsg}`;
    }

    const messages = [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userMsg }
    ];

    const startTime = performance.now();
    try {
        let text = '';

        const provider = getProviderType();

        if (provider === 'ollama') {
            // --- Ollama Local ---
            // Helper: unload all models to free VRAM
            async function unloadAllModels() {
                try {
                    const psResp = await fetch(`${host}/api/ps`);
                    if (psResp.ok) {
                        const psData = await psResp.json();
                        for (const m of (psData.models || [])) {
                            await fetch(`${host}/api/generate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ model: m.name, keep_alive: 0 }),
                                signal: AbortSignal.timeout(5000)
                            }).catch(() => { });
                        }
                        // Wait for VRAM to actually release
                        if (psData.models && psData.models.length > 0) {
                            await new Promise(r => setTimeout(r, 3000));
                        }
                    }
                } catch (e) { }
            }

            // Helper: make the Ollama chat request
            async function ollamaChat(targetModel) {
                return await fetch(`${host}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: targetModel,
                        messages: messages,
                        stream: false,
                        think: false,
                        options: {
                            temperature: 0.7,
                            num_predict: 256,
                            num_ctx: 2048,
                            num_gpu: 99
                        }
                    }),
                    signal: AbortSignal.timeout(300000)
                });
            }

            // Unload other models first
            await unloadAllModels();

            let resp = await ollamaChat(model);

            // If model crashed, try once more after full VRAM cleanup
            if (!resp.ok) {
                let errCheck = '';
                try { const d = await resp.clone().json(); errCheck = d.error || ''; } catch (e) { }
                if (errCheck.includes('unexpectedly stopped') || errCheck.includes('resource limitations')) {
                    console.log(`Model ${model} crashed, retrying after VRAM cleanup...`);
                    await unloadAllModels();
                    resp = await ollamaChat(model);
                }
            }

            const elapsed = Math.round(performance.now() - startTime);
            if (!resp.ok) {
                let errMsg = `Ollama HTTP ${resp.status}`;
                try {
                    const errData = await resp.json();
                    if (errData.error) {
                        errMsg = errData.error;
                        if (errMsg.includes('unexpectedly stopped') || errMsg.includes('resource limitations')) {
                            errMsg = `Model crashed — ${model} may be too large. Try qwen3:8b or a cloud provider.`;
                        }
                    }
                } catch (e) { }
                return { colors: null, raw: errMsg, model, elapsed, error: errMsg };
            }
            const data = await resp.json();
            text = data.message?.content || data.response || '';
        } else {
            // --- OpenAI-compatible API (OpenAI, Groq, OpenRouter) ---
            const cfg = getOllamaConfig();
            const apiKey = cfg.apiKey || '';
            let apiUrl = '';

            if (provider === 'openai') {
                apiUrl = 'https://api.openai.com/v1/chat/completions';
            } else if (provider === 'groq') {
                apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
            } else if (provider === 'openrouter') {
                apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
            }

            if (!apiKey) {
                return { colors: null, raw: 'No API key set', model, elapsed: 0, error: `Set your ${provider} API key in settings.` };
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            if (provider === 'openrouter') {
                headers['HTTP-Referer'] = 'https://chromapulse.app';
                headers['X-Title'] = 'ChromaPulse';
            }

            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 256
                }),
                signal: AbortSignal.timeout(30000)
            });
            const elapsed = Math.round(performance.now() - startTime);
            if (!resp.ok) {
                let errMsg = `${provider} HTTP ${resp.status}`;
                try {
                    const errData = await resp.json();
                    errMsg = errData.error?.message || errData.error || errMsg;
                } catch (e) { }
                return { colors: null, raw: errMsg, model, elapsed, error: errMsg };
            }
            const data = await resp.json();
            text = data.choices?.[0]?.message?.content || '';
        }

        const elapsed = Math.round(performance.now() - startTime);

        // Strip <think>...</think> blocks from thinking models
        const cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const parseTarget = cleanText || text;

        // Parse hex array from response
        const match = parseTarget.match(/\[[\s\S]*?\]/);
        if (match) {
            try {
                let colors = JSON.parse(match[0]);
                // Fix hex codes missing '#' prefix
                colors = colors.map(c => typeof c === 'string' && /^[0-9A-Fa-f]{6}$/.test(c) ? '#' + c : c);
                if (Array.isArray(colors) && colors.every(c => /^#[0-9A-Fa-f]{6}$/.test(c))) {
                    while (colors.length < colorCount) colors.push(colors[colors.length - 1]);
                    return { colors: colors.slice(0, colorCount), raw: text, model, elapsed, error: null };
                }
            } catch (e) { /* JSON parse failed, try fallback */ }
        }

        // Fallback: extract hex codes from cleaned text
        const hexMatches = parseTarget.match(/#[0-9A-Fa-f]{6}/g);
        if (hexMatches && hexMatches.length >= colorCount) {
            return { colors: hexMatches.slice(0, colorCount), raw: text, model, elapsed, error: null };
        }

        return { colors: null, raw: text, model, elapsed, error: 'Could not parse colors from response' };
    } catch (err) {
        const elapsed = Math.round(performance.now() - startTime);
        console.error('Ollama generation error:', err);
        return { colors: null, raw: err.message, model, elapsed, error: err.message };
    }
}

// --- Remix from a single color ---
async function remixFromColor(hex) {
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);

    showToast(`🔄 Remixing from ${hex}...`);

    // If Ollama is enabled, ask the LLM to build a palette around this color
    if (isOllamaEnabled()) {
        const prompt = `Build a palette around the color ${hex} (HSL: ${h}°, ${s}%, ${l}%). This color MUST be the first color in the array. Generate ${colorCount - 1} companion colors that complement it.`;

        const result = await generateWithOllama(prompt, currentHarmony);

        if (result.colors) {
            // Ensure the seed color is first
            result.colors[0] = hex;
            loadPresetSilent(result.colors);

            // Log it
            debugLog.unshift({
                prompt: `🔄 Remix from ${hex}`,
                harmony: currentHarmony,
                timestamp: new Date().toLocaleTimeString(),
                source: 'ollama',
                model: result.model,
                elapsed: result.elapsed,
                rawResponse: result.raw,
                parsedColors: result.colors,
                error: null
            });
            if (debugLog.length > 50) debugLog.pop();

            showToast('✨ AI remix generated!');
            return;
        }
    }

    // Offline remix using algorithmic harmony from the seed color
    const palette = [hex];
    const count = colorCount - 1;

    switch (currentHarmony) {
        case 'complementary': {
            const compH = clampHue(h + 180);
            for (let i = 0; i < count; i++) {
                const useComp = i % 2 === 0;
                const nh = useComp ? compH + (Math.random() - 0.5) * 20 : h + (Math.random() - 0.5) * 20;
                palette.push(rgbToHex(...hslToRgb(clampHue(nh), varyS(s), varyL(l))));
            }
            break;
        }
        case 'analogous': {
            for (let i = 0; i < count; i++) {
                const offset = ((i + 1) * 25) * (i % 2 === 0 ? 1 : -1);
                palette.push(rgbToHex(...hslToRgb(clampHue(h + offset), varyS(s), varyL(l))));
            }
            break;
        }
        case 'triadic': {
            const hues = [h, clampHue(h + 120), clampHue(h + 240)];
            for (let i = 0; i < count; i++) {
                palette.push(rgbToHex(...hslToRgb(hues[(i + 1) % 3] + (Math.random() - 0.5) * 15, varyS(s), varyL(l))));
            }
            break;
        }
        case 'split-complementary': {
            const hues = [h, clampHue(h + 150), clampHue(h + 210)];
            for (let i = 0; i < count; i++) {
                palette.push(rgbToHex(...hslToRgb(hues[(i + 1) % 3] + (Math.random() - 0.5) * 15, varyS(s), varyL(l))));
            }
            break;
        }
        case 'tetradic': {
            const hues = [h, clampHue(h + 60), clampHue(h + 180), clampHue(h + 240)];
            for (let i = 0; i < count; i++) {
                palette.push(rgbToHex(...hslToRgb(hues[(i + 1) % 4] + (Math.random() - 0.5) * 10, varyS(s), varyL(l))));
            }
            break;
        }
        case 'monochromatic': {
            for (let i = 0; i < count; i++) {
                const newL = Math.max(10, Math.min(90, 15 + (i + 1) * (70 / count)));
                const newS = Math.max(20, Math.min(95, s + (Math.random() - 0.5) * 15));
                palette.push(rgbToHex(...hslToRgb(h, Math.round(newS), Math.round(newL))));
            }
            break;
        }
        case 'shades': {
            for (let i = 0; i < count; i++) {
                const newL = Math.max(5, Math.min(85, l - (i + 1) * (l / (count + 1))));
                palette.push(rgbToHex(...hslToRgb(h, s, Math.round(newL))));
            }
            break;
        }
        case 'compound': {
            for (let i = 0; i < count; i++) {
                const useAccent = i === count - 1;
                const nh = useAccent ? clampHue(h + 180 + (Math.random() - 0.5) * 40) : clampHue(h + (i + 1) * 20 * (i % 2 === 0 ? 1 : -1));
                palette.push(rgbToHex(...hslToRgb(nh, varyS(s), varyL(l))));
            }
            break;
        }
        default: { // random
            for (let i = 0; i < count; i++) {
                const nh = clampHue(h + (Math.random() * 360));
                palette.push(rgbToHex(...hslToRgb(nh, 40 + Math.random() * 50, 30 + Math.random() * 45)));
            }
        }
    }

    // Log it
    debugLog.unshift({
        prompt: `🔄 Remix from ${hex}`,
        harmony: currentHarmony,
        timestamp: new Date().toLocaleTimeString(),
        source: 'keywords',
        model: null,
        elapsed: 0,
        rawResponse: `(algorithmic ${currentHarmony} remix from seed ${hex})`,
        parsedColors: palette,
        error: null
    });
    if (debugLog.length > 50) debugLog.pop();

    loadPresetSilent(palette);
    showToast(`🎨 ${currentHarmony} remix from ${hex}!`);
}

async function handlePromptGenerate() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
        showToast('Type a description first!');
        return;
    }

    btnPromptGenerate.disabled = true;
    btnPromptGenerate.innerHTML = '<span class="spinner"></span>Generating...';

    let colors = null;
    let logEntry = {
        prompt: prompt,
        harmony: currentHarmony,
        timestamp: new Date().toLocaleTimeString(),
        source: 'keywords',
        model: null,
        elapsed: 0,
        rawResponse: null,
        parsedColors: null,
        error: null
    };

    // Try Ollama first if enabled
    if (isOllamaEnabled()) {
        const result = await generateWithOllama(prompt, currentHarmony);
        logEntry.model = result.model;
        logEntry.elapsed = result.elapsed;
        logEntry.rawResponse = result.raw;

        if (result.colors) {
            colors = result.colors;
            logEntry.source = 'ollama';
            logEntry.parsedColors = colors;
            showToast('\u2728 AI palette generated locally!');
        } else {
            logEntry.error = result.error;
            showToast('LLM failed \u2014 falling back to smart keywords');
        }
    }

    // Fallback to keyword engine
    if (!colors) {
        const kwStart = performance.now();
        colors = generateFromPrompt(prompt);
        const kwElapsed = Math.round(performance.now() - kwStart);

        if (colors) {
            logEntry.source = 'keywords';
            logEntry.parsedColors = colors;
            logEntry.elapsed = logEntry.elapsed || kwElapsed;
            if (!logEntry.rawResponse) logEntry.rawResponse = '(keyword engine \u2014 no LLM call)';
            showToast('\ud83c\udfa8 Palette generated from keywords!');
        } else {
            logEntry.source = 'none';
            logEntry.error = logEntry.error || 'No matching keywords found';
            if (!logEntry.rawResponse) logEntry.rawResponse = '(no LLM call, keyword match failed)';
            showToast('No matching keywords found \u2014 try different words');
        }
    }

    // Add to debug log
    debugLog.unshift(logEntry);
    if (debugLog.length > 50) debugLog.pop();

    if (colors) {
        loadPresetSilent(colors);
    }

    btnPromptGenerate.disabled = false;
    btnPromptGenerate.textContent = 'Generate';
}

function loadPresetSilent(colors) {
    currentPalette = colors.map(hex => {
        hex = hex.toUpperCase();
        const [r, g, b] = hexToRgb(hex);
        return { r, g, b, hex };
    });
    colorCount = colors.length;
    colorCountSelect.value = colorCount;
    lockedIndices.clear();
    renderPalette();
}

// --- Panel Management ---
function openPanel(panel) {
    closeAllPanels();
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function closeAllPanels() {
    presetsPanel.classList.add('hidden');
    trendingPanel.classList.add('hidden');
    debugPanel.classList.add('hidden');
    overlay.classList.add('hidden');
    saveDialog.classList.add('hidden');
    settingsDialog.classList.add('hidden');
    document.getElementById('export-preview').classList.add('hidden');
}

// --- Export ---
function exportPalette() {
    const lines = currentPalette.map((c, i) => {
        const pantone = findClosestPantone(c.r, c.g, c.b);
        const [h, s, l] = rgbToHsl(c.r, c.g, c.b);
        return `Color ${i + 1}: ${c.hex} | RGB(${c.r},${c.g},${c.b}) | HSL(${h}°,${s}%,${l}%) | ${pantone}`;
    });
    const text = `ChromaPulse Palette — ${currentHarmony}\n${'─'.repeat(50)}\n${lines.join('\n')}\n${'─'.repeat(50)}`;
    copyToClipboard(text);
    showToast('Palette info copied to clipboard!');
}

// --- Event Listeners ---

// Harmony buttons
harmonySelector.addEventListener('click', e => {
    const btn = e.target.closest('.harmony-btn');
    if (!btn) return;
    harmonySelector.querySelectorAll('.harmony-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentHarmony = btn.dataset.harmony;
    generatePalette();
});

// Color count
colorCountSelect.addEventListener('change', () => {
    colorCount = parseInt(colorCountSelect.value);
    lockedIndices.clear();
    generatePalette();
});

// Generate
btnGenerate.addEventListener('click', () => generatePalette());

// Spacebar
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.target.closest('input, select, textarea')) {
        e.preventDefault();
        generatePalette();
    }
});

// Lock all
btnLockAll.addEventListener('click', () => {
    if (lockedIndices.size === colorCount) {
        lockedIndices.clear();
        btnLockAll.textContent = '🔓';
    } else {
        for (let i = 0; i < colorCount; i++) lockedIndices.add(i);
        btnLockAll.textContent = '🔒';
    }
    renderPalette();
});

// Save
btnSave.addEventListener('click', () => {
    saveDialog.classList.remove('hidden');
    overlay.classList.remove('hidden');
    presetNameInput.value = '';
    presetNameInput.focus();
});

document.getElementById('save-confirm').addEventListener('click', () => {
    const name = presetNameInput.value.trim() || 'Untitled Palette';
    savePreset(name);
    closeAllPanels();
});

document.getElementById('save-cancel').addEventListener('click', closeAllPanels);

presetNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const name = presetNameInput.value.trim() || 'Untitled Palette';
        savePreset(name);
        closeAllPanels();
    }
});

// Export
btnExport.addEventListener('click', exportPalette);

// Panels
btnPresets.addEventListener('click', () => { renderPresets(); openPanel(presetsPanel); });
btnTrending.addEventListener('click', () => { renderTrending(); openPanel(trendingPanel); });
document.getElementById('close-presets').addEventListener('click', closeAllPanels);
document.getElementById('close-trending').addEventListener('click', closeAllPanels);
overlay.addEventListener('click', closeAllPanels);

// Debug log panel
const btnDebug = document.getElementById('btn-debug');

function renderDebugLog() {
    const list = document.getElementById('debug-list');
    if (debugLog.length === 0) {
        list.innerHTML = '<p class="empty-state">No queries yet.<br>Use the prompt bar to generate a palette.</p>';
        return;
    }

    list.innerHTML = debugLog.map((entry, i) => {
        const badgeClass = entry.source === 'ollama' ? 'success' :
            entry.source === 'keywords' ? 'fallback' : 'error';
        const badgeLabel = entry.source === 'ollama' ? '✅ Ollama' :
            entry.source === 'keywords' ? '🔤 Keywords' : '❌ Failed';

        const colorSwatches = entry.parsedColors
            ? `<div class="debug-colors">${entry.parsedColors.map(c => `<div style="background:${c}"></div>`).join('')}</div>`
            : '';

        const colorsText = entry.parsedColors
            ? entry.parsedColors.join(', ')
            : 'None';

        const rawId = `debug-raw-${i}`;

        return `
            <div class="debug-entry">
                <div class="debug-entry-header">
                    <span class="debug-prompt">"${escapeHtml(entry.prompt)}"</span>
                    <span class="debug-badge ${badgeClass}">${badgeLabel}</span>
                </div>
                ${entry.harmony && entry.harmony !== 'random' ? `<div style="font-size:0.7rem;color:#a78bfa;margin-bottom:6px;">🎯 Harmony: <strong>${entry.harmony}</strong></div>` : ''}
                <div class="debug-meta">
                    <span>⏱ ${entry.elapsed}ms</span>
                    <span>🕐 ${entry.timestamp}</span>
                    ${entry.model ? `<span>🤖 ${entry.model}</span>` : ''}
                    <span>🎨 ${entry.parsedColors ? entry.parsedColors.length + ' colors' : 'none'}</span>
                </div>
                ${colorSwatches}
                ${entry.error ? `<div style="color:#FF6B6B;font-size:0.72rem;">⚠ ${escapeHtml(entry.error)}</div>` : ''}
                <div class="debug-section">
                    <button class="debug-toggle" onclick="document.getElementById('${rawId}').classList.toggle('hidden')">
                        ▶ Raw Response
                    </button>
                    <div id="${rawId}" class="debug-raw hidden">${escapeHtml(entry.rawResponse || '(empty)')}</div>
                </div>
                <div class="debug-section">
                    <div style="font-size:0.72rem;color:var(--text-dim);">Parsed: <code style="color:#4ecdc4;font-size:0.7rem;">${escapeHtml(colorsText)}</code></div>
                </div>
            </div>
        `;
    }).join('');
}

btnDebug.addEventListener('click', () => { renderDebugLog(); openPanel(debugPanel); });
document.getElementById('close-debug').addEventListener('click', closeAllPanels);
document.getElementById('clear-debug').addEventListener('click', () => {
    debugLog = [];
    renderDebugLog();
    showToast('Debug log cleared');
});

// Prompt generation
btnPromptGenerate.addEventListener('click', handlePromptGenerate);
promptInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handlePromptGenerate();
});

// Settings dialog — Multi-provider
const ollamaModelSelect = document.getElementById('ollama-model');
const customModelWrap = document.getElementById('custom-model-wrap');
const providerSelect = document.getElementById('ai-provider');
const apiKeyWrap = document.getElementById('api-key-wrap');
const apiKeyInput = document.getElementById('ai-api-key');
const apiKeyHelp = document.getElementById('api-key-help');
const ollamaSetupWrap = document.getElementById('ollama-setup-wrap');
const ollamaHostWrap = document.getElementById('ollama-host-wrap');

const PROVIDER_MODELS = {
    ollama: [
        {
            group: '⭐ Recommended', models: [
                { value: 'qwen3.5:35b-a3b', label: 'Qwen 3.5 35B ⭐ (best)' },
                { value: 'qwen3:8b', label: 'Qwen 3 8B (~5GB)' },
                { value: 'qwen2.5:7b', label: 'Qwen 2.5 7B (~4.5GB)' },
            ]
        },
        {
            group: '⚡ Faster', models: [
                { value: 'qwen2.5:3b', label: 'Qwen 2.5 3B (~2GB)' },
                { value: 'qwen2.5:1.5b', label: 'Qwen 2.5 1.5B (~1GB)' },
            ]
        },
        { group: 'Custom', models: [{ value: 'custom', label: 'Custom model...' }] },
    ],
    openai: [
        {
            group: '⭐ Recommended', models: [
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini ⭐ (fast, cheap)' },
                { value: 'gpt-4o', label: 'GPT-4o (best quality)' },
                { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (latest)' },
                { value: 'gpt-4.1', label: 'GPT-4.1 (latest, best)' },
            ]
        },
        { group: 'Custom', models: [{ value: 'custom', label: 'Custom model...' }] },
    ],
    groq: [
        {
            group: '⭐ Free tier', models: [
                { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B ⭐ (best, free)' },
                { value: 'gemma2-9b-it', label: 'Gemma 2 9B (free)' },
                { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fastest)' },
            ]
        },
        { group: 'Custom', models: [{ value: 'custom', label: 'Custom model...' }] },
    ],
    openrouter: [
        {
            group: '⭐ Recommended', models: [
                { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash ⭐ (free)' },
                { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
                { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
                { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
            ]
        },
        { group: 'Custom', models: [{ value: 'custom', label: 'Custom model...' }] },
    ],
};

const PROVIDER_HELP = {
    openai: 'Get key at <a href="https://platform.openai.com/api-keys" target="_blank" style="color:#4ecdc4;">platform.openai.com</a> (pay-per-use)',
    groq: 'Free key at <a href="https://console.groq.com/keys" target="_blank" style="color:#4ecdc4;">console.groq.com</a>',
    openrouter: 'Get key at <a href="https://openrouter.ai/keys" target="_blank" style="color:#4ecdc4;">openrouter.ai</a>',
};

function updateProviderUI(provider) {
    const isOllama = provider === 'ollama';
    ollamaSetupWrap.classList.toggle('hidden', !isOllama);
    ollamaHostWrap.classList.toggle('hidden', !isOllama);
    apiKeyWrap.classList.toggle('hidden', isOllama);
    apiKeyHelp.innerHTML = PROVIDER_HELP[provider] || '';
    const models = PROVIDER_MODELS[provider] || PROVIDER_MODELS.ollama;
    ollamaModelSelect.innerHTML = models.map(g => {
        const opts = g.models.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
        return `<optgroup label="${g.group}">${opts}</optgroup>`;
    }).join('');
}

providerSelect.addEventListener('change', () => {
    updateProviderUI(providerSelect.value);
    customModelWrap.classList.add('hidden');
});

ollamaModelSelect.addEventListener('change', () => {
    customModelWrap.classList.toggle('hidden', ollamaModelSelect.value !== 'custom');
});

btnSettings.addEventListener('click', () => {
    const cfg = getOllamaConfig();
    const provider = cfg.provider || 'ollama';
    providerSelect.value = provider;
    updateProviderUI(provider);
    ollamaModelSelect.value = cfg.model || ollamaModelSelect.options[0]?.value || '';
    customModelWrap.classList.toggle('hidden', cfg.model !== 'custom');
    document.getElementById('ollama-custom-model').value = cfg.customModel || '';
    document.getElementById('ollama-host').value = cfg.host || 'http://localhost:11434';
    apiKeyInput.value = cfg.apiKey || '';
    updateAIStatus();
    settingsDialog.classList.remove('hidden');
    overlay.classList.remove('hidden');
});

document.getElementById('settings-test').addEventListener('click', async () => {
    const provider = providerSelect.value;
    const current = getOllamaConfig();
    current.provider = provider;
    current.model = ollamaModelSelect.value;
    current.customModel = document.getElementById('ollama-custom-model').value.trim();
    if (provider === 'ollama') {
        current.host = document.getElementById('ollama-host').value.trim() || 'http://localhost:11434';
        saveOllamaConfig(current);
        await testOllamaConnection();
    } else {
        current.apiKey = apiKeyInput.value.trim();
        saveOllamaConfig(current);
        const status = document.getElementById('ai-status');
        if (!current.apiKey) {
            status.innerHTML = '❌ No API key set.';
            return;
        }
        status.innerHTML = `✅ ${provider} ready — <strong>${getActiveModel()}</strong>`;
    }
});

document.getElementById('settings-save').addEventListener('click', () => {
    const provider = providerSelect.value;
    saveOllamaConfig({
        enabled: true,
        provider: provider,
        model: ollamaModelSelect.value,
        customModel: document.getElementById('ollama-custom-model').value.trim(),
        host: document.getElementById('ollama-host').value.trim() || 'http://localhost:11434',
        apiKey: apiKeyInput.value.trim()
    });
    closeAllPanels();
    showToast(`${provider} enabled — ${getActiveModel()}`);
});

document.getElementById('settings-cancel').addEventListener('click', closeAllPanels);

// Restart onboarding tour
document.getElementById('btn-restart-tour').addEventListener('click', () => {
    closeAllPanels();
    if (typeof window.chromaPulseRestartTour === 'function') {
        window.chromaPulseRestartTour();
    }
});

// --- Image Export ---
const btnExportImg = document.getElementById('btn-export-img');
const exportPreview = document.getElementById('export-preview');
const exportCanvas = document.getElementById('export-canvas');
const renderCanvas = document.getElementById('render-canvas');

function renderSwatchCard() {
    const count = currentPalette.length;
    // Square layout: each swatch is a column; total is square
    const size = 1200;
    const padding = 40;
    const headerH = 60;
    const footerH = 50;
    const swatchTop = padding + headerH;
    const infoH = 120; // text area below each swatch
    const swatchH = size - swatchTop - footerH - padding - infoH;
    const swatchW = (size - padding * 2) / count;
    const cornerR = 16;

    renderCanvas.width = size;
    renderCanvas.height = size;
    const ctx = renderCanvas.getContext('2d');

    // Background
    ctx.fillStyle = '#0f0f13';
    roundRect(ctx, 0, 0, size, size, 24, true);

    // Title
    ctx.font = '600 22px Inter, sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'left';
    ctx.fillText('ChromaPulse', padding, padding + 28);

    ctx.font = '400 14px Inter, sans-serif';
    ctx.fillStyle = '#8888a0';
    ctx.textAlign = 'right';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    ctx.fillText(`Palette · ${currentHarmony} · ${dateStr}`, size - padding, padding + 28);

    // Draw each color swatch
    currentPalette.forEach((color, i) => {
        const x = padding + i * swatchW;
        const gap = 4;
        const sx = x + gap / 2;
        const sw = swatchW - gap;

        // Swatch rectangle with rounded top corners
        ctx.fillStyle = color.hex;
        const r = i === 0 ? [cornerR, 0, 0, cornerR] :
            i === count - 1 ? [0, cornerR, cornerR, 0] :
                [0, 0, 0, 0];
        roundRectVary(ctx, sx, swatchTop, sw, swatchH, r);
        ctx.fill();

        // Info background (dark strip below swatch)
        ctx.fillStyle = '#1a1a24';
        const ir = i === 0 ? [0, 0, cornerR, 0] :
            i === count - 1 ? [0, 0, 0, cornerR] :
                [0, 0, 0, 0];
        roundRectVary(ctx, sx, swatchTop + swatchH, sw, infoH, ir);
        ctx.fill();

        // Hex code
        ctx.textAlign = 'center';
        const cx = sx + sw / 2;
        ctx.font = '500 18px "JetBrains Mono", monospace';
        ctx.fillStyle = '#e8e8f0';
        ctx.fillText(color.hex, cx, swatchTop + swatchH + 30);

        // Pantone
        const pantone = findClosestPantone(color.r, color.g, color.b);
        ctx.font = '500 11px Inter, sans-serif';
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText(pantone, cx, swatchTop + swatchH + 52);

        // RGB
        ctx.font = '400 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#8888a0';
        ctx.fillText(`R${color.r} G${color.g} B${color.b}`, cx, swatchTop + swatchH + 72);

        // HSL
        const [h, s, l] = rgbToHsl(color.r, color.g, color.b);
        ctx.fillText(`H${h}° S${s}% L${l}%`, cx, swatchTop + swatchH + 88);

        // Color dot on swatch center
        const dotY = swatchTop + swatchH / 2;
        ctx.beginPath();
        ctx.arc(cx, dotY - 20, 24, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();
        ctx.font = '500 13px "JetBrains Mono", monospace';
        ctx.fillStyle = textColorFor(color.r, color.g, color.b);
        ctx.fillText(color.hex, cx, dotY - 15);
    });

    // Footer watermark
    ctx.font = '400 12px Inter, sans-serif';
    ctx.fillStyle = '#555566';
    ctx.textAlign = 'center';
    ctx.fillText('Generated with ChromaPulse', size / 2, size - padding + 5);

    // Copy to visible canvas
    exportCanvas.width = size;
    exportCanvas.height = size;
    const vctx = exportCanvas.getContext('2d');
    vctx.drawImage(renderCanvas, 0, 0);
}

// Rounded rect helper
function roundRect(ctx, x, y, w, h, r, fill) {
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
    if (fill) ctx.fill();
}

// Rounded rect with individual corner radii [topLeft, topRight, bottomRight, bottomLeft]
function roundRectVary(ctx, x, y, w, h, radii) {
    const [tl, tr, br, bl] = radii;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    if (tr) ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    else ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - br);
    if (br) ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    else ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + bl, y + h);
    if (bl) ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    else ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + tl);
    if (tl) ctx.quadraticCurveTo(x, y, x + tl, y);
    else ctx.lineTo(x, y);
    ctx.closePath();
}

// Show export preview
btnExportImg.addEventListener('click', () => {
    renderSwatchCard();
    exportPreview.classList.remove('hidden');
    overlay.classList.remove('hidden');
});

// Close
document.getElementById('export-close').addEventListener('click', closeAllPanels);

// Copy as PNG to clipboard
document.getElementById('export-copy-img').addEventListener('click', async () => {
    try {
        const blob = await new Promise(resolve => renderCanvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('📸 Swatch card copied to clipboard!');
    } catch (err) {
        console.error(err);
        showToast('Copy failed — try downloading instead');
    }
});

// Download full palette PNG
document.getElementById('export-download').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `chromapulse-palette-${Date.now()}.png`;
    link.href = renderCanvas.toDataURL('image/png');
    link.click();
    showToast('⬇ Full palette PNG downloaded!');
});

// --- Individual Color Card Renderer ---
function renderSingleCard(color, index) {
    const size = 1200;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    const textCol = textColorFor(color.r, color.g, color.b);
    const isLight = luminance(color.r, color.g, color.b) > 0.35;
    const pantone = findClosestPantone(color.r, color.g, color.b);
    const [h, s, l] = rgbToHsl(color.r, color.g, color.b);

    // Full color background with rounded corners
    ctx.fillStyle = color.hex;
    roundRect(ctx, 0, 0, size, size, 32, true);

    // Subtle inner shadow/vignette for depth
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, 'rgba(255,255,255,0.03)');
    grad.addColorStop(1, isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.15)');
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, size, size, 32, true);

    // Info card at bottom
    const cardH = 280;
    const cardM = 60; // margin from edges
    const cardY = size - cardM - cardH;
    const cardW = size - cardM * 2;
    const cardR = 20;

    // Glass-style info card background
    ctx.fillStyle = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
    roundRect(ctx, cardM, cardY, cardW, cardH, cardR, true);

    // Thin border on card
    ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cardM, cardY, cardW, cardH, cardR, false);
    ctx.stroke();

    // Hex — big and bold
    ctx.textAlign = 'center';
    ctx.font = '700 64px "JetBrains Mono", monospace';
    ctx.fillStyle = textCol;
    ctx.fillText(color.hex, size / 2, cardY + 70);

    // Pantone
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillStyle = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.55)';
    ctx.fillText(pantone, size / 2, cardY + 115);

    // Divider line
    ctx.beginPath();
    ctx.moveTo(cardM + 80, cardY + 140);
    ctx.lineTo(cardM + cardW - 80, cardY + 140);
    ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // RGB
    ctx.font = '400 22px "JetBrains Mono", monospace';
    ctx.fillStyle = isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.5)';
    ctx.fillText(`RGB(${color.r}, ${color.g}, ${color.b})`, size / 2, cardY + 180);

    // HSL
    ctx.fillText(`HSL(${h}°, ${s}%, ${l}%)`, size / 2, cardY + 215);

    // Color index badge (top-left)
    ctx.font = '600 18px Inter, sans-serif';
    ctx.fillStyle = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(70, 70, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = textCol;
    ctx.textAlign = 'center';
    ctx.fillText(`${index + 1}`, 70, 77);

    // Small "ChromaPulse" watermark bottom-right  
    ctx.font = '400 14px Inter, sans-serif';
    ctx.fillStyle = isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)';
    ctx.textAlign = 'right';
    ctx.fillText('ChromaPulse', size - cardM, cardY + cardH + 28);

    return c;
}

// Download individual cards
document.getElementById('export-cards').addEventListener('click', () => {
    showToast(`🃏 Downloading ${currentPalette.length} cards...`);

    currentPalette.forEach((color, i) => {
        setTimeout(() => {
            const canvas = renderSingleCard(color, i);
            const link = document.createElement('a');
            const safeName = color.hex.replace('#', '');
            link.download = `chromapulse-${safeName}-card.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }, i * 350); // stagger downloads so browser doesn't block
    });
});

// --- Init ---
updateAIStatus();
generatePalette();
