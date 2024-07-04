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
// AIRFIELD DATA
//these are initiated like this because i fetch the data from OSM. For all the others it's data created by myself in geojson format.
let dataRunways = {"type": "FeatureCollection","features": []}; 
let dataTaxiways = {"type": "FeatureCollection","features": []};
let dataAprons = {"type": "FeatureCollection","features": []};
let dataTerminals = {"type": "FeatureCollection","features": []};
let dataStandPoints = {"type": "FeatureCollection","features": []};
let dataStandLines = {"type": "FeatureCollection","features": []};
let dataRoads, dataPoi, dataAirfieldAor;
// CTR DATA
let dataSectors, dataCtrPoints, dataCtrPlaces;
// TMA DATA
let dataTMAPoints;

// Initialising the corresponding layers to be used by Leaflet
// AIRFIELD LAYERS
let layerTerminals, layerAprons, layerTaxiways, layerRunways, layerStandPoint, layerStandLines, layerRoads, layerPoi, layerAirfieldAor;
// CTR LAYERS
let layerSectors, layerCtrPoints, layerCtrPlaces;
// TMA LAYERS
let layerTMAPoints;

// LAYER GROUPS AIRFIELD
let layerStands, layerRamps, layerWays, layerGroupRoads, layerGroupPoi, layerGroupAirfieldAor;
// LAYER GROUPS CTR
let layerGroupSectors, layerGroupCtrPoints, layerGroupCtrPlaces;
// LAYER GROUPS TMA
let layerGroupTMAPoints;

// Layer BIG Groups
let layerAirfield;
let layerCtr;
let layerTMA;

let layerList = [];
let selectedLayer;
let testing = false;
let qsize = 0;
const INIT1 = [[59.648, 17.941], 15];
let testArray = [];
let testProgress = 0;
let testPoints = 0;


let timerInterval; //Define the timerInterval so its available

let iconVfrPoint = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/kitpaddle/essa-training/f4be9cfcfb957623310fa5c05ae31353f1ed6c58/ctr_vfr_point.png',
    iconSize:     [20, 20], // size of the icon
    iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
    popupAnchor:  [21, 10] // point from which the popup should open relative to the iconAnchor
});

let iconVfrHold = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/kitpaddle/essa-training/41caaabb597ea02be6e5815ca5f2313e5185f06f/ctr_vfr_hold.png',
    iconSize:     [20, 20], // size of the icon
    iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
    popupAnchor:  [21, 10] // point from which the popup should open relative to the iconAnchor
});

let iconVfrDme = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/kitpaddle/essa-training/main/ctr_vfr_dme.png',
    iconSize:     [20, 20], // size of the icon
    iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
    popupAnchor:  [21, 10] // point from which the popup should open relative to the iconAnchor
});

let iconVfrVor = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/kitpaddle/essa-training/main/ctr_vfr_vor.png',
    iconSize:     [20, 20], // size of the icon
    iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
    popupAnchor:  [21, 10] // point from which the popup should open relative to the iconAnchor
});

let iconVfrChurch = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/kitpaddle/essa-training/main/ctr_vfr_church.png',
  iconSize: [20, 20], // size of the icon
  iconAnchor: [10, 10], // point of the icon which will correspond to marker's location
  popupAnchor: [21, 10] // point from which the popup should open relative to the iconAnchor
});

let iconVfrAirfield = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/kitpaddle/essa-training/main/ctr_vfr_airfield.png',
  iconSize: [20, 20], // size of the icon
  iconAnchor: [10, 10], // point of the icon which will correspond to marker's location
  popupAnchor: [21, 10] // point from which the popup should open relative to the iconAnchor
});

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
  attributionControl: false,
  renderer: L.canvas()
});

L.control.attribution({
  position: 'bottomleft'
}).addTo(map);

// Creating Basemaps
const baseMapGrey = new L.tileLayer(URL_WHITE, {
  attribution: '&copy; <a href="https://carto.com/">CartoDB</a> & <a href="https://www.openstreetmap.org/copyright">OSM</a> kitpaddle',
  minZoom: 8,
  updateWhenIdle: true,
  keepBuffer: 5,
  edgeBufferTiles: 2
}).addTo(map);
const baseMap = L.tileLayer(URL_OSM, {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> kitpaddle',
  minZoom: 8,
  fillOpacity: 0.25
});
const baseMapSat = new L.tileLayer(URL_SAT, {
  attribution: '&copy; <a href="https://carto.com/">CartoDB</a> & <a href="https://www.openstreetmap.org/copyright">OSM</a>& <a href="https://www.esri.com/en-us/home">ESRI</a> kitpaddle',
  minZoom: 8,
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
layerCtr = L.layerGroup([]);
layerTMA = L.layerGroup([]);

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
  let html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>';
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

function onEachPoi(feature, layer){
  let html
  if(feature.properties.description!=undefined){
    html = '<div class="tooltip"><b>'+feature.properties.name+'</b><br>'+feature.properties.description+'</div>';
  }else{
    html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>';
  }
  
  layer.bindTooltip(html, {permanent: false, direction: 'top'});
  
  layer.on('click', function(){
    testClick(feature.properties.name);
  });
  
  layer.on('mouseover', function () {
    this.setStyle({color: 'orange', weight: 7});
    //layer.bindPopup(feature.properties.name).openPopup(); // here add openPopup()
  });
  layer.on('mouseout', function () {
    this.setStyle({color: 'black', weight: 3});
  });
}

function onEachVfrPoint(feature, layer){
  if (feature.properties.category == 'label') {
    layer.setStyle({
            fillColor: 'transparent', // Set the fill color to transparent
            color: 'transparent', // Set the border color to transparent
            opacity: 0, // Set the opacity to 0 (invisible)
            fillOpacity: 0, // Set the fill opacity to 0 (invisible)
            pointerEvents: 'none' // Disable pointer events on the polygon
        });
    let html = '<b>'+feature.properties.aor+'</b>';
    let bounds = layer.getBounds().getCenter()
    layer.bindTooltip(html, {permanent: true, direction: 'center', className: 'aorTip'}).openTooltip();
    
  }else{
    if(feature.properties.category == 'other'){
      let html = '<div class="tooltip"><b>'+feature.properties.aor+'</b><br>Frequency:'+feature.properties.name+'</div>';
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
    }else{
      if(feature.properties.description!=undefined){
        html = '<div class="tooltip"><b>'+feature.properties.name+'</b><br>'+feature.properties.description+'</div>';
      }else{
        html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>';
      }

      layer.bindTooltip(html, {permanent: false, direction: 'top'});
      layer.on('click', function(){
        testClick(feature.properties.name);
      });
    }
  }
}

function onEachAoR(feature,layer){
  //OBS for this to work the order of the features on tje geojson are important. This is a hack solution
  if (feature.properties.category == 'label') {
    layer.setStyle({
            fillColor: 'transparent', // Set the fill color to transparent
            color: 'transparent', // Set the border color to transparent
            opacity: 0, // Set the opacity to 0 (invisible)
            fillOpacity: 0, // Set the fill opacity to 0 (invisible)
            pointerEvents: 'none' // Disable pointer events on the polygon
        });
    let html = '<b>'+feature.properties.aor+'</b>';
    let bounds = layer.getBounds().getCenter()
    layer.bindTooltip(html, {permanent: true, direction: 'center', className: 'aorTip'}).openTooltip();
    
  }else{

    let html = '<div class="tooltip"><b>'+feature.properties.aor+'</b><br>Frequency: '+feature.properties.name+'</div>';
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
}
//For the places/areas in the CTR
function onEachPlace(feature, layer){
  if(feature.properties.category=="sector"){
    layer.setStyle({color: 'rgb(224, 99, 76)', opacity: 0.8});
    html = '<div class="tooltip"><b>'+feature.properties.name+'</b><br>'+feature.properties.height+'</div>';
  }else if(feature.properties.category=="water"){
    layer.setStyle({color: 'rgb(76, 165, 224)', opacity: 0.8});
    html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>';
  }else if(feature.properties.category=="road"){
    layer.setStyle({color: 'black', opacity: 0.8});
    html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>';
  }else{
    layer.setStyle({color: 'rgb(166, 207, 152)', opacity: 0.8});
    html = '<div class="tooltip"><b>'+feature.properties.name+'</b></div>';
  }
  layer.bindTooltip(html, {permanent: false, direction: 'top'});
  layer.on('mouseover', function () {
    this.setStyle({color: 'orange', opacity: 1});
    //layer.bindPopup(feature.properties.name).openPopup(); // here add openPopup()
  });
  layer.on('mouseout', function () {
    if(feature.properties.category=="sector"){
      this.setStyle({color: 'rgb(224, 99, 76)', opacity: 0.8});
    }else if (feature.properties.category=="water"){
      this.setStyle({color: 'rgb(76, 165, 224)', opacity: 0.8});
    }else if (feature.properties.category=="road"){
      this.setStyle({color: 'black', opacity: 0.8});
    }else{
      this.setStyle({color: 'rgb(166, 207, 152)', opacity: 0.8});
    }

  });
  layer.on('click', function(){
    testClick(feature.properties.name);
  });
}

// FETCHING DATA for TMA Points
fetch('https://kitpaddle.github.io/essa-training/essa_tma_points.geojson').then(response => {
  return response.json();
}).then(data => {
  dataTMAPoints = data; // Save data locally
  
  layerTMAPointsLabel = L.geoJSON(dataTMAPoints, {
    onEachFeature: onEachVfrPoint,
    style:{color:'black', weight: 3},
    filter: function(feature,layer){ return (feature.properties.category == "label")}
    
  });
  layerTMAPoints = L.geoJSON(dataTMAPoints, {
    onEachFeature: onEachVfrPoint,
    style:{color:'black', weight: 3},
    filter: function(feature,layer){ return (feature.properties.category != "label")},
    pointToLayer: function (feature, latlng) { 
      switch(feature.properties.TYPEOFPOINT){
        case 'DNPT': return L.marker(latlng, {icon: iconVfrPoint});
        case 'NDB': return L.marker(latlng, {icon: iconVfrDme});
      }
      //return L.marker(latlng, {icon: iconVfrPoint}); }
      
    }
  });
  
  // Grouping points to one layer
  layerGroupTMAPoints = L.layerGroup([layerTMAPoints, layerTMAPointsLabel]);
  // CTR LAYER
  layerTMA.addLayer(layerTMAPoints);
  // Making a layer list used by "ttipClick()" to activate/deactivate Tooltips
  layerList.push(layerTMAPoints);
  
}).catch(err => {
  console.log("Error fetching TMA points from file essa_tma_points.geojson");
});

// FETCHING DATA for CTR Places, Sectors and Water bodies.
fetch('https://kitpaddle.github.io/essa-training/essa_ctr_areas.geojson').then(response => {
  return response.json();
}).then(data => {
  dataCtrPlaces = data; // Save data locally

  layerCtrPlaces = L.geoJSON(dataCtrPlaces, {onEachFeature: onEachPlace, style:{color:'black', weight: 3}});

  // Grouping the two layers to one layer
  layerGroupCtrPlaces = L.layerGroup([layerCtrPlaces]);
  // AOR LAYER (and added to Airfield so it is show on map and everything)
  layerCtr.addLayer(layerGroupCtrPlaces);
  
  // Making a layer list used by "ttipClick()" to activate/deactivate Tooltips
  layerList.push(layerCtrPlaces);
  
}).catch(err => {
  console.log("Error fetching CTR places from file /essa_ctr_areas.geojson");
});

// FETCHING DATA for VFR Points
fetch('https://kitpaddle.github.io/essa-training/essa_ctr_vfrPoints.geojson').then(response => {
  return response.json();
}).then(data => {
  dataCtrPoints = data; // Save data locally
  //console.log(data);
  
  layerCtrPoints = L.geoJSON(dataCtrPoints, {
    onEachFeature: onEachVfrPoint, 
    pointToLayer: function (feature, latlng) {
      switch(feature.properties.category){
        case 'VFR Holding': return L.marker(latlng, {icon: iconVfrHold});
        case 'VFR Reporting Point': return L.marker(latlng, {icon: iconVfrPoint});
        case 'Church': return L.marker(latlng, {icon: iconVfrChurch});
        case 'Navaid': return L.marker(latlng, {icon: iconVfrDme});
        case 'Airfield': return L.marker(latlng, {icon: iconVfrAirfield});
      }
    }
  });
  
  // Grouping stands to one layer
  layerGroupCtrPoints = L.layerGroup([layerCtrPoints]);
  // CTR LAYER
  layerCtr.addLayer(layerGroupCtrPoints);
  
  // Making a layer list used by "ttipClick()" to activate/deactivate Tooltips
  layerList.push(layerCtrPoints);
  
}).catch(err => {
  console.log("Error fetching VFR points from file essa_ctr_vfrPoints.geojson");
});

// FETCHING DATA for CTR Sectors
fetch('https://kitpaddle.github.io/essa-training/essa_ctr_sectors.geojson').then(response => {
  return response.json();
}).then(data => {
  dataSectors = data; // Save data locally
  //console.log(dataRoads);
  
  layerSectors = L.geoJSON(dataSectors, {interactive: false, style:{color:'grey', weight: 1}});
  
  // Grouping stands to one layer
  layerGroupSectors = L.layerGroup([layerSectors]);
  // CTR LAYER
  layerCtr.addLayer(layerGroupSectors);
  layerTMA.addLayer(layerGroupSectors);
  //test
  // Making a layer list used by "ttipClick()" to activate/deactivate Tooltips
  //layerList.push(layerSectors);
  
}).catch(err => {
  console.log("Error fetching CTR/TMA sectors");
});

// FETCHING DATA for AORs in airfield (Frequencies)
fetch('https://kitpaddle.github.io/essa-training/essa_airfield_aor.geojson').then(response => {
  return response.json();
}).then(data => {
  dataAirfieldAor = data; // Save data locally

  // Different layers for LABELS so these can never be hidden (not added to layerList)
  // Must be in code above the one below or drawn in wrong order and interferes with clicking
  layerAirfieldAorLabel = L.geoJSON(dataAirfieldAor, {onEachFeature: onEachAoR, style:{color:'black', weight: 4}, filter: function(feature,layer){
    return (feature.properties.category == "label")
  }});
  // Normal layer 
  layerAirfieldAor = L.geoJSON(dataAirfieldAor, {onEachFeature: onEachAoR, style:{color:'black', weight: 4}, filter: function(feature,layer){
    return (feature.properties.category != "label")
  }});
  
  // Grouping the two layers to one layer
  layerGroupAirfieldAor = L.layerGroup([layerAirfieldAor, layerAirfieldAorLabel]);
  // AOR LAYER (and added to Airfield so it is show on map and everything)
  layerAirfield.addLayer(layerGroupAirfieldAor);
  
  // Making a layer list used by "ttipClick()" to activate/deactivate Tooltips
  layerList.push(layerAirfieldAor);
  
}).catch(err => {
  console.log("Error fetching AOR for Airports");
});

// FETCHING DATA for SERVICE ROADS
fetch('https://kitpaddle.github.io/essa-training/essa_serviceroadsV2.geojson').then(response => {
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

// FETCHING DATA for Points of Interests
fetch('https://kitpaddle.github.io/essa-training/essa_poi.geojson').then(response => {
  return response.json();
}).then(data => {
  dataPoi = data; // Save data locally
  //console.log(dataRoads);
  
  layerPoi = L.geoJSON(dataPoi, {onEachFeature: onEachPoi,
                                 pointToLayer: function(feature,latlng){
                                   return L.circleMarker(latlng, {color: 'black', weight: 3})},
                                 style:function(feature){
                                   if(feature.properties.category == "Hotspot")
                                     return {color: 'black', fillColor: "red"};
                                   else{
                                     return {fillColor: 'grey', radius: 6}
                                   }
                                 }
                                });
  
  // Grouping stands to one layer
  layerGroupPoi = L.layerGroup([layerPoi]);
  // AIRFIELD LAYER
  layerAirfield.addLayer(layerGroupPoi);
  
  // Making a layer list used by "ttipClick()" to activate/deactivate Tooltips
  layerList.push(layerPoi);
  
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
  panelLayers.addOverlay(layerCtr, "CTR");
  panelLayers.addOverlay(layerTMA, "TMA");
  
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
    map.removeLayer(layerGroupPoi);
    map.removeLayer(layerGroupAirfieldAor);
    map.removeLayer(layerGroupSectors);
    map.removeLayer(layerGroupCtrPoints);
    map.removeLayer(layerGroupCtrPlaces);
    map.removeLayer(layerGroupTMAPoints);
  }
  
  switch (nr){
    case 1:
      selectedLayer = layerWays;
      layerWays.addTo(map);
      qsize = layerRunways.getLayers().length + layerTaxiways.getLayers().length;
      moveMap(layerRunways);
      break;
    case 2:
      selectedLayer = layerStands;
      layerStands.addTo(map);
      qsize = layerStandPoint.getLayers().length;
      moveMap(layerStandPoint);
      break;
    case 3:
      selectedLayer = layerRamps;
      layerRamps.addTo(map);
      qsize = layerAprons.getLayers().length + layerTerminals.getLayers().length;
      moveMap(layerAprons);
      break;
    case 4:
      selectedLayer = layerGroupRoads;
      layerGroupRoads.addTo(map);
      qsize = layerRoads.getLayers().length;
      moveMap(layerRoads);
      break;
    case 5:
      selectedLayer = layerGroupPoi;
      layerGroupPoi.addTo(map);
      qsize = layerPoi.getLayers().length;
      moveMap(layerPoi);
      break;
    case 6:
      selectedLayer = layerGroupAirfieldAor;
      layerGroupAirfieldAor.addTo(map);
      qsize = layerAirfieldAor.getLayers().length;
      moveMap(layerAirfieldAor);
      break;
    case 7:
      selectedLayer = layerGroupCtrPlaces;
      layerGroupSectors.addTo(map);
      layerGroupCtrPlaces.addTo(map);
      qsize = layerCtrPlaces.getLayers().length;;
      moveMap(layerCtrPlaces);
      break;
    case 8:
      selectedLayer = layerGroupCtrPoints;
      layerGroupCtrPoints.addTo(map);
      layerGroupSectors.addTo(map);
      qsize = layerCtrPoints.getLayers().length;
      moveMap(layerCtrPoints);
      break;
    case 9:
      selectedLayer = layerGroupTMAPoints;
      layerGroupTMAPoints.addTo(map);
      layerGroupSectors.addTo(map);
      qsize = layerTMAPoints.getLayers().length;
      moveMap(layerTMAPoints);
      break;
  }
  
  document.getElementById("questions").innerHTML = "Questions: 0/"+qsize;
  document.getElementById("answers").innerHTML = "Correct answers: 0/"+qsize;
  if(testing) timerButton(); //If testing was ON, stop testing
}

function padNumber ( val ) { return val > 9 ? val : "0" + val; }

//function to re-center and resize map view depending on what layer is clicked
function moveMap(layer){
  let bounds = layer.getBounds();
  map.fitBounds(bounds);
}

function timerButton(){  
  if(!testing){
    console.log("Starting testing");
    let testTime = 0; //Define time in seconds for timer
    testArray = []; testProgress = 0; testPoints = 0;
    testing = true; // starting test
    document.getElementById("testbutton").innerHTML = "Stop Testing";
    document.getElementById('ttip').checked = false;
    ttipClick(); // If Tooltips checkbox was on, set to off and update
    document.getElementById('ttip').disabled = true; // Disable checkbox
    document.getElementById("questions").innerHTML = "Question: 1/"+qsize;
    timerInterval = setInterval( function(){
      testTime++;
      document.getElementById("timer").innerHTML='Time lapsed: '+padNumber(parseInt(testTime/60,10))+':'+padNumber(testTime%60)
    }, 1000);
    
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
    testArray = shuffleArray(testArray);
    console.log("Testing: "+ testArray[testProgress].feature.properties.name);
    document.getElementById('tq').innerHTML = "Where is "+testArray[testProgress].feature.properties.name+" ?";
    document.getElementById('answers').innerHTML = "Correct answers: 0/"+qsize;
    
  } 
  else {
    testing = false; // no longer testing
    document.getElementById("testbutton").innerHTML = "Start Test";
    console.log("not testing");
    document.getElementById('ttip').disabled = false; //un-disable checkbox
    
    clearInterval ( timerInterval );
    
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
      console.log("Testing: "+ testArray[testProgress].feature.properties.name + " "+testArray[testProgress].feature.properties.category);
      document.getElementById('questions').innerHTML = "Question: "+(testProgress+1) +"/"+qsize;
      document.getElementById('tq').innerHTML = "Where is "+testArray[testProgress].feature.properties.name+" ?";
    }
  }
}

// Function to shuffle an array using the Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
