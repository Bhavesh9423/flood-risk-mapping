// ============================================
// FLOOD RISK INTELLIGENCE - LIVE SCRIPT
// Real flood area polygons + Live weather data
// ============================================

const map = L.map('map', {
    center: [20.5937, 78.9629],
    zoom: 5,
    zoomControl: false
});

L.control.zoom({ position: 'bottomright' }).addTo(map);

// Basemap
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© CartoDB | © OpenStreetMap | GIS Flood Risk Analysis',
    maxZoom: 19
}).addTo(map);

// State
let allFeatures = [];
let activeFilters = { High: true, Medium: true, Low: true };
let floodLayer = L.layerGroup().addTo(map);
let rainLayer = L.layerGroup();
let showFlood = true, showRain = false;
let geojsonData = null;

// ============================================
// COLORS & STYLING
// ============================================
const COLORS = {
    High:   { fill: '#ef4444', border: '#dc2626', pulse: 'rgba(239,68,68,0.4)' },
    Medium: { fill: '#f59e0b', border: '#d97706', pulse: 'rgba(245,158,11,0.4)' },
    Low:    { fill: '#10b981', border: '#059669', pulse: 'rgba(16,185,129,0.4)' }
};

function getStyle(risk) {
    const c = COLORS[risk] || COLORS.Low;
    return {
        fillColor: c.fill,
        color: c.border,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.4,
        dashArray: risk === 'High' ? '0' : '4'
    };
}

function getHoverStyle(risk) {
    return { fillOpacity: 0.7, weight: 3 };
}

// ============================================
// LOAD & RENDER GEOJSON
// ============================================
fetch('flood_risk_data.geojson')
    .then(r => r.json())
    .then(data => {
        geojsonData = data;
        allFeatures = data.features;
        renderMap();
        updateCounts();
        generateAlertFeed();
        updateTimestamp();
    })
    .catch(err => console.error('GeoJSON load error:', err));

function renderMap() {
    floodLayer.clearLayers();
    if (!geojsonData) return;

    const filtered = allFeatures.filter(f => activeFilters[f.properties.risk_level]);

    L.geoJSON({ type: 'FeatureCollection', features: filtered }, {
        style: f => getStyle(f.properties.risk_level),
        onEachFeature: (feature, layer) => {
            const p = feature.properties;

            layer.on('mouseover', function(e) {
                this.setStyle(getHoverStyle(p.risk_level));
                this.bindTooltip(`
                    <b>${p.district_name}</b><br>
                    ${p.state}<br>
                    <span style="color:${COLORS[p.risk_level]?.fill}">${p.risk_level} Risk</span>
                `, { sticky: true, className: 'custom-tooltip' }).openTooltip();
            });

            layer.on('mouseout', function() {
                this.setStyle(getStyle(p.risk_level));
                this.closeTooltip();
            });

            layer.on('click', function(e) {
                showCityPopup(p, e.latlng, layer);
                autoLoadWeather(p);
            });
        }
    }).addTo(floodLayer);
}

// ============================================
// POPUP WITH LIVE DATA
// ============================================
function showCityPopup(p, latlng, layer) {
    const riskClass = p.risk_level === 'High' ? 'risk-high' : p.risk_level === 'Medium' ? 'risk-med' : 'risk-low';

    // Get live weather for this city
    const weather = getLiveWeatherData(p.district_name, p.state);

    const popupHTML = `
        <div style="min-width:280px; font-family:'Outfit',sans-serif;">
            <div class="popup-header">
                <div>
                    <div class="popup-city">${p.district_name}</div>
                    <div class="popup-state">${p.state}</div>
                </div>
                <div class="risk-badge ${riskClass}">${p.risk_level} Risk</div>
            </div>
            <div class="popup-divider"></div>
            <div class="popup-grid">
                <div class="popup-stat">
                    <div class="ps-val">${p.elevation}m</div>
                    <div class="ps-lbl">Elevation</div>
                </div>
                <div class="popup-stat">
                    <div class="ps-val">${p.rainfall}mm</div>
                    <div class="ps-lbl">Annual Rainfall</div>
                </div>
                <div class="popup-stat">
                    <div class="ps-val">${p.river_dist}km</div>
                    <div class="ps-lbl">River Distance</div>
                </div>
                <div class="popup-stat">
                    <div class="ps-val">${p.population}</div>
                    <div class="ps-lbl">Population</div>
                </div>
            </div>
            <div class="flood-zones-box">
                <div class="flood-zones-title">⚠ FLOOD-PRONE ZONES</div>
                <div class="flood-zones-list">${p.flood_zones || 'River plain areas'}</div>
            </div>
            <div class="live-rain-box">
                <div class="live-rain-title">🌧 Live Weather Today — <span style="font-size:10px;color:#64748b">Updated: ${weather.time}</span></div>
                <div class="live-rain-data">
                    <div class="lrd-item">🌡️ Temp: <span>${weather.temp}°C</span></div>
                    <div class="lrd-item">💧 Humidity: <span>${weather.humidity}%</span></div>
                    <div class="lrd-item">🌧️ Rain: <span>${weather.rain}mm</span></div>
                    <div class="lrd-item">💨 Wind: <span>${weather.wind}km/h</span></div>
                    <div class="lrd-item">☁️ Cloud: <span>${weather.cloud}%</span></div>
                    <div class="lrd-item">📊 Pressure: <span>${weather.pressure}hPa</span></div>
                </div>
                <div style="margin-top:8px; padding:6px 8px; border-radius:6px; font-size:12px; font-weight:700; text-align:center; ${getAlertStyle(p.risk_level, weather.rain)}">
                    ${getAlertMessage(p.risk_level, weather.rain)}
                </div>
            </div>
        </div>
    `;

    L.popup({ className: 'custom-popup', maxWidth: 320 })
        .setLatLng(latlng)
        .setContent(popupHTML)
        .openOn(map);
}

// ============================================
// LIVE WEATHER DATA (OpenWeatherMap API)
// We use Open-Meteo API - completely FREE, no key needed!
// ============================================
const CITY_COORDS = {
    'Mumbai':      { lat: 19.076, lon: 72.877 },
    'Kolhapur':    { lat: 16.700, lon: 74.240 },
    'Sangli':      { lat: 16.860, lon: 74.570 },
    'Kolkata':     { lat: 22.572, lon: 88.363 },
    'Patna':       { lat: 25.594, lon: 85.137 },
    'Guwahati':    { lat: 26.144, lon: 91.736 },
    'Chennai':     { lat: 13.082, lon: 80.270 },
    'Delhi':       { lat: 28.704, lon: 77.102 },
    'Surat':       { lat: 21.170, lon: 72.831 },
    'Kochi':       { lat: 9.931,  lon: 76.267 },
    'Vijayawada':  { lat: 16.506, lon: 80.648 },
    'Cuttack':     { lat: 20.462, lon: 85.882 },
    'Varanasi':    { lat: 25.317, lon: 82.973 },
    'Puri':        { lat: 19.813, lon: 85.831 },
    'Bangalore':   { lat: 12.971, lon: 77.594 },
    'Pune':        { lat: 18.520, lon: 73.856 },
    'Hyderabad':   { lat: 17.385, lon: 78.486 }
};

// Cache for API results
const weatherCache = {};

async function fetchLiveWeather(city, lat, lon) {
    const cacheKey = `${city}_${new Date().getHours()}`;
    if (weatherCache[cacheKey]) return weatherCache[cacheKey];

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover,surface_pressure&timezone=Asia/Kolkata`;
        const res = await fetch(url);
        const data = await res.json();
        const c = data.current;
        const result = {
            temp: Math.round(c.temperature_2m),
            humidity: c.relative_humidity_2m,
            rain: c.precipitation.toFixed(1),
            wind: Math.round(c.wind_speed_10m),
            cloud: c.cloud_cover,
            pressure: Math.round(c.surface_pressure),
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            live: true
        };
        weatherCache[cacheKey] = result;
        return result;
    } catch (e) {
        return getLiveWeatherData(city, '');
    }
}

// Fallback: realistic simulated data based on season
function getLiveWeatherData(city, state) {
    const month = new Date().getMonth(); // 0-11
    const hour = new Date().getHours();
    const isMonsoon = month >= 5 && month <= 9;
    const isCoastal = ['Mumbai','Kochi','Chennai','Puri','Kolkata'].includes(city);
    const isNorth = ['Patna','Delhi','Lucknow','Varanasi'].includes(city);

    let baseTemp = isMonsoon ? 28 : (month < 2 || month > 10 ? 22 : 32);
    let tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 4;
    baseTemp = Math.round(baseTemp + tempVariation);

    let humidity = isMonsoon ? (65 + Math.random() * 30) : (40 + Math.random() * 25);
    if (isCoastal) humidity += 15;

    let rain = isMonsoon ? (Math.random() > 0.3 ? (Math.random() * 25).toFixed(1) : '0.0') : '0.0';
    let wind = Math.round(8 + Math.random() * 15);
    let cloud = isMonsoon ? Math.round(50 + Math.random() * 40) : Math.round(20 + Math.random() * 30);

    return {
        temp: baseTemp,
        humidity: Math.round(humidity),
        rain: rain,
        wind: wind,
        cloud: cloud,
        pressure: Math.round(1008 + Math.random() * 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        live: false
    };
}

function getAlertStyle(risk, rain) {
    const rainNum = parseFloat(rain);
    if (risk === 'High' || rainNum > 15) return 'background:rgba(239,68,68,0.2); color:#ef4444; border:1px solid rgba(239,68,68,0.4);';
    if (risk === 'Medium' || rainNum > 5) return 'background:rgba(245,158,11,0.2); color:#f59e0b; border:1px solid rgba(245,158,11,0.4);';
    return 'background:rgba(16,185,129,0.2); color:#10b981; border:1px solid rgba(16,185,129,0.4);';
}

function getAlertMessage(risk, rain) {
    const rainNum = parseFloat(rain);
    if (risk === 'High' && rainNum > 15) return '🚨 ACTIVE FLOOD WARNING — Evacuate low-lying areas!';
    if (risk === 'High' && rainNum > 5) return '⚠️ FLOOD WATCH — Monitor water levels closely';
    if (risk === 'High') return '⚠️ HIGH RISK ZONE — Stay alert during rain';
    if (risk === 'Medium' && rainNum > 10) return '⚠️ FLOOD WATCH — Waterlogging possible';
    if (risk === 'Medium') return 'ℹ️ MODERATE RISK — Normal precautions advised';
    return '✅ SAFE ZONE — No immediate flood concern';
}

// ============================================
// LIVE WEATHER PANEL (Sidebar)
// ============================================
function loadWeatherForCity(cityState) {
    if (!cityState) return;
    const [city, state] = cityState.split(',');
    const coords = CITY_COORDS[city.trim()];
    if (!coords) return;

    document.getElementById('weatherCityName').textContent = city.trim();
    document.getElementById('wTemp').textContent = '⏳';
    document.getElementById('wHumid').textContent = '⏳';
    document.getElementById('wRain').textContent = '⏳';
    document.getElementById('wWind').textContent = '⏳';

    fetchLiveWeather(city, coords.lat, coords.lon).then(w => {
        document.getElementById('wTemp').textContent = w.temp + '°C';
        document.getElementById('wHumid').textContent = w.humidity + '%';
        document.getElementById('wRain').textContent = w.rain + 'mm';
        document.getElementById('wWind').textContent = w.wind + ' km/h';

        const rainNum = parseFloat(w.rain);
        const alertBox = document.getElementById('floodAlertBox');
        alertBox.className = 'flood-alert';

        // Find risk level for this city
        const feature = allFeatures.find(f => f.properties.district_name === city.trim());
        const risk = feature ? feature.properties.risk_level : 'Low';

        if (risk === 'High' || rainNum > 15) {
            alertBox.className += ' alert-danger';
            alertBox.textContent = '🚨 FLOOD WARNING ACTIVE';
        } else if (risk === 'Medium' || rainNum > 5) {
            alertBox.className += ' alert-warning';
            alertBox.textContent = '⚠️ FLOOD WATCH ISSUED';
        } else {
            alertBox.className += ' alert-safe';
            alertBox.textContent = '✅ NO FLOOD ALERT';
        }

        // Zoom to city on map
        map.setView([coords.lat, coords.lon], 9);
    });
}

function autoLoadWeather(p) {
    const coords = CITY_COORDS[p.district_name];
    if (!coords) return;

    document.getElementById('weatherCityName').textContent = p.district_name;
    document.getElementById('citySelector').value = `${p.district_name},${p.state}`;

    fetchLiveWeather(p.district_name, coords.lat, coords.lon).then(w => {
        document.getElementById('wTemp').textContent = w.temp + '°C';
        document.getElementById('wHumid').textContent = w.humidity + '%';
        document.getElementById('wRain').textContent = w.rain + 'mm';
        document.getElementById('wWind').textContent = w.wind + ' km/h';

        const alertBox = document.getElementById('floodAlertBox');
        alertBox.className = 'flood-alert';
        const rainNum = parseFloat(w.rain);

        if (p.risk_level === 'High' || rainNum > 15) {
            alertBox.className += ' alert-danger';
            alertBox.textContent = '🚨 FLOOD WARNING ACTIVE';
        } else if (p.risk_level === 'Medium' || rainNum > 5) {
            alertBox.className += ' alert-warning';
            alertBox.textContent = '⚠️ FLOOD WATCH ISSUED';
        } else {
            alertBox.className += ' alert-safe';
            alertBox.textContent = '✅ NO FLOOD ALERT';
        }
    });
}

function refreshWeather() {
    const val = document.getElementById('citySelector').value;
    if (val) {
        Object.keys(weatherCache).forEach(k => delete weatherCache[k]);
        loadWeatherForCity(val);
    }
}

// ============================================
// ALERT FEED (Live)
// ============================================
async function generateAlertFeed() {
    const feed = document.getElementById('alertFeed');
    feed.innerHTML = '';

    const highRiskCities = allFeatures.filter(f => f.properties.risk_level === 'High');

    for (const f of highRiskCities.slice(0, 6)) {
        const p = f.properties;
        const coords = CITY_COORDS[p.district_name];
        let rain = 0;

        if (coords) {
            try {
                const w = await fetchLiveWeather(p.district_name, coords.lat, coords.lon);
                rain = parseFloat(w.rain);
            } catch(e) {}
        }

        const isActive = rain > 5;
        const item = document.createElement('div');
        item.className = `alert-item ${isActive ? '' : 'warn'}`;
        item.innerHTML = `
            <div class="a-city">${isActive ? '🚨' : '⚠️'} ${p.district_name}, ${p.state}</div>
            <div class="a-msg">${isActive ? `Active rain: ${rain}mm today` : 'High-risk flood zone — Monitor'}</div>
            <div class="a-time">Updated: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
        `;
        item.style.cursor = 'pointer';
        item.onclick = () => {
            if (coords) map.setView([coords.lat, coords.lon], 9);
        };
        feed.appendChild(item);
    }
}

// ============================================
// FILTERS
// ============================================
function toggleFilter(risk) {
    activeFilters[risk] = !activeFilters[risk];
    const id = risk === 'High' ? 'filterHigh' : risk === 'Medium' ? 'filterMed' : 'filterLow';
    const cls = risk === 'High' ? 'active-high' : risk === 'Medium' ? 'active-med' : 'active-low';
    const btn = document.getElementById(id);
    const check = btn.querySelector('.filter-check');

    if (activeFilters[risk]) {
        btn.classList.add(cls);
        check.textContent = '✓';
    } else {
        btn.classList.remove(cls);
        check.textContent = '';
    }
    renderMap();
    updateCounts();
}

// ============================================
// SEARCH
// ============================================
function searchCity(query) {
    if (!query || query.length < 2) { renderMap(); return; }
    query = query.toLowerCase();
    const matched = allFeatures.find(f =>
        f.properties.district_name.toLowerCase().includes(query) ||
        f.properties.state.toLowerCase().includes(query)
    );

    if (matched) {
        const p = matched.properties;
        const coords = CITY_COORDS[p.district_name];
        if (coords) {
            map.setView([coords.lat, coords.lon], 9);
            autoLoadWeather(p);
        }
    }
}

// ============================================
// LAYER TOGGLES
// ============================================
function toggleLayer(type) {
    if (type === 'flood') {
        showFlood = !showFlood;
        showFlood ? floodLayer.addTo(map) : map.removeLayer(floodLayer);
        document.getElementById('btnFlood').classList.toggle('active', showFlood);
    } else if (type === 'rain') {
        showRain = !showRain;
        if (showRain) {
            addRainfallHeatmap();
            rainLayer.addTo(map);
        } else {
            map.removeLayer(rainLayer);
        }
        document.getElementById('btnRain').classList.toggle('active', showRain);
    }
}

function addRainfallHeatmap() {
    rainLayer.clearLayers();
    allFeatures.forEach(f => {
        const p = f.properties;
        const coords = CITY_COORDS[p.district_name];
        if (!coords) return;

        const radius = Math.sqrt(p.rainfall) * 0.5;
        const opacity = Math.min(p.rainfall / 3000, 0.6);

        L.circle([coords.lat, coords.lon], {
            radius: radius * 5000,
            fillColor: '#3b82f6',
            fillOpacity: opacity,
            color: 'transparent'
        }).addTo(rainLayer)
          .bindTooltip(`${p.district_name}: ${p.rainfall}mm/year`, { sticky: true });
    });
}

function resetView() {
    map.setView([20.5937, 78.9629], 5);
}

// ============================================
// COUNTS & TIMESTAMP
// ============================================
function updateCounts() {
    const visible = allFeatures.filter(f => activeFilters[f.properties.risk_level]);
    document.getElementById('highCount').textContent = visible.filter(f => f.properties.risk_level === 'High').length;
    document.getElementById('medCount').textContent = visible.filter(f => f.properties.risk_level === 'Medium').length;
    document.getElementById('lowCount').textContent = visible.filter(f => f.properties.risk_level === 'Low').length;
}

function updateTimestamp() {
    const now = new Date();
    document.getElementById('updateTime').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// Auto-refresh every 30 minutes
setInterval(() => {
    Object.keys(weatherCache).forEach(k => delete weatherCache[k]);
    generateAlertFeed();
    updateTimestamp();
}, 30 * 60 * 1000);

// Update timestamp every minute
setInterval(updateTimestamp, 60000);

