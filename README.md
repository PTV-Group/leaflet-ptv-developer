[![Build status](https://travis-ci.org/ptv-logistics/leaflet-xserver.svg)](https://travis-ci.org/ptv-logistics/leaflet-xserver)
[![NPM version](https://img.shields.io/npm/v/leaflet-xserver.svg)](https://www.npmjs.com/package/leaflet-xserver)
![XServer 2.2!](https://img.shields.io/badge/XServer-2.2-blue.svg?style=flat)
![Leaflet compatible!](https://img.shields.io/badge/Leaflet-0.7.7%2F1.0.2-blue.svg?style=flat)

leaflet-xserver provides classes to add xMapServer specific features to Leaflet.

### L.TileLayer.XServer

The Layer class `L.TileLayer.XServer` can be used to make xServer elements clickable. 

#### As single map
[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable.1.0.html)

The easiest way to add a clickable layer is to use the new `TileLayerXServer` and append a clickable xServer-Layer (`PTV_TruckAttributes`) to the profile. The icons of the layer can now be clicked to display the object information. The options are the same as for `L.TileLayer`

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var interactiveTileLayer = L.tileLayer.xserver(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}' +
    '?storedProfile={profile}&layers=background,transport,labels,PTV_TruckAttributes&contentType=JSON&xtok={token}',
    {
        profile: 'silkysand',
        token: window.token,
        attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
        subdomains: '1234',
        maxZoom: 22,
        pane: 'tilePane'
    }).addTo(map);
```

#### As layered map
[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable-Layered.1.0.html)

It's also possible to split the xMapServer map into separate Leaflet layers. This sample creates a standard xMapServer basemap-layer and a clickable truck attributes overlay. A client-side layer `L.Circle`can then be added between the two xMapServer layers by assigning them to different panes (`tilePane`, `overlayPane` and  `shadowPane`).

```javascript
var coordinate = L.latLng(49.01405, 8.4044); // KA
var radius = 250; // m

var map = L.map('map').setView(coordinate, 14);

var basemapLayer = L.tileLayer(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}' +
    '?storedProfile={profile}&xtok={token}',
    {
        profile: 'silkysand',
        token: window.token,
        attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
        subdomains: '1234',
        maxZoom: 22,
        pane: 'tilePane'
    }).addTo(map);

var circle = L.circle(coordinate, radius / Math.cos(coordinate.lng / 2 / Math.PI), {
        color: 'red',
        fillColor: 'orange',
        fillOpacity: 0.5,
        pane: 'overlayPane'
    }).addTo(map).bindPopup("I am a circle.");

var truckAttributesLayer = L.tileLayer.xserver(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rest/XMap/tile/{z}/{x}/{y}' +
    '?storedProfile={profile}&layers=PTV_TruckAttributes&contentType=JSON&xtok={token}',
    {
        profile: 'silkysand',
        token: window.token,
        attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
        subdomains: '1234',
        maxZoom: 22,
        pane: 'clickableTiles'
    }).addTo(map);
```

#### Using the JSON API
[Demo](https://ptv-logistics.github.io/xserverjs/boilerplate/Leaflet-Clickable.1.0-rs.html)

If you need more than the standard REST parameters, `L.TileLayer.XServer` can be initialized with a `requestExtension` property. This property then contains parameters which are sent using the JSON api.

```javascript
var map = L.map('map').setView(new L.LatLng(49.01405, 8.4044), 14);

var interactiveTileLayer = L.tileLayer.xserver(
    'https://s0{s}-xserver2-europe-test.cloud.ptvgroup.com/services/rs/XMap/renderMap',
    {
        requestExtension: {
            "storedProfile": "gravelpit",
            "requestProfile": {
                "featureLayerProfile": {
                    "themes": [{
                        "enabled": true,
                        "id": "PTV_TruckAttributes"
                    }]
                }
            },
            "resultFields": {
                "featureThemeIds": ["PTV_TruckAttributes"]
                }
        },
        username: 'xtok',
        password: window.token,
        attribution: '<a target="_blank" href="http://www.ptvgroup.com">PTV</a>, HERE',
        subdomains: '1234',
        maxZoom: 22,
        pane: 'tilePane'
    }).addTo(map);
```

#### L.TileLayer.XServer for Leaflet 0.7

leaflet-xserver also has a specific `L.TileLayer.XServer07` class for bawckward-compatibility with Leaflet 0.7.x.

### L.NonTiledLayer, L.NonTiledLayer.WMS

Not all imagery providers can handle tiles properly, for example if they render labels dynamically.
So we've added a Leaflet.NonTiledLayer which gets the imagery for the complete map viewport whenever it changes.
Leaflet.NonTiledLayer.WMS is the implementation that makes WMS requests, similar to the TileLayer.WMS. The layer supports both Leaflet 0.7.x and Leaflet 1.0.

You can use this layer to add the xMapServer-1 base map to Leaflet via the xMapServer WMS adapter. 

[Demo Leaflet 0.7](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/Leaflet.0.7.html)

[Demo Leaflet 1.0](https://ptv-logistics.github.io/xserverjs/boilerplate/xmap-1/Leaflet.1.0.html)

Get detailed information about the recommended xMapServer-1 integration at the [xMapServer-1 section](https://github.com/ptv-logistics/xserverjs/tree/master/boilerplate/xmap-1/).

#### The options of L.NonTiledLayer:

* *attribution* - the attribution text for the layer data. Default: ```''```
* *opacity* - the opacity value between 0.0 and 1.0. Default: ```1.0```
* *minZoom* - the minimum zoom level for which the overlay is requested. Default: ```0```
* *maxZoom* - the maximum zoom level for which the overlay is requested. Default: ```18```
* *bounds* - the geographic bounds of the layer. Default: ```L.latLngBounds([-180, -85.05], [180, 85.05])```
* *zIndex* - z-index of the images. Default: ```undefined```
* *pane* - the name of the pane where the child div is inserted. Default: ```'overlayPane'``` 
* *pointerEvents* - the pointer-events style for the overlayer. Default: ```null```
* *errorImageUrl* - the url of the image displayed when the layer fails to load (invalid request or server error). Default: 1px transparent gif ```data:image/gif;base64,R0lGODlhAQABAHAAACH5BAUAAAAALAAAAAABAAEAAAICRAEAOw==```
* *useCanvas* - use the canvas to render the images, fixes flickering issues with Firefox, doesn't work on IE8. Setting it to ```undefined``` will use canvas, if available. Default: ```undefined``` 

You can find more information of L.NontiledLayer at the [GitHub page](https://github.com/ptv-logistics/Leaflet.NonTiledLayer).
