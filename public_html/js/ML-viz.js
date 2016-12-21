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

  d3.json("/api/v1.0/data/ML_LDA_vis_data/", function(error, json) {
    $('#ML-chart').empty();
    var chart = d3.select("#ML-chart").append("svg").chart("Sankey.Path");
    chart
      .name(label)
      .colorNodes(function(name, node) {
        return color(node, 1) || colors.fallback;
      })
      .colorLinks(function(link) {
        return color(link.source, 4) || color(link.target, 1) || colors.fallback;
      })
      .nodeWidth(15)
      .nodePadding(10)
      .spread(true)
      .iterations(0)
      .draw(json);
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
  });
};