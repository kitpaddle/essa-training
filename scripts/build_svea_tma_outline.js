// Builds the overall TMA outline: union of the 4 parent sectors (W/E/D/S) plus an eastern
// extension patch (2 brand-new far points + 2 points snapped onto the existing boundary),
// and appends it as one more feature ("TMA") to essa_svea_sectors.geojson.
const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const filePath = path.join(__dirname, '..', 'essa_svea_sectors.geojson');
const fc = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Drop a previously-generated TMA feature before regenerating
fc.features = fc.features.filter(f => f.properties.ID !== 'TMA');

function altToFeet(label) {
  if (label === 'GND') return 0;
  const m = label.match(/^([AF]L?)(\d+)$/);
  if (!m) throw new Error('Unrecognized altitude label: ' + label);
  return parseInt(m[2], 10) * 100;
}

const subSectors = fc.features.filter(f => f.properties.parentSector); // the 15 W1../E1../D1../S1.. features
const parentSectors = fc.features.filter(f => f.properties.parentSector === '' && ['W', 'E', 'D', 'S'].includes(f.properties.ID));

// Union the 4 parent outlines into one core shape
let core = parentSectors[0];
for (let i = 1; i < parentSectors.length; i++) core = turf.union(turf.featureCollection([core, parentSectors[i]]));

// Anchor points given by the user for the eastern extension; the 1st/4th were approximate
// and get snapped onto the nearest actual vertex of the core outline.
const ring = core.geometry.coordinates[0];
function nearestVertex(pt) {
  let best = null, bestD = Infinity;
  for (const c of ring) {
    const d = turf.distance(turf.point(pt), turf.point(c));
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
const given1 = [19.0600209, 59.3594662];
const given4 = [18.8691358, 59.9631824];
const p1 = nearestVertex(given1); // snaps essentially exactly
const p4 = nearestVertex(given4); // snaps to nearest existing vertex
const p2 = [19.8465732, 59.5375514]; // accurate as given
const p3 = [19.2262446, 60.042698]; // accurate as given

const patch = turf.polygon([[p1, p2, p3, p4, p1]]);
let full = turf.union(turf.featureCollection([core, patch]));

if (full.geometry.type !== 'Polygon') {
  throw new Error('Expected a single Polygon result, got ' + full.geometry.type);
}

// Western extension: anchors snap onto the outline produced above (which already includes
// the eastern extension), new far points used as given.
const ring2 = full.geometry.coordinates[0];
function nearestVertex2(pt) {
  let best = null, bestD = Infinity;
  for (const c of ring2) {
    const d = turf.distance(turf.point(pt), turf.point(c));
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
const wGiven1 = [16.6363423, 59.0921085];
const wGiven4 = [16.8852119, 59.9376392];
const wP1 = nearestVertex2(wGiven1);
const wP4 = nearestVertex2(wGiven4);
const wP2 = [16.3135973, 59.2192107]; // accurate as given
const wP3 = [16.4123168, 59.8162769]; // accurate as given

const westPatch = turf.polygon([[wP1, wP2, wP3, wP4, wP1]]);
full = turf.union(turf.featureCollection([full, westPatch]));

if (full.geometry.type !== 'Polygon') {
  throw new Error('Expected a single Polygon result after western extension, got ' + full.geometry.type);
}

// turf.union can leave tiny degenerate "sliver" holes where unioned polygon edges don't
// align to floating-point precision. The TMA outline should be one simple ring with no
// holes, so drop any interior rings here rather than rendering them as stray lines.
if (full.geometry.coordinates.length > 1) {
  console.log('Dropping', full.geometry.coordinates.length - 1, 'degenerate interior ring(s) from union artifacts');
  full.geometry.coordinates = [full.geometry.coordinates[0]];
}

let minLabel = subSectors[0].properties.minAlt;
let maxLabel = subSectors[0].properties.maxAlt;
for (const s of subSectors) {
  if (altToFeet(s.properties.minAlt) < altToFeet(minLabel)) minLabel = s.properties.minAlt;
  if (altToFeet(s.properties.maxAlt) > altToFeet(maxLabel)) maxLabel = s.properties.maxAlt;
}

const tmaFeature = {
  type: 'Feature',
  properties: {
    ID: 'TMA',
    minAlt: minLabel,
    maxAlt: maxLabel,
    parentSector: '',
  },
  geometry: full.geometry,
};

fc.features.push(tmaFeature);
fs.writeFileSync(filePath, JSON.stringify(fc, null, 2));
console.log('Updated', filePath, '- now', fc.features.length, 'features total');
console.log('TMA', tmaFeature.properties.minAlt + '-' + tmaFeature.properties.maxAlt, 'vertices=' + full.geometry.coordinates[0].length);
