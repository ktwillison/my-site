#!/usr/bin/python 

import os, copy, json
import json, collections
from flask import Flask, jsonify, request, send_from_directory, make_response
from flask.ext.cors import CORS, cross_origin
app = Flask(__name__, static_url_path='')
cors = CORS(app) 
app.config['CORS_HEADERS'] = 'Content-Type'

# get root
@app.route("/")
def index():
	return app.make_response(open('public_html/index.htm').read())

# send assets (ex. assets/js/random_triangle_meshes/random_triangle_meshes.js)
# blocks other requests, so your directories won't get listed (ex. assets/js will return "not found")
@app.route('/assets/<path:path>')
def send_assets(path):
	return send_from_directory('public_html/', path)

# @app.route('/wine/')
# def get_wine_index():
# 	return app.make_response(open('public_html/html/wine.html').read())

@app.route('/api/v1.0/data/wine_finder_data/', methods=['GET'])
@cross_origin(origin='http://www.katewillison.com',headers=['Content-Type','Authorization'])
def get_wine_finder_data():
	with open('data/wine_finder_data.json') as data_file:
		return json.dumps(json.load(data_file))


if __name__ == "__main__":
	port = int(os.environ.get("PORT", 5050))
	app.run(host='0.0.0.0', port=port, debug=True)

# set debug=True if you want to have auto-reload on changes
# this is great for developing