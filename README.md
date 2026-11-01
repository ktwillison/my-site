# my-site

Source for my personal website, built in 2016–17. It has a few interactive data projects:

- **Wine Explorer**: browse grape varietals by flavor profile, aroma and growing region (d3, dc.js, Leaflet).
- **Wine Model**: describe a wine and a naive Bayes classifier guesses the varietal (scikit-learn, NLTK), plus an LDA chart of how the varietal categories overlap.
- **Stockholm Apartments**: a map of apartment sale prices in Stockholm.
- **Civis Journey Map**.

It's an older personal project, kept online mostly for posterity, so the code reflects how I built things back then.

## How it's put together

- `server/`: a Flask app that serves the page, the data files and the wine-model API. It's packaged with a `Dockerfile` and runs on Google Cloud Run.
- `static/`: the Firebase Hosting root. Anything not found here is forwarded to the Cloud Run service (see `firebase.json`).
- `.github/workflows/`: on pushes to `master`, deploys `server/` to Cloud Run and then releases Firebase Hosting.

To run it locally:

```bash
cd server
docker build -t my-site .
docker run -p 8080:8080 my-site
```

Or without Docker (Python 3.14):

```bash
cd server/src
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python flask_front_end_app.py   # http://localhost:5050
```

## Updating dependencies

- **Python**: versions are pinned in `server/src/requirements.txt`; the Docker image installs from it.
- **Browser libraries** (d3, dc.js, crossfilter, Leaflet, jQuery, GSAP, Font Awesome): versions are pinned in `package.json`. After changing them, run `npm install && npm run vendor`. That copies each library's browser build into `server/src/libraries/<package>@<version>/` and updates the paths in `server/src/templates/index.html`. The copied files are committed, because the Docker image only contains `server/src`.
- `npm outdated` lists libraries with newer releases, and `npm run check:es` checks that all shipped JavaScript still runs in browsers that support ES2017.
