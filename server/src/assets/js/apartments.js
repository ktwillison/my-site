 // -------------------------------------------------------------------------
 //     Created by Kate Willison in 2017, based on visualizations attributed below. 
 //     Feel free to remix & reuse under the MIT licence terms described here:
 //     https://opensource.org/licenses/MIT
 // -------------------------------------------------------------------------


/**
Data JSON format:
{ ...,
	"sale": [{
		"location": {
			"address": {
				"streetAddress": "Tavastgatan 26B"
			}, ... ,
			"position": {
				"latitude": 59.31965415,
				"longitude": 18.05996149
			},
		},
		"listPrice": 5050000,
		"rent": 2847,
		"floor": 2,
		"livingArea": 65,
		"rooms": 2,
		"soldPrice": 4500000,
		... 
	}, ... ]
}

**/

	// ----------------------------------------------------------------
	//       Set up map and wheel properties
	// ----------------------------------------------------------------
var apartmentExplorerRendered = false;
var APARTMENT_CHART_GROUP = "apartment-explorer"; // dc.js chart group, kept separate from the wine explorer

function renderApartmentExplorer() {
	if (!apartmentExplorerRendered) {

// ----------------------------------------------------------------
//       Load data
// ----------------------------------------------------------------

		d3.json("/api/v1.0/data/apartment_data/").then(function(remote_json) {
			// First chuck of data is for midsommarkransen, second is for söder
			remote_json[0].sold.forEach(function(d) { d.location.area = "Midsommarkransen"; });
			remote_json[1].sold.forEach(function(d) { d.location.area = "Södermalm"; });

			var remote_json_validated = remote_json[0].sold.concat(remote_json[1].sold);
			remote_json_validated = remote_json_validated.filter(function (d) {
			  return d.listPrice > 0 &&
			         d.soldPrice > 0 &&
			         d.livingArea > 0 &&
			         d.rent > 0 &&
			         d.floor >= 0 &&
			         d.rooms > 0;
			});
			
			// ----------------------------------------------------------------
			//       Crossfilter setup
			// ----------------------------------------------------------------
			
			// crossfilter
			var cf = crossfilter(remote_json_validated);

			// create dimensions
			var listPrice = cf.dimension(function(d) { return d.listPrice; });
			var soldPrice = cf.dimension(function(d) { return d.soldPrice; });
			var percentChangeInPrice = cf.dimension(function(d) { return (d.soldPrice-d.listPrice)/d.listPrice; });
			var soldPricePerSqM = cf.dimension(function(d) { return d.soldPrice/d.livingArea; });
			var livingArea = cf.dimension(function(d) { return d.livingArea; });
			var floor = cf.dimension(function(d) { return d.floor; });
			var rent = cf.dimension(function(d) { return d.rent; });
			var rooms = cf.dimension(function(d) { return d.rooms; });
			var location = cf.dimension(function(d) { return d.location.area; });
			var allDim = cf.dimension(function(d) { return d; });

			// Aggregates over every record that passes the current filters
			var allRecords = cf.groupAll().reduce(
				//add
				function(p,v){
					p.count++;

					// Calculate Sums
					p.listPriceSum += v['listPrice'];
					p.soldPriceSum += v['soldPrice'];
					p.percentChangeInPriceSum += (v['soldPrice']-v['listPrice'])/v['listPrice'];
					p.soldPricePerSqMSum += (v['soldPrice']/v['livingArea']);
					p.livingAreaSum += v['livingArea'];
					p.floorSum += v['floor'];
					p.roomsSum += v['rooms'];
					p.rentSum += v['rent'];

					// Calculate Averages
					p.listPriceAvg = (p.listPriceSum/p.count);
					p.soldPriceAvg = (p.soldPriceSum/p.count);
					p.percentChangeInPriceAvg = (p.percentChangeInPriceSum/p.count);
					p.soldPricePerSqMAvg = (p.soldPricePerSqMSum/p.count);
					p.livingAreaAvg = (p.livingAreaSum/p.count);
					p.floorAvg = (p.floorSum/p.count);
					p.roomsAvg = (p.roomsSum/p.count);
					p.rentAvg = (p.rentSum/p.count);

					return p;
				},
				//remove
				function(p,v){
					p.count--;

					// Calculate Sums
					p.listPriceSum -= v['listPrice'];
					p.soldPriceSum -= v['soldPrice'];
					p.percentChangeInPriceSum -= (v['soldPrice']-v['listPrice'])/v['listPrice'];
					p.soldPricePerSqMSum -= (v['soldPrice']/v['livingArea']);
					p.livingAreaSum -= v['livingArea'];
					p.floorSum -= v['floor'];
					p.roomsSum -= v['rooms'];
					p.rentSum -= v['rent'];

					// Calculate Averages
					p.listPriceAvg = (p.listPriceSum/p.count);
					p.soldPriceAvg = (p.soldPriceSum/p.count);
					p.percentChangeInPriceAvg = (p.percentChangeInPriceSum/p.count);
					p.soldPricePerSqMAvg = (p.soldPricePerSqMSum/p.count);
					p.livingAreaAvg = (p.livingAreaSum/p.count);
					p.floorAvg = (p.floorSum/p.count);
					p.roomsAvg = (p.roomsSum/p.count);
					p.rentAvg = (p.rentSum/p.count);
					
					return p;
				},

				//init
				function() {
					return {count:0, listPriceSum:0, soldPriceSum:0, percentChangeInPriceSum:0, 
						soldPricePerSqMSum:0, livingAreaSum:0, floorSum:0, roomsSum:0, rentSum:0,
						listPriceAvg:0, soldPriceAvg:0, percentChangeInPriceAvg:0, soldPricePerSqMAvg:0, 
						livingAreaAvg:0, floorAvg:0, roomsAvg:0, rentAvg:0
					}
				}
			);


			// Define number formatters
			var percentFormatter = d3.format("+,.0%") // d3 v4+ defaults to 6 decimals
			var priceFormatter = d3.format(".3s")
			var rentFormatter = d3.format(".2s")

			// Fire on filter change
			var updateAggregates = function() {
				var result = allRecords.value();
				document.getElementById("apartment-filter-count").innerHTML = result.count;
				document.getElementById("soldPrice_avg").innerHTML = priceFormatter(result.soldPriceAvg);
				document.getElementById("rent_avg").innerHTML = rentFormatter(result.rentAvg);
				document.getElementById("listPrice_avg").innerHTML = priceFormatter(result.listPriceAvg);
				document.getElementById("livingArea_avg").innerHTML = rentFormatter(result.livingAreaAvg);
				document.getElementById("rooms_avg").innerHTML = rentFormatter(result.roomsAvg);
				document.getElementById("floor_avg").innerHTML = rentFormatter(result.floorAvg);
				document.getElementById("soldPricePerSqM_avg").innerHTML = rentFormatter(result.soldPricePerSqMAvg);
				document.getElementById("percentChangeInPrice_avg").innerHTML = percentFormatter(result.percentChangeInPriceAvg);

				update_map_markers();
			};



// ----------------------------------------------------------------
//       Create charts
// ----------------------------------------------------------------
			// -------------------------------
			// ----------Add Loction chart
			// -------------------------------
			var sum = 0;
			var location_chart = dc.pieChart("#location_chart", APARTMENT_CHART_GROUP)
				.width(200)
				.height(200)
				.radius(100)
				.innerRadius(50)
				.dimension(location)
				.group(location.group())
				.ordering(function(d) { return d.key; }) // dc.js v3+ defaults to largest slice first
				.renderLabel(true)
				.on("filtered", updateAggregates);


			// -------------------------------
			// ----------Add Bar charts
			// -------------------------------

			// // Chart width helper
			var chartWidth = document.getElementById("apartment-finder-size").offsetWidth;

			var bar_charts = [];

			// Chart creator-helper
			function create_chart(elementID, dimension, value_range, formatter, bins) {
				bins = bins || 30;
				var bin_width = value_range/bins,
					x_grouped = dimension.group(
		            	function(d) {return Math.floor(d/bin_width)*bin_width;});

				var newChart = dc.barChart("#".concat(elementID), APARTMENT_CHART_GROUP)
					.width(chartWidth)
					.height(chartWidth/3)
					.dimension(dimension)
					.group(x_grouped)
					.centerBar(true)
					.x(d3.scaleLinear())
					.xUnits(function(){return bins;})
					.elasticY(true)
        			.elasticX(true)
					.yAxisLabel('Count')
					.on("filtered", updateAggregates);
				newChart.xAxis().tickFormat(formatter);
				bar_charts.push(newChart);
				return newChart
			};

			function calculate_range(dimension, accessor) {
				var max = dimension.top(1)[0][accessor],
					min = dimension.bottom(1)[0][accessor]
				return max-min;
			}

			// Define charts
			var soldPrice_chart = create_chart("soldPrice_chart", soldPrice, calculate_range(soldPrice,"soldPrice"), priceFormatter);
			var rent_chart = create_chart("rent_chart", rent, calculate_range(rent,"rent"), rentFormatter);
			var listPrice_chart = create_chart("listPrice_chart", listPrice, calculate_range(listPrice,"listPrice"), priceFormatter);
			var livingArea_chart = create_chart("livingArea_chart", livingArea, calculate_range(livingArea,"livingArea"), d3.format(""));
			var rooms_chart = create_chart("rooms_chart", rooms, calculate_range(rooms,"rooms"), d3.format(".2s"), rooms.group().size());
			var floor_chart = create_chart("floor_chart", floor, calculate_range(floor,"floor"), d3.format(".2s"), floor.group().size());

			// Define special ranges for computed functions
			var max = percentChangeInPrice.top(1)[0],
				min = percentChangeInPrice.bottom(1)[0],
				max_val = (max.soldPrice-max.listPrice)/max.listPrice,
				min_val = (min.soldPrice-min.listPrice)/min.listPrice,
				percentChangeInPrice_value_range = max_val - min_val

			var max = soldPricePerSqM.top(1)[0],
				min = soldPricePerSqM.bottom(1)[0],
				max_val = (max.soldPrice/max.livingArea),
				min_val = (min.soldPrice/min.livingArea),
				soldPricePerSqM_value_range = max_val - min_val

			var percentChangeInPrice_chart = create_chart("percentChangeInPrice_chart", percentChangeInPrice, percentChangeInPrice_value_range, percentFormatter);
			var soldPricePerSqM_chart = create_chart("soldPricePerSqM_chart", soldPricePerSqM, soldPricePerSqM_value_range, priceFormatter);


			// -------------------------------
			// ----------Add Map -------------
			// -------------------------------
			var apartmentMap = L.map('apartment_map').setView([59.311710, 18.053760], 12);
			var markerLayer = L.layerGroup().addTo(apartmentMap);
			addBaseTiles(apartmentMap, { maxZoom: 18 });

			function update_map_markers() {
				markerLayer.remove();

				var newMarkers = allDim.top(Infinity).map(function(d) {
					return L.marker([d.location.position.latitude, d.location.position.longitude]);
				});
				markerLayer = L.layerGroup(newMarkers).addTo(apartmentMap);
			}

			// -------------------------------
			// ----------Add data table
			// -------------------------------
			var dataTable = dc.dataTable('#apartment-data-table', APARTMENT_CHART_GROUP)
				.dimension(allDim)
				.size(800)
				.section(function(d) { return ''; })
				.showSections(false)
				.sortBy(function(d){ return d.location.address.streetAddress; })
				.order(d3.ascending)
				.columns([
						function(d) { return d.location.address.streetAddress; },
						function(d) { return priceFormatter(d.listPrice); },
						function(d) { return priceFormatter(d.soldPrice); },
						function(d) { return percentFormatter((d.soldPrice-d.listPrice)/d.listPrice); },
						function(d) { return priceFormatter(d.soldPrice/d.livingArea); },
						function(d) { return d.livingArea; },
						function(d) { return rentFormatter(d.rent); },
						function(d) { return d.floor; },
						function(d) { return d.rooms; }
				])
			
// ----------------------------------------------------------------
//       Filter helper functions
// ----------------------------------------------------------------

			// --------------------------------------
			// --------- Overall filters
			// --------------------------------------

			var resetFilters = function() {
				listPrice_chart.filter(null);
				soldPrice_chart.filter(null);
				rent_chart.filter(null);
				floor_chart.filter(null);
				livingArea_chart.filter(null);
				rooms_chart.filter(null);
				percentChangeInPrice_chart.filter(null);
				soldPricePerSqM_chart.filter(null);
				location_chart.filter(null);

				updateAggregates();
			};

			// add reset all event when text is clicked
			d3.selectAll('a.reset_apartment_filters').on('click', function() {
				resetFilters();
				dc.renderAll(APARTMENT_CHART_GROUP);
			});

			// Update chart widths on resize
			var resizeTimer;
			window.addEventListener("resize", function() {
				clearTimeout(resizeTimer);
				resizeTimer = setTimeout(function() {
					var newWidth = document.getElementById("apartment-finder-size").offsetWidth;
					if (!newWidth || newWidth === chartWidth) { return; } // hidden, or unchanged
					chartWidth = newWidth;
					bar_charts.forEach(function(chart) { chart.width(chartWidth).height(chartWidth/3); });
					dc.renderAll(APARTMENT_CHART_GROUP);
					apartmentMap.invalidateSize();
				}, 150);
			});

			updateAggregates();
			dc.renderAll(APARTMENT_CHART_GROUP);

		}, function(error) {
			// Let the next visit to this page try again
			console.error("Could not load the apartment data", error);
			apartmentExplorerRendered = false;
		});
	}
	apartmentExplorerRendered = true;
}

