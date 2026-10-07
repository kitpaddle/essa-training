// Adds the SVEA sector frequency "button" features (quiz-only, no geometry) to
// essa_svea_sectors.geojson, same shape/pattern as essa_airfield_aor.geojson's button features.
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'essa_svea_sectors.geojson');
const fc = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Drop any previously-generated frequency buttons before regenerating
fc.features = fc.features.filter(f => f.properties.category !== 'button');

const frequencies = [
  { aor: 'ARR-E', name: '126.655', parentSector: 'E' },
  { aor: 'DEP-E', name: '130.330', parentSector: 'E' },
  { aor: 'DIR-E', name: '120.505', parentSector: 'E' },
  { aor: 'ARR-W', name: '123.755', parentSector: 'W' },
  { aor: 'DEP-W', name: '119.630', parentSector: 'W' },
  { aor: 'DIR-W', name: '124.105', parentSector: 'W' },
];

const buttonFeatures = frequencies.map(f => ({
  type: 'Feature',
  properties: {
    aor: f.aor,
    category: 'button',
    name: f.name,
    parentSector: f.parentSector,
  },
  geometry: null,
}));

fc.features.push(...buttonFeatures);
fs.writeFileSync(filePath, JSON.stringify(fc, null, 2));
console.log('Updated', filePath, '- now', fc.features.length, 'features total (+', buttonFeatures.length, 'frequency buttons)');
