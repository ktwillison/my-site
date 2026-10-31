# my-site

Source for my personal website, built in 2016–17. It has a few interactive data projects:

- **Wine Explorer**: browse grape varietals by flavor profile, aroma and growing region (d3, dc.js, Leaflet).
- **Wine Model**: describe a wine and a naive Bayes classifier guesses the varietal (scikit-learn, NLTK).
- **Stockholm Apartments**: a map of apartment sale prices in Stockholm.
- **Civis Journey Map** and an LDA topic-model visualization.

It's an older personal project, kept online mostly for posterity, so the code reflects how I built things back then.

## How it's put together

- `server/`: a Flask app that serves the page, the data files and the wine-model API. It's packaged with a `Dockerfile` and runs on Google Cloud Run.
- `static/`: Firebase Hosting, which forwards all requests to the Cloud Run service (see `firebase.json`).
- `.github/workflows/`: deploys on merge.

To run it locally:

```bash
cd server
docker build -t my-site .
docker run -p 8080:8080 my-site
```
