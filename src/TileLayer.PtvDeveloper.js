'use strict';

var L = require('leaflet'),
	superagent = require('superagent');

L.TileLayer.PtvDeveloper = L.TileLayer.extend({
	options: {
		disableMouseEvents : false,
	},

	initialize: function (url, options) {
		options = L.setOptions(this, options);
		
		L.TileLayer.prototype.initialize.call(this, url, options);
	},

	onAdd: function (map) {
		L.TileLayer.prototype.onAdd.call(this, map);

		if(!this.options.disableMouseEvents) {
			var cont = map._container;

			cont.addEventListener('mousemove', L.bind(this._onMouseMove, this), true);
			cont.addEventListener('mousedown', L.bind(this._onMouseDown, this), true);

			map._mapPane.addEventListener('click', L.bind(this._onClick, this), true);
			map.addEventListener('click', L.bind(this._onMapClick, this), false);
		}
	},

	onRemove: function (map) {
		if(!this.options.disableMouseEvents) {
			var cont = map._container;

			cont.removeEventListener('mousemove', L.bind(this._onMouseMove, this), true);
			cont.removeEventListener('mousedown', L.bind(this._onMouseDown, this), true);

			map._mapPane.removeEventListener('click', L.bind(this._onClick, this), true);
			map.removeEventListener('click', L.bind(this._onMapClick, this), false);
		}

		L.TileLayer.prototype.onRemove.call(this, map);
	},

	findElement: function (e, container) {
		if (!container) {
			return null;
		}
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
				if ((layer.referencePixelCoordinates.x - width / 2 <= mp.x) && (layer.referencePixelCoordinates.x + width / 2 >= mp.x) &&
					(layer.referencePixelCoordinates.y - height / 2 <= mp.y) && (layer.referencePixelCoordinates.y + height / 2 >= mp.y)) {
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
		if (!this._map || (this._map.dragging._draggable && this._map.dragging._draggable._moving) || this._map._animatingZoom) {
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
			for(var key in  found[layer].attributes) {
				var value = found[layer].attributes[key];
				description = description.concat(
					key.replace(/[A-Z]/g, ' $&') + ': ' +
					value.replace('_', ' ') + '<br>');
			}
		}
		return description.toLowerCase();
	},

	pixelToLatLng: function (tileKey, point) {
		var earthHalfCircum = Math.PI;
		var earthCircum = earthHalfCircum * 2.0
		var arc = earthCircum / Math.pow(2, tileKey.z);
		var x = -earthHalfCircum + (tileKey.x + (point.x / 256.0)) * arc;
		var y = earthHalfCircum - (tileKey.y + (point.y / 256.0)) * arc;

		return L.latLng(
			(360 / Math.PI) * (Math.atan(Math.exp(y)) - (Math.PI / 4)),
			(180.0 / Math.PI) * x);
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];
		if (tile && tile.el && tile.el.request)
			tile.el.request.abort();
			
		return L.TileLayer.prototype._removeTile.call(this, key);
	},

	createTile: function (coords, done) {
		var url = this.getTileUrl(coords);
		var tile = document.createElement('img');
		tile._map = this._map;
		tile._layers = [];
		tile.request = superagent.get(url);

		tile.request.responseType('json')
			.end(L.bind(function (err, response) {
				tile.request = null;

				if(response && response.body && response.body.image)
				{
					var resp = response.body;
					var prefixMap = {
						'iVBOR': 'data:image/png;base64,',
						'R0lGO': 'data:image/gif;base64,',
						'/9j/4': 'data:image/jpeg;base64,',
						'Qk02U': 'data:image/bmp;base64,'
					};
					
					var rawImage = resp.image;
					tile.src = prefixMap[rawImage.substr(0, 5)] + rawImage;

					if (resp.features) {
						var features = resp.features;

						for (var i = 0; i < features.length; i++) {
							var feature = features[i];
							feature.latLng = this.pixelToLatLng(coords, feature.referencePixelCoordinates);
							tile._layers.push(feature);
						}
					}
				}

				done(null, tile);
			}, this));
		return tile;
	}
});

L.tileLayer.ptvDeveloper = function (url, options) {
	var resolvedUrl =  L.Util.template(url, L.extend({s: 0, x: 0, y: 0, z: 0}, options));

	if (resolvedUrl.indexOf('/data-tiles') !== -1) {
		return new L.TileLayer.PtvDeveloper(url, options);
	} else {
		return new L.TileLayer(url, options);
	}
};

module.exports = L.tileLayer.ptvDeveloper;