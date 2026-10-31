#!/usr/bin/env node
// Copies the browser builds of the npm front-end dependencies into
// server/src/libraries/<package>@<version>/ (the Docker image only contains
// server/src, so the files are committed), then rewrites the matching
// /libraries/<package>@<old-version>/ references in templates/index.html.
//
// Usage: npm install && npm run vendor

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const libDir = path.join(root, 'server/src/libraries');
const templatePath = path.join(root, 'server/src/templates/index.html');

// package name -> { dir: folder name prefix, files: { dest: source (relative to the package) } }
const LIBS = {
  'd3': { dir: 'd3', files: { 'd3.min.js': 'dist/d3.min.js' } },
  'd3-sankey': { dir: 'd3-sankey', files: { 'd3-sankey.min.js': 'dist/d3-sankey.min.js' } },
  'dc': { dir: 'dc', files: { 'dc.min.js': 'dist/dc.min.js', 'dc.min.css': 'dist/style/dc.min.css' } },
  'crossfilter2': { dir: 'crossfilter2', files: { 'crossfilter.min.js': 'crossfilter.min.js' } },
  'leaflet': {
    dir: 'leaflet',
    files: {
      'leaflet.js': 'dist/leaflet.js',
      'leaflet.css': 'dist/leaflet.css',
      'images/layers.png': 'dist/images/layers.png',
      'images/layers-2x.png': 'dist/images/layers-2x.png',
      'images/marker-icon.png': 'dist/images/marker-icon.png',
      'images/marker-icon-2x.png': 'dist/images/marker-icon-2x.png',
      'images/marker-shadow.png': 'dist/images/marker-shadow.png',
    },
  },
  'jquery': { dir: 'jquery', files: { 'jquery.min.js': 'dist/jquery.min.js' } },
  'gsap': { dir: 'gsap', files: { 'gsap.min.js': 'dist/gsap.min.js' } },
  '@fortawesome/fontawesome-free': {
    dir: 'fontawesome',
    files: {
      'css/fontawesome.min.css': 'css/fontawesome.min.css',
      'css/brands.min.css': 'css/brands.min.css',
      'css/solid.min.css': 'css/solid.min.css',
      'webfonts/fa-brands-400.woff2': 'webfonts/fa-brands-400.woff2',
      'webfonts/fa-solid-900.woff2': 'webfonts/fa-solid-900.woff2',
      'LICENSE.txt': 'LICENSE.txt',
    },
  },
};

let template = fs.readFileSync(templatePath, 'utf8');

for (const [pkg, { dir, files }] of Object.entries(LIBS)) {
  const pkgRoot = path.join(root, 'node_modules', pkg); // not require.resolve: d3 doesn't export package.json
  const { version } = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'));
  const target = `${dir}@${version}`;

  // Remove previously vendored versions of this package.
  for (const entry of fs.readdirSync(libDir)) {
    if (entry.startsWith(`${dir}@`) && entry !== target) {
      fs.rmSync(path.join(libDir, entry), { recursive: true, force: true });
      console.log(`removed  libraries/${entry}`);
    }
  }

  for (const [dest, src] of Object.entries(files)) {
    const out = path.join(libDir, target, dest);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(path.join(pkgRoot, src), out);
  }
  console.log(`vendored libraries/${target}`);

  const escaped = dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  template = template.replace(new RegExp(`/libraries/${escaped}@[^/]+/`, 'g'), `/libraries/${target}/`);
}

fs.writeFileSync(templatePath, template);
console.log('updated  server/src/templates/index.html');
