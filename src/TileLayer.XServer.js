'use strict';

var L = require('leaflet'),
	superagent = require('superagent'),
	nontiledlayer = require('leaflet.nontiledlayer');

L.TileLayer.XServer = L.TileLayer.extend({
	_isrsLayer: false,

	initialize: function (url, options) {
		this._isrsLayer = (url.indexOf('/renderMap') !== -1);

		if (!this._isrsLayer && url.indexOf('contentType=JSON') === -1)
			throw new Error('L.TileLayer.XServer cannot be intatiated directly without contentType=JSON')

		L.TileLayer.prototype.initialize.call(this, url, options);
	},  

	onAdd: function (map) {
		this._resetQueue();

		L.TileLayer.prototype.onAdd.call(this, map);

		var cont = map._container;

		cont.addEventListener('mousemove', L.bind(this._onMouseMove, this), true);
		cont.addEventListener('mousedown', L.bind(this._onMouseDown, this), true);

		map._mapPane.addEventListener('click', L.bind(this._onClick, this), true);
		map.addEventListener('click', L.bind(this._onMapClick, this), false);
	},

	onRemove: function (map) {
		this._resetQueue();

		var cont = map._container;

		cont.removeEventListener('mousemove', L.bind(this._onMouseMove, this), true);
		cont.removeEventListener('mousedown', L.bind(this._onMouseDown, this), true);

		map._mapPane.removeEventListener('click', L.bind(this._onClick, this), true);
		map.removeEventListener('click', L.bind(this._onMapClick, this), false);

		L.TileLayer.prototype.onRemove.call(this, map);
	},

	maxConcurrentRequests: 8,

	requestQueue: [],

	activeRequests: [],

	queueId: 0,

	_setView: function (center, zoom, noPrune, noUpdate) {
		var tileZoom = Math.round(zoom);
		if ((this.options.maxZoom !== undefined && tileZoom > this.options.maxZoom) ||
            (this.options.minZoom !== undefined && tileZoom < this.options.minZoom)) {
			tileZoom = undefined;
		}

		var tileZoomChanged = this.options.updateWhenZooming && (tileZoom !== this._tileZoom);

		if (tileZoomChanged)
			this._resetQueue();

		L.TileLayer.prototype._setView.call(this, center, zoom, noPrune, noUpdate);
	},

	redraw: function () {
		this._resetQueue();

		L.TileLayer.prototype.redraw.call(this);
	},

	_resetQueue: function () {
		this.requestQueue = [];
		this.queueId = this.queueId + 1;

		for (var i = 0; i < this.activeRequests.length; i++) {
			this.activeRequests[i].abort();
		}

		this.activeRequests = [];
	},

	runRequestQ: function (url, request, handleSuccess, force) {
		if (!force && this.activeRequests.length >= this.maxConcurrentRequests) {
			this.requestQueue.push({
				url: url,
				request: request,
				handleSuccess: handleSuccess
			});
			return;
		}

		var that = this;
		var queueId = this.queueId;

		var req;

		if (request == null) { // rest/get
			req = superagent.get(url)
                .end(function (err, resp) {
	that.activeRequests.splice(that.activeRequests.indexOf(request), 1);
	if (that.queueId == queueId && that.requestQueue.length) {
		var pendingRequest = that.requestQueue.shift();
		that.runRequestQ(pendingRequest.url, pendingRequest.request, pendingRequest.handleSuccess, true);
	}

	handleSuccess(err, resp);
});
		} else { // rs/post
			req = superagent.post(url)
                .set('Content-Type', 'application/json')
                .send(request)
                .auth(this.options.username, this.options.password)
                .end(function (err, resp) {
	that.activeRequests.splice(that.activeRequests.indexOf(request), 1);
	if (that.queueId == queueId && that.requestQueue.length) {
		var pendingRequest = that.requestQueue.shift();
		that.runRequestQ(pendingRequest.url, pendingRequest.request, pendingRequest.handleSuccess, true);
	}

	handleSuccess(err, resp);
});
		}

		this.activeRequests.push(req);
	},

	findElement: function (e, container) {
		if (!container)
			return null;

		var result = {};

		var tiles = Array.prototype.slice.call(container.getElementsByTagName('img')),
			i, len, tile;

		for (i = 0, len = tiles.length; i < len; i++) {
			tile = tiles[i];
			var mp = L.DomEvent.getMousePosition(e, tile);

			for (var j = tile._layers.length - 1; j >= 0; j--) {
				var layer = tile._layers[j];
				var width = Math.abs(layer.pixelBoundingBox.right - layer.pixelBoundingBox.left);
				var height = Math.abs(layer.pixelBoundingBox.top - layer.pixelBoundingBox.bottom);
				if ((layer.referencePixelPoint.x - width / 2 <= mp.x) && (layer.referencePixelPoint.x + width / 2 >= mp.x) &&
                    (layer.referencePixelPoint.y - height / 2 <= mp.y) && (layer.referencePixelPoint.y + height / 2 >= mp.y)) {
					if (!result[layer.id])
						result[layer.id] = layer;
				}
			}
		}

		if (Object.keys(result).length > 0)
			return result;

		return null;
	},

	_onMouseMove: function (e) {
		if (!this._map || this._map.dragging._draggable._moving || this._map._animatingZoom) {
			return;
		}

		if (this.findElement(e, this._container)) {
			e.preventDefault();

			this._map._container.style.cursor = 'pointer';

			e.stopPropagation();
		} else {
			this._map._container.style.cursor = '';
		}
	},

	_onMouseDown: function (e) {
		var found = this.findElement(e, this._container);
		if (found) {
			e.preventDefault();

			e.stopPropagation();
			return false;
		}
	},

	_onClick: function (e) {
		var found = this.findElement(e, this._container);
		if (found) {
			e.preventDefault();

			var description = this.buildDescriptionText(found);

			var point = found[Object.keys(found)[0]].latLng;

			L.popup()
                .setLatLng(point)
                .setContent(description)
                .openOn(this._map);

			e.stopPropagation();
			return false;
		}
	},

	_onMapClick: function (e) {
		var found = this.findElement(e.originalEvent, this._container);
		if (found) {
			var description = this.buildDescriptionText(found);

			var point = found[Object.keys(found)[0]].latLng;

			L.popup()
                .setLatLng(point)
                .setContent(description)
                .openOn(this._map);

			return false;
		}
	},

	buildDescriptionText: function (found) {
		var description = '';
		var isFirstLayer = true;

		for (var layer in found) {
			if (isFirstLayer) {
				isFirstLayer = false;
			} else {
				description = description + '<br>';
			}

			for (var i = 0; i < found[layer].attributes.length; i++) {
				var attribute = found[layer].attributes[i];
				description = description.concat(
                    attribute.key.replace(/[A-Z]/g, ' $&') + ': ' +
                    attribute.value.replace('_', ' ') + '<br>');
			}
		}

		return description.toLowerCase();;
	},

	pixToLatLng: function (tileKey, point) {
		var earthHalfCircum = Math.PI;
		var earthCircum = earthHalfCircum * 2.0
		var arc = earthCircum / Math.pow(2, tileKey.z);
		var x = -earthHalfCircum + (tileKey.x + (point.x / 256.0)) * arc;
		var y = earthHalfCircum - (tileKey.y + (point.y / 256.0)) * arc;

		return L.latLng(
            (360 / Math.PI) * (Math.atan(Math.exp(y)) - (Math.PI / 4)),
            (180.0 / Math.PI) * x);
	},

	createTile: function (coords, done) {
		var tile = document.createElement('img');

		L.DomEvent.on(tile, 'load', L.bind(this._tileOnLoad, this, done, tile));
		L.DomEvent.on(tile, 'error', L.bind(this._tileOnError, this, done, tile));

		if (this.options.crossOrigin) {
			tile.crossOrigin = '';
		}

        /*
         Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
         http://www.w3.org/TR/WCAG20-TECHS/H67
        */
		tile.alt = '';

        /*
         Set role="presentation" to force screen readers to ignore this
         https://www.w3.org/TR/wai-aria/roles#textalternativecomputation
        */
		tile.setAttribute('role', 'presentation');

		var url = this.getTileUrl(coords);

		if (this._isrsLayer) {
            // Modify/extend this object for customization, for example the stored profile 
			var request = {
				'mapSection': {
					'$type': 'MapSectionByTileKey',
					'zoomLevel': coords.z,
					'x': coords.x,
					'y': coords.y
				},
				'imageOptions': {
					'width': 256,
					'height': 256
				},
				'resultFields': {
					'image': true
				}
			};

			if (this.options.requestExtension) {
				request = L.extend(request, this.options.requestExtension);
			}
		}

		tile._map = this._map;
		tile._layers = [];

		this.runRequestQ(url, request,
            L.bind(function (error, response) {
	if (!this._map)
		return;

	if (error) {
		tile.src = '';
		return;
	}

	var resp = JSON.parse(response.text);

	var prefixMap = {
		'iVBOR': 'data:image/png;base64,',
		'R0lGO': 'data:image/gif;base64,',
		'/9j/4': 'data:image/jpeg;base64,',
		'Qk02U': 'data:image/bmp;base64,'
	};

	var rawImage = resp.image;
	tile.src = prefixMap[rawImage.substr(0, 5)] + rawImage;

	if (resp.features) {
		var objectInfos = resp.features;

		for (var i = 0; i < objectInfos.length; i++) {
			var oi = objectInfos[i];
			oi.latLng = this.pixToLatLng(coords, oi.referencePixelPoint);
			tile._layers.push(oi);
		}
	}
}, this));

		return tile;
	}
});

L.tileLayer.xserver = function (url, options) {
	if ((url.indexOf('/renderMap') !== -1) || (url.indexOf('contentType=JSON') !== -1)) {
		return new L.TileLayer.XServer(url, options);
	} else {
		return new L.TileLayer(url, options);
	}
};

module.exports = L.tileLayer.xserver;