 // -------------------------------------------------------------------------
 //     Shared settings for the wine explorer and apartment visualizations.
 // -------------------------------------------------------------------------

// dc.js falls back to d3's old "category20c" palette (removed from d3 v5+) and logs a
// warning about it. Set the same colours explicitly so the charts look as they always have.
dc.config.defaultColors([
	"#3182bd", "#6baed6", "#9ecae1", "#c6dbef", "#e6550d", "#fd8d3c", "#fdae6b", "#fdd0a2",
	"#31a354", "#74c476", "#a1d99b", "#c7e9c0", "#756bb1", "#9e9ac8", "#bcbddc", "#dadaeb",
	"#636363", "#969696", "#bdbdbd", "#d9d9d9"
]);

 // -------------------------------------------------------------------------
 //     Leaflet basemap shared by the wine explorer and apartment maps.
 //
 //     The maps originally used Mapbox's classic v4 tile API ("mapbox.light"),
 //     which Mapbox has retired. CARTO's free "Positron" basemap is the closest
 //     visual match and needs no API key (free for non-commercial use with
 //     attribution). To switch providers, change the URL/options here only.
 // -------------------------------------------------------------------------

var BASEMAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
var BASEMAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>';

function addBaseTiles(map, options) {
	var tileOptions = {
		attribution: BASEMAP_ATTRIBUTION,
		subdomains: 'abcd',
		maxZoom: 19
	};
	for (var key in options) {
		if (Object.prototype.hasOwnProperty.call(options, key)) {
			tileOptions[key] = options[key];
		}
	}
	return L.tileLayer(BASEMAP_TILE_URL, tileOptions).addTo(map);
}
