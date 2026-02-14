// ============================================
// FLOOD RISK INTELLIGENCE SYSTEM - JAVASCRIPT
// Enhanced with Animations and Interactivity
// ============================================

// Global Variables
let map;
let geoJsonLayer;
let allFeatures = [];
let riskCounts = { high: 0, medium: 0, low: 0 };

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeApp, 1000); // Show loading screen for 1 second
});

// Main initialization function
function initializeApp() {
    hideLoadingScreen();
    initializeMap();
    setupEventListeners();
    animateStatsCounter();
}

// Hide loading screen with animation
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 500);
}

// Initialize Leaflet map
function initializeMap() {
    // Create map centered on India
    map = L.map('map', {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: false,
        minZoom: 4,
        maxZoom: 10
    });

    // Add custom zoom control
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Add dark-themed base map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Load GeoJSON data
    loadGeoJSONData();
}

// Load and display GeoJSON data
function loadGeoJSONData() {
    fetch('flood_risk_data.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('GeoJSON file not found');
            }
            return response.json();
        })
        .then(data => {
            processGeoJSONData(data);
            addGeoJSONToMap(data);
            updateRiskCounts();
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
            showErrorMessage();
        });
}

// Process GeoJSON to extract features
function processGeoJSONData(data) {
    allFeatures = data.features;
    riskCounts = { high: 0, medium: 0, low: 0 };
    
    allFeatures.forEach(feature => {
        const risk = getRiskCategory(feature.properties.risk_level);
        riskCounts[risk]++;
    });
}

// Add GeoJSON layer to map
function addGeoJSONToMap(data) {
    geoJsonLayer = L.geoJSON(data, {
        style: styleFeature,
        onEachFeature: onEachFeature
    }).addTo(map);
}

// Style function for GeoJSON features
function styleFeature(feature) {
    const riskLevel = feature.properties.risk_level.toLowerCase();
    let fillColor = getColorByRisk(riskLevel);
    
    return {
        fillColor: fillColor,
        weight: 2,
        opacity: 1,
        color: '#ffffff',
        fillOpacity: 0.7
    };
}

// Get color based on risk level
function getColorByRisk(riskLevel) {
    const risk = riskLevel.toLowerCase();
    
    if (risk.includes('high')) {
        return '#ef4444'; // Red
    } else if (risk.includes('medium')) {
        return '#f59e0b'; // Orange
    } else if (risk.includes('low')) {
        return '#10b981'; // Green
    }
    return '#64748b'; // Gray for unknown
}

// Get risk category (high/medium/low)
function getRiskCategory(riskLevel) {
    const risk = riskLevel.toLowerCase();
    if (risk.includes('high')) return 'high';
    if (risk.includes('medium')) return 'medium';
    if (risk.includes('low')) return 'low';
    return 'unknown';
}

// Add interactivity to each feature
function onEachFeature(feature, layer) {
    // Hover effects
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: clickFeature
    });

    // Create enhanced popup
    const popupContent = createEnhancedPopup(feature.properties);
    layer.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup'
    });
}

// Highlight feature on hover
function highlightFeature(e) {
    const layer = e.target;
    
    layer.setStyle({
        weight: 4,
        color: '#06b6d4',
        fillOpacity: 0.9
    });
    
    layer.bringToFront();
}

// Reset highlight
function resetHighlight(e) {
    geoJsonLayer.resetStyle(e.target);
}

// Handle feature click
function clickFeature(e) {
    const layer = e.target;
    map.fitBounds(layer.getBounds(), {
        padding: [50, 50],
        maxZoom: 8
    });
}

// Create enhanced popup content
function createEnhancedPopup(properties) {
    const districtName = properties.district_name || properties.name || 'Unknown';
    const state = properties.state || 'Unknown State';
    const riskLevel = properties.risk_level || 'Not Available';
    const riskCategory = getRiskCategory(riskLevel);
    const riskColor = getColorByRisk(riskLevel);
    
    // Additional data if available
    const elevation = properties.elevation || 'N/A';
    const rainfall = properties.rainfall || 'N/A';
    const population = properties.population || 'N/A';
    
    return `
        <div style="font-family: 'Outfit', sans-serif; color: #f8fafc;">
            <div style="padding-bottom: 12px; margin-bottom: 12px; border-bottom: 2px solid ${riskColor};">
                <h3 style="margin: 0 0 4px 0; font-size: 1.2rem; color: #06b6d4;">
                    ${districtName}
                </h3>
                <p style="margin: 0; font-size: 0.85rem; color: #cbd5e1;">
                    ${state}
                </p>
            </div>
            
            <div style="margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${riskColor};"></div>
                    <strong style="color: #f8fafc;">Flood Risk Level:</strong>
                </div>
                <div style="padding: 8px 12px; background: ${riskColor}20; border-radius: 6px; border-left: 3px solid ${riskColor};">
                    <span style="color: ${riskColor}; font-weight: 700; font-size: 1.1rem;">
                        ${riskLevel.toUpperCase()}
                    </span>
                </div>
            </div>
            
            ${elevation !== 'N/A' || rainfall !== 'N/A' || population !== 'N/A' ? `
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155;">
                    <div style="font-size: 0.85rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 6px;">
                        ${elevation !== 'N/A' ? `<div>📏 Elevation: <strong>${elevation}m</strong></div>` : ''}
                        ${rainfall !== 'N/A' ? `<div>🌧️ Annual Rainfall: <strong>${rainfall}mm</strong></div>` : ''}
                        ${population !== 'N/A' ? `<div>👥 Population: <strong>${population}</strong></div>` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Update risk counts in header
function updateRiskCounts() {
    animateCounters('highRiskCount', riskCounts.high);
    animateCounters('mediumRiskCount', riskCounts.medium);
    animateCounters('lowRiskCount', riskCounts.low);
}

// Animate counter numbers
function animateCounters(elementId, targetValue) {
    const element = document.getElementById(elementId);
    let currentValue = 0;
    const increment = Math.ceil(targetValue / 30);
    const duration = 1000;
    const stepTime = duration / (targetValue / increment);
    
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        element.textContent = currentValue;
    }, stepTime);
}

// Animate stats on initial load
function animateStatsCounter() {
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach((item, index) => {
        item.style.animation = `fade-in 0.6s ease-out ${0.8 + index * 0.2}s both`;
    });
}

// Setup event listeners
function setupEventListeners() {
    // Filter checkboxes
    document.getElementById('filterHigh').addEventListener('change', applyFilters);
    document.getElementById('filterMedium').addEventListener('change', applyFilters);
    document.getElementById('filterLow').addEventListener('change', applyFilters);
    
    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Legend toggle
    document.getElementById('legendToggle').addEventListener('click', toggleLegend);
    
    // Panel toggle (mobile)
    const toggleBtn = document.getElementById('togglePanel');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleControlPanel);
    }
}

// Apply risk filters
function applyFilters() {
    const showHigh = document.getElementById('filterHigh').checked;
    const showMedium = document.getElementById('filterMedium').checked;
    const showLow = document.getElementById('filterLow').checked;
    
    map.eachLayer(layer => {
        if (layer.feature && layer.feature.properties) {
            const risk = getRiskCategory(layer.feature.properties.risk_level);
            let shouldShow = false;
            
            if (risk === 'high' && showHigh) shouldShow = true;
            if (risk === 'medium' && showMedium) shouldShow = true;
            if (risk === 'low' && showLow) shouldShow = true;
            
            if (shouldShow) {
                layer.setStyle({ fillOpacity: 0.7, opacity: 1 });
            } else {
                layer.setStyle({ fillOpacity: 0, opacity: 0 });
            }
        }
    });
}

// Search functionality
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        alert('Please enter a district or city name');
        return;
    }
    
    let found = false;
    
    allFeatures.forEach(feature => {
        const districtName = (feature.properties.district_name || feature.properties.name || '').toLowerCase();
        const state = (feature.properties.state || '').toLowerCase();
        
        if (districtName.includes(searchTerm) || state.includes(searchTerm)) {
            found = true;
            
            // Find the layer and zoom to it
            map.eachLayer(layer => {
                if (layer.feature && layer.feature.properties) {
                    const layerDistrict = (layer.feature.properties.district_name || layer.feature.properties.name || '').toLowerCase();
                    if (layerDistrict === districtName) {
                        map.fitBounds(layer.getBounds(), {
                            padding: [50, 50],
                            maxZoom: 8
                        });
                        layer.openPopup();
                    }
                }
            });
        }
    });
    
    if (!found) {
        alert(`No results found for "${searchTerm}"`);
    }
}

// Toggle legend visibility
function toggleLegend() {
    const legendContent = document.getElementById('legendContent');
    const legendToggle = document.getElementById('legendToggle');
    
    if (legendContent.classList.contains('collapsed')) {
        legendContent.classList.remove('collapsed');
        legendToggle.textContent = '−';
    } else {
        legendContent.classList.add('collapsed');
        legendToggle.textContent = '+';
    }
}

// Toggle control panel (mobile)
function toggleControlPanel() {
    const panelContent = document.querySelector('.panel-content');
    panelContent.classList.toggle('collapsed');
}

// Show error message
function showErrorMessage() {
    const mapDiv = document.getElementById('map');
    mapDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 20px;">
            <div style="font-size: 3rem;">⚠️</div>
            <h3 style="color: #ef4444; font-size: 1.5rem;">Error Loading Data</h3>
            <p style="color: #cbd5e1; text-align: center; max-width: 500px;">
                Unable to load flood risk data. Please ensure <code>flood_risk_data.geojson</code> is in the project folder.
            </p>
            <button onclick="location.reload()" style="padding: 12px 24px; background: #06b6d4; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                Retry
            </button>
        </div>
    `;
}

// Add custom animations on scroll (optional enhancement)
window.addEventListener('scroll', function() {
    const elements = document.querySelectorAll('.info-card');
    elements.forEach(element => {
        const position = element.getBoundingClientRect();
        if (position.top < window.innerHeight && position.bottom >= 0) {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    });
});
