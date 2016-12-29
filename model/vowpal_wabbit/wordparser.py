import sys
import json
import re
import csv

# Helper function to split words and build a count-mapping
def clean_text(text_to_clean, words_count):
	text_to_clean = text_to_clean.encode('utf8')
	# words = [word.lower() for word in re.findall("([A-Za-z]\w+)", text_to_clean)]
	words_raw = [word.lower() for word in re.findall(r'\w+(?:-\w+)?', text_to_clean)]
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
review_start = 6
review_end = 10
count = 1

# Build varietal matchup from the file
# categories = {} # 34 categories total
# varietal_map_file = open('category_map.txt', 'r')
# for f in varietal_map_file:
# 	lines = f.split('\r') # excel is awful, so readline breaks :(
# for line in lines:
#     data = (line.strip()).split('\t')
#     categories[data[0]] = data[1]
# varietal_map_file.close

# Reformat each line in Vowpal Wabbit-friendly form
for f in sys.stdin:
	lines = f.split('\r') # excel is awful, so readline breaks :(

# wines = {}
wordcounts = {}
# count = 0
for line in lines[1:len(lines)]:
	# keywords = {}
	# print count
	data = line.split('\t')

	# Parse varietal and keywords from each line
	# varietal = data[0]

	# Only Barbera and Malbec for now
	if True:
	# if categories[varietal] == "1" or categories[varietal] == "14":
		for review in data[review_start:review_end]:
			try:
				# keywords = clean_text(review, keywords)
				wordcounts = clean_text(review, wordcounts)
				#print keywords
			except:
				pass

		# if len(keywords) == 0: continue

		# if categories[varietal] == "1":
		# 	keywords["wineLabel"] = 1
		# elif categories[varietal] == "14":
		# 	keywords["wineLabel"] = 0

		# wines[count] = keywords
		# count += 1
	# Build up and print the line
	#label = categories[varietal] + " " + categories[varietal]
	#label = label + "|Keywords" + print_features(keywords)
	
	#print keywords

# jason = []
# for key in wines:
# 	jason.append(wines[key])

# print "writing"

# to be used in SQL for further analysis

with open('wordcounts.csv', 'wb') as csvfile:
    spamwriter = csv.writer(csvfile, delimiter=',',
                            quotechar='"', quoting=csv.QUOTE_MINIMAL)
    for o_key, o_value in wordcounts.iteritems():
	    spamwriter.writerow([o_key, o_value])
	    

# with open('test.txt', 'wb') as outfile:
# 	json.dump(jason, outfile)

