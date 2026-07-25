// ══════════════════════════════════════════
// FLOOD RISK INTELLIGENCE — MAIN SCRIPT
// 86 real flood-zone shapes + live weather
// ══════════════════════════════════════════

const map = L.map('map', { center: [22.5, 79.5], zoom: 5, zoomControl: false });
L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© CartoDB © OpenStreetMap | Flood Risk Intelligence',
  maxZoom: 19
}).addTo(map);

let allFeatures = [];
let activeFilters = { High: true, Medium: true, Low: true };
let floodLayer = L.layerGroup().addTo(map);
let rainLayer  = L.layerGroup();
let showFlood = true, showRain = false;
let cityLayerMap = {};           // district_name -> geometry centroid [lat,lon]
const weatherCache = {};

const C = {
  High:   { fill:'#ef4444', border:'#dc2626' },
  Medium: { fill:'#f59e0b', border:'#d97706' },
  Low:    { fill:'#10b981', border:'#059669' }
};

function getStyle(risk){
  return { fillColor:C[risk].fill, color:C[risk].border, weight:2, opacity:.9, fillOpacity:.35, dashArray: risk==='Low' ? '5' : '0' };
}

// ── Compute polygon centroid (simple average) for weather lookups ──
function centroidOf(coords){
  let latSum=0, lonSum=0, n=0;
  coords[0].forEach(pt=>{ lonSum+=pt[0]; latSum+=pt[1]; n++; });
  return [latSum/n, lonSum/n];
}

// ══ LOAD GEOJSON ══
fetch('flood_risk_data.geojson')
  .then(r=>r.json())
  .then(data=>{
    allFeatures = data.features;

    // build centroid lookup + populate dropdown
    const sel = document.getElementById('citySelector');
    allFeatures
      .slice()
      .sort((a,b)=>a.properties.district_name.localeCompare(b.properties.district_name))
      .forEach(f=>{
        const p = f.properties;
        const c = centroidOf(f.geometry.coordinates);
        cityLayerMap[p.district_name] = c;
        const opt = document.createElement('option');
        opt.value = p.district_name;
        opt.textContent = `${p.district_name} (${p.state})`;
        sel.appendChild(opt);
      });

    renderMap();
    updateCounts();
    buildAlertFeed();
  })
  .catch(e=>{
    console.error('GeoJSON load error:', e);
    document.getElementById('alertFeed').innerHTML = '<div style="color:#ef4444;font-size:11px;text-align:center;padding:18px;">⚠️ Could not load flood data.<br>Check flood_risk_data.geojson is uploaded.</div>';
  });

// ══ RENDER MAP ══
function renderMap(){
  floodLayer.clearLayers();
  const filtered = allFeatures.filter(f=>activeFilters[f.properties.risk_level]);
  L.geoJSON({ type:'FeatureCollection', features:filtered }, {
    style: f=>getStyle(f.properties.risk_level),
    onEachFeature:(feature,layer)=>{
      const p = feature.properties;
      layer.on('mouseover', function(){
        this.setStyle({ fillOpacity:.6, weight:3 });
        this.bindTooltip(`<b>${p.district_name}</b>, ${p.state}<br><span style="color:${C[p.risk_level].fill}">${p.risk_level} Risk</span>`, { sticky:true }).openTooltip();
      });
      layer.on('mouseout', function(){ this.setStyle(getStyle(p.risk_level)); this.closeTooltip(); });
      layer.on('click', function(e){
        buildPopup(p, e.latlng);
        syncSidebarWeather(p.district_name);
      });
    }
  }).addTo(floodLayer);
}

// ══ POPUP ══
async function buildPopup(p, latlng){
  const rc = p.risk_level==='High'?'rh':p.risk_level==='Medium'?'rm':'rl';
  const coords = cityLayerMap[p.district_name];
  const w = await fetchWeather(p.district_name, coords);

  const html = `
  <div style="min-width:270px;font-family:'Outfit',sans-serif;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
      <div><div class="pu-city">${p.district_name}</div><div class="pu-state">${p.state}</div></div>
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
      <div class="live-title"><span>🌧 Live Weather — ${w.time}</span><span style="font-size:9px;color:${w.live?'#10b981':'#64748b'};">${w.live?'✅ Live API':'⚡ Est.'}</span></div>
      <div class="live-grid">
        <div class="lg-item">🌡️ Temp: <span>${w.temp}°C</span></div>
        <div class="lg-item">💧 Humid: <span>${w.humidity}%</span></div>
        <div class="lg-item">🌧️ Rain: <span>${w.rain}mm</span></div>
        <div class="lg-item">💨 Wind: <span>${w.wind}km/h</span></div>
      </div>
      <div class="pu-alert" style="${alertStyle(p.risk_level,w.rain)}">${alertMsg(p.risk_level,w.rain)}</div>
    </div>
  </div>`;

  L.popup({ className:'custom-popup', maxWidth:310 }).setLatLng(latlng).setContent(html).openOn(map);
}

function alertStyle(risk, rain){
  const r = parseFloat(rain);
  if (risk==='High'||r>15) return 'background:rgba(239,68,68,.18);color:#ef4444;border:1px solid rgba(239,68,68,.35);';
  if (risk==='Medium'||r>5) return 'background:rgba(245,158,11,.18);color:#f59e0b;border:1px solid rgba(245,158,11,.35);';
  return 'background:rgba(16,185,129,.18);color:#10b981;border:1px solid rgba(16,185,129,.35);';
}
function alertMsg(risk, rain){
  const r = parseFloat(rain);
  if (risk==='High'&&r>15) return '🚨 ACTIVE FLOOD WARNING — Evacuate low areas!';
  if (risk==='High'&&r>5)  return '⚠️ FLOOD WATCH — Monitor levels closely';
  if (risk==='High')        return '⚠️ HIGH RISK ZONE — Stay alert during rain';
  if (risk==='Medium'&&r>8) return '⚠️ FLOOD WATCH — Waterlogging possible';
  if (risk==='Medium')      return 'ℹ️ MODERATE RISK — Normal precautions';
  return '✅ SAFE ZONE — No immediate flood concern';
}

// ══ LIVE WEATHER (Open-Meteo, free, no key) — with robust fallback ══
async function fetchWeather(city, coords){
  const key = `${city}_${new Date().getHours()}`;
  if (weatherCache[key]) return weatherCache[key];
  if (!coords) return simulateWeather(city);

  try{
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords[0].toFixed(3)}&longitude=${coords[1].toFixed(3)}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&timezone=Asia%2FKolkata`;
    const controller = new AbortController();
    const timeoutId = setTimeout(()=>controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('bad response');
    const d = await res.json();
    if (!d.current) throw new Error('no current data');
    const c = d.current;
    const result = {
      temp: Math.round(c.temperature_2m),
      humidity: Math.round(c.relative_humidity_2m),
      rain: Number(c.precipitation).toFixed(1),
      wind: Math.round(c.wind_speed_10m),
      time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
      live: true
    };
    weatherCache[key] = result;
    return result;
  }catch(err){
    console.warn('Live weather fetch failed, using estimate:', err.message);
    return simulateWeather(city);
  }
}

function simulateWeather(city){
  const m = new Date().getMonth(), h = new Date().getHours();
  const monsoon = m>=5 && m<=9;
  const coastal = ['Mumbai','Kochi','Chennai','Puri','Kolkata','Guwahati','Mangalore','Panaji','Visakhapatnam'].includes(city);
  let temp = monsoon ? 28 : (m<2||m>10?21:33);
  temp = Math.round(temp + Math.sin((h-6)*Math.PI/12)*4);
  return {
    temp,
    humidity: Math.round((monsoon?70:45)+(coastal?15:0)+Math.random()*15),
    rain: monsoon ? (Math.random()>.4 ? (Math.random()*20).toFixed(1) : '0.0') : '0.0',
    wind: Math.round(8+Math.random()*12),
    time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
    live:false
  };
}

// ══ SIDEBAR WEATHER ══
function loadWeather(cityName){
  if (!cityName){
    document.getElementById('wCityName').textContent='Select a City';
    ['wTemp','wHumid','wRain','wWind'].forEach(id=>document.getElementById(id).textContent='—');
    const box=document.getElementById('alertBox');
    box.className='alert-box a-idle'; box.textContent='Select a city to check live flood alert';
    document.getElementById('statusNote').textContent='';
    return;
  }
  syncSidebarWeather(cityName);
}

function syncSidebarWeather(cityName){
  document.getElementById('wCityName').textContent = cityName;
  document.getElementById('citySelector').value = cityName;
  setWeatherLoading();
  const coords = cityLayerMap[cityName];
  fetchWeather(cityName, coords).then(w=>applyWeatherUI(w, cityName));
}

function setWeatherLoading(){
  ['wTemp','wHumid','wRain','wWind'].forEach(id=>document.getElementById(id).textContent='⏳');
  document.getElementById('statusNote').textContent='Fetching live data...';
}

function applyWeatherUI(w, city){
  document.getElementById('wTemp').textContent  = w.temp+'°C';
  document.getElementById('wHumid').textContent = w.humidity+'%';
  document.getElementById('wRain').textContent  = w.rain+'mm';
  document.getElementById('wWind').textContent  = w.wind+' km/h';
  document.getElementById('statusNote').textContent = w.live
    ? `✅ Live data from Open-Meteo · Updated ${w.time}`
    : `⚡ Estimated seasonal data · Updated ${w.time}`;

  const f = allFeatures.find(f=>f.properties.district_name===city);
  const risk = f ? f.properties.risk_level : 'Low';
  const box = document.getElementById('alertBox');
  const r = parseFloat(w.rain);
  box.className='alert-box';
  if (risk==='High'||r>15){ box.classList.add('a-danger'); box.textContent='🚨 FLOOD WARNING ACTIVE'; }
  else if (risk==='Medium'||r>5){ box.classList.add('a-warn'); box.textContent='⚠️ FLOOD WATCH ISSUED'; }
  else { box.classList.add('a-safe'); box.textContent='✅ NO FLOOD ALERT NOW'; }
}

function refreshWeather(){
  const val = document.getElementById('citySelector').value;
  if (!val) return;
  const btn = document.getElementById('refreshBtn');
  btn.textContent = '⏳ ...';
  const key = `${val}_${new Date().getHours()}`;
  delete weatherCache[key];
  loadWeather(val);
  setTimeout(()=>{ btn.textContent='↻ Refresh'; }, 800);
}

// ══ ALERT FEED ══
async function buildAlertFeed(){
  const feed = document.getElementById('alertFeed');
  feed.innerHTML='';
  const highs = allFeatures.filter(f=>f.properties.risk_level==='High').slice(0,8);
  for (const f of highs){
    const p = f.properties;
    const coords = cityLayerMap[p.district_name];
    const w = await fetchWeather(p.district_name, coords);
    const r = parseFloat(w.rain);
    const div = document.createElement('div');
    div.className = `feed-item${r>5?'':' warn'}`;
    div.innerHTML = `
      <div class="fc">${r>5?'🚨':'⚠️'} ${p.district_name}, ${p.state}</div>
      <div class="fm2">${r>5?`Rain: ${r}mm today — Active Alert`:'High-risk zone — Monitor closely'}</div>
      <div class="ft">Updated: ${w.time} · ${w.live?'Live':'Est.'}</div>`;
    div.onclick = ()=>{ if(coords) map.setView(coords,9); syncSidebarWeather(p.district_name); };
    feed.appendChild(div);
  }
  if (highs.length===0) feed.innerHTML = '<div style="color:#475569;font-size:11px;text-align:center;padding:18px;">No high-risk alerts currently</div>';
}

// ══ FILTERS ══
function toggleFilter(risk){
  activeFilters[risk] = !activeFilters[risk];
  const on = activeFilters[risk];
  const cfg = { High:['fHigh','ckH'], Medium:['fMed','ckM'], Low:['fLow','ckL'] };
  const [btnId, ckId] = cfg[risk];
  document.getElementById(btnId).classList.toggle('on', on);
  document.getElementById(ckId).textContent = on ? '✓' : '';
  renderMap(); updateCounts();
}

// ══ SEARCH ══
function searchCity(q){
  const box = document.getElementById('searchResults');
  if (!q || q.length<2){ box.innerHTML=''; return; }
  const matches = allFeatures.filter(f=>
    f.properties.district_name.toLowerCase().includes(q.toLowerCase()) ||
    f.properties.state.toLowerCase().includes(q.toLowerCase())
  ).slice(0,6);

  box.innerHTML = matches.map(f=>{
    const p = f.properties;
    const badgeColor = C[p.risk_level].fill;
    return `<div class="sr-item" onclick="jumpToCity('${p.district_name}')">
      <span>${p.district_name}, ${p.state}</span>
      <span class="sr-badge" style="background:${badgeColor}22;color:${badgeColor};">${p.risk_level}</span>
    </div>`;
  }).join('');
}

function jumpToCity(cityName){
  const coords = cityLayerMap[cityName];
  if (coords){
    map.setView(coords, 9);
    syncSidebarWeather(cityName);
    document.getElementById('searchResults').innerHTML='';
    document.getElementById('searchInput').value='';
  }
}

// ══ LAYER TOGGLE ══
function toggleLayer(type){
  if (type==='flood'){
    showFlood=!showFlood;
    showFlood ? floodLayer.addTo(map) : map.removeLayer(floodLayer);
    document.getElementById('btnFlood').classList.toggle('active', showFlood);
  } else {
    showRain=!showRain;
    if (showRain){ addRainHeatmap(); rainLayer.addTo(map); } else map.removeLayer(rainLayer);
    document.getElementById('btnRain').classList.toggle('active', showRain);
  }
}

function addRainHeatmap(){
  rainLayer.clearLayers();
  allFeatures.forEach(f=>{
    const p = f.properties;
    const coords = cityLayerMap[p.district_name];
    if (!coords) return;
    L.circle(coords, {
      radius: Math.sqrt(p.rainfall)*4500,
      fillColor:'#3b82f6', fillOpacity: Math.min(p.rainfall/3500,.5), color:'transparent'
    }).addTo(rainLayer).bindTooltip(`${p.district_name}: ${p.rainfall}mm/yr`,{sticky:true});
  });
}

function resetView(){ map.setView([22.5,79.5],5); }

// ══ COUNTS ══
function updateCounts(){
  const v = allFeatures.filter(f=>activeFilters[f.properties.risk_level]);
  document.getElementById('highCount').textContent = v.filter(f=>f.properties.risk_level==='High').length;
  document.getElementById('medCount').textContent  = v.filter(f=>f.properties.risk_level==='Medium').length;
  document.getElementById('lowCount').textContent  = v.filter(f=>f.properties.risk_level==='Low').length;
}

// Auto-refresh alert feed every 30 min
setInterval(()=>{
  Object.keys(weatherCache).forEach(k=>delete weatherCache[k]);
  buildAlertFeed();
}, 30*60*1000);
