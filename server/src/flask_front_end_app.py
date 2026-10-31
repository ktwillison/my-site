#!/usr/bin/env python3
import json
import logging
import os
import re
import threading

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS, cross_origin
from nltk.stem.lancaster import LancasterStemmer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')
LIBRARIES_DIR = os.path.join(BASE_DIR, 'libraries')
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_DIR = os.path.join(BASE_DIR, 'model')
INDEX_PATH = os.path.join(BASE_DIR, 'templates', 'index.html')

app = Flask(__name__, static_folder=None)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'


def setup_logging():
	"""Send logs to Google Cloud Logging when running on GCP; fall back to stderr locally."""
	try:
		import google.cloud.logging
		logging_client = google.cloud.logging.Client()
		# By default, this captures all logs at INFO level and higher
		logging_client.setup_logging()
	except Exception as error:  # e.g. no GCP credentials when running locally
		logging.basicConfig(level=logging.INFO)
		logging.getLogger(__name__).info('Google Cloud Logging not configured (%s); logging to stderr', error)


setup_logging()


# get root
@app.route("/")
@app.route("/wine-explorer")
@app.route("/wine-model")
@app.route("/civis-journey-map")
@app.route("/stockholm-apartments")
def index():
	with open(INDEX_PATH, encoding='utf-8') as index_file:
		response = app.make_response(index_file.read())
	# Browsers revalidate the page after 5 minutes, so after a deploy nobody keeps an old page that
	# points at library versions that no longer exist. The Firebase CDN may keep it longer
	# (s-maxage); its cache is purged whenever a new Hosting release goes out.
	response.headers['Cache-Control'] = 'public, max-age=300, s-maxage=60000'
	return response


# send assets (ex. assets/js/random_triangle_meshes/random_triangle_meshes.js)
# blocks other requests, so your directories won't get listed (ex. assets/js will return "not found")
@app.route('/assets/<path:path>')
def send_assets(path):
	response = send_from_directory(ASSETS_DIR, path)
	# Site scripts/styles keep their file names between deploys, so make browsers revalidate (cheap 304s)
	response.headers['Cache-Control'] = 'no-cache'
	return response


@app.route('/libraries/<path:path>')
def send_library(path):
	response = send_from_directory(LIBRARIES_DIR, path)
	# Third-party libraries live in versioned folders (e.g. d3@7.9.0/), so they never change in place
	if '@' in path.split('/')[0]:
		response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
	return response


@app.route('/api/v1.0/data/<filename>/', methods=['GET'])
@cross_origin(origins=['http://www.katewillison.com', 'https://www.katewillison.com'],
			  allow_headers=['Content-Type', 'Authorization'])
def get_data(filename):
	return send_from_directory(DATA_DIR, filename + '.json', mimetype='application/json')


# Route for wine model API
@app.route('/api/v1.0/winemodel/', methods=['POST'], endpoint='wine-model')
def wine_model():
	payload = request.get_json(silent=True)
	input_text = payload.get('input_text') if isinstance(payload, dict) else None
	if input_text is None:
		return jsonify({'message': {'input_text': 'No input text provided'}}), 400

	# First check if input text is valid
	cleaned_text = clean_text(str(input_text))
	if cleaned_text != "":
		# Use the (trained once, then cached) model to create a classification mapping
		model, vectorizer = get_model()
		prediction_mapping = predict_class(cleaned_text, model, vectorizer)
		return jsonify({'prediction': json.dumps(prediction_mapping)})

	# If not, return an error code
	response = jsonify({
		'status': 412,
		'message': "The input text didn't contain any words that are included in the model -- put your wine-reviewer hat on and try again!",
	})
	response.status_code = 412
	return response


# Methods for wine-model-building:
lancaster = LancasterStemmer()

category_filter = ["Sangiovese", "Pinot Noir", "Semillon", "Nebbiolo",
			"Rhone Blends", "Shiraz/Syrah", "Merlot", "Chardonnay",
			"Tempranillo", "Cabernet Sauvignon and Blends", "Riesling",
			"Zinfandel", "Grenache", "Sauvignon Blanc", "Malbec", "Cabernet Franc",
			"Chenin Blanc", "Petite Sirah", "Mourvedre", "Pinot Gris", "Viognier",
			"Gruner Veltliner", "Gewurztraminer"]


def load_word_lists():
	with open(os.path.join(MODEL_DIR, 'model_words.json'), encoding='utf-8') as data_file:
		data = json.load(data_file)
	included_words = set(lancaster.stem(i) for i in data["included_words"])
	ngram_words = set(data["ngram_words"])
	return included_words, ngram_words


included_words, ngram_words = load_word_lists()


# Create ngrams from the list of ngram words in the format [modifier]_[ngram word]
def find_ngrams(input_list, n):
	ngrams = zip(*[input_list[i:] for i in range(n)])
	ngrams_filtered = []
	for (g1, g2) in ngrams:
		if g2 in ngram_words:
			ngrams_filtered.append(g1+"_"+g2)
	return ngrams_filtered


def clean_text(text_to_clean):
	words_raw = [word.lower() for word in re.findall(r'\w+(?:-\w+)?', text_to_clean)]
	words = [k for k in words_raw if not k.split('-')[0].isdigit()]
	ngrams = find_ngrams(words, 2)
	words = [lancaster.stem(k) for k in words]
	words = [k for k in words if k in included_words]
	words += ngrams
	return " ".join(words)


def predict_class(cleaned_text, model, vectorizer):
	cleaned_vectorized_text = vectorizer.transform([cleaned_text]).toarray()
	prediction = model.predict_proba(cleaned_vectorized_text)[0]
	classes = model.classes_

	prediction_mapping = []
	for i in range(0, len(prediction)):
		prediction_mapping.append({"name": str(classes[i]), "p": float(prediction[i]) * 100})
	prediction_mapping.sort(key=lambda x: x["p"], reverse=True)
	return prediction_mapping


def train_model(vectorizer):
	# Create the Multinomial Naive Bayes model
	with open(os.path.join(MODEL_DIR, 'training_data.txt'), encoding='utf-8') as training_data_file:
		training_data = json.load(training_data_file)

	keywords = [i["keywords"] for i in training_data]
	wine_class = [i["name"] for i in training_data]

	# Vectorize keywords
	word_vectors = vectorizer.fit_transform(keywords)

	# fit a Multinomial Naive Bayes model to the data
	model = MultinomialNB()
	model.fit(word_vectors, wine_class)

	return model


_model_lock = threading.Lock()
_model_cache = None


def get_model():
	"""Train the model on first use and reuse it afterwards (the training data never changes)."""
	global _model_cache
	with _model_lock:
		if _model_cache is None:
			vectorizer = CountVectorizer(token_pattern=r'\w+(?:-\w+)?', binary=True)
			_model_cache = (train_model(vectorizer), vectorizer)
		return _model_cache


if __name__ == "__main__":
	port = int(os.environ.get("PORT", 5050))
	# set debug=True if you want to have auto-reload on changes
	# this is great for developing
	app.run(host='0.0.0.0', port=port, debug=True)
