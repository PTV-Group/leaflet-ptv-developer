![Leaflet compatible!](https://img.shields.io/badge/Leaflet-1.x-blue.svg?style=flat)

## Purpose

leaflet-ptv-developer provides classes to add [PTV Developer](https://developer.myptv.com/) specific features to Leaflet.

## Components

* [L.TileLayer.PtvDeveloper](#tilelayerptvdeveloper)

## How to build

```npm install``` 

or use the latest build at https://unpkg.com/leaflet-ptv-developer/dist/

<a name="tilelayerptvdeveloper"></a>
### L.TileLayer.PtvDeveloper

The Layer class `L.TileLayer.PtvDeveloper` can be used to make PTV Developer [`data-tiles`](https://developer.myptv.com/Documentation/Raster%20Maps%20API/Code%20Samples/Data%20Tiles.htm) elements clickable or request tiles with specific parameters.

#### Additional options

* *disableMouseEvents* - disables all mouse click and hover events. Default: ```false```


#### Integration as single raster map

The easiest way to add a clickable layer is to use class `L.TileLayer.PtvDeveloper`, append a clickable `data-tiles` layer (e.g. `restrictions` or `trafficIncidents`) to the profile and set the api key. The icons of the layer can now be clicked to display the object information. The options are the same as for `L.TileLayer`

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var interactiveTileLayer =  L.tileLayer.ptvDeveloper(
            'https://api.myptv.com/rastermaps/v1/data-tiles/{z}/{x}/{y}' +
            '?apiKey={token}&layers={layers}', {
                attribution: '&copy; ' + new Date().getFullYear() + ' PTV Group, HERE',
                profile: 'silkysand',
                layers: 'background,transport,labels,restrictions',
                token: window.apiKey,
                maxZoom: 22,
                pane: 'tilePane'
            }).addTo(map);

```

#### Integration as layered raster map

It's also possible to split the PTV Developer raster tiles into separate Leaflet layers. This sample creates a [`image-tiles`](https://developer.myptv.com/Documentation/Raster%20Maps%20API/Code%20Samples/Image%20Tiles.htm) base map layer and a clickable restrictions `data-tiles` overlay.

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

map.createPane('clickableTiles');
map.getPane('clickableTiles').style.zIndex = 500;

var basemapLayer = L.tileLayer(
    'https://api.myptv.com/rastermaps/v1/image-tiles/{z}/{x}/{y}' +
    '?apiKey={token}&layers={layers}', {
        attribution: '&copy; ' + new Date().getFullYear() + ' PTV Group, HERE',
        profile: 'silkysand',
        layers: 'background,transport',
        token: window.apiKey,
        maxZoom: 22,
        pane: 'tilePane'
    }).addTo(map);

var restrictionsLayer = L.tileLayer.ptvDeveloper(
    'https://api.myptv.com/rastermaps/v1/data-tiles/{z}/{x}/{y}' +
    '?apiKey={token}&layers={layers}', {
        profile: 'silkysand',
        layers: 'restrictions,labels',
        token: window.apiKey,
        subdomains: '1234',
        maxZoom: 22,
        pane: 'clickableTiles'
    }).addTo(map);

```

###  Integration as a layered vector map

Another possiblity is to mashup a clickable `data-tiles` layer with a [`vector-tiles`](https://developer.myptv.com/Documentation/Vector%20Maps%20API/QuickStart.htm) base map layer. 

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var vectorLayer = L.maplibreGL({
        attribution: '&copy; ' + new Date().getFullYear() + ' PTV Group, HERE',
        interactive:false,
        style: 'https://vectormaps-resources.myptv.com/styles/latest/standard.json',
        transformRequest: (url, resourceType) => {
        if (resourceType === 'Tile' && url.startsWith('https://api.myptv.com')) {
            return {
            url: url + '?apiKey=' + window.apiKey
            }
        }
        }
    }).addTo(map);
    
map.createPane('clickableTiles');
map.getPane('clickableTiles').style.zIndex = 500;

var restrictionsLayer = L.tileLayer.ptvDeveloper(
    'https://api.myptv.com/rastermaps/v1/data-tiles/{z}/{x}/{y}' +
    '?apiKey={token}&layers={layers}', {
        profile: 'silkysand',
        layers: 'restrictions',
        token: window.apiKey,
        subdomains: '1234',
        maxZoom: 22,
        pane: 'clickableTiles'
    }).addTo(map);

```

