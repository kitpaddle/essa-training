// SIZE MAP AND INTERFACE TO WINDOW

/*

Overpass TURBO API:

[out:json][timeout:10];
area[icao="ESSA"]->.searchArea;
(
  node["aeroway"](area.searchArea);
  way["aeroway"](area.searchArea);
  way["highway"="service"](area.searchArea);
);

out meta;
>;
out meta qt;

The above returns all NODES and WAYS of ESSA! Convert JSON to Geojson and use it?
The below is an example for calling Overpass from JS

(async () => {
  const api = await fetch('https://www.overpass-api.de/api/interpreter?', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body:"[out:json];node(48.865,2.25,48.9,2.27)[amenity=restaurant];out;"
  });
  const answer = await api.json();
  console.log(answer);
})()

*/


let viewport_width = document.documentElement.clientWidth;
let viewport_height = document.documentElement.clientHeight;
document.getElementById('main').style.width = viewport_width+'px';
document.getElementById('main').style.height = viewport_height+'px';

// Add listener to resize when window resizes.
window.addEventListener('resize', function(event) {
  viewport_width = document.documentElement.clientWidth;
  viewport_height = document.documentElement.clientHeight;
  document.getElementById('main').style.width = viewport_width+'px';
  document.getElementById('main').style.height = viewport_height+'px';
}, true);

// Variables
let savedData = {};
let exportJson = {};
let selectedFeatures = [];
let bounds;

let osmData;

// Initaliasing empty GeoJSON objects and filling them with data/features later
let dataRunways = {"type": "FeatureCollection","features": []};
let dataTaxiways = {"type": "FeatureCollection","features": []};
let dataAprons = {"type": "FeatureCollection","features": []};
let dataTerminals = {"type": "FeatureCollection","features": []};
let dataStandPoints = {"type": "FeatureCollection","features": []};
let dataStandLines = {"type": "FeatureCollection","features": []};
let dataRoads;
// Initialising the corresponding layers to be used by Leaflet
let layerTerminals;
let layerAprons;
let layerTaxiways;
let layerRunways;
let layerStandPoint;
let layerStandLines;
let layerRoads;
// Layer Groups
let layerStands;
let layerRamps;
let layerWays;
let layerGroupRoads;
// Layer BIG Groups
let layerAirfield;

let layerList = [];
let selectedLayer;
let testing = false;
let qsize = 0;
const INIT1 = [[59.648, 17.941], 15];
let testArray = [];
let testProgress = 0;
let testPoints = 0;



//// JS RELATED TO MAP / LEAFLET

const startingPos =[59.651, 17.941];
const URL_OSM = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const URL_WHITE = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png';
const URL_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// Creating MAP and baseMap Layer and adding them to the DIV
// So even if other layers take time to load map shows right away
const map = L.map('map', {
  center: startingPos,
  zoom: 14,
  fullscreenControl: true,
  fullscreenControlOptions: {position: 'topright'},
  attributionControl: false,
  renderer: L.canvas()
});

L.control.attribution({
  position: 'bottomleft'
}).addTo(map);

// Creating Basemaps
const baseMapGrey = new L.tileLayer(URL_WHITE, {
  attribution: '&copy; <a href="https://carto.com/">CartoDB</a> & <a href="https://www.openstreetmap.org/copyright">OSM</a> kitpaddle',
  minZoom: 9,
  updateWhenIdle: true,
  keepBuffer: 5,
  edgeBufferTiles: 2
}).addTo(map);
const baseMap = L.tileLayer(URL_OSM, {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kitpaddle',
  minZoom: 9,
  fillOpacity: 0.25
});
const baseMapSat = new L.tileLayer(URL_SAT, {
  attribution: '&copy; <a href="https://carto.com/">CartoDB</a> & <a href="https://www.openstreetmap.org/copyright">OSM</a>& <a href="https://www.esri.com/en-us/home">ESRI</a> kitpaddle',
  minZoom: 9,
  updateWhenIdle: true,
  keepBuffer: 5,
  edgeBufferTiles: 2
});
// Creating Layergroup for basemaps
const baseMaps = {
  "Base Map": baseMapGrey,
  // TOO DETAILED SO HIDING DETAILED MAP
  //"Detailed Map": baseMap,
  "Satellite": baseMapSat
};

// Create control with layerGroups
let panelLayers = new L.control.layers(baseMaps);
// Add control AND layers to map
panelLayers.addTo(map);
//map.fitBounds(ctrLayer.getBounds());
layerAirfield = L.layerGroup([]);

function getUniqueValues(array){
  return Array.from(new Set(array));
}
function onEachRunway(feature, layer){
  let html = '<div class="tt"><b>RWY '+feature.properties.name+'</b></div>';
  layer.bindTooltip(html, {direction: 'top', className: "tipClass"}).openTooltip();
  layer.on('mouseover', function () {
    this.setStyle({color: 'orange', weight: 10});
    //layer.bindPopup(feature.properties.name).openPopup(); // here add openPopup()
  });
  layer.on('mouseout', function () {
    this.setStyle({color: 'black', weight: 9});
  });
  layer.on('click', function(){
    testClick(feature.properties.name);
  });
}
function onEachStand(feature, layer){
  let html = '<div class="tt"><b>'+feature.properties.ref+'</b></div>';
  layer.bindTooltip(html, {permanent: false, direction: 'top'});
  layer.on('mouseover', function () {
    this.setStyle({color: 'orange', opacity: 1});
    //layer.bindPopup(feature.properties.name).openPopup(); // here add openPopup()
  });
  layer.on('mouseout', function () {
    this.setStyle({color: 'black', opacity: 0.8});
  });
  layer.on('click', function(){
    testClick(feature.properties.name);
  });
}
function onEachTaxiway(feature, layer){
  let html = '<div class="tooltip"><b>'+feature.properties.ref+'</b></div>'
  layer.bindTooltip(html, {permanent: false, direction: 'top'});
  layer.on('mouseover', function () {
    this.setStyle({color: 'orange', weight: 7});
    //layer.bindPopup(feature.properties.name).openPopup(); // here add openPopup()
  });
  layer.on('mouseout', function () {
    this.setStyle({color: 'grey', weight: 7});
  });
  layer.on('click', function(){
    testClick(feature.properties.ref);
  });
}
function onEachApron(feature, layer){
  let html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>'
  layer.bindTooltip(html, {permanent: false, direction: 'top'});
  layer.on('mouseover', function () {
    this.setStyle({color: 'orange', opacity: 1});
    //layer.bindPopup(feature.properties.name).openPopup(); // here add openPopup()
  });
  layer.on('mouseout', function () {
    this.setStyle({color: 'grey', opacity: 0.8});
  });
  layer.on('add', function (){
    layer.bringToBack();
  });
  layer.on('click', function(){
    testClick(feature.properties.name);
  });
}
function onEachTerminal(feature, layer){
  let html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>'
  layer.bindTooltip(html, {permanent: false, direction: 'top'});
  layer.on('mouseover', function () {
    this.setStyle({color: 'orange', opacity: 1});
    //layer.bindPopup(feature.properties.name).openPopup(); // here add openPopup()
  });
  layer.on('mouseout', function () {
    this.setStyle({color: 'black', opacity: 0.8});
  });
  layer.on('click', function(){
    testClick(feature.properties.name);
  });
}
function onEachRoad(feature, layer){
  let html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>'
  layer.bindTooltip(html, {permanent: false, direction: 'top'});
  layer.on('mouseover', function () {
    this.setStyle({color: 'orange', weight: 7});
    //layer.bindPopup(feature.properties.name).openPopup(); // here add openPopup()
  });
  layer.on('mouseout', function () {
    this.setStyle({color: 'black', weight: 4});
  });
  layer.on('click', function(){
    testClick(feature.properties.name);
  });
}

// FETCHING DATA for SERVICE ROADS
fetch('https://kitpaddle.github.io/essa-training/essa_serviceroads.geojson').then(response => {
  return response.json();
}).then(data => {
  dataRoads = data; // Save data locally
  //console.log(dataRoads);
  
  layerRoads = L.geoJSON(dataRoads, {onEachFeature: onEachRoad, style:{color:'black', weight: 4}});
  
  // Grouping stands to one layer
  layerGroupRoads = L.layerGroup([layerRoads]);
  // AIRFIELD LAYER
  layerAirfield.addLayer(layerGroupRoads);
  
  // Making a layer list used by "ttipClick()" to activate/deactivate Tooltips
  layerList.push(layerRoads);
  
}).catch(err => {
  // Do something for an error here
});

// FETCH DATA for RWYS & TWYS & STANDS & APRONS & TERMINALS
// Data is sourced from OpenStreetMap as a GeoJSON saved on my github
fetch('https://kitpaddle.github.io/hosting/essaosmaeroways220928.geojson').then(response => {
  return response.json();
}).then(data => {
  osmData = data; // Save data locally
  
  // PUSH ALL FEATURES TO RESPECTIVE GEOJSON FEATURE ARRAY
  let taxiwayNames = [];
  let twytemp = [];
  // Iterating all features and sorting in respective Geojson arrays
  for (let i=0;i<osmData.features.length; i++){
    //temparr.push(osmData.features[i].properties.aeroway);
    if(osmData.features[i].properties.aeroway == "runway") dataRunways.features.push(osmData.features[i]);
    if(osmData.features[i].properties.aeroway == "apron") dataAprons.features.push(osmData.features[i]);
    if(osmData.features[i].properties.aeroway == "terminal") dataTerminals.features.push(osmData.features[i]);
    // Special case for STANDS to get lines AND points
    if(osmData.features[i].properties.aeroway == "parking_position" && osmData.features[i].geometry.type == "Point" ){
      osmData.features[i].properties.name = osmData.features[i].properties.ref;
      dataStandPoints.features.push(osmData.features[i]);
    } 
    if(osmData.features[i].properties.aeroway == "parking_position" && osmData.features[i].geometry.type == "LineString" ) dataStandLines.features.push(osmData.features[i]);
    // Special case for taxiways as they are MULTILINES
    if(osmData.features[i].properties.aeroway == "taxiway") {
      twytemp.push(osmData.features[i]);
      taxiwayNames.push(osmData.features[i].properties.ref);
    }
  }
  
  // Geting unique taxiways, then going through all features to group one with same name into MULTILINE features.
  let uniqueTaxiways = getUniqueValues(taxiwayNames);
  for (let i=0; i<uniqueTaxiways.length; i++){
    let newFeature = {
      "type": "Feature",
      "geometry": {
        "type": "MultiLineString",
        "coordinates": []
      },
      "properties": {
        "ref": uniqueTaxiways[i],
        "name": uniqueTaxiways[i]
      }
    };
    for (let j=0; j<twytemp.length; j++){
      if(twytemp[j].properties.ref == newFeature.properties.ref){
        newFeature.geometry.coordinates.push(twytemp[j].geometry.coordinates);
      }
    }
    if(uniqueTaxiways[i]!=undefined){
      dataTaxiways.features.push(newFeature);
    }
  }
  layerRunways = L.geoJSON(dataRunways, {onEachFeature: onEachRunway, style:{color:'black', weight: 9}});
  layerAprons = L.geoJSON(dataAprons, {onEachFeature: onEachApron,style:{weight: 0.5, color:'grey'}});
  layerTerminals = L.geoJSON(dataTerminals, {onEachFeature: onEachTerminal,style:{weight: 0.5, color:'black'}});
  layerTaxiways = L.geoJSON(dataTaxiways, {onEachFeature: onEachTaxiway,style:{weight: 7, color:'grey'}});
  layerStandPoint = L.geoJSON(dataStandPoints, {onEachFeature: onEachStand, pointToLayer: function (feature, latlng) {
    return L.circleMarker(latlng, {weight: 0.7, radius: 7, color: "#000"});
  }});
  layerStandLines = L.geoJSON(dataStandLines, {style:{color:'black', opacity: 0.1, weight: 1}});
  
  // Grouping stands to one layer
  layerStands = L.layerGroup([layerStandPoint, layerStandLines]);
  // Grouping taxiways and Runways to one layer
  layerWays = L.layerGroup([layerRunways, layerTaxiways]);
  // Grouping Aprons and Terminals
  layerRamps = L.layerGroup([layerAprons, layerTerminals]);
  // AIRFIELD LAYER
  
  layerAirfield.addLayer(layerStands);
  layerAirfield.addLayer(layerWays);
  layerAirfield.addLayer(layerRamps);
  
  // Making a layer list used by "ttipClick()" to activate/deactivate Tooltips
  //layerList = [layerRunways, layerTaxiways, layerStandPoint, layerAprons, layerTerminals];
  layerList.push(layerRunways);
  layerList.push(layerTaxiways);
  layerList.push(layerStandPoint);
  layerList.push(layerAprons);
  layerList.push(layerTerminals);
 
  // Adding layers to controlpanel, maybe remove it at the end? ONLY TESTING?
  panelLayers.addOverlay(layerAirfield, "Airfield");
  
  mapButton(1); // Initaliasing first layer
  
}).catch(err => {
  // Do something for an error here
});

// Switch all labels SHOWING or HIDING
function ttipClick(){
  // Check if checked
  if(document.getElementById('ttip').checked){
    // Show labels
    layerList.forEach(l =>{
      l.eachLayer(function(l) {
        if (l.getTooltip()) {
          let tt = l.getTooltip();
          l.unbindTooltip().bindTooltip(tt, {
            permanent: true
          })
        }
      })
    })
  }else{ // Hide labels
    layerList.forEach(l =>{
      l.eachLayer(function(l) {
        if (l.getTooltip()) {
          let tt = l.getTooltip();
          l.unbindTooltip().bindTooltip(tt, {
            permanent: false
          })
        }
      })
    })
  }
  
}

function mapButton(nr){
  [...document.getElementsByClassName('pButton')].map(x => x.classList.remove('active')); // Removes 'active' class from all pButton
  document.getElementById(nr).classList.add('active'); // Add 'active'-class to the one just pressed
  if(selectedLayer){
    map.removeLayer(layerWays);
    map.removeLayer(layerRamps);
    map.removeLayer(layerStands);
    map.removeLayer(layerGroupRoads);
  }
  
  switch (nr){
    case 1:
      selectedLayer = layerWays;
      layerWays.addTo(map);
      qsize = layerRunways.getLayers().length + layerTaxiways.getLayers().length;
      break;
    case 2:
      selectedLayer = layerStands;
      layerStands.addTo(map);
      qsize = layerStandPoint.getLayers().length;
      break;
    case 3:
      selectedLayer = layerRamps;
      layerRamps.addTo(map);
      qsize = layerAprons.getLayers().length + layerTerminals.getLayers().length;
      break;
    case 4:
      selectedLayer = layerGroupRoads;
      layerGroupRoads.addTo(map);
      qsize = layerRoads.getLayers().length;
      break;
  }
  document.getElementById("questions").innerHTML = "Questions: 0/"+qsize;
  document.getElementById("answers").innerHTML = "Correct answers: 0/"+qsize;
  if(testing) timerButton(); //If testing was ON, stop testing
}

function timerButton(){
  if(!testing){
    testArray = []; testProgress = 0; testPoints = 0;
    testing = true; // starting test
    document.getElementById("testbutton").innerHTML = "Stop Testing";
    document.getElementById('ttip').checked = false;
    ttipClick(); // If Tooltips checkbox was on, set to off and update
    document.getElementById('ttip').disabled = true; // Disable checkbox
    document.getElementById("questions").innerHTML = "Question: 1/"+qsize;
    
    // HIDE ALL TOOLTIPS by setting opacity 0
    layerList.forEach(l =>{
      l.eachLayer(function(l) {
        if (l.getTooltip()) {
          let tt = l.getTooltip();
          tt.setOpacity(0);
        }
      })
    })
    // If multiple layers in selectedLayer
    if(selectedLayer.getLayers().length>1){
      selectedLayer.eachLayer(function(s){
        s.eachLayer(function(layer){
          testArray.push(layer);
        })
      })
    }else{ // If single layer
      selectedLayer.eachLayer(function(s){
        s.eachLayer(function(layer){
          testArray.push(layer);
        })
      })
    }
    
    document.getElementById('tq').innerHTML = "Where is "+testArray[testProgress].feature.properties.name+" ?";
    document.getElementById('answers').innerHTML = "Correct answers: 0/"+qsize;
    
  } 
  else {
    testing = false; // no longer testing
    document.getElementById("testbutton").innerHTML = "Start Test";
    console.log("not testing");
    document.getElementById('ttip').disabled = false; //un-disable checkbox
    
    // "UNHIDE" ALL TOOLTIPS by setting opacity back to 1
    layerList.forEach(l =>{
      l.eachLayer(function(l) {
        if (l.getTooltip()) {
          let tt = l.getTooltip();
          tt.setOpacity(1);
        }
      })
    })
    
  }  
}

function testClick(r){
  console.log("Clicked: "+r);
  if(testing){
    console.log("Testing: "+ testArray[testProgress].feature.properties.name);
    if(r == testArray[testProgress].feature.properties.name){
      testPoints++;
      document.getElementById('answers').innerHTML = "Correct answers: "+ testPoints +"/"+qsize; 
    }
    if(testProgress+2>qsize){
      console.log("Complete!");
      document.getElementById('tq').innerHTML = "Test complete!";
      timerButton();
    }else{
      testProgress++;
    document.getElementById('questions').innerHTML = "Question: "+(testProgress+1) +"/"+qsize;
    document.getElementById('tq').innerHTML = "Where is "+testArray[testProgress].feature.properties.name+" ?";
    }
  }
}
