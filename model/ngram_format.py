import sys
import json
import re
import nltk
import io
from nltk.util import ngrams
from nltk.stem.lancaster import LancasterStemmer
import random

# Number of words to include in each n-gram
ngram_number = 1
ngram_output = open('ngram_output.txt', 'w')

# Helper function to split words and build a count-mapping
lancaster = LancasterStemmer()
def clean_text(text_to_clean, words_count):
	# text_to_clean = text_to_clean.encode('utf8')

	words_raw = [word.lower() for word in re.findall(r'\w+(?:-\w+)?', text_to_clean)]
	words = [k for k in words_raw if not k.split('-')[0].isdigit()]
	words = [k for k in words if not k in stop_words.keys()]
	ngrams = find_ngrams(words, 2)

	# print ngrams
	if len(ngrams) > 0 :
		ngram_output.write(", ".join(ngrams) + '\n')

	words = [lancaster.stem(k) for k in words]
	words = [k for k in words if k in included_words.keys()]
	# words = [k for k in words if k in top_words.keys()]
	words += ngrams

	# for word in words:
	# 	if word in words_count:
	# 		words_count[word] += 1
	# 	else:
	# 		words_count[word] = 1
	# return words_count
	words_count += words
	return words_count

# Helper function to print words and count in VW-friendly format
def print_features(frequency_map):
	return_string = ""
	for feature, count in frequency_map.iteritems():
		return_string += " " + feature + ":" + str(count)
	return return_string


# Data headers:
# varietal	name	country	sub_region	appelation	alcohol	review_1	review_2	review_3	review_4	review_5	link
# Reviews are columns 6-10 (0-indexed)
review_start = 6
review_end = 10


# Build varietal matchup from the file
# categories = {} # 34 categories total, cut down to 23
category_filter = ["Sangiovese", "Pinot Noir", "Semillon", "Nebbiolo", 
			"Rhone Blends", "Shiraz/Syrah", "Merlot", "Chardonnay", 
			"Tempranillo", "Cabernet Sauvignon and Blends", "Riesling", 
			"Zinfandel", "Grenache", "Sauvignon Blanc", "Malbec", "Cabernet Franc",
			"Chenin Blanc", "Petite Sirah", "Mourvedre", "Pinot Gris", "Viognier", 
			"Gruner Veltliner", "Gewurztraminer"]
# varietal_map_file = open('vowpal_wabbit/category_map.txt', 'r')
# for f in varietal_map_file:
# 	lines = f.split('\r') # excel is awful, so readline breaks :(
# for line in lines:
#     data = (line.strip()).split('\t')
#     categories[data[0]] = {"id":data[1], "color":data[2]}
# varietal_map_file.close

stop_words = {}
top_words = {}
included_words = {}
ngram_words = {}
stop_words_file = open('vowpal_wabbit/stop_words_wine_specific.txt', 'r')
for line in stop_words_file:
    data = (line.strip())
    stop_words[data] = 1
stop_words_file.close

stop_words_file = open('vowpal_wabbit/stop_words.txt', 'r')
for line in stop_words_file:
    data = (line.strip())
    stop_words[data] = 1
stop_words_file.close

included_words_file = open('vowpal_wabbit/included_words.txt', 'r')
for line in included_words_file:
    data = (line.strip().encode("utf8"))
    included_words[lancaster.stem(data)] = 1
included_words_file.close

top_words_file = open('vowpal_wabbit/top_words_stemmed.txt', 'r')
top_words_max = 5000
for line in top_words_file:
	if (len(top_words) > top_words_max):
		break
	else:
	    data = (line.strip())
	    top_words[data] = 1
top_words_file.close

ngrams_words_file = open('vowpal_wabbit/ngram_words.txt', 'r')
for line in ngrams_words_file:
    data = (line.strip())
    ngram_words[data] = 1
ngrams_words_file.close

def find_ngrams(input_list, n):
	ngrams = zip(*[input_list[i:] for i in range(n)])
	ngrams_filtered = []
	for (g1, g2) in ngrams:
		if g2 in ngram_words.keys():
			ngrams_filtered.append(g1+"_"+g2)
	# input_list = [k for k in input_list if k in ngram_words.keys()]
	return ngrams_filtered


vw_output = open('vw_output.txt', 'w')
with io.open("wine_data_cleaned_word.txt", "r") as data_file:
	# data_file_content = data_file.read().encode("utf8")
	lines = [ (random.random(), line.encode("utf8")) for line in data_file ]
	lines.sort()
	# lines = data_file_content.split('\n')
	for _, line in lines[1:len(lines)]:
		data = line.split('\t')

		# Parse varietal and keywords from each line
		varietal = data[0]
		if varietal in category_filter:

			# keywords = {}
			keywords = list()
			for review in data[review_start:review_end]:
				keywords = clean_text(review, keywords)

			# Build up and print the line
			# label = categories[varietal]["id"] + " " + categories[varietal]["id"]
			# label = str(category_filter.index(varietal) + 1) + " " + str(category_filter.index(varietal) + 1)
			# label = label + "|Color " + categories[varietal]["color"]
			label_id = str(category_filter.index(varietal) + 1)
			label = label_id + " " + label_id
			# keyword_label = print_features(keywords)
			# if keyword_label != "":
			if len(keywords) > 0:
				# label = label + " |Keywords" + keyword_label + '\n'
				label = label + " |Keywords " + " ".join(keywords) + '\n'
				# print label
				vw_output.write(label)
vw_output.close()
ngram_output.close()



# Reformat each line in Vowpal Wabbit-friendly form
# for line in sys.stdin:
# # 	lines = f.split('\r') # excel is awful, so readline breaks :(

# # for line in lines[1:len(lines)]:
# 	#data = line.strip().split('\t')

# 	# print review

# 	# Parse varietal and keywords from each line
# 	review = line
# 	keywords = []
# 	keywords = clean_text(review)

# 	# ngrams_out = nltk.bigrams(" ".join(keywords))
# 	ngrams_out = find_ngrams(keywords, ngram_number)

# 	ngrams_out_str = ""
# 	for gram in ngrams_out:
# 		ngrams_out_str += "_".join(gram) + " " 

# 	# print ngrams_out_str
# 	print data[0] + " " + data[1] + " " + ngrams_out_str



