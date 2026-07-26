// ══════════════════════════════════════════════════
// FLOOD RISK INTELLIGENCE SYSTEM — script.js
// Wired to original design (index.html + style.css)
// Real flood-zone polygons + live weather data
// ══════════════════════════════════════════════════

let map;
let allFeatures = [];
let floodLayer;
let cityLayerMap = {};   // district_name -> [lat, lon] centroid
let activeFilters = { High: true, Medium: true, Low: true };
const weatherCache = {};

const RISK_COLORS = {
    High:   { fill: '#ef4444', border: '#dc2626' },
    Medium: { fill: '#f59e0b', border: '#d97706' },
    Low:    { fill: '#10b981', border: '#059669' }
};

// ══════════ INIT MAP ══════════
function initMap() {
    map = L.map('map', { zoomControl: true, center: [22.5, 79.5], zoom: 5 });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB © OpenStreetMap | Flood Risk Intelligence',
        maxZoom: 19
    }).addTo(map);

    floodLayer = L.layerGroup().addTo(map);
}

function getStyle(risk) {
    const c = RISK_COLORS[risk] || RISK_COLORS.Low;
    return {
        fillColor: c.fill,
        color: c.border,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.35,
        dashArray: risk === 'Low' ? '5' : '0'
    };
}

function centroidOf(coords) {
    let latSum = 0, lonSum = 0, n = 0;
    coords[0].forEach(pt => { lonSum += pt[0]; latSum += pt[1]; n++; });
    return [latSum / n, lonSum / n];
}

// ══════════ LOAD DATA ══════════
async function loadFloodData() {
    try {
        const res = await fetch('flood_risk_data.geojson');
        const data = await res.json();
        allFeatures = data.features;

        allFeatures.forEach(f => {
            cityLayerMap[f.properties.district_name] = centroidOf(f.geometry.coordinates);
        });

        renderMap();
        updateStatCounts();
        hideLoadingScreen();
    } catch (err) {
        console.error('Failed to load flood_risk_data.geojson:', err);
        hideLoadingScreen();
    }
}

// ══════════ RENDER MAP ══════════
function renderMap() {
    floodLayer.clearLayers();
    const filtered = allFeatures.filter(f => activeFilters[f.properties.risk_level]);

    L.geoJSON({ type: 'FeatureCollection', features: filtered }, {
        style: f => getStyle(f.properties.risk_level),
        onEachFeature: (feature, layer) => {
            const p = feature.properties;

            layer.on('mouseover', function () {
                this.setStyle({ fillOpacity: 0.6, weight: 3 });
                this.bindTooltip(
                    `<b>${p.district_name}</b>, ${p.state}<br><span style="color:${RISK_COLORS[p.risk_level].fill}">${p.risk_level} Risk</span>`,
                    { sticky: true }
                ).openTooltip();
            });
            layer.on('mouseout', function () {
                this.setStyle(getStyle(p.risk_level));
                this.closeTooltip();
            });
            layer.on('click', function (e) {
                showPopup(p, e.latlng);
            });
        }
    }).addTo(floodLayer);
}

// ══════════ POPUP WITH LIVE WEATHER ══════════
async function showPopup(p, latlng) {
    const coords = cityLayerMap[p.district_name];
    const w = await fetchWeather(p.district_name, coords);
    const riskColor = RISK_COLORS[p.risk_level].fill;

    const html = `
    <div style="min-width:260px; font-family:'Outfit',sans-serif;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:8px;">
            <div>
                <div style="font-size:17px; font-weight:800; color:#f8fafc;">${p.district_name}</div>
                <div style="font-size:11px; color:#94a3b8;">${p.state}</div>
            </div>
            <div style="padding:4px 11px; border-radius:20px; font-size:11px; font-weight:700; background:${riskColor}22; color:${riskColor}; border:1px solid ${riskColor}55;">
                ${p.risk_level} Risk
            </div>
        </div>
        <div style="height:1px; background:rgba(255,255,255,0.1); margin:8px 0;"></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:9px;">
            <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:7px; text-align:center;">
                <div style="font-size:15px; font-weight:700; color:#06b6d4;">${p.elevation}m</div>
                <div style="font-size:9px; color:#94a3b8;">Elevation</div>
            </div>
            <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:7px; text-align:center;">
                <div style="font-size:15px; font-weight:700; color:#06b6d4;">${p.rainfall}mm</div>
                <div style="font-size:9px; color:#94a3b8;">Annual Rain</div>
            </div>
            <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:7px; text-align:center;">
                <div style="font-size:15px; font-weight:700; color:#06b6d4;">${p.river_dist}km</div>
                <div style="font-size:9px; color:#94a3b8;">River Dist.</div>
            </div>
            <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:7px; text-align:center;">
                <div style="font-size:15px; font-weight:700; color:#06b6d4;">${p.population}</div>
                <div style="font-size:9px; color:#94a3b8;">Population</div>
            </div>
        </div>
        <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:8px; padding:8px 10px; margin-bottom:8px;">
            <div style="font-size:10px; font-weight:700; color:#ef4444; margin-bottom:3px;">⚠ FLOOD-PRONE AREAS</div>
            <div style="font-size:11px; color:#cbd5e1; line-height:1.5;">${p.flood_zones || 'River banks and low-lying areas'}</div>
        </div>
        <div style="background:rgba(6,182,212,0.08); border:1px solid rgba(6,182,212,0.2); border-radius:8px; padding:8px 10px;">
            <div style="font-size:10px; font-weight:700; color:#06b6d4; margin-bottom:6px; display:flex; justify-content:space-between;">
                <span>🌧 Live Weather — ${w.time}</span>
                <span style="font-size:9px; color:${w.live ? '#10b981' : '#94a3b8'};">${w.live ? '✅ Live API' : '⚡ Est.'}</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; font-size:10px; color:#94a3b8;">
                <div>🌡️ Temp: <span style="color:#f8fafc; font-weight:600;">${w.temp}°C</span></div>
                <div>💧 Humid: <span style="color:#f8fafc; font-weight:600;">${w.humidity}%</span></div>
                <div>🌧️ Rain: <span style="color:#f8fafc; font-weight:600;">${w.rain}mm</span></div>
                <div>💨 Wind: <span style="color:#f8fafc; font-weight:600;">${w.wind}km/h</span></div>
            </div>
            <div style="margin-top:8px; padding:6px 8px; border-radius:6px; font-size:11px; font-weight:700; text-align:center; ${alertStyle(p.risk_level, w.rain)}">
                ${alertMsg(p.risk_level, w.rain)}
            </div>
        </div>
    </div>`;

    L.popup({ maxWidth: 300 }).setLatLng(latlng).setContent(html).openOn(map);
}

function alertStyle(risk, rain) {
    const r = parseFloat(rain);
    if (risk === 'High' || r > 15) return 'background:rgba(239,68,68,0.18); color:#ef4444; border:1px solid rgba(239,68,68,0.35);';
    if (risk === 'Medium' || r > 5) return 'background:rgba(245,158,11,0.18); color:#f59e0b; border:1px solid rgba(245,158,11,0.35);';
    return 'background:rgba(16,185,129,0.18); color:#10b981; border:1px solid rgba(16,185,129,0.35);';
}
function alertMsg(risk, rain) {
    const r = parseFloat(rain);
    if (risk === 'High' && r > 15) return '🚨 ACTIVE FLOOD WARNING — Evacuate low areas!';
    if (risk === 'High' && r > 5)  return '⚠️ FLOOD WATCH — Monitor levels closely';
    if (risk === 'High')            return '⚠️ HIGH RISK ZONE — Stay alert during rain';
    if (risk === 'Medium' && r > 8) return '⚠️ FLOOD WATCH — Waterlogging possible';
    if (risk === 'Medium')          return 'ℹ️ MODERATE RISK — Normal precautions';
    return '✅ SAFE ZONE — No immediate flood concern';
}

// ══════════ LIVE WEATHER (Open-Meteo, free, no key) ══════════
async function fetchWeather(city, coords) {
    const key = `${city}_${new Date().getHours()}`;
    if (weatherCache[key]) return weatherCache[key];
    if (!coords) return simulateWeather(city);

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords[0].toFixed(3)}&longitude=${coords[1].toFixed(3)}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Asia%2FKolkata`;
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error('bad response');
        const d = await res.json();
        const c = d.current;
        const result = {
            temp: Math.round(c.temperature_2m),
            humidity: Math.round(c.relative_humidity_2m),
            rain: Number(c.precipitation).toFixed(1),
            wind: Math.round(c.wind_speed_10m),
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            live: true
        };
        weatherCache[key] = result;
        return result;
    } catch (err) {
        console.warn('Live weather failed, using estimate for', city, err.message);
        return simulateWeather(city);
    }
}

function simulateWeather(city) {
    const m = new Date().getMonth(), h = new Date().getHours();
    const monsoon = m >= 5 && m <= 9;
    const coastal = ['Mumbai','Kochi','Chennai','Puri','Kolkata','Guwahati','Mangalore','Panaji','Visakhapatnam'].includes(city);
    let temp = monsoon ? 28 : (m < 2 || m > 10 ? 21 : 33);
    temp = Math.round(temp + Math.sin((h - 6) * Math.PI / 12) * 4);
    return {
        temp,
        humidity: Math.round((monsoon ? 70 : 45) + (coastal ? 15 : 0) + Math.random() * 15),
        rain: monsoon ? (Math.random() > 0.4 ? (Math.random() * 20).toFixed(1) : '0.0') : '0.0',
        wind: Math.round(8 + Math.random() * 12),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        live: false
    };
}

// ══════════ FILTERS (wired to #filterHigh / #filterMedium / #filterLow) ══════════
function setupFilters() {
    const map2 = { filterHigh: 'High', filterMedium: 'Medium', filterLow: 'Low' };
    Object.keys(map2).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            activeFilters[map2[id]] = el.checked;
            renderMap();
            updateStatCounts();
        });
    });
}

// ══════════ SEARCH (wired to #searchInput / #searchBtn) ══════════
function setupSearch() {
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('searchBtn');
    if (!input) return;

    function doSearch() {
        const q = input.value.trim().toLowerCase();
        if (!q) return;
        const hit = allFeatures.find(f =>
            f.properties.district_name.toLowerCase().includes(q) ||
            f.properties.state.toLowerCase().includes(q)
        );
        if (hit) {
            const coords = cityLayerMap[hit.properties.district_name];
            if (coords) {
                map.setView(coords, 9);
                // Find the layer & open its popup
                floodLayer.eachLayer(layer => {
                    if (layer.feature && layer.feature.properties.district_name === hit.properties.district_name) {
                        showPopup(hit.properties, layer.getBounds ? layer.getBounds().getCenter() : { lat: coords[0], lng: coords[1] });
                    }
                });
            }
        }
    }
    if (btn) btn.addEventListener('click', doSearch);
    input.addEventListener('keypress', e => { if (e.key === 'Enter') doSearch(); });
}

// ══════════ STAT COUNTS (wired to #highRiskCount etc.) ══════════
function updateStatCounts() {
    const v = allFeatures.filter(f => activeFilters[f.properties.risk_level]);
    const h = document.getElementById('highRiskCount');
    const m = document.getElementById('mediumRiskCount');
    const l = document.getElementById('lowRiskCount');
    if (h) h.textContent = v.filter(f => f.properties.risk_level === 'High').length;
    if (m) m.textContent = v.filter(f => f.properties.risk_level === 'Medium').length;
    if (l) l.textContent = v.filter(f => f.properties.risk_level === 'Low').length;
}

// ══════════ CONTROL PANEL TOGGLE ══════════
function setupPanelToggle() {
    const toggleBtn = document.getElementById('togglePanel');
    const panel = document.getElementById('controlPanel');
    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', () => panel.classList.toggle('collapsed'));
    }
}

// ══════════ LEGEND TOGGLE ══════════
function setupLegendToggle() {
    const toggle = document.getElementById('legendToggle');
    const content = document.getElementById('legendContent');
    if (toggle && content) {
        toggle.addEventListener('click', () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            toggle.textContent = isHidden ? '−' : '+';
        });
    }
}

// ══════════ LOADING SCREEN ══════════
function hideLoadingScreen() {
    const el = document.getElementById('loadingScreen');
    if (el) {
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => { el.style.display = 'none'; }, 500);
        }, 400);
    }
}

// ══════════ INIT ══════════
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadFloodData();
    setupFilters();
    setupSearch();
    setupPanelToggle();
    setupLegendToggle();
});
