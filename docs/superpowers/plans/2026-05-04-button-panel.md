# Button Panel for Non-Geographic Test Items — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace off-map fake GeoJSON rectangles with a proper button panel overlaid at the bottom of the map, fully integrated with the existing knowledge test.

**Architecture:** GeoJSON features with `category: "button"` are filtered out of Leaflet map rendering and instead rendered as HTML buttons in a `#button-panel` div overlaid on the map. In normal mode buttons show `"[sector] — [freq]"`; in test mode they show only `"[freq]"` and the question format changes from `"Where is X?"` to `"What is the frequency of X?"`. Button clicks call the same `testClick()` as map clicks.

**Tech Stack:** Vanilla JS, Leaflet.js 1.7.1, plain CSS, GeoJSON. No build step — open `index.html` via a local HTTP server to test (e.g. `python -m http.server 8080`).

---

## File Map

| File | Change |
|------|--------|
| `essa_airfield_aor.geojson` | Replace 4×2 label/other pairs with 4 `"button"` entries |
| `essa_tma_points.geojson` | Replace 6×2 label/other pairs with 6 `"button"` entries |
| `index.html` | Add `#button-panel` div inside `#map` |
| `style.css` | Add `position: relative` to `#map`, add `#button-panel` and `.panel-button` styles |
| `script.js` | Simplify handlers, update filters, collect button data, add panel functions, update test flow |

---

### Task 1: Simplify JS handlers and update Leaflet filters

**Files:**
- Modify: `script.js`

This makes the JS ready for the updated GeoJSON. Do this first so the app still works while the GeoJSON still has the old entries — the old "label" and "other" features will just keep rendering as before until Task 2 swaps them out.

- [ ] **Step 1: Replace `onEachVfrPoint` (lines 320–361)**

The existing function has three branches: `"label"`, `"other"`, and normal. With the GeoJSON cleanup, only normal navigation point features will reach Leaflet. Replace the entire function with:

```javascript
function onEachVfrPoint(feature, layer){
  let html;
  if(feature.properties.description != undefined){
    html = '<div class="tooltip"><b>'+feature.properties.name+'</b><br>'+feature.properties.description+'</div>';
  } else {
    html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>';
  }
  layer.bindTooltip(html, {permanent: false, direction: 'top'});
  layer.on('click', function(){
    testClick(feature.properties.name);
  });
}
```

- [ ] **Step 2: Replace `onEachAoR` (lines 363–393)**

The existing function has two branches: `"label"` (transparent tooltip) and clickable. Only real AoR polygons will reach Leaflet after the GeoJSON update. Replace the entire function with:

```javascript
function onEachAoR(feature, layer){
  let html = '<div class="tooltip"><b>'+feature.properties.aor+'</b><br>Frequency: '+feature.properties.name+'</div>';
  layer.bindTooltip(html, {permanent: false, direction: 'top'});
  layer.on('mouseover', function () {
    this.setStyle({color: 'orange', weight: 7});
  });
  layer.on('mouseout', function () {
    this.setStyle({color: 'black', weight: 4});
  });
  layer.on('click', function(){
    testClick(String(feature.properties.name));
  });
}
```

Note: `String()` coerces numeric frequency values (some are stored as JS numbers in the GeoJSON, e.g. `118.505`) to string so `testClick` comparisons work consistently.

- [ ] **Step 3: Update the AoR Leaflet filter (inside the `essa_airfield_aor.geojson` fetch, ~line 551)**

Find these two `L.geoJSON()` calls and update their `filter` functions:

```javascript
layerAirfieldAorLabel = L.geoJSON(dataAirfieldAor, {
  onEachFeature: onEachAoR,
  style: {color: 'black', weight: 4},
  filter: function(feature) {
    return feature.properties.category === 'label';
  }
});
layerAirfieldAor = L.geoJSON(dataAirfieldAor, {
  onEachFeature: onEachAoR,
  style: {color: 'black', weight: 4},
  filter: function(feature) {
    return feature.properties.category !== 'label'
        && feature.properties.category !== 'button';
  }
});
```

- [ ] **Step 4: Update the TMA Leaflet filter (inside the `essa_tma_points.geojson` fetch, ~line 437)**

Find the two `L.geoJSON()` calls and update their `filter` functions:

```javascript
layerTMAPointsLabel = L.geoJSON(dataTMAPoints, {
  onEachFeature: onEachVfrPoint,
  style: {color: 'black', weight: 3},
  filter: function(feature) {
    return feature.properties.category === 'label';
  }
});
layerTMAPoints = L.geoJSON(dataTMAPoints, {
  onEachFeature: onEachVfrPoint,
  style: {color: 'black', weight: 3},
  filter: function(feature) {
    return feature.properties.category !== 'label'
        && feature.properties.category !== 'button';
  },
  pointToLayer: function (feature, latlng) {
    switch(feature.properties.TYPEOFPOINT){
      case 'DNPT': return L.marker(latlng, {icon: iconVfrPoint});
      case 'NDB':  return L.marker(latlng, {icon: iconVfrDme});
      case 'DMEV': return L.marker(latlng, {icon: iconVfrDme});
    }
  }
});
```

- [ ] **Step 5: Verify no errors**

Start a local server and open the app:
```
cd C:\Users\kit_p\Documents\essa-training
python -m http.server 8080
```
Open http://localhost:8080. Open DevTools console (F12). No errors. Layers 1–9 all still work. The fake rectangles still show on layer 6 and 9 (that's fine, GeoJSON hasn't changed yet).

- [ ] **Step 6: Commit**

```bash
git add script.js
git commit -m "refactor: simplify AoR/VfrPoint handlers and update Leaflet filters for button category"
```

---

### Task 2: Update GeoJSON files

**Files:**
- Modify: `essa_airfield_aor.geojson`
- Modify: `essa_tma_points.geojson`

- [ ] **Step 1: Edit `essa_airfield_aor.geojson`**

Delete all features with `"category": "label"` or `"category": "other"` (the last 8 entries in the file). Replace them with these 4 entries before the closing `]` of the features array:

```json
    {
      "type": "Feature",
      "properties": { "aor": "CD", "category": "button", "name": "121.830" },
      "geometry": null
    },
    {
      "type": "Feature",
      "properties": { "aor": "Rescue Channel", "category": "button", "name": "123.100" },
      "geometry": null
    },
    {
      "type": "Feature",
      "properties": { "aor": "ATIS ARR", "category": "button", "name": "119.005" },
      "geometry": null
    },
    {
      "type": "Feature",
      "properties": { "aor": "ATIS DEP", "category": "button", "name": "121.630" },
      "geometry": null
    }
```

The file should now have 10 features total: 6 real AoR polygons (ids 0–5) followed by 4 button entries.

- [ ] **Step 2: Edit `essa_tma_points.geojson`**

Delete all features with `"category": "label"` or `"category": "other"` (the last 12 entries — the blocks for DEP-W, ARR-W, DEP-E, ARR-E, DIR, APP-S in both label and other flavours). Replace them with these 6 entries:

```json
    {
      "type": "Feature",
      "properties": { "aor": "DEP-W", "category": "button", "name": "124.105" },
      "geometry": null
    },
    {
      "type": "Feature",
      "properties": { "aor": "ARR-W", "category": "button", "name": "123.755" },
      "geometry": null
    },
    {
      "type": "Feature",
      "properties": { "aor": "DEP-E", "category": "button", "name": "130.330" },
      "geometry": null
    },
    {
      "type": "Feature",
      "properties": { "aor": "ARR-E", "category": "button", "name": "126.655" },
      "geometry": null
    },
    {
      "type": "Feature",
      "properties": { "aor": "DIR", "category": "button", "name": "120.505" },
      "geometry": null
    },
    {
      "type": "Feature",
      "properties": { "aor": "APP-S", "category": "button", "name": "120.155" },
      "geometry": null
    }
```

The file should now have 33 features: 27 real navigation point features + 6 button entries.

- [ ] **Step 3: Verify GeoJSON is valid and layers load**

Hard-refresh http://localhost:8080 (Ctrl+Shift+R). Check the console — no errors. Click layer 6 (Frequencies): the off-map fake rectangles are gone, the real AoR polygons on the airfield still render. Click layer 9 (TMA Significant Points): fake rectangles gone, real navigation point markers still render.

- [ ] **Step 4: Commit**

```bash
git add essa_airfield_aor.geojson essa_tma_points.geojson
git commit -m "feat: replace fake off-map rectangles with button category entries in GeoJSON"
```

---

### Task 3: Add HTML and CSS for the button panel

**Files:**
- Modify: `index.html`
- Modify: `style.css`

- [ ] **Step 1: Add `#button-panel` inside `#map` in `index.html`**

Change line 18 from:
```html
  <div id='map'></div>
```
To:
```html
  <div id='map'>
    <div id="button-panel"></div>
  </div>
```

- [ ] **Step 2: Add styles to `style.css`**

Append to the end of `style.css`:

```css
#map {
  position: relative;
}

#button-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: none;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px;
  background-color: rgba(40, 40, 40, 0.85);
}

.panel-button {
  width: auto;
  height: 28px;
  padding: 0 12px;
  flex-shrink: 0;
}
```

`position: relative` on `#map` anchors the absolutely-positioned panel inside it. `z-index: 1000` places it above Leaflet's tile layers (which use z-index up to ~600). `display: none` hides it by default — JS will set it to `flex` when active.

- [ ] **Step 3: Verify CSS is valid**

Hard-refresh http://localhost:8080. No errors in console. Panel not yet visible (JS wiring comes next).

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: add button panel HTML structure and CSS"
```

---

### Task 4: JS — collect button data and wire up the panel

**Files:**
- Modify: `script.js`

After this task the panel will appear in normal (non-test) mode when layers 6 or 9 are active.

- [ ] **Step 1: Add three global variables**

After the existing variable block near the top of `script.js` (around line 102, after `let testPoints = 0;`), add:

```javascript
let buttonDataAor = [];
let buttonDataTMA = [];
let currentButtonData = [];
```

- [ ] **Step 2: Collect button features in the AoR fetch**

In the AoR fetch callback (around line 547), immediately after the line `dataAirfieldAor = data;`, add:

```javascript
buttonDataAor = data.features.filter(function(f) {
  return f.properties.category === 'button';
});
```

- [ ] **Step 3: Collect button features in the TMA fetch**

In the TMA fetch callback (around line 434), immediately after the line `dataTMAPoints = data;`, add:

```javascript
buttonDataTMA = data.features.filter(function(f) {
  return f.properties.category === 'button';
});
```

- [ ] **Step 4: Add `buildButtonPanel` and `showButtonPanel` functions**

Add these two functions immediately after the `moveMap` function (around line 834):

```javascript
function buildButtonPanel(buttonData) {
  const panel = document.getElementById('button-panel');
  panel.innerHTML = '';
  buttonData.forEach(function(feature) {
    const btn = document.createElement('button');
    btn.className = 'pButton panel-button';
    btn.dataset.name = String(feature.properties.name);
    btn.dataset.aor = feature.properties.aor;
    btn.textContent = feature.properties.aor + ' — ' + feature.properties.name;
    btn.onclick = function() { testClick(String(feature.properties.name)); };
    panel.appendChild(btn);
  });
}

function showButtonPanel(show) {
  document.getElementById('button-panel').style.display = show ? 'flex' : 'none';
}
```

`—` is an em dash (—). `String()` converts numeric frequency values to strings.

- [ ] **Step 5: Update `mapButton` to manage the panel**

In `mapButton(nr)`, find the block of `map.removeLayer(...)` calls (around line 749). Immediately after the last `map.removeLayer(...)` and before the `switch (nr)` statement, add:

```javascript
showButtonPanel(false);
currentButtonData = [];
```

Then replace the existing `case 6:` and `case 9:` blocks in the switch statement with:

```javascript
case 6:
  selectedLayer = layerGroupAirfieldAor;
  layerGroupAirfieldAor.addTo(map);
  qsize = layerAirfieldAor.getLayers().length + buttonDataAor.length;
  currentButtonData = buttonDataAor;
  buildButtonPanel(buttonDataAor);
  showButtonPanel(true);
  moveMap(layerAirfieldAor);
  break;
case 9:
  selectedLayer = layerGroupTMAPoints;
  layerGroupTMAPoints.addTo(map);
  layerGroupSectors.addTo(map);
  qsize = layerTMAPoints.getLayers().length + buttonDataTMA.length;
  currentButtonData = buttonDataTMA;
  buildButtonPanel(buttonDataTMA);
  showButtonPanel(true);
  moveMap(layerTMAPoints);
  break;
```

- [ ] **Step 6: Verify the panel appears correctly**

Hard-refresh http://localhost:8080.
- Click "Frequencies" (button 6): a dark translucent bar appears at the bottom of the map showing `[ CD — 121.830 ]  [ Rescue Channel — 123.100 ]  [ ATIS ARR — 119.005 ]  [ ATIS DEP — 121.630 ]`.
- Click "TMA Significant Points" (button 9): bar shows `[ DEP-W — 124.105 ]  [ ARR-W — 123.755 ]  [ DEP-E — 130.330 ]  [ ARR-E — 126.655 ]  [ DIR — 120.505 ]  [ APP-S — 120.155 ]`.
- Click any other layer button: bar disappears.

- [ ] **Step 7: Commit**

```bash
git add script.js
git commit -m "feat: wire up button panel — shows for layers 6 and 9 with sector and frequency labels"
```

---

### Task 5: JS — test mode behaviour

**Files:**
- Modify: `script.js`

After this task the full test flow works: button items are tested alongside map features, question format adapts, and button labels switch during the test.

- [ ] **Step 1: Add `updateQuestion` helper**

Add this function immediately after `showButtonPanel`:

```javascript
function updateQuestion() {
  const current = testArray[testProgress];
  const isButton = current.feature.properties.category === 'button';
  const question = isButton
    ? 'What is the frequency of ' + current.feature.properties.aor + '?'
    : 'Where is ' + current.feature.properties.name + '?';
  document.getElementById('questions').innerHTML = 'Question: ' + (testProgress + 1) + '/' + qsize;
  document.getElementById('tq').innerHTML = question;
}
```

- [ ] **Step 2: Add `setButtonPanelTestMode` helper**

Add this function immediately after `updateQuestion`:

```javascript
function setButtonPanelTestMode(isTest) {
  document.querySelectorAll('.panel-button').forEach(function(btn) {
    btn.textContent = isTest
      ? btn.dataset.name
      : btn.dataset.aor + ' — ' + btn.dataset.name;
  });
}
```

- [ ] **Step 3: Update `timerButton` — test start path**

In the `if(!testing)` branch of `timerButton`, find these lines (around line 875):

```javascript
testArray = shuffleArray(testArray);
console.log("Testing: "+ testArray[testProgress].feature.properties.name);
document.getElementById('tq').innerHTML = "Where is "+testArray[testProgress].feature.properties.name+" ?";
document.getElementById('answers').innerHTML = "Correct answers: 0/"+qsize;
```

Replace them with:

```javascript
currentButtonData.forEach(function(feature) {
  testArray.push({ feature: feature });
});
testArray = shuffleArray(testArray);
setButtonPanelTestMode(true);
document.getElementById('answers').innerHTML = 'Correct answers: 0/' + qsize;
updateQuestion();
```

Also find and remove this line from earlier in the same branch (it's now handled by `updateQuestion`):
```javascript
document.getElementById("questions").innerHTML = "Question: 1/"+qsize;
```

- [ ] **Step 4: Update `timerButton` — test stop path**

In the `else` branch of `timerButton`, find:
```javascript
document.getElementById('ttip').disabled = false;
```

Add `setButtonPanelTestMode(false)` immediately after it:

```javascript
document.getElementById('ttip').disabled = false;
setButtonPanelTestMode(false);
```

- [ ] **Step 5: Update `testClick` to use `updateQuestion`**

In `testClick`, find the `else` block that advances the question (around line 913):

```javascript
testProgress++;
console.log("Testing: "+ testArray[testProgress].feature.properties.name + " "+testArray[testProgress].feature.properties.category);
document.getElementById('questions').innerHTML = "Question: "+(testProgress+1) +"/"+qsize;
document.getElementById('tq').innerHTML = "Where is "+testArray[testProgress].feature.properties.name+" ?";
```

Replace with:

```javascript
testProgress++;
updateQuestion();
```

- [ ] **Step 6: Full test verification**

Hard-refresh http://localhost:8080.

**Layer 6 — Frequencies:**
1. Click "Frequencies". Panel shows `[ CD — 121.830 ] ...`
2. Click "Start Test". Panel buttons switch to `[ 121.830 ] [ 123.100 ] [ 119.005 ] [ 121.630 ]`.
3. Questions alternate between "Where is [frequency]?" (for AoR polygon features — click the correct polygon on the map) and "What is the frequency of [sector]?" (for button features — click the correct frequency button).
4. Correct answers increment the score. Wrong clicks still advance the question.
5. After all questions: "Test complete!" Panel buttons restore to `[ CD — 121.830 ] ...`.

**Layer 9 — TMA Significant Points:**
1. Click "TMA Significant Points". Panel shows `[ DEP-W — 124.105 ] ...`
2. Click "Start Test". Mixed test: map marker questions ("Where is RESNA?") and frequency questions ("What is the frequency of ARR-W?").
3. Verify both types work correctly through several cycles.

**Other layers:**
1. Click "Stands", start test — works exactly as before, no panel.

- [ ] **Step 7: Commit**

```bash
git add script.js
git commit -m "feat: integrate button items into knowledge test with adaptive question format"
```

---

## Self-Review

**Spec coverage:**
- §1 GeoJSON cleanup → Task 2 ✓
- §2 Panel UI (placement, normal mode labels, test mode labels, button click) → Tasks 3, 4, 5 ✓
- §3 Filter change, button data collection, `buildButtonPanel`, `qsize` update, handler simplification → Tasks 1, 4 ✓
- §4 `testArray` population, `updateQuestion`, `setButtonPanelTestMode` → Task 5 ✓

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code blocks are complete.

**Type consistency:**
- `buttonDataAor`, `buttonDataTMA`, `currentButtonData` declared in Task 4 step 1, used in Tasks 4–5 ✓
- `buildButtonPanel(buttonData)` defined in Task 4 step 4, called in Task 4 step 5 ✓
- `showButtonPanel(show)` defined in Task 4 step 4, called in Tasks 4 and 5 ✓
- `updateQuestion()` defined in Task 5 step 1, called in Tasks 5 steps 3 and 5 ✓
- `setButtonPanelTestMode(isTest)` defined in Task 5 step 2, called in Task 5 steps 3 and 4 ✓
- `btn.dataset.name` and `btn.dataset.aor` set in `buildButtonPanel`, read in `setButtonPanelTestMode` ✓
