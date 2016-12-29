import sys
import json
import re

# Helper function to split words and build a count-mapping
def clean_text(text_to_clean, words_count):
	text_to_clean = text_to_clean.encode('utf8')
	# words = [word.lower() for word in re.findall("([A-Za-z]\w+)", text_to_clean)]
	words_raw = [word.lower() for word in re.findall(r'\w+(?:-\w+)?(?:_\w+)?(?:-\w+)?', text_to_clean)]
	words = [k for k in words_raw if not k.split('-')[0].isdigit()]
	for word in words:
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
review_start = 3
review_end = 3


# Build varietal matchup from the file
categories = {} # 34 categories total
# category_filter = ["Zinfandel", "Chardonnay", "Sauvignon Blanc", "Pinot Noir", "Riesling", "Shiraz/Syrah"]
varietal_map_file = open('category_map.txt', 'r')
for f in varietal_map_file:
	lines = f.split('\r') # excel is awful, so readline breaks :(
for line in lines:
    data = (line.strip()).split('\t')
    categories[data[0]] = {"id":data[1], "color":data[2]}
varietal_map_file.close

# print categories
# stop_words_file = open('../mallet/program/data/stop_words_wine_specific.txt', 'r')
# for f in stop_words_file:
# 	lines = f.split('\r') # excel is awful, so readline breaks :(
# for line in lines:
#     data = (line.strip())
#     stop_words[data]
# stop_words_file.close


# Reformat each line in Vowpal Wabbit-friendly form
for line in sys.stdin:
# 	lines = f.split('\r') # excel is awful, so readline breaks :(

# for line in lines[1:len(lines)]:
	data = line.split(' ')

	# Parse varietal and keywords from each line
	varietal = data[0].strip()
	varietal = varietal.replace("_", " ")

	# print varietal

	# if varietal in category_filter:
	if True:
		# print data[1]
		keywords = {}
		keywords = clean_text(" ".join(data[2:len(data)]), keywords)
		# print keywords
		# for review in data[review_start:review_end]:
		# 	try:
		# 		# keywords = clean_text(review, keywords)
		# 		keywords = review.split(" ")
		# print keywords
		# 	except:
		# 		pass

		# Build up and print the line
		label = categories[varietal]["id"] + " " + categories[varietal]["id"]
		# label = str(category_filter.index(varietal) + 1) + " " + str(category_filter.index(varietal) + 1)
		label = label + "|Color " + categories[varietal]["color"]
		label = label + " |Keywords" + print_features(keywords)
		if print_features(keywords) != "":
			print label



