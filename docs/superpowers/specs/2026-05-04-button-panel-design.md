# Button Panel for Non-Geographic Test Items

**Date:** 2026-05-04  
**Status:** Approved

## Problem

Two layers — Airport Frequencies (button 6) and TMA Points (button 9) — contain non-geographic items that have no meaningful location on the map. These were hacked as fake off-map rectangles duplicated as `"label"` + `"other"` GeoJSON pairs. This is fragile and confusing to maintain.

## Solution

Replace fake rectangles with a button panel overlaid at the bottom of the map. The GeoJSON remains the source of truth for all data, but items marked `category: "button"` are routed to the panel instead of the map.

---

## 1. GeoJSON Changes

### Affected files
- `essa_airfield_aor.geojson` — items: CD, Rescue Channel, ATIS ARR, ATIS DEP
- `essa_tma_points.geojson` — items: DEP-W, ARR-W, DEP-E, ARR-E, DIR, APP-S

### Change per item
Replace the `"label"` + `"other"` pair (two entries, same fake rectangle geometry) with a single entry:

```json
{
  "type": "Feature",
  "properties": {
    "aor": "CD",
    "category": "button",
    "name": "121.830"
  },
  "geometry": null
}
```

- `aor` = sector/station name (displayed on button in normal mode)
- `name` = frequency (displayed on button in test mode; used as answer key)
- `geometry: null` = valid GeoJSON, signals no map rendering

Real geographic features (AoR polygons, navigation points) are untouched.

---

## 2. UI: Button Panel

A `<div id="button-panel">` positioned absolute at the bottom of the map container (`#map`). Hidden by default, shown only when layer 6 or layer 9 is active.

**Normal mode** — buttons show sector name and frequency:
```
[ CD — 121.830 ]  [ Rescue — 123.100 ]  [ ATIS ARR — 119.005 ]  [ ATIS DEP — 121.630 ]
```

**Test mode** — buttons show frequency only, question format changes:
```
Question: "What is the frequency of CD?"
[ 121.830 ]  [ 123.100 ]  [ 119.005 ]  [ 121.630 ]
```

Clicking a button always calls `testClick(feature.properties.name)` — identical to clicking a map feature.

Style follows existing UI conventions (consistent with `.pButton` style).

---

## 3. JS: Layer Loading Changes

### Filter change
All `L.geoJSON()` calls that currently filter out `category == "label"` must also filter out `category == "button"`, preventing null-geometry features from reaching Leaflet:

```javascript
filter: function(feature) {
  return feature.properties.category !== "label" 
      && feature.properties.category !== "button";
}
```

### Button data collection
During each GeoJSON fetch, collect `"button"` features into a dedicated array:
- `buttonDataAor` — for layer 6 (Airport Frequencies)
- `buttonDataTMA` — for layer 9 (TMA Points)

### Panel population
A `buildButtonPanel(buttonData)` function generates button elements from the collected data and injects them into `#button-panel`. Called from `mapButton()` when layers 6 or 9 are activated.

### `qsize` update
```javascript
// Layer 6 example
qsize = layerAirfieldAor.getLayers().length + buttonDataAor.length;

// Layer 9 example  
qsize = layerTMAPoints.getLayers().length + buttonDataTMA.length;
```

### Code simplification
`onEachAoR` and `onEachVfrPoint` can have their `"label"` and `"other"` branches removed — those features no longer exist on the map.

---

## 4. JS: Test Flow Changes

### Building `testArray`
After the existing `eachLayer()` loop, push button items as plain objects matching the Leaflet layer structure:

```javascript
buttonDataAor.forEach(function(feature) {
  testArray.push({ feature: feature });
});
```

These are shuffled together with map items by the existing `shuffleArray()`.

### Question format
In `timerButton()` and `testClick()`, check the current item's category:

```javascript
const current = testArray[testProgress];
const isButton = current.feature.properties.category === "button";
const question = isButton
  ? "What is the frequency of " + current.feature.properties.aor + "?"
  : "Where is " + current.feature.properties.name + "?";
document.getElementById('tq').innerHTML = question;
```

### Button label switching
- **Test start**: update each button to show only `feature.properties.name` (frequency)
- **Test end**: restore buttons to show `feature.properties.aor + " — " + feature.properties.name`

This is handled in `timerButton()` alongside the existing tooltip show/hide logic.

---

## Out of Scope

- SIDs layer and separation minima test (separate future feature)
- Any changes to other layers (runways, stands, VFR points, etc.)
