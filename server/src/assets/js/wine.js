 // -------------------------------------------------------------------------
 //     Created by Kate Willison in 2017, based on visualizations attributed below. 
 //     Feel free to remix & reuse under the MIT licence terms described here:
 //     https://opensource.org/licenses/MIT
 // -------------------------------------------------------------------------


/**
Data JSON format:

{ 	"varietals" : [ ...,  {"name": "Barbera", "id":9,  "fruit":4,  "body":4,   "dryness":0,  "acidity":5, "alcohol":4,  "tannins":1,  "color":5, "aromas": [52, 54, 60, 61, 62, 71, 85, 88, 94, 112, 155, 157, 165, 166], "countries": [15, 30, 2] }, ... ], 
	"aromas": [ ...,  {"name": "Floral", "id":1}, ... ], 
	"colors": [ ...,  {"name": "color_straw", "id":2}, ...], 
	"countries": [  ...,  {"name": "Algeria", "id":1},  ... ]
} 

**/

	// ----------------------------------------------------------------
	//       Set up map and wheel properties
	// ----------------------------------------------------------------
var wineExplorerRendered = false;
var WINE_CHART_GROUP = "wine-explorer"; // dc.js chart group, so filtering here doesn't redraw the apartment charts
var fitWineExplorerToWidth = null; // set once the explorer has loaded

function renderWineExplorer() {
	setAromaWheelPadding();
	if (wineExplorerRendered && fitWineExplorerToWidth) {
		// Already drawn: re-fit in case the window was resized while this page was hidden
		fitWineExplorerToWidth();
	}
	if (!wineExplorerRendered) {

		// -------------------------------
		// ----------Map setup
		// -------------------------------
		var wineMap = L.map('wine-map');
		var countryMarkers = new L.FeatureGroup();

		addBaseTiles(wineMap, {
			maxZoom: 16,
			attribution: BASEMAP_ATTRIBUTION + ' | Created for CME161'
		});

		// Define color scale & legend
		function getChoroColor(d) {
			return d > 25 ? '#800026' :
				d > 20 ? '#BD0026' :
				d > 15 ? '#E31A1C' :
				d > 10 ? '#FC4E2A' :
				d > 7 ? '#FD8D3C' :
				d > 3 ? '#FEB24C' :
				d > 1 ? '#FED976' :
				'#FFEDA0';
		};

		var selected_country_ids = [];
		var choloStyle = function(d, id) {
			var isSelected = (selected_country_ids.indexOf(id) > -1); 
			if (selected_country_ids.length == 0) { isSelected = true; }
			return {
				"color": getChoroColor(d),
				"weight": 2,
				dashArray: '3',
				fillOpacity: isSelected ? 0.5 : 0
			}
		};
			
		var legend = L.control({
			position: 'bottomleft'
		});

		//Add legend
		legend.onAdd = function(wineMap) {
			var div = L.DomUtil.create('div', 'info legend'),
				grades = [1, 3, 7, 10, 15, 20, 25],
				labels = [];
				div.innerHTML += '<h4><b># of Wines</b></h4>'
			// loop through our density intervals and generate a label with a colored square for each interval
			for (var i = 0; i < grades.length; i++) {
				div.innerHTML +=
					'<i style="background:' + getChoroColor(grades[i] + 1) + '"></i> ' +
					grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
			}

			return div;
		};
		legend.addTo(wineMap);


		// -------------------------------
		// ----------Aroma wheel setup
		// -------------------------------
		// Sunburst graph adapted from http://bl.ocks.org/mbostock/4063423
		var wheel_width = 500,
			wheel_height = 500,
			wheel_radius = Math.min(wheel_width, wheel_height) / 2;

		var svg = d3.select("#aroma_wheel").insert("svg",":first-child") // .append("svg") // 
			.attr("width", "100%")
			.attr("preserveAspectRatio", "xMinYMin meet")
			.attr("viewBox","0 0 " + wheel_width + " " + wheel_height)
			//class to make it responsive
			.classed("svg-content-responsive", true)
			.append("g")
			.attr("transform", "translate(" + wheel_width / 2 + "," + wheel_height * .5 + ")");
			
		var svgText = svg.append("text")

		// Add hovered aroma label
		svgText.append("tspan")
			.attr("x", "0")
			.attr("text-anchor", "middle")
			.style("font-weight", "bold")
			.text("This Aroma:");
		svgText.append("tspan")
			.attr("x", "0")
			.attr("text-anchor", "middle")
			.attr("dy", "25")
			.attr("id", "aroma_hover")
			.text(" ");

		// Each leaf aroma gets an equal slice; inner rings are the sum of their children.
		// (Path data are d3.hierarchy nodes; the raw aroma objects are in node.data.)
		var partition = d3.partition()
			.size([2 * Math.PI, wheel_radius * wheel_radius]);

		var arc = d3.arc()
			.startAngle(function(d) {
				return d.x0;
			})
			.endAngle(function(d) {
				return d.x1;
			})
			.innerRadius(function(d) {
				return Math.sqrt(d.y0);
			})
			.outerRadius(function(d) {
				return Math.sqrt(d.y1);
			});



// ----------------------------------------------------------------
//       Load data
// ----------------------------------------------------------------

		d3.json("/api/v1.0/data/wine_finder_data/").then(function(remote_json) {

			// ----------------------------------------------------------------
			//       Crossfilter setup
			// ----------------------------------------------------------------
			
			// crossfilter
			var cf = crossfilter(remote_json.varietals);
			
			// create dimensions
			var color = cf.dimension(function(d) { return getNameForId(remote_json.colors, d.color); });
			var fruit = cf.dimension(function(d) { return d.fruit; });
			var body = cf.dimension(function(d) { return d.body; });
			var dryness = cf.dimension(function(d) { return d.dryness; });
			var acidity = cf.dimension(function(d) { return d.acidity; });
			var alcohol = cf.dimension(function(d) { return d.alcohol; });
			var tannins = cf.dimension(function(d) { return d.tannins; });
			var name = cf.dimension(function(d) { return d.name; });
			var country = cf.dimension(function(d) { return d.countries; }, true);
			var aromas = cf.dimension(function(d) { return d.aromas; }, true);
			var allDim = cf.dimension(function(d) { return d; });

			// create groups
			var color_sum = color.group().reduceSum(function(d) { return 1; });
			var fruit_sum = fruit.group().reduceSum(function(d) { return 1; });
			var body_sum = body.group().reduceSum(function(d) { return 1; });
			var dryness_sum = dryness.group().reduceSum(function(d) { return 1; });
			var acidity_sum = acidity.group().reduceSum(function(d) { return 1; });
			var alcohol_sum = alcohol.group().reduceSum(function(d) { return 1; });
			var tannins_sum = tannins.group().reduceSum(function(d) { return 1; });
			var country_sum = country.group().reduceSum(function(d) { return 1; });
			var aroma_sum = aromas.group().reduceSum(function(d) { return 1; });
			var name_sum = name.group().reduceSum(function(d) { return 1; });


// ----------------------------------------------------------------
//       Create charts
// ----------------------------------------------------------------
			
			// -------------------------------
			// ----------Add aroma wheel
			// -------------------------------
			var aroma_map_root = remote_json.aroma_map;
			var aroma_hierarchy = d3.hierarchy(aroma_map_root)
				.sum(function(d) { return d.children ? 0 : 1; });
			var path = svg.selectAll("path")
				.data(partition(aroma_hierarchy).descendants())
				.enter().append("path")
				.attr("display", function(d) {
					return d.depth ? null : "none";
				}) // hide inner ring
				.attr("d", arc)
				.style("stroke", "#fff")
				.style("fill", function(d) {
					var id = getChildAromaId(d.data);
					return getChoroColor(30*id/177);
				})
				.style("fill-rule", "evenodd")
				.style("cursor", "pointer")
				.on("mouseover", wheel_mouseover)
				.on("click", wheel_click)
				.on("mouseout", function() {
					d3.select("#aroma_hover").text(" ");
				});
			
			// Chart width helper
			var width = document.getElementById("wine-explorer-size").offsetWidth;
			var get_chart_width = function(d) { return Math.min(Math.max(d, 160), 300)};
			var chart_WL = get_chart_width(width / 4)
			
				// Chart color helper
			function getChildAromaId(d) {
				while (d.children) { d = d.children[0]; }
				return d.aroma_id;
			}
			
			

			// -------------------------------
			// ----------Add map
			// -------------------------------
			//Helper function to draw map
			function drawMap(cf_group, dict, map_markers) { 
				map_markers.clearLayers();
				cf_group
					.top(Infinity)
					.forEach(function(d, i) {
						if (d.value > 0) {
							var countryID = d.key;
							var location = dict[countryID - 1];
							var name = location.name;
							var marker = L.geoJSON(location.geojson, {
								style: choloStyle(d.value, countryID)
							});
							marker.on("click", function () {
								set_country_selection(countryID);
							});
							marker.on("mouseover", function () {
								$("#region_hover").text(name);
							});
							marker.on("mouseout", function () {
								update_selected_country_text();
							});

							map_markers.addLayer(marker);
						}
					});
				wineMap.addLayer(map_markers);
				wineMap.fitBounds([
					[71.3577, 178.5170],
					[-55.6118, -171.7911]
				]);
			}

			// -------------------------------
			// ----------Add pie chart
			// -------------------------------
			var sum = 0;
			var color_chart = dc.pieChart("#color_chart", WINE_CHART_GROUP)
				.width(200)
				.height(200)
				.radius(100)
				//.innerRadius(50)
				.dimension(color)
				.group(color_sum)
				.renderLabel(true)
				.ordering(function(d) {
					var order = {
						'straw': 2,
						'gold': 1,
						'green': 3,
						'garnet': 4,
						'ruby': 5,
						'purple': 6
					};
					return order[d.key];
				})
				.ordinalColors(["#F7C938", "#F2D780", "#DEE0A1",
					"#943543", "#791925", "#66023C"
				])
				.label(function(d) {
					var string = d.key;
					return string.charAt(0).toUpperCase() + string.slice(1);
				});


			// -------------------------------
			// ------Add property bar charts
			// -------------------------------	
			var xAxisLabels = {0:"", 1:"L", 2:"M-", 3:"M", 4:"M+", 5:"H"};

			// Chart creator-helper
			function create_chart(elementID, dimension, group) {
				var newChart = dc.barChart("#".concat(elementID), WINE_CHART_GROUP)
					.width(chart_WL)
					.height(chart_WL)
					.dimension(dimension)
					.group(group)
					.centerBar(true)
					.x(d3.scaleLinear().domain([0.5, 5.5]))
					.xUnits(dc.units.fp.precision(1))
					.yAxisLabel('Count')
					// Colour each bar by its level (1-5). Set through dc so it lands in the
					// `fill` attribute, which dc.css's grey `.deselected` rule can override.
					.colorAccessor(function(d) { return d.key; }) // stacked charts default to the layer name
					.colors(function(level) { return getChoroColor(level * 5); });
				newChart.xAxis().ticks(5);
				newChart.yAxis().ticks(5);
				newChart.xAxis().tickFormat(function (v) { return xAxisLabels[v]; });
				return newChart
			};

			var body_chart = create_chart("body_chart", body, body_sum);
			var acidity_chart = create_chart("acidity_chart", acidity, acidity_sum);
			var alcohol_chart = create_chart("alcohol_chart", alcohol, alcohol_sum);
			var fruit_chart = create_chart("fruit_chart", fruit, fruit_sum);
			var dryness_chart = create_chart("dryness_chart", dryness, dryness_sum);
			var tannins_chart = create_chart("tannins_chart", tannins, tannins_sum);


			// -------------------------------
			// ----------Add data table
			// -------------------------------
			var dataTable = dc.dataTable('#wine-data-table', WINE_CHART_GROUP)
				.dimension(allDim)
				.size(100)
				.section(function(d) { return ''; })
				.showSections(false)
				.sortBy(function(d){ return d.name; })
				.order(d3.ascending)
				.columns([
						function(d) { return d.name; },
						function(d) { return getNameForId(remote_json.colors, d.color); },
						function(d) { return xAxisLabels[d.body]; },
						function(d) { return xAxisLabels[d.acidity]; },
						function(d) { return xAxisLabels[d.alcohol]; },
						function(d) { return xAxisLabels[d.fruit]; },
						function(d) { return xAxisLabels[d.dryness]; },
						function(d) { return xAxisLabels[d.tannins]; }
				])
				.on('renderlet', function(table) {
					updateCount(allDim.top(Infinity));
					drawMap(country_sum, remote_json.countries, countryMarkers);
					createColorSwatches();
					
					// Add filtering when a user clicks on rows
					$('#wine-data-table .dc-table-row').click(function() {
						var varietal_text = $(this).find("td._0").text()
						set_varietal_selection(varietal_text);
					});
				});

			var swatchColors = {
				'straw': "#F2D780",
				'gold': "#F7C938",
				'green': "#DEE0A1",
				'garnet': "#943543",
				'ruby': "#791925",
				'purple': "#66023C"
			}

			function createColorSwatches() {
				$(".dc-table-column._1").each(function(index, thisCell) {
					var color = thisCell.innerText || thisCell.textContent;
					var div = document.createElement("div");
					div.style.width = "10px";
					div.style.height = "10px";
					div.style.background = swatchColors[color];
					div.style.display = "inline-block";
					div.title = color;
					thisCell.innerHTML = '';
					thisCell.appendChild(div);
				});
			}

// ----------------------------------------------------------------
//       Chart helper functions
// ----------------------------------------------------------------

			// --------------------------------------
			// --------- Aroma selection helpers
			// --------------------------------------
			// Update node selection in view from svg properties
			function sync_node_selection_view() {
				update_selected_aroma_text();
				svg.selectAll("path")
					.style("opacity", function(d) {
						if (d.data.selected || selected_aroma_ids.length === 0) {
							return 1;
						}
						return 0.2
					})    
			}

			// Toggle wedge selection (using svg properties) from selected aroma_map_root node,
			// update selected_aroma_ids to reflect the result of the data toggle
			function set_node_selection(d, selection) {
				d.selected = selection;
				var index = selected_aroma_ids.indexOf(d.aroma_id);
				if (d.children) {
					for (var i = 0; i < d.children.length; i++) {
						set_node_selection(d.children[i], selection);
					}
				} else if (selection && (index == -1)) {
					selected_aroma_ids.push(d.aroma_id);
				} else if (index > -1) { 
					selected_aroma_ids.splice(index, 1);
				}
			}

			// Update selected aromas in view (svg properties) from selected_aroma_ids array
			function select_aromas_from_array(arr) {
				selected_aroma_ids = arr;
				svg.selectAll("path").each(function(d) {
					d.data.selected = (selected_aroma_ids.indexOf(d.data.aroma_id) > -1);
				});
			}

			// Update selected aroma text from svg properties
			function update_selected_aroma_text() {
				var aroma_text = update_selected_aroma_text_helper(aroma_map_root);
				d3.select("#aroma_selection").text(aroma_text);
			}

			function update_selected_aroma_text_helper(d) {
				var aroma_text = d.selected ? d.name : "";
				if (d.children) {
					for (var i = 0; i < d.children.length; i++) {
						var add_text = update_selected_aroma_text_helper(d.children[i]);
						if (add_text != "") {
							aroma_text = aroma_text + ((aroma_text === "") ? "" : ", ") + add_text;
						}
					}
				}
				return aroma_text;
			}

			// Set explanation on wheel mouseover
			function wheel_mouseover(event, d) {
				d3.select("#aroma_hover").text(d.data.name);
			}

			// --------------------------------------
			// --------- Map selection helpers
			// --------------------------------------
			// Update selected country text
			function update_selected_country_text() {
				if (selected_country_ids.length == 0) {
					$("#region_hover").html("&nbsp");
				} else {
					var selected_countries = remote_json.countries.filter(function (c) {
					  	return selected_country_ids.indexOf(c.id) > -1; 
					});

					var selected_country_text = selected_countries.map(function(c){ return c.name; }).join(", ");
					$("#region_hover").text(selected_country_text);
				}
			}

			function set_country_selection(d) {
				var index = selected_country_ids.indexOf(d);
				if (index == -1) {
					selected_country_ids.push(d);
				} else if (index > -1) { 
					selected_country_ids.splice(index, 1);
				}
				updateCountryFilter();
			}

			// --------------------------------------
			// --------- Table selection helpers
			// --------------------------------------
			var selected_varietal = null;
			function set_varietal_selection(d) {
				if (selected_varietal == d) {
					selected_varietal = null;
				} else {
					selected_varietal = d;
				}
				update_varietal_filter();
			}
			
// ----------------------------------------------------------------
//       Filter helper functions
// ----------------------------------------------------------------

			// Return color name from given id
			function getNameForId(array, id) {
				for (var i = 0; i < array.length; i++) {
					if (array[i].id === id) {
						return array[i].name.replace("color_", "");
					}
				}
				return "";
			}

			//find the count of the total number of wines in current filter
			var updateCount = function(d) {
				document.getElementById("filter-count").innerHTML = d.length;
			};

			// --------------------------------------
			// --------- Aroma filters
			// --------------------------------------

			// Update aroma filter on click
			var selected_aroma_ids = [];
			function wheel_click(event, d) {
				set_node_selection(d.data, !d.data.selected);	// svg data
				if(selected_aroma_ids.length === 0) {
					reset_aroma_selection();
				} else {
					sync_aroma_selection();
					// aromas.filterFunction(function(d) { return selected_aroma_ids.indexOf(d) > -1; }); 
				}
				// sync_node_selection_view();					// view
				// sync_aroma_filter();						// Crossfilter
				dc.redrawAll(WINE_CHART_GROUP);
			}

			function reset_aroma_selection() {
				selected_aroma_ids = [];
				set_node_selection(aroma_map_root, false);   // svg data
				sync_node_selection_view();					// view
				aromas.filter(null);						// crossfilter
			}

			// assumes that the svg data properties & selected_aroma_ids have been set
			function sync_aroma_selection() {
				sync_node_selection_view();					// view
				aromas.filterFunction(function(d) { 		// crossfilter
					return selected_aroma_ids.indexOf(d) > -1; 
				}); 
			}

			// update crossfilter to reflect selected_aroma_ids 
			// function sync_aroma_filter(){
			// 	if(selected_aroma_ids.length === 0) {
			// 		reset_aroma_selection();
			// 	} else {
			// 		sync_aroma_selection();
			// 		// aromas.filterFunction(function(d) { return selected_aroma_ids.indexOf(d) > -1; }); 
			// 	}
			// }


			// --------------------------------------
			// --------- Map filters
			// --------------------------------------

			// Update map filter on click
			function updateCountryFilter() {
				if(selected_country_ids.length === 0) {
					country.filter(null);
				} else {
					country.filterFunction(function(d) { 
						return selected_country_ids.indexOf(d) > -1; 
					});
				}
				dc.redrawAll(WINE_CHART_GROUP);
			}

			function resetCountrySelection() {
				country.filter(null);
				selected_country_ids = [];
				update_selected_country_text()
			}

			// --------------------------------------
			// --------- Table filters
			// --------------------------------------

			// Update map filter on click
			function update_varietal_filter() {
				if (selected_varietal === null) {
					reset_aroma_selection();
					reset_varietal_selection();

				} else {
					// filter crossfilter data
					name.filterFunction(function(d) { 
						return selected_varietal == d; 
					}); 

					// select this varietal's aromas
					var varietal_data = remote_json.varietals.filter(function(d) { 
						return selected_varietal == d.name; 
					}); 
					select_aromas_from_array(varietal_data[0].aromas);	

					// sync wheel view with data model
					sync_aroma_selection();
				}
				dc.redrawAll(WINE_CHART_GROUP);
			}

			function reset_varietal_selection() {
				name.filter(null);
				selected_varietal = null;
			}


			// --------------------------------------
			// --------- Overall filters
			// --------------------------------------

			var filterAll = function() {
				color_chart.filter(null);
				fruit_chart.filter(null);
				body_chart.filter(null);
				alcohol_chart.filter(null);
				acidity_chart.filter(null);
				dryness_chart.filter(null);
				tannins_chart.filter(null);
				dataTable.filter(null);
				resetCountrySelection();
				reset_aroma_selection();
				reset_varietal_selection();
			};

			// add reset all event when text is clicked
			d3.selectAll('a.reset_wine_filters').on('click', function() {
				filterAll();
				dc.renderAll(WINE_CHART_GROUP);
			});

			// Fit the charts to the current page width (on resize, and when the page is shown again)
			var bar_charts = [body_chart, acidity_chart, alcohol_chart, fruit_chart, dryness_chart, tannins_chart];
			fitWineExplorerToWidth = function() {
				var newWidth = document.getElementById("wine-explorer-size").offsetWidth;
				if (!newWidth) { return; } // section is hidden
				wineMap.invalidateSize(); // Leaflet can't measure its container while it's hidden
				var new_chart_WL = get_chart_width(newWidth / 4);
				if (new_chart_WL === chart_WL) { return; }
				chart_WL = new_chart_WL;
				bar_charts.forEach(function(chart) { chart.width(chart_WL).height(chart_WL); });
				dc.renderAll(WINE_CHART_GROUP);
			};
			var resizeTimer;
			window.addEventListener("resize", function() {
				clearTimeout(resizeTimer);
				resizeTimer = setTimeout(fitWineExplorerToWidth, 150);
			});


			dc.renderAll(WINE_CHART_GROUP);

		}, function(error) {
			// Undo the setup done above so the next visit to this page tries again
			console.error("Could not load the wine explorer data", error);
			wineMap.remove();
			d3.select("#aroma_wheel svg").remove();
			wineExplorerRendered = false;
		});
	}

	wineExplorerRendered = true;
}

function setAromaWheelPadding(){
		var $aromaWheel = $("#aroma_wheel.svg-container");
		var width = parseInt($aromaWheel.css("width"), 10);
		if (!isNaN(width)) {
			$aromaWheel.css("padding-bottom", (width + 20) + "px");
		}
};
