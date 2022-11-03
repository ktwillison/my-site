#!/usr/bin/python 
import os, copy, json, collections, io, re
from flask import Flask, jsonify, request, send_from_directory, make_response
from flask.ext.restful import Api, Resource, reqparse
from flask.ext.cors import CORS, cross_origin

from nltk.stem.lancaster import LancasterStemmer
from sklearn import datasets, metrics
from sklearn.naive_bayes import MultinomialNB
from sklearn.feature_extraction.text import CountVectorizer
import numpy as np

app = Flask(__name__, static_url_path='')
api = Api(app)
cors = CORS(app) 
app.config['CORS_HEADERS'] = 'Content-Type'

# get root
@app.route("/")
@app.route("/wine-explorer")
@app.route("/wine-model")
@app.route("/civis-journey-map")
@app.route("/stockholm-apartments")
def index():
	return app.make_response(open('templates/index.html').read())

# send assets (ex. assets/js/random_triangle_meshes/random_triangle_meshes.js)
# blocks other requests, so your directories won't get listed (ex. assets/js will return "not found")
@app.route('/assets/<path:path>')
def send_assets(path):
	return send_from_directory('assets/', path)

@app.route('/libraries/<path:path>')
def send_library(path):
	return send_from_directory('libraries/', path)

# @app.route('/wine/')
# def get_wine_index():
# 	return app.make_response(open('public_html/html/wine.html').read())

@app.route('/api/v1.0/data/<filename>/', methods=['GET'])
@cross_origin(origin='http://www.katewillison.com/', headers=['Content-Type','Authorization'])
def get_data(filename):
	with open('data/' + filename + '.json') as data_file:
		return json.dumps(json.load(data_file))



# Route for wine model API
class WineModelAPI(Resource):
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('input_text', type = str, required = True,
            help = 'No input text provided', location = 'json')
        super(WineModelAPI, self).__init__()

    def post(self):
		args = self.reqparse.parse_args()

		# First check if input text is valid
		cleaned_text = clean_text(args['input_text'])
		if cleaned_text != "":
			# Define a vectorizer, then train the model
			vectorizer = CountVectorizer(token_pattern=r'\w+(?:-\w+)?', binary=True)
			model = train_model(vectorizer)

			# Use the model to create a classification mapping
			prediction_mapping = predict_class(cleaned_text, model, vectorizer)
			return { 'prediction': json.dumps(prediction_mapping) }

		# If not, return an error code
		else:
			response = jsonify({
				'status': 412,
				'message': "The input text didn't contain any words that are included in the model -- put your wine-reviewer hat on and try again!",
			})
			response.status_code = 412
			return response



api.add_resource(WineModelAPI, '/api/v1.0/winemodel/', endpoint = 'wine-model')


# Methods for wine-model-building:
lancaster = LancasterStemmer()
included_words = []
ngram_words = []

category_filter = ["Sangiovese", "Pinot Noir", "Semillon", "Nebbiolo", 
			"Rhone Blends", "Shiraz/Syrah", "Merlot", "Chardonnay", 
			"Tempranillo", "Cabernet Sauvignon and Blends", "Riesling", 
			"Zinfandel", "Grenache", "Sauvignon Blanc", "Malbec", "Cabernet Franc",
			"Chenin Blanc", "Petite Sirah", "Mourvedre", "Pinot Gris", "Viognier", 
			"Gruner Veltliner", "Gewurztraminer"]

def set_word_lists():
	global included_words, ngram_words, lancaster
	with open('model/model_words.json') as data_file:    
	    data = json.load(data_file)#.encode("utf8")
	    included_words = data["included_words"]
	    included_words = [lancaster.stem(i) for i in included_words]
	    ngram_words = data["ngram_words"]

# Create ngrams from the list of ngram words in the format [modifier]_[ngram word]
def find_ngrams(input_list, n):
	ngrams = zip(*[input_list[i:] for i in range(n)])
	ngrams_filtered = []
	for (g1, g2) in ngrams:
		if g2 in ngram_words:
			ngrams_filtered.append(g1+"_"+g2)
	return ngrams_filtered

def clean_text(text_to_clean):
	global included_words, ngram_words, lancaster
	set_word_lists()
	words_raw = [word.lower() for word in re.findall(r'\w+(?:-\w+)?', text_to_clean)]
	words = [k for k in words_raw if not k.split('-')[0].isdigit()]
	ngrams = find_ngrams(words, 2)
	words = [lancaster.stem(k) for k in words]
	words = [k for k in words if k in included_words]
	words += ngrams
	return " ".join(words)

def predict_class(cleaned_text, model, vectorizer):
	cleaned_vectorized_text = vectorizer.transform([cleaned_text]).toarray()
	prediction = model.predict_proba(cleaned_vectorized_text)[0]#.toList()
	classes = model.classes_

	prediction_mapping = []
	for i in range(0, len(prediction)):
		prediction_mapping.append({"name": classes[i], "p":prediction[i]*100})
	prediction_mapping.sort(key=lambda x: x["p"], reverse=True)
	return prediction_mapping

def train_model(vectorizer):
	# Create the Gaussian Naive Bayes model
	with open('model/training_data.txt') as training_data_file:  
		training_data = json.load(training_data_file)

	keywords = [i["keywords"] for i in training_data]
	wine_class = [i["name"] for i in training_data]

	# Vectorize keywords
	word_vectors = vectorizer.fit_transform(keywords)

	# fit a Multinomial Naive Bayes model to the data
	model = MultinomialNB()
	model.fit(word_vectors.toarray(), wine_class)

	return model



if __name__ == "__main__":
	port = int(os.environ.get("PORT", 5050))
	app.run(host='0.0.0.0', port=port, debug=True)

# set debug=True if you want to have auto-reload on changes
# this is great for developing