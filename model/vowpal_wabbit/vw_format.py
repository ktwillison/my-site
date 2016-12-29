import sys
import json
import re
import nltk
import io
import unicodedata
from nltk.stem.lancaster import LancasterStemmer



test_output = open('test.txt', 'w')


# Helper function to split words and build a count-mapping
lancaster = LancasterStemmer()
def clean_text(text_to_clean, words_count):

	# text_to_clean = text_to_clean.encode('utf8')
	# text_to_clean = text_to_clean.decode('utf8')
	# text_to_clean = unicodedata.normalize('NFC', text_to_clean)
	# words = [word.lower() for word in re.findall("([A-Za-z]\w+)", text_to_clean)]
	words_raw = [word.lower() for word in re.findall(r'\w+(?:-\w+)?', text_to_clean, re.UNICODE)]

	for w in words_raw:
		test_output.write(w)


	words = [k for k in words_raw if not k.split('-')[0].isdigit()]
	for word in words:
		# if word not in stop_words:
		# 	# stem word and check that it is within top 5k
		# 	word = lancaster.stem(word)
		# 	if word in top_words:
				if word in words_count:
					words_count[word] += 1
				else:
					words_count[word] = 1
	return words_count

# Helper function to print words and count in VW-friendly format
def print_features(frequency_map):
	return_string = ""
	for feature, count in frequency_map.iteritems():
		return_string += " " + feature + ":" + str(count)

	# if return_string == "":
	# 	return_string = " no_value:1"
	return return_string

# Data headers:
# varietal	name	country	sub_region	appelation	alcohol	review_1	review_2	review_3	review_4	review_5	link
# Reviews are columns 6-10 (0-indexed)
review_start = 6
review_end = 10


# Build varietal matchup from the file
categories = {} # 34 categories total, cut down to 23
category_filter = ["Sangiovese", "Pinot Noir", "Semillon", "Nebbiolo", 
			"Rhone Blends", "Shiraz/Syrah", "Merlot", "Chardonnay", 
			"Tempranillo", "Cabernet Sauvignon and Blends", "Riesling", 
			"Zinfandel", "Grenache", "Sauvignon Blanc", "Malbec", "Cabernet Franc",
			"Chenin Blanc", "Petite Sirah", "Mourvedre", "Pinot Gris", "Viognier", 
			"Gruner Veltliner", "Gewurztraminer"]
varietal_map_file = open('vowpal_wabbit/category_map.txt', 'r')
for f in varietal_map_file:
	lines = f.split('\r') # excel is awful, so readline breaks :(
for line in lines:
    data = (line.strip()).split('\t')
    categories[data[0]] = {"id":data[1], "color":data[2]}
varietal_map_file.close

stop_words = {}
stop_words_file = open('vowpal_wabbit/stop_words_wine_specific.txt', 'r')
for f in stop_words_file:
	lines = f.split('\r') # excel is awful, so readline breaks :(
	for line in lines:
	    data = (line.strip())
	    stop_words[data] = True
stop_words_file.close

stop_words_file = open('vowpal_wabbit/stop_words.txt', 'r')
for f in stop_words_file:
	lines = f.split('\r') # excel is awful, so readline breaks :(
	for line in lines:
	    data = (line.strip())
	    stop_words[data] = True
stop_words_file.close

top_words = {}
top_words_file = open('vowpal_wabbit/top_words_stemmed.txt', 'r')
for f in top_words_file:
	lines = f.split('\r') # excel is awful, so readline breaks :(
	for line in lines:
	    data = (line.strip())
	    if data != '': 
	    	top_words[data] = True
top_words_file.close


# Reformat each line in Vowpal Wabbit-friendly form

vw_output = open('vw_output.txt', 'w')
with io.open("wine_data_cleaned_word.txt", "r") as data_file: #, encoding="utf-8"
	data_file_content = data_file.read().encode("utf8")
	lines = data_file_content.split('\n')

# data_file = open('wine_data_cleaned_word.txt', 'r')
# for f in data_file:
# 	print f[2339]
# 	f = f.encode("utf8")
# 	lines = f.split('\r') # excel is awful, so readline breaks :(

# for f in sys.stdin:
# 	lines = f.split('\r') # excel is awful, so readline breaks :(
	for line in lines[1:len(lines)]:
		data = line.split('\t')

		# Parse varietal and keywords from each line
		varietal = data[0]
		if varietal in category_filter:
		# if True:

			keywords = {}
			for review in data[review_start:review_end]:
				# try:
					keywords = clean_text(review, keywords)
				# except:
				# 	pass

			# Build up and print the line
			label = categories[varietal]["id"] + " " + categories[varietal]["id"]
			# label = str(category_filter.index(varietal) + 1) + " " + str(category_filter.index(varietal) + 1)
			label = label + "|Color " + categories[varietal]["color"]
			keyword_label = print_features(keywords)
			if keyword_label != "":
				label = label + " |Keywords" + keyword_label + '\n'
				# print label
				vw_output.write(label)
vw_output.close()
test_output.close()



