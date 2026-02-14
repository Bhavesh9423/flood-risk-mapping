# 🚀 DEPLOYMENT GUIDE: GitHub Pages

## Complete Step-by-Step Guide to Deploy Your Flood Risk Mapping System

---

## 📋 PREREQUISITES

1. A GitHub account (Free) - Sign up at https://github.com
2. Your project files ready:
   - index.html
   - style.css
   - script.js
   - flood_risk_data.geojson (your actual GeoJSON from QGIS)

---

## 📁 FOLDER STRUCTURE

Your project folder should look like this:

```
flood-risk-mapping/
│
├── index.html                    (Main HTML file)
├── style.css                     (Styling file)
├── script.js                     (JavaScript functionality)
├── flood_risk_data.geojson       (Your GeoJSON data from QGIS)
└── README.md                     (Optional: Project description)
```

**IMPORTANT:** All files must be in the same folder (root directory). Do NOT create subfolders unless you modify the file paths in the code.

---

## 🔧 STEP 1: PREPARE YOUR GEOJSON FILE

### Option A: Use Your QGIS Export
1. Open your QGIS project
2. Right-click on your final flood risk layer
3. Export → Save Features As
4. Format: GeoJSON
5. Save as: `flood_risk_data.geojson`

### Required GeoJSON Properties
Your GeoJSON MUST have these properties for each feature:
```json
{
  "properties": {
    "district_name": "District Name",
    "state": "State Name",
    "risk_level": "High" or "Medium" or "Low"
  }
}
```

### Verify Your GeoJSON Format
Open your GeoJSON file in a text editor and check:
- ✅ It starts with `{"type": "FeatureCollection"`
- ✅ Contains "features" array
- ✅ Each feature has "properties" with district_name and risk_level
- ✅ Each feature has "geometry" with coordinates

### If Your Property Names Are Different:
If your QGIS export uses different property names (e.g., "DISTRICT", "RISK"), you need to modify script.js:

Find this line (around line 73):
```javascript
const districtName = properties.district_name || properties.name || 'Unknown';
```

Change it to match YOUR property names:
```javascript
const districtName = properties.DISTRICT || properties.NAME || 'Unknown';
const riskLevel = properties.RISK || 'Not Available';
```

---

## 🌐 STEP 2: CREATE GITHUB REPOSITORY

1. **Go to GitHub**: https://github.com
2. **Sign in** to your account
3. **Click the "+" icon** in the top right corner
4. **Select "New repository"**

### Repository Settings:
- **Repository name**: `flood-risk-mapping` (or any name you prefer)
- **Description**: "GIS-based flood risk identification system for India"
- **Visibility**: Choose "Public" (required for free GitHub Pages)
- **Initialize**: ✅ Check "Add a README file"
- **Click**: "Create repository"

---

## 📤 STEP 3: UPLOAD YOUR FILES TO GITHUB

### Method 1: Upload via GitHub Website (Easiest)

1. **On your repository page**, click "Add file" → "Upload files"

2. **Drag and drop** OR **Choose files**:
   - index.html
   - style.css
   - script.js
   - flood_risk_data.geojson

3. **Scroll down** to "Commit changes" section

4. **Add commit message**: "Initial commit - Flood risk mapping system"

5. **Click**: "Commit changes"

### Method 2: Upload via Git Command Line (Advanced)

```bash
# Navigate to your project folder
cd path/to/your/project

# Initialize git
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit"

# Add remote repository
git remote add origin https://github.com/YOUR-USERNAME/flood-risk-mapping.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 🚀 STEP 4: ENABLE GITHUB PAGES

1. **Go to your repository** on GitHub

2. **Click "Settings"** tab (top menu)

3. **Scroll down** and click "Pages" in the left sidebar

4. **Under "Source"**:
   - Branch: Select "main"
   - Folder: Select "/ (root)"
   - Click "Save"

5. **Wait 2-3 minutes** for deployment

6. **Refresh the page** - You'll see a message:
   ```
   Your site is live at https://YOUR-USERNAME.github.io/flood-risk-mapping/
   ```

7. **Click the link** to view your live website!

---

## ✅ STEP 5: VERIFY YOUR DEPLOYMENT

### Check if Everything Works:

1. ✅ **Map loads properly** - You should see an interactive map of India
2. ✅ **Districts are colored** - Red, Orange, or Green based on risk
3. ✅ **Click on districts** - Popup shows district name and risk level
4. ✅ **Legend is visible** - Bottom right corner
5. ✅ **Info panel shows** - Top left corner
6. ✅ **Responsive on mobile** - Test on your phone

### If Map Doesn't Load:

**Open Browser Console** (Press F12, go to "Console" tab)

**Common Errors:**

1. **"GeoJSON file not found"**
   - Solution: Make sure `flood_risk_data.geojson` is in the root folder
   - Check the filename spelling exactly

2. **"Failed to fetch"**
   - Solution: Wait 5-10 minutes after enabling GitHub Pages
   - Clear browser cache (Ctrl + Shift + R)

3. **Map shows but no districts**
   - Solution: Check your GeoJSON file format
   - Verify property names match the script

4. **Districts show wrong colors**
   - Solution: Check risk_level values in GeoJSON
   - Must be exactly: "High", "Medium", or "Low"

---

## 🔄 STEP 6: UPDATE YOUR GEOJSON (After Deployment)

When you have your actual QGIS data ready:

1. **Go to your repository** on GitHub
2. **Click on** `flood_risk_data.geojson`
3. **Click the pencil icon** (Edit this file)
4. **Delete dummy content** and **paste your actual GeoJSON**
5. **Scroll down** and click "Commit changes"
6. **Wait 1-2 minutes** for changes to go live
7. **Refresh your website** (Ctrl + Shift + R to hard refresh)

---

## 🎯 STEP 7: CUSTOMIZE YOUR PROJECT

### Change Title and Description:
Edit `index.html`:
```html
<h1>🌊 Your Custom Title</h1>
<p>Your custom description</p>
```

### Change Colors:
Edit `style.css` - find these classes:
```css
.high-risk {
    background-color: #e74c3c; /* Change this color */
}
```

### Add More Information:
Edit the info panel in `index.html` to add your college name, project guide, etc.

---

## 📱 SHARING YOUR PROJECT

### Your Live Website URL:
```
https://YOUR-USERNAME.github.io/flood-risk-mapping/
```

**Example:**
If your GitHub username is "john123" and repository is "flood-risk-mapping":
```
https://john123.github.io/flood-risk-mapping/
```

### Share This Link:
- ✅ In your project report
- ✅ On your resume
- ✅ To your professor
- ✅ On social media
- ✅ In project presentations

---

## 🎓 EXPLAINING TO YOUR PROFESSOR

### Key Points to Mention:

1. **Technology Stack:**
   - "I used HTML, CSS, and JavaScript for the frontend"
   - "Leaflet.js library for interactive map rendering"
   - "GeoJSON format for spatial data integration"

2. **Data Processing:**
   - "Performed weighted overlay analysis in QGIS"
   - "Reclassified risk factors on 1-5 scale"
   - "Exported final results as GeoJSON for web visualization"

3. **Deployment:**
   - "Hosted on GitHub Pages - a free, reliable hosting service"
   - "Website is live and accessible 24/7"
   - "No server maintenance required"

4. **Features Implemented:**
   - "Interactive map with zoom and pan functionality"
   - "Color-coded districts based on flood risk"
   - "Click-based popups showing district-wise information"
   - "Responsive design - works on mobile and desktop"
   - "Legend and information panels for user guidance"

---

## 🔒 MAKING YOUR SITE MORE PROFESSIONAL

### Add Custom Domain (Optional):
1. Buy a domain (e.g., from Namecheap, GoDaddy)
2. In repository Settings → Pages → Custom domain
3. Add your domain and configure DNS

### Add Google Analytics (Optional):
1. Create Google Analytics account
2. Get tracking code
3. Add to `index.html` before `</head>` tag

---

## 🛠️ TROUBLESHOOTING

### Problem: Changes not showing after update
**Solution:**
- Hard refresh: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
- Clear browser cache
- Wait 2-3 minutes for GitHub to rebuild

### Problem: Map not centering on India
**Solution:**
- Edit script.js, line 15
- Adjust coordinates: `[latitude, longitude]`
- For India: `[20.5937, 78.9629]`

### Problem: GeoJSON too large (over 25MB)
**Solution:**
- Simplify geometry in QGIS (Vector → Geometry Tools → Simplify)
- Reduce precision of coordinates
- Split into multiple files by state

---

## 📞 GETTING HELP

If you face issues:
1. Check browser console (F12) for error messages
2. Verify all filenames match exactly (case-sensitive)
3. Compare your GeoJSON structure with the sample
4. Make sure all files are in the root directory

---

## ✨ BONUS TIPS

1. **Add a README.md** to your repository explaining your project
2. **Take screenshots** of your map for reports and presentations
3. **Document your methodology** in the info panel
4. **Add your name** and college details in the footer
5. **Version control**: Commit changes with clear messages

---

## 🎉 SUCCESS CHECKLIST

- [ ] GitHub account created
- [ ] Repository created and set to Public
- [ ] All 4 files uploaded (HTML, CSS, JS, GeoJSON)
- [ ] GitHub Pages enabled
- [ ] Website is live and accessible
- [ ] Map loads correctly
- [ ] Districts are colored properly
- [ ] Popups work on click
- [ ] Tested on mobile device
- [ ] Shared link with professor

---

**Congratulations! Your flood risk mapping system is now live! 🎊**

Your website URL: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

---

*Need to update? Just edit files on GitHub and commit changes!*
