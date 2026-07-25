// ══════════════════════════════════════════
// FLOOD RISK INTELLIGENCE — MAIN SCRIPT
// Real shapes + Live weather + Full details
// ══════════════════════════════════════════

const map = L.map('map', { center: [20.5937, 78.9629], zoom: 5, zoomControl: false });
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Basemap
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© CartoDB © OpenStreetMap | ADCET Minor Project 2024-25',
    maxZoom: 19
}).addTo(map);

// ── State ──
let allFeatures = [], activeFilters = { High: true, Medium: true, Low: true };
let floodLayer = L.layerGroup().addTo(map);
let rainLayer  = L.layerGroup();
let showFlood = true, showRain = false;
const weatherCache = {};

// ── City coords for live API ──
const COORDS = {
    'Mumbai':     [19.076, 72.877], 'Kolhapur':   [16.700, 74.240],
    'Sangli':     [16.860, 74.570], 'Kolkata':    [22.572, 88.363],
    'Patna':      [25.594, 85.137], 'Guwahati':   [26.144, 91.736],
    'Chennai':    [13.082, 80.270], 'Delhi':      [28.704, 77.102],
    'Surat':      [21.170, 72.831], 'Kochi':      [ 9.931, 76.267],
    'Vijayawada': [16.506, 80.648], 'Cuttack':    [20.462, 85.882],
    'Varanasi':   [25.317, 82.973], 'Puri':       [19.813, 85.831],
    'Bangalore':  [12.971, 77.594], 'Pune':       [18.520, 73.856],
    'Hyderabad':  [17.385, 78.486]
};

// ══ COLORS ══
const C = {
    High:   { fill:'#ef4444', border:'#dc2626' },
    Medium: { fill:'#f59e0b', border:'#d97706' },
    Low:    { fill:'#10b981', border:'#059669' }
};

function getStyle(risk) {
    return { fillColor: C[risk].fill, color: C[risk].border, weight: 2, opacity: .9, fillOpacity: .35, dashArray: risk==='Low'?'5':'0' };
}

// ══ LOAD GEOJSON ══
fetch('flood_risk_data.geojson')
    .then(r => r.json())
    .then(data => {
        allFeatures = data.features;
        renderMap();
        updateCounts();
        buildAlertFeed();
        updateTime();
    })
    .catch(e => console.error('GeoJSON error:', e));

// ══ RENDER MAP ══
function renderMap() {
    floodLayer.clearLayers();
    const filtered = allFeatures.filter(f => activeFilters[f.properties.risk_level]);

    L.geoJSON({ type:'FeatureCollection', features: filtered }, {
        style: f => getStyle(f.properties.risk_level),
        onEachFeature: (feature, layer) => {
            const p = feature.properties;
            layer.on('mouseover', function() {
                this.setStyle({ fillOpacity: .6, weight: 3 });
                this.bindTooltip(
                    `<b>${p.district_name}</b>, ${p.state}<br><span style="color:${C[p.risk_level].fill}">${p.risk_level} Risk</span>`,
                    { sticky: true }
                ).openTooltip();
            });
            layer.on('mouseout', function() { this.setStyle(getStyle(p.risk_level)); this.closeTooltip(); });
            layer.on('click', function(e) {
                buildPopup(p, e.latlng);
                syncSidebarWeather(p);
            });
        }
    }).addTo(floodLayer);
}

// ══ POPUP ══
async function buildPopup(p, latlng) {
    const rc = p.risk_level==='High'?'rh':p.risk_level==='Medium'?'rm':'rl';
    const w = await fetchWeather(p.district_name, COORDS[p.district_name]);

    const html = `
    <div style="min-width:270px;font-family:'Outfit',sans-serif;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
            <div>
                <div class="pu-city">${p.district_name}</div>
                <div class="pu-state">${p.state}</div>
            </div>
            <div class="pu-risk ${rc}">${p.risk_level} Risk</div>
        </div>
        <div class="pu-div"></div>
        <div class="pu-grid">
            <div class="pu-stat"><div class="pv">${p.elevation}m</div><div class="pl">Elevation</div></div>
            <div class="pu-stat"><div class="pv">${p.rainfall}mm</div><div class="pl">Annual Rain</div></div>
            <div class="pu-stat"><div class="pv">${p.river_dist}km</div><div class="pl">River Dist.</div></div>
            <div class="pu-stat"><div class="pv">${p.population}</div><div class="pl">Population</div></div>
        </div>
        <div class="fz-box">
            <div class="fz-title">⚠ FLOOD-PRONE AREAS</div>
            <div class="fz-list">${p.flood_zones || 'River banks and low-lying areas'}</div>
        </div>
        <div class="live-box">
            <div class="live-title">🌧 Live Weather — ${w.time}
                <span style="font-size:9px;color:#475569;margin-left:4px;">${w.live?'✅ Real API':'⚡ Estimated'}</span>
            </div>
            <div class="live-grid">
                <div class="lg-item">🌡️ Temp: <span>${w.temp}°C</span></div>
                <div class="lg-item">💧 Humid: <span>${w.humidity}%</span></div>
                <div class="lg-item">🌧️ Rain: <span>${w.rain}mm</span></div>
                <div class="lg-item">💨 Wind: <span>${w.wind}km/h</span></div>
                <div class="lg-item">☁️ Cloud: <span>${w.cloud}%</span></div>
                <div class="lg-item">📊 Press: <span>${w.pressure}hPa</span></div>
            </div>
            <div class="pu-alert" style="${alertStyle(p.risk_level, w.rain)}">
                ${alertMsg(p.risk_level, w.rain)}
            </div>
        </div>
        <div style="margin-top:8px;font-size:9px;color:#475569;text-align:center;">
            ADCET Minor Project 2024-25 | Bhavesh Oswal & Wasif Kazi
        </div>
    </div>`;

    L.popup({ className:'custom-popup', maxWidth:310 })
        .setLatLng(latlng).setContent(html).openOn(map);
}

function alertStyle(risk, rain) {
    const r = parseFloat(rain);
    if (risk==='High'||r>15) return 'background:rgba(239,68,68,.18);color:#ef4444;border:1px solid rgba(239,68,68,.35);';
    if (risk==='Medium'||r>5) return 'background:rgba(245,158,11,.18);color:#f59e0b;border:1px solid rgba(245,158,11,.35);';
    return 'background:rgba(16,185,129,.18);color:#10b981;border:1px solid rgba(16,185,129,.35);';
}

function alertMsg(risk, rain) {
    const r = parseFloat(rain);
    if (risk==='High'&&r>15) return '🚨 ACTIVE FLOOD WARNING — Evacuate low areas!';
    if (risk==='High'&&r>5)  return '⚠️ FLOOD WATCH — Monitor levels closely';
    if (risk==='High')        return '⚠️ HIGH RISK ZONE — Stay alert during rain';
    if (risk==='Medium'&&r>8) return '⚠️ FLOOD WATCH — Waterlogging possible';
    if (risk==='Medium')      return 'ℹ️ MODERATE RISK — Normal precautions';
    return '✅ SAFE ZONE — No immediate flood concern';
}

// ══ LIVE WEATHER API (Open-Meteo — Free, no key!) ══
async function fetchWeather(city, coords) {
    const key = `${city}_${new Date().getHours()}`;
    if (weatherCache[key]) return weatherCache[key];
    if (!coords) return simulateWeather(city);
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover,surface_pressure&timezone=Asia/Kolkata`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const d   = await res.json();
        const c   = d.current;
        const result = {
            temp: Math.round(c.temperature_2m), humidity: c.relative_humidity_2m,
            rain: c.precipitation.toFixed(1),   wind: Math.round(c.wind_speed_10m),
            cloud: c.cloud_cover,                pressure: Math.round(c.surface_pressure),
            time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
            live: true
        };
        weatherCache[key] = result;
        return result;
    } catch { return simulateWeather(city); }
}

function simulateWeather(city) {
    const m = new Date().getMonth(), h = new Date().getHours();
    const monsoon = m >= 5 && m <= 9;
    const coastal = ['Mumbai','Kochi','Chennai','Puri','Kolkata','Guwahati'].includes(city);
    let temp = monsoon ? 28 : (m<2||m>10?21:32);
    temp = Math.round(temp + Math.sin((h-6)*Math.PI/12)*4);
    return {
        temp, humidity: Math.round((monsoon?70:45)+(coastal?15:0)+Math.random()*15),
        rain: monsoon?(Math.random()>.4?(Math.random()*20).toFixed(1):'0.0'):'0.0',
        wind: Math.round(8+Math.random()*12), cloud: Math.round(monsoon?60:25+Math.random()*25),
        pressure: Math.round(1005+Math.random()*12),
        time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
        live: false
    };
}

// ══ SIDEBAR WEATHER ══
function loadWeather(val) {
    if (!val) return;
    const parts = val.split(',');
    const city = parts[0];
    const lat = parseFloat(parts[1]), lon = parseFloat(parts[2]);
    document.getElementById('wCityName').textContent = city;
    setWeatherLoading();
    fetchWeather(city, [lat, lon]).then(w => applyWeatherUI(w, city));
}

function syncSidebarWeather(p) {
    document.getElementById('wCityName').textContent = p.district_name;
    const coords = COORDS[p.district_name];
    setWeatherLoading();
    fetchWeather(p.district_name, coords).then(w => {
        applyWeatherUI(w, p.district_name);
        // Sync dropdown
        const sel = document.getElementById('citySelector');
        for (let opt of sel.options) {
            if (opt.value.startsWith(p.district_name+',')) { sel.value = opt.value; break; }
        }
    });
}

function setWeatherLoading() {
    ['wTemp','wHumid','wRain','wWind'].forEach(id => document.getElementById(id).textContent='⏳');
}

function applyWeatherUI(w, city) {
    document.getElementById('wTemp').textContent  = w.temp+'°C';
    document.getElementById('wHumid').textContent = w.humidity+'%';
    document.getElementById('wRain').textContent  = w.rain+'mm';
    document.getElementById('wWind').textContent  = w.wind+' km/h';
    const f = allFeatures.find(f=>f.properties.district_name===city);
    const risk = f ? f.properties.risk_level : 'Low';
    const box = document.getElementById('alertBox');
    const r = parseFloat(w.rain);
    box.className = 'alert-box';
    if (risk==='High'||r>15) { box.classList.add('a-danger'); box.textContent='🚨 FLOOD WARNING ACTIVE'; }
    else if (risk==='Medium'||r>5) { box.classList.add('a-warn'); box.textContent='⚠️ FLOOD WATCH ISSUED'; }
    else { box.classList.add('a-safe'); box.textContent='✅ NO FLOOD ALERT NOW'; }
}

function refreshWeather() {
    const val = document.getElementById('citySelector').value;
    if (!val) return;
    const city = val.split(',')[0];
    const key = `${city}_${new Date().getHours()}`;
    delete weatherCache[key];
    loadWeather(val);
}

// ══ ALERT FEED ══
async function buildAlertFeed() {
    const feed = document.getElementById('alertFeed');
    feed.innerHTML = '';
    const highs = allFeatures.filter(f=>f.properties.risk_level==='High').slice(0,7);
    for (const f of highs) {
        const p = f.properties;
        const coords = COORDS[p.district_name];
        const w = await fetchWeather(p.district_name, coords);
        const r = parseFloat(w.rain);
        const div = document.createElement('div');
        div.className = `feed-item${r>5?'':' warn'}`;
        div.innerHTML = `
            <div class="fc">${r>5?'🚨':'⚠️'} ${p.district_name}, ${p.state}</div>
            <div class="fm2">${r>5?`Rain: ${r}mm today — Active Alert`:'High-risk zone — Monitor closely'}</div>
            <div class="ft">Updated: ${w.time} | ${w.live?'Live API':'Estimated'}</div>`;
        div.onclick = () => { if(coords) map.setView(coords,9); };
        feed.appendChild(div);
    }
}

// ══ FILTERS ══
function toggleFilter(risk) {
    activeFilters[risk] = !activeFilters[risk];
    const on = activeFilters[risk];
    const map2 = {High:['fHigh','fh','ckH'], Medium:['fMed','fm','ckM'], Low:['fLow','fl','ckL']};
    const [btnId, cls, ckId] = map2[risk];
    document.getElementById(btnId).classList.toggle('on', on);
    document.getElementById(ckId).textContent = on ? '✓' : '';
    renderMap(); updateCounts();
}

// ══ SEARCH ══
function searchCity(q) {
    if (!q || q.length < 2) { renderMap(); return; }
    const hit = allFeatures.find(f =>
        f.properties.district_name.toLowerCase().includes(q.toLowerCase()) ||
        f.properties.state.toLowerCase().includes(q.toLowerCase())
    );
    if (hit) {
        const p = hit.properties;
        const coords = COORDS[p.district_name];
        if (coords) { map.setView(coords, 9); syncSidebarWeather(p); }
    }
}

// ══ LAYER TOGGLE ══
function toggleLayer(type) {
    if (type==='flood') {
        showFlood = !showFlood;
        showFlood ? floodLayer.addTo(map) : map.removeLayer(floodLayer);
        document.getElementById('btnFlood').classList.toggle('active', showFlood);
    } else {
        showRain = !showRain;
        if (showRain) { addRainHeatmap(); rainLayer.addTo(map); }
        else map.removeLayer(rainLayer);
        document.getElementById('btnRain').classList.toggle('active', showRain);
    }
}

function addRainHeatmap() {
    rainLayer.clearLayers();
    allFeatures.forEach(f => {
        const p = f.properties, coords = COORDS[p.district_name];
        if (!coords) return;
        L.circle(coords, {
            radius: Math.sqrt(p.rainfall)*4500,
            fillColor:'#3b82f6', fillOpacity: Math.min(p.rainfall/3500,.5), color:'transparent'
        }).addTo(rainLayer).bindTooltip(`${p.district_name}: ${p.rainfall}mm/yr`,{sticky:true});
    });
}

function resetView() { map.setView([20.5937,78.9629],5); }

// ══ COUNTS & TIME ══
function updateCounts() {
    const v = allFeatures.filter(f=>activeFilters[f.properties.risk_level]);
    document.getElementById('highCount').textContent = v.filter(f=>f.properties.risk_level==='High').length;
    document.getElementById('medCount').textContent  = v.filter(f=>f.properties.risk_level==='Medium').length;
    document.getElementById('lowCount').textContent  = v.filter(f=>f.properties.risk_level==='Low').length;
}

function updateTime() {
    setInterval(() => {
        // Clear cache and rebuild alerts every 30 min
    }, 30*60*1000);
}
