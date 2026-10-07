// One-off script to convert the SVEA sector tables (transcribed from SVEA_sektorer.png)
// into a GeoJSON FeatureCollection of sector polygons.
const fs = require('fs');
const path = require('path');

function dmsToDecimal(str) {
  // e.g. "601529N0174941E" -> lat DDMMSS + hemisphere, lon DDDMMSS + hemisphere
  const m = str.match(/^(\d{2})(\d{2})(\d{2})([NS])(\d{3})(\d{2})(\d{2})([EW])$/);
  if (!m) throw new Error('Bad coordinate: ' + str);
  const [, latD, latM, latS, latH, lonD, lonM, lonS, lonH] = m;
  let lat = (+latD) + (+latM) / 60 + (+latS) / 3600;
  let lon = (+lonD) + (+lonM) / 60 + (+lonS) / 3600;
  if (latH === 'S') lat = -lat;
  if (lonH === 'W') lon = -lon;
  return [+lon.toFixed(6), +lat.toFixed(6)];
}

const sectors = [
  { id: 'W1', parentSector: 'W', minAlt: 'GND', maxAlt: 'FL245', coords: [
    '601529N0174941E','600954N0180215E','600921N0180728E','593902N0175619E','593411N0172438E',
    '592701N0170647E','592708N0165710E','592717N0164049E','595620N0165328E','601358N0173548E','601529N0174941E'
  ]},
  { id: 'W2', parentSector: 'W', minAlt: 'GND', maxAlt: 'FL95', coords: [
    '601529N0174941E','601758N0181247E','600921N0180728E','600954N0180215E','601529N0174941E'
  ]},
  { id: 'E1', parentSector: 'E', minAlt: 'GND', maxAlt: 'FL245', coords: [
    '600921N0180728E','600526N0184419E','595654N0185308E','595354N0185610E','593934N0190434E',
    '593239N0190409E','592742N0184316E','590901N0184239E','592052N0175751E','592416N0175108E',
    '593902N0175619E','600921N0180728E'
  ]},
  { id: 'E2', parentSector: 'E', minAlt: 'FL65', maxAlt: 'FL245', coords: [
    '592416N0175108E','592052N0175751E','590901N0184239E','590001N0184233E','591458N0174448E','592416N0175108E'
  ]},
  { id: 'E3', parentSector: 'E', minAlt: 'FL105', maxAlt: 'FL245', coords: [
    '591458N0174448E','590001N0184233E','585517N0183748E','590321N0172339E','590953N0173531E','591458N0174448E'
  ]},
  { id: 'E4', parentSector: 'E', minAlt: 'GND', maxAlt: 'FL95', coords: [
    '601758N0181247E','601645N0182330E','601558N0183317E','600526N0184419E','600921N0180728E','601758N0181247E'
  ]},
  { id: 'E5', parentSector: 'E', minAlt: 'GND', maxAlt: 'FL95', coords: [
    '593239N0190409E','592134N0190336E','590026N0184259E','590001N0184233E','590901N0184239E','592742N0184316E','593239N0190409E'
  ]},
  { id: 'D1', parentSector: 'D', minAlt: 'GND', maxAlt: 'FL245', coords: [
    '593902N0175619E','593411N0172438E','592628N0174448E','592416N0175108E','593320N0175418E','593902N0175619E'
  ]},
  { id: 'D2', parentSector: 'D', minAlt: 'A35', maxAlt: 'FL245', coords: [
    '593411N0172438E','592628N0174448E','592701N0170647E','593411N0172438E'
  ]},
  { id: 'D3', parentSector: 'D', minAlt: 'FL65', maxAlt: 'FL245', coords: [
    '592628N0174448E','592416N0175108E','591458N0174448E','592128N0165359E','592717N0164049E',
    '592708N0165710E','592701N0170647E','592628N0174448E'
  ]},
  { id: 'D4', parentSector: 'D', minAlt: 'FL105', maxAlt: 'FL245', coords: [
    '592717N0164049E','592128N0165359E','591458N0174448E','590953N0173531E','590321N0172339E',
    '585833N0171536E','585937N0165947E','590043N0164228E','590538N0163840E','591203N0163419E','592717N0164049E'
  ]},
  { id: 'S1', parentSector: 'S', minAlt: 'GND', maxAlt: 'FL65', coords: [
    '592628N0174448E','592416N0175108E','591458N0174448E','592128N0165359E','592717N0164049E',
    '592708N0165710E','592701N0170647E','592628N0174448E'
  ]},
  { id: 'S2', parentSector: 'S', minAlt: 'GND', maxAlt: 'FL65', coords: [
    '592416N0175108E','592052N0175751E','590901N0184239E','590001N0184233E','591458N0174448E','592416N0175108E'
  ]},
  { id: 'S3', parentSector: 'S', minAlt: 'GND', maxAlt: 'FL105', coords: [
    '592717N0164049E','592128N0165359E','591458N0174448E','590001N0184233E','585517N0183748E',
    '584910N0183133E','584917N0181044E','583659N0172725E','584343N0172628E','585758N0172428E',
    '585833N0171536E','585937N0165947E','590043N0164228E','590538N0163840E','591203N0163419E','592717N0164049E'
  ]},
  { id: 'S4', parentSector: 'S', minAlt: 'GND', maxAlt: 'A35', coords: [
    '593411N0172438E','592628N0174448E','592701N0170647E','593411N0172438E'
  ]},
];

const features = sectors.map(s => ({
  type: 'Feature',
  properties: {
    ID: s.id,
    minAlt: s.minAlt,
    maxAlt: s.maxAlt,
    parentSector: s.parentSector,
  },
  geometry: {
    type: 'Polygon',
    coordinates: [s.coords.map(dmsToDecimal)],
  },
}));

const fc = { type: 'FeatureCollection', features };

const outPath = path.join(__dirname, '..', 'essa_svea_sectors.geojson');
fs.writeFileSync(outPath, JSON.stringify(fc, null, 2));
console.log('Wrote', outPath, 'with', features.length, 'sectors');
