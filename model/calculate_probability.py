import io
import os
import re
import subprocess
from time import asctime, time
# from nltk.util import ngrams
from nltk.stem.lancaster import LancasterStemmer

lancaster = LancasterStemmer()

input_filename = "input.txt"
input_cleaned_filename = "input_cleaned.txt"
output_filename = "output_probability.txt"

category_filter = ["Sangiovese", "Pinot Noir", "Semillon", "Nebbiolo", 
			"Rhone Blends", "Shiraz/Syrah", "Merlot", "Chardonnay", 
			"Tempranillo", "Cabernet Sauvignon and Blends", "Riesling", 
			"Zinfandel", "Grenache", "Sauvignon Blanc", "Malbec", "Cabernet Franc",
			"Chenin Blanc", "Petite Sirah", "Mourvedre", "Pinot Gris", "Viognier", 
			"Gruner Veltliner", "Gewurztraminer"]

def print_probabilities(data):
	print "\n------------- predictions -------------" 
	for (category, value) in data:
		print category_filter[int(category)-1] + ": " + str(value)
	print '\n'

def find_probabilities(file):
	with io.open(file, "r") as data_file:
		for line in data_file:
			data = line.split(' ')
			data = [d.strip().split(':') for d in data]
			data.sort(key=lambda x: x[1], reverse=True)
		data_file.close()
		return data

def calculate_probability(input_filename, output_filename):
	environmentDict=dict(os.environ, LD_LIBRARY_PATH='/usr/local/lib')    
	# Hat Tip to shrikant-sharat for this secret incantation 
	# Note: only needed if you rebuilt vowpal and the new libvw.so is in /usr/local/lib

	predictCommand = ("vw -d " + input_filename + " -t -i predictor.vw --link=logistic --quiet --probabilities -p " + output_filename).split(' ')
	subprocess.call(predictCommand, env=environmentDict)

def clean_text(text_to_clean):
	words_raw = [word.lower() for word in re.findall(r'\w+(?:-\w+)?', text_to_clean)]
	words = [k for k in words_raw if not k.split('-')[0].isdigit()]

	# print "---------- words-----------"
	# print words

	ngrams = find_ngrams(words, 2)
	words = [lancaster.stem(k) for k in words]

	# print "---------- stemmed words-----------"
	# print words

	words = [k for k in words if k in included_words.keys()]
	words += ngrams

	# print "----------Included words-----------"
	# print included_words.keys()
	# print "----------Stop words-----------"
	# print stop_words.keys()

	return words

def create_cleaned_input_file(original_filename, cleaned_filename):
	cleaned = open(cleaned_filename, 'w')
	with io.open(original_filename, "r") as original:
		data = original.read().encode("utf8")
		keywords = clean_text(data)
		label = "1 1 |Keywords " + " ".join(keywords) + '\n'
		cleaned.write(label)
	original.close()
	cleaned.close()

included_words = {}
ngram_words = {}
included_words_file = open('vowpal_wabbit/included_words.txt', 'r')
for line in included_words_file:
    data = (line.strip().encode("utf8"))
    included_words[lancaster.stem(data)] = 1
included_words_file.close

ngrams_words_file = open('vowpal_wabbit/ngram_words.txt', 'r')
for line in ngrams_words_file:
    data = (line.strip())
    ngram_words[data] = 1
ngrams_words_file.close


# Create ngrams from the list of ngram words in the format [modifier]_[ngram word]
def find_ngrams(input_list, n):
	ngrams = zip(*[input_list[i:] for i in range(n)])
	ngrams_filtered = []
	for (g1, g2) in ngrams:
		if g2 in ngram_words.keys():
			ngrams_filtered.append(g1+"_"+g2)
	return ngrams_filtered


create_cleaned_input_file(input_filename, input_cleaned_filename)
calculate_probability(input_cleaned_filename, output_filename)
probabilities = find_probabilities(output_filename)
print_probabilities(probabilities)


