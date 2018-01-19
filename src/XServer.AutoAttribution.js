// magic auto attribution for xMapServer-2
(function () {
	'use strict';

	var L = (typeof window !== 'undefined' ? window['L'] : typeof global !== 'undefined' ? global['L'] : null),
		superagent = require('superagent');

	// hijack TileLayer initialize
	var proto = L.TileLayer.prototype;
	var prev = proto.initialize;

	// match for xMap-2 /rest/ and /rs/ urls
	var xmapRegex = new RegExp('(^https?:\/\/.*\/)services\/(rest|rs)\/XMap\/');

	// match for xserver-internet token (only new GUID-tokens!)
	var tokenRegex = new RegExp('[&\?]xtok=(\\w{8}-\\w{4}-\\w{4}-\\w{4}-\\w{12})');

	proto.initialize = function (url, options) {
		// base initialization first
		prev.call(this, url, options);

		autoSetAttributions(this);
	};

	var prevRedraw = proto.redraw;

	proto.redraw = function () {
		autoSetAttributions(this);

		prevRedraw.call(this);
	};

	function autoSetAttributions(layer) {
		// get the resolved uri string
		var resolvedUrl = layer.getTileUrl({
			x: 0,
			y: 0,
			z: 0
		});

		// does it match an xMap-2 url?
		var urlMatch = xmapRegex.exec(resolvedUrl);
		if (!urlMatch || urlMatch.length < 2)
			return;

		// use the same host for XRuntime
		var host = urlMatch[1];

		// parse token from resolvedUrl
		var tokenMatch = tokenRegex.exec(resolvedUrl);
		var token = (tokenMatch && tokenMatch.length > 1) ? tokenMatch[1] : null;

		// get copyright from XRuntime
		var req = superagent.post(host + 'services/rs/XRuntime/experimental/getDataInformation')
			.set('Content-Type', 'application/json')
			.send({
				dataInformationOptions: {
					returnOnlyLicensedMapFeatures: true
				},
				resultFields: {
					continents: false
				}
			});

		if (token)
			req.auth('xtok', token);

		req.end(function (err, resp) {
			var oldCopyright = layer.options.attribution;

			var newCopyright = (err || !resp || !resp.body || !resp.body.mapDescription ||
					!resp.body.mapDescription.copyright) ?
				'PTV, HERE (or maybe TOMTOM), AND' :
				matchCopyrights(resolvedUrl, resp.body.mapDescription.copyright);

			layer.options.attribution = newCopyright;

			// set or replace copyright in attributionControl
			if (layer._map && layer._map.attributionControl) {
				if (oldCopyright) // remove old copyright
					layer._map.attributionControl.removeAttribution(oldCopyright);

				layer._map.attributionControl.addAttribution(newCopyright);
			}
		});
	}

	function matchCopyrights(url, copyright) {
		var matchedCopyrights = [];

		// match feature layer copyrights
		var featurelayerRegex = /(PTV_[A-Za-z]*)/g;
		if (copyright.featureLayers && copyright.featureLayers.length > 0) {
			var featurelayerMatches = url.match(featurelayerRegex);
			if (featurelayerMatches && featurelayerMatches.length > 0) {
				copyright.featureLayers.forEach(function (el) {
					if (featurelayerMatches.indexOf(el.themeId) !== -1)
						matchedCopyrights = matchedCopyrights.concat(el.copyright);
				});
			}
		}

		// match for basemap copyrights
		var baselayerRegex = new RegExp('(&|\\?)(layers=.*(background|labels|transport)|^((?!layers=).)*$)');
		var baselayerMatch = baselayerRegex.exec(url);
		if (baselayerMatch && baselayerMatch.length > 0 || matchedCopyrights.length === 0) {
			matchedCopyrights = matchedCopyrights.concat(copyright.basemap ? copyright.basemap : copyright);
		}

		// make mentions unique
		var result = [];
		matchedCopyrights.forEach(function (el) {
			if (result.indexOf(el < 0)) result.push(el);
		});
		return result;
	}

	var protoAttribution = L.Control.Attribution.prototype;

	var prev_update = proto._update;

	protoAttribution._update = function () {
		if (!this._map) {
			return;
		}

		var attribs = [];

		for (var i in this._attributions) {
			if (this._attributions[i]) {
				var split = i.split(',');
				attribs = attribs.concat(split);
			}
		}
		var uniqueAttribs = [];
		attribs.forEach(function (el) {
			if (uniqueAttribs.indexOf(el) < 0) uniqueAttribs.push(el);
		});
		uniqueAttribs.sort().reverse();

		var prefixAndAttribs = [];

		if (this.options.prefix) {
			prefixAndAttribs.push(this.options.prefix);
		}
		if (uniqueAttribs.length) {
			prefixAndAttribs.push(uniqueAttribs.join(', '));
		}

		this._container.innerHTML = prefixAndAttribs.join(' | ');
	};
})();