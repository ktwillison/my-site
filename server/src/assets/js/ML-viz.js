 // -------------------------------------------------------------------------
 //     Based on the Sankey chart : https://github.com/q-m/d3.chart.sankey
 //     Adapted by Kate Willison in 2017; ported to d3 v7 + d3-sankey in 2026
 //     (d3.chart / d3.chart.sankey only ever supported d3 v3).
 //     Feel free to remix & reuse under the MIT licence terms described here:
 //     https://opensource.org/licenses/MIT
 // -------------------------------------------------------------------------


var mlChartData = null;
var mlChartWidth = null; // width of the chart currently drawn

// Redraw only if the chart's width changed (mobile browsers fire resize events
// just from the address bar showing/hiding while scrolling)
function resizeMLChart() {
  var width = document.getElementById("ML-chart").clientWidth;
  if (width && width !== mlChartWidth) {
    renderMLChart();
  }
}

function renderMLChart() {
  var colors = {
    'barbera':         '#df2b5a',
    'cabernet_franc':         '#8a1437',
    'cabernet_sauvignon_and_blends':         '#a91a46',
    'carignane':         '#9c1840',
    'charbono':         '#b61f4c',
    'chardonnay':         '#eeb945',
    'chenin_blanc':         '#eaa725',
    'dolcetto':         '#cc2553',
    'gamay':         '#e22d5a',
    'gewurztraminer':         '#f4ce6b',
    'grenache':         '#b01d49',
    'gruner_veltliner':         '#fcedaa',
    'lagrein':         '#660c28',
    'malbec':         '#bc204f',
    'marsanne':         '#ecb034',
    'melon_de_bourgogne':         '#fcedaa',
    'merlot':         '#d02653',
    'mourvedre':         '#a31b43',
    'nebbiolo':         '#c42251',
    'petite_sirah':         '#95173d',
    'pineau_daunis':         '#e22d5a',
    'pinot_blanc':         '#f0c555',
    'pinot_gris':         '#fef0af',
    'pinot_noir':         '#e42d5b',
    'rhone_blends':         '#851335',
    'riesling':         '#f5d170',
    'romorantin':         '#edb338',
    'sangiovese':         '#d12754',
    'sauvignon_blanc':         '#fdeaa5',
    'semillon':         '#e9a117',
    'fallback':            '#9f9fa3'
  };

  // The chart is redrawn on window resize, so only fetch the data once.
  var dataPromise = mlChartData ? Promise.resolve(mlChartData) : d3.json("/api/v1.0/data/ML_LDA_vis_data/");

  dataPromise.then(function(json) {
    mlChartData = json;
    draw(json);
  }).catch(function(error) {
    console.error("Could not load the LDA chart data", error);
  });

  function draw(json) {
    var container = document.getElementById("ML-chart");
    container.innerHTML = "";

    var outerWidth = container.clientWidth,
        outerHeight = container.clientHeight,
        margin = {top: 1, right: 1, bottom: 6, left: 1},
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom,
        nodeWidth = 15,
        unselectedOpacity = 0.2;

    if (width <= 0 || height <= 0) { return; } // section is hidden
    mlChartWidth = outerWidth;

    // d3-sankey mutates its input, so lay out a copy of the data
    var graph = d3.sankey()
      .nodeWidth(nodeWidth)
      .nodePadding(10)
      .iterations(0)
      .extent([[0, 0], [width, height]])({
        nodes: json.nodes.map(function(d) { return Object.assign({}, d); }),
        links: json.links.map(function(d) { return Object.assign({}, d); })
      });

    var svg = d3.select(container).append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight);
    var base = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var link = base.append("g").attr("class", "links")
      .selectAll(".link")
      .data(graph.links.slice().sort(function(a, b) { return b.width - a.width; }))
      .enter().append("path")
      .attr("class", "link")
      .attr("d", d3.sankeyLinkHorizontal())
      .style("stroke", function(d) {
        return color(d.source, 4) || color(d.target, 1) || colors.fallback;
      })
      .style("stroke-width", function(d) { return Math.max(1, d.width); })
      .on("mouseover", function(event, d) { select(d); })
      .on("mouseout", function() { select(null); });

    var node = base.append("g").attr("class", "nodes")
      .selectAll(".node")
      .data(graph.nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("data-node-id", function(d) { return d.id; })
      .attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
      .on("mouseover", function(event, d) { select(d); })
      .on("mouseout", function() { select(null); });

    node.append("rect")
      .attr("height", function(d) { return Math.max(0, d.y1 - d.y0); })
      .attr("width", nodeWidth)
      .style("fill", nodeColor)
      .style("stroke", function(d) { return d3.rgb(nodeColor(d)).darker(2); });

    node.append("text")
      .attr("dy", ".35em")
      .attr("y", function(d) { return (d.y1 - d.y0) / 2; })
      .attr("x", function(d) { return textAnchor(d) === "start" ? (6 + nodeWidth) : -6; })
      .attr("text-anchor", textAnchor)
      .text(label);

    // Hovering a node or link highlights everything connected to it
    function select(item) {
      var selection = item ? getConnections(item) : null;
      base.selectAll(".node, .link")
        .interrupt()
        .transition()
        .delay(selection ? 0 : 100) // short delay for the deselect transition to avoid flicker
        .duration(50)
        .style("opacity", function(o) {
          return !selection || selection.indexOf(o) >= 0 ? 1 : unselectedOpacity;
        });
    }

    function textAnchor(d) {
      return d.x0 < width / 2 ? "start" : "end";
    }

    function nodeColor(d) {
      return color(d, 1) || colors.fallback;
    }
  }

  function label(node) {
    return node.name.replace(/\s*\(.*?\)$/, '');
  }
  function color(node, depth) {
    var id = node.id.replace(/(_score)?(_\d+)?$/, '');
    if (colors[id]) {
      return colors[id];
    } else if (depth > 0 && node.targetLinks && node.targetLinks.length == 1) {
      return color(node.targetLinks[0].source, depth-1);
    } else {
      return null;
    }
  }
}

// Path-highlighting helpers, ported from d3.chart.sankey's "Sankey.Path" chart.
function getConnections(o, direction) {
  if (o.source && o.target) {
    return getConnectionsLink(o, direction);
  } else {
    return getConnectionsNode(o, direction);
  }
}

// Return the link and its connected nodes with their links etc.
function getConnectionsLink(o, direction) {
  var links = [o];
  direction = direction || "both";

  if (direction == "source" || direction == "both") {
    links = links.concat(getConnectionsNode(o.source, "source"));
  }
  if (direction == "target" || direction == "both") {
    links = links.concat(getConnectionsNode(o.target, "target"));
  }

  return links;
}

// Return the node and its connected links. If direction is "both", just return
// all links; if direction is "source", only return the source link when there
// is one target link (or none, in which case the node is an endnode); if
// direction is "target" vice versa.
function getConnectionsNode(o, direction) {
  var links = [o];
  direction = direction || "both";

  if ((direction == "source" && o.sourceLinks.length < 2) || direction == "both") {
    o.targetLinks.forEach(function(p) { links = links.concat(getConnectionsLink(p, direction)); });
  }
  if ((direction == "target" && o.targetLinks.length < 2) || direction == "both") {
    o.sourceLinks.forEach(function(p) { links = links.concat(getConnectionsLink(p, direction)); });
  }

  return links;
}
