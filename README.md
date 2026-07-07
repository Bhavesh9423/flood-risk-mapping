# 🌊 Flood Risk Identification System - India

## GIS and Remote Sensing Based Flood Prone Area Mapping

A web-based interactive mapping system for identifying and visualizing flood-prone districts in India using GIS analysis and remote sensing data.

---

## 📋 Project Overview

This is a **Final Year Computer Engineering Project** that combines Geographic Information Systems (GIS) with web technologies to create an accessible, interactive flood risk visualization platform.

### 🎯 Objective
To identify and visualize flood-prone areas in India at the district level using weighted overlay analysis of multiple risk factors.

---

## 🔬 Methodology

### Data Sources & Risk Factors:
1. **Elevation Data (DEM)** - Digital Elevation Model
2. **Rainfall Data** - Historical precipitation patterns
3. **River Proximity** - Distance from major rivers and water bodies
4. **Land Use Pattern** - Urbanization and land cover analysis

### Analysis Technique:
- **Reclassification**: Each factor scored on 1-5 scale
- **Weighted Overlay Analysis**: Combined factors with appropriate weights
- **GIS Software**: QGIS for spatial analysis
- **Output**: Risk classification (High/Medium/Low)

---

## 🎨 Features

✅ **Interactive Map**: Pan, zoom, and explore flood risk across India  
✅ **Color-Coded Districts**:
   - 🔴 Red = High Risk
   - 🟠 Orange = Medium Risk
   - 🟢 Green = Low Risk

✅ **District Information**: Click any district for detailed risk information  
✅ **Legend & Info Panel**: Easy-to-understand risk classification  
✅ **Responsive Design**: Works on desktop, tablet, and mobile devices  
✅ **Fast Loading**: Optimized GeoJSON for quick performance  

---

## 🛠️ Technology Stack

### Frontend:
- **HTML5** - Structure and content
- **CSS3** - Styling and responsive design
- **JavaScript (ES6)** - Interactive functionality

### Libraries:
- **Leaflet.js** - Open-source mapping library
- **OpenStreetMap** - Base map tiles

### Data Format:
- **GeoJSON** - Spatial data exchange format

### Deployment:
- **GitHub Pages** - Free hosting platform
- **Git** - Version control

---

## 📁 Project Structure

```
flood-risk-mapping/
│
├── index.html                    # Main HTML page
├── style.css                     # Styling and responsive design
├── script.js                     # Map functionality and interactions
├── flood_risk_data.geojson       # Flood risk spatial data
├── DEPLOYMENT_GUIDE.md           # Step-by-step deployment instructions
└── README.md                     # This file
```

---

## 🚀 Live Demo

**Website URL**: `https://bhavesh9423.github.io/flood-risk-mapping/`

---

## 📥 Installation & Setup

### For Local Development:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/flood-risk-mapping.git
   ```

2. **Navigate to project folder**:
   ```bash
   cd flood-risk-mapping
   ```

3. **Open in browser**:
   - Simply open `index.html` in any modern web browser
   - Or use a local server:
     ```bash
     python -m http.server 8000
     ```
   - Then visit: `http://localhost:8000`

### For GitHub Pages Deployment:

See **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** for complete step-by-step instructions.

---

## 📊 GeoJSON Data Format

Your GeoJSON file should follow this structure:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "district_name": "Mumbai",
        "state": "Maharashtra",
        "risk_level": "High"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

### Required Properties:
- `district_name` - Name of the district
- `state` - Name of the state
- `risk_level` - Must be: "High", "Medium", or "Low"

---

## 🎓 Academic Context

### Project Components:
1. **Literature Survey**: Study of flood risk assessment methods
2. **GIS Analysis**: Weighted overlay in QGIS
3. **Web Development**: Interactive visualization system
4. **Deployment**: Live hosting on GitHub Pages

### Learning Outcomes:
- GIS and remote sensing applications
- Web mapping technologies
- Spatial data analysis
- Full-stack web deployment
- Version control with Git

---

## 🔄 Updating the Data

To update flood risk data after deployment:

1. Export new GeoJSON from QGIS
2. Go to GitHub repository
3. Click on `flood_risk_data.geojson`
4. Click edit (pencil icon)
5. Replace content with new data
6. Commit changes
7. Wait 1-2 minutes for update to go live

---

## 📱 Browser Compatibility

✅ Chrome (Recommended)  
✅ Firefox  
✅ Safari  
✅ Edge  
✅ Mobile browsers (iOS Safari, Chrome Mobile)  

---

## 🤝 Contributing

This is an academic project, but suggestions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📧 Contact

**Student Name**: Bhavesh Oswal
**Email**: bhaveshoswal0007@gmail.com  

---

## 📄 License

This project is created for educational purposes as part of a final year academic project.

---

## 🙏 Acknowledgments

- **QGIS Community** - For excellent GIS software
- **Leaflet.js** - For the mapping library
- **OpenStreetMap** - For base map data
- **GitHub** - For hosting and version control
- **Project Guide** - For guidance and support

---

## 📚 References

1. QGIS Documentation: https://docs.qgis.org/
2. Leaflet.js Documentation: https://leafletjs.com/
3. GeoJSON Specification: https://geojson.org/
4. Flood Risk Assessment Papers: [Add your references]

---

## 🎯 Future Enhancements

Potential improvements for this project:
- [ ] Real-time weather integration
- [ ] Historical flood event markers
- [ ] Population density overlay
- [ ] Export functionality (PDF reports)
- [ ] Multi-language support
- [ ] Search functionality for districts
- [ ] Mobile app version

---

## 📸 Screenshots

<img width="1920" height="910" alt="Screenshot 2026-07-07 180551" src="https://github.com/user-attachments/assets/30eecf23-2904-4ee5-9221-0ab46f74854f" />
<img width="1914" height="907" alt="Screenshot 2026-07-07 180629" src="https://github.com/user-attachments/assets/b80bc388-ff9c-42ee-ad22-02cd4505bca1" />


---

**Made with 💙 for flood risk awareness and disaster preparedness**

---

*Last Updated: July 2026*
