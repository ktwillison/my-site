/**
Data JSON format:

{ "varietals" : [ ...,  {"name": "Barbera", "id":9,  "fruit":4,  "body":4,   "dryness":0,  "acidity":5, "alcohol":4,  "tannins":1,  "color":5, "aromas": [52, 54, 60, 61, 62, 71, 85, 88, 94, 112, 155, 157, 165, 166], "countries": [15, 30, 2] }, ... ], 

"aromas": [ ...,  {"name": "Floral", "id":1}, ... ], 

"colors": [ ...,  {"name": "color_straw", "id":2}, ...], 

"countries": [  ...,  {"name": "Algeria", "id":1},  ... ]
} 

**/

  // ----------------------------------------------------------------
  //       Set up map and wheel properties
  // ----------------------------------------------------------------

// Add Map to the visualization
var wineMap = L.map('map');
var breweryMarkers = new L.FeatureGroup();
var countryMarkers = new L.FeatureGroup();

L.tileLayer('https://api.tiles.mapbox.com/v4/{map_id}/{z}/{x}/{y}.png?access_token={accessToken}', {
  "map_id": 'mapbox.light',
  "accessToken": 'pk.eyJ1IjoiYmVua2hvbyIsImEiOiJjaW9uZTR2aGcwMDhzdWptNDRtYnNmdDN4In0.ipiruWri3qdAOb5C0TnSBw',
  "maxZoom": 16,
  "attribution": "Created for CME161"
}).addTo(wineMap);

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

var colorScale = d3.scale.linear()
.domain([0, 27])
.range(["blue", "red"]);

var CholoStyle = function(d) {
  return {
    "color": getChoroColor(d),
    "weight": 2,
    dashArray: '3',
    fillOpacity: 0.5
    //"opacity": 0
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


// Aroma wheel setup
// Sunburst graph adapted from http://bl.ocks.org/mbostock/4063423
var wheel_width = 500,
  wheel_height = 500,
  wheel_radius = Math.min(wheel_width, wheel_height) / 2,
  wheel_color = d3.scale.category20c();

var svg = d3.select("#aroma_wheel").insert("svg",":first-child") // .append("svg") // 
  .attr("width", "100%")
  .attr("preserveAspectRatio", "xMinYMin meet")
  .attr("viewBox","0 0 " + wheel_width + " " + wheel_height)
  //class to make it responsive
  .classed("svg-content-responsive", true)
  .append("g")
  .attr("transform", "translate(" + wheel_width / 2 + "," + wheel_height * .5 + ")");
  
var svgText = svg.append("text")

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

var partition = d3.layout.partition()
  .sort(null)
  .size([2 * Math.PI, wheel_radius * wheel_radius])
  .value(function(d) {
    return 1;
  });

var arc = d3.svg.arc()
  .startAngle(function(d) {
    return d.x;
  })
  .endAngle(function(d) {
    return d.x + d.dx;
  })
  .innerRadius(function(d) {
    return Math.sqrt(d.y);
  })
  .outerRadius(function(d) {
    return Math.sqrt(d.y + d.dy);
  });

// Stash the old values for transition.
function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}

// Interpolate the arcs in data space.
function arcTween(a) {
  var i = d3.interpolate({
    x: a.x0,
    dx: a.dx0
  }, a);
  return function(t) {
    var b = i(t);
    a.x0 = b.x;
    a.dx0 = b.dx;
    return arc(b);
  };
}

d3.select(self.frameElement).style("height", wheel_height + "px");



  // ----------------------------------------------------------------
  //       Load data
  // ----------------------------------------------------------------

d3.json("/api/v1.0/data/wine_finder_data/", function(remote_json) {
// d3.json("https://katewillison.com/api/v1.0/data/wine_finder_data/", function(remote_json) {

  window.remote_json = remote_json;

  // Helper access functions
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

  //Helper function to draw map
  function drawMap(cf_group, dict, map_markers) {  
    map_markers.clearLayers();
    cf_group
      .top(Infinity)
      .forEach(function(d, i) {
        if (d.value > 0) {
          var location = dict[d.key - 1];
          var name = location.name;
          var marker = L.geoJson(location.geojson, {
            style: CholoStyle(d.value)
          });
          marker.bindPopup("<p>" + name + "</p>");
          map_markers.addLayer(marker);
        }
      });
    wineMap.addLayer(map_markers);
    wineMap.fitBounds([
      [71.3577, 178.5170],
      [-55.6118, -171.7911]
    ]);
  }

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
  
  // Add aroma wheel
  var root = remote_json.aroma_map;
  var path = svg.datum(root).selectAll("path")
    .data(partition.nodes)
    .enter().append("path")
    .attr("display", function(d) {
      return d.depth ? null : "none";
    }) // hide inner ring
    .attr("d", arc)
    .style("stroke", "#fff")
    .style("fill", function(d) {
      var id = getChildAromaId(d);
      return getChoroColor(30*id/177);
      //return wheel_color((d.children ? d : d.parent).name);
    })
    .style("fill-rule", "evenodd")
    .on("mouseover", wheel_mouseover)
    .on("click", wheel_click)
    .on("mouseout", function() {
      d3.select("#aroma_hover").text(" ");
    })
    .each(stash);
  
  // Chart width helper
  var width = document.getElementById("resize").offsetWidth;
  var get_chart_width = function(d) { return Math.min(Math.max(d, 160), 300)};
  var chart_WL = get_chart_width(width / 4)
  
    // Chart color helper
  function getChildAromaId(d) {
      while (d.children) { d = d.children[0]; }
      return d.aroma_id;
  }
  
  function setBarColors(chart){
    chart.selectAll('rect.bar').each(function(d){
      d3.select(this).attr("style", "fill: " + getChoroColor(d.x * 5));
    });
  }  
  
  var fruit_chart = dc.barChart("#fruit_chart")
    .width(chart_WL)
    .height(chart_WL)
    //.width(250)
    //.height(200)
    .dimension(fruit)
    .group(fruit_sum)
    .centerBar(true)
    .x(d3.scale.linear().domain([0.5, 5.5]))
    .xUnits(dc.units.fp.precision(1))
    .yAxisLabel('Count')
    .renderlet( setBarColors );
  fruit_chart.xAxis().ticks(5);

  var body_chart = dc.barChart("#body_chart")
    .width(250)
    .height(200)
    .width(chart_WL)
    .height(chart_WL)
    .dimension(body)
    .group(body_sum)
    .centerBar(true)
    .x(d3.scale.linear().domain([0.5, 5.5]))
    .xUnits(dc.units.fp.precision(1))
    .yAxisLabel('Count')
    .renderlet( setBarColors );
  body_chart.xAxis().ticks(5);

  var dryness_chart = dc.barChart("#dryness_chart")
    .width(250)
    .height(200)
    .width(chart_WL)
    .height(chart_WL)
    .dimension(dryness)
    .group(dryness_sum)
    .centerBar(true)
    .x(d3.scale.linear().domain([0.5, 5.5]))
    .xUnits(dc.units.fp.precision(1))
    .yAxisLabel('Count')
    .renderlet( setBarColors );
  dryness_chart.xAxis().ticks(5);

  var acidity_chart = dc.barChart("#acidity_chart")
    .width(250)
    .height(200)
    .width(chart_WL)
    .height(chart_WL)
    .dimension(acidity)
    .group(acidity_sum)
    .centerBar(true)
    .x(d3.scale.linear().domain([0.5, 5.5]))
    .xUnits(dc.units.fp.precision(1))
    .yAxisLabel('Count')
    .renderlet( setBarColors );
  acidity_chart.xAxis().ticks(5);

  var alcohol_chart = dc.barChart("#alcohol_chart")
    .width(250)
    .height(200)
    .width(chart_WL)
    .height(chart_WL)
    .dimension(alcohol)
    .group(alcohol_sum)
    .centerBar(true)
    .x(d3.scale.linear().domain([0.5, 5.5]))
    .xUnits(dc.units.fp.precision(1))
    .yAxisLabel('Count')
    .renderlet( setBarColors );
  alcohol_chart.xAxis().ticks(5);

  var tannins_chart = dc.barChart("#tannins_chart")
    .width(250)
    .height(200)
    .width(chart_WL)
    .height(chart_WL)
    .dimension(tannins)
    .group(tannins_sum)
    .centerBar(true)
    .x(d3.scale.linear().domain([0.5, 5.5]))
    .xUnits(dc.units.fp.precision(1))
    .yAxisLabel('Count')
    .renderlet( setBarColors );
  tannins_chart.xAxis().ticks(5);

  var sum = 0;
  var color_chart = dc.pieChart("#color_chart")
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
    .colors(["#F7C938", "#F2D780", "#DEE0A1",
      "#943543", "#791925", "#66023C"
    ])
    .label(function(d) {
      var string = d.data.key;
      return string.charAt(0).toUpperCase() + string.slice(1);
    })
    .renderLabel(true);

  var dataTable = dc.dataTable('#wine-data-table')
    .dimension(allDim)
    .group(function(d) {
      return null;
    })

  .columns([
      function(d) { return d.name; },
      function(d) { return d.acidity; },
      function(d) { return d.alcohol; },
      function(d) { return d.body; },
      function(d) { return getNameForId(remote_json.colors, d.color); },
      function(d) { return d.dryness; },
      function(d) { return d.fruit; },
      function(d) { return d.tannins; }
    ])
    .renderlet(function(table) {
      // remove unnecessary row rendered
      table.select('tr.dc-table-group').remove();
      updateCount(allDim.top(Infinity));
      drawMap(country_sum, remote_json.countries, countryMarkers);
    });

  // ----------------------------------------------------------------
  //       Chart helper functions
  // ----------------------------------------------------------------

  // Update node selection in view
  function set_node_selection_view(d, selection) {
    set_node_selection(d, selection);
    update_selected_aroma_text();
    svg.selectAll("path")
      .style("opacity", function(d) {
        if (d.selected || selected_aroma_ids.length === 0) {
          return 1;
        }
        return 0.2
      })    
  }

  // Toggle wedge selection from selected root node
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

  // Update selected aroma text
  function update_selected_aroma_text() {
    var aroma_text = update_selected_aroma_text_helper(svg.data()[0]);
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
  function wheel_mouseover(d) {
    d3.select("#aroma_hover").text(d.name);
  }
  
  // ----------------------------------------------------------------
  //       Filter helper functions
  // ----------------------------------------------------------------

  // Update aroma filter on click
  var selected_aroma_ids = [];
  function wheel_click(d) {
    set_node_selection_view(d, !d.selected);
    if(selected_aroma_ids.length === 0) {
      resetAromaSelection();
    } else {
      aromas.filterFunction(function(d) { return selected_aroma_ids.indexOf(d) > -1; }); 
    }
    dc.redrawAll();
  }
  
  function resetAromaSelection() {
    aromas.filter(null);
    set_node_selection_view(svg.data()[0], false);
  }

  var filterAll = function() {
    color_chart.filter(null);
    fruit_chart.filter(null);
    body_chart.filter(null);
    alcohol_chart.filter(null);
    acidity_chart.filter(null);
    dryness_chart.filter(null);
    tannins_chart.filter(null);
    dataTable.filter(null);
    resetAromaSelection();
  };

  // add reset all event when text is clicked
  d3.selectAll('a#ResetAll').on('click', function() {
    filterAll();
    dc.renderAll();
  });

  // Update chart widths on resize
  window.onresize = function(event) {
    var newWidth = document.getElementById("resize").offsetWidth;
    var chart_WL = get_chart_width(newWidth / 4);
    dc.renderAll();
  };


  dc.renderAll();

});
