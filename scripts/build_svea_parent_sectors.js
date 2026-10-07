// Unions each parent sector's (W/E/D/S) sub-sector polygons into a single outline feature
// per parent, reading from essa_svea_sectors.geojson (produced by build_svea_sectors.js).
const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const filePath = path.join(__dirname, '..', 'essa_svea_sectors.geojson');

const fc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
// Drop any previously-generated parent features (ID W/E/D/S with blank parentSector) before regenerating
fc.features = fc.features.filter(f => !(f.properties.parentSector === '' && ['W', 'E', 'D', 'S'].includes(f.properties.ID)));

function altToFeet(label) {
  if (label === 'GND') return 0;
  const m = label.match(/^([AF]L?)(\d+)$/); // matches "A35" or "FL245"
  if (!m) throw new Error('Unrecognized altitude label: ' + label);
  return parseInt(m[2], 10) * 100;
}

const groups = {};
for (const f of fc.features) {
  const p = f.properties.parentSector;
  (groups[p] = groups[p] || []).push(f);
}

const parentFeatures = Object.keys(groups).sort().map(parent => {
  const members = groups[parent];

  // Union all sub-sector polygons for this parent into one outline geometry
  let unioned = members[0];
  for (let i = 1; i < members.length; i++) {
    unioned = turf.union(turf.featureCollection([unioned, members[i]]));
  }

  // Overall vertical extent: lowest minAlt and highest maxAlt among the sub-sectors
  let minLabel = members[0].properties.minAlt;
  let maxLabel = members[0].properties.maxAlt;
  for (const m of members) {
    if (altToFeet(m.properties.minAlt) < altToFeet(minLabel)) minLabel = m.properties.minAlt;
    if (altToFeet(m.properties.maxAlt) > altToFeet(maxLabel)) maxLabel = m.properties.maxAlt;
  }

  return {
    type: 'Feature',
    properties: {
      ID: parent,
      minAlt: minLabel,
      maxAlt: maxLabel,
      parentSector: '',
    },
    geometry: unioned.geometry,
  };
});

fc.features.push(...parentFeatures);
fs.writeFileSync(filePath, JSON.stringify(fc, null, 2));
console.log('Updated', filePath, '- now', fc.features.length, 'features total (15 sub-sectors + 4 parent outlines)');
for (const f of parentFeatures) {
  console.log(f.properties.ID, f.geometry.type, f.properties.minAlt + '-' + f.properties.maxAlt);
}
