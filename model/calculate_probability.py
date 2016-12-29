import io
import os
import subprocess

category_filter = ["Sangiovese", "Pinot Noir", "Semillon", "Nebbiolo", 
			"Rhone Blends", "Shiraz/Syrah", "Merlot", "Chardonnay", 
			"Tempranillo", "Cabernet Sauvignon and Blends", "Riesling", 
			"Zinfandel", "Grenache", "Sauvignon Blanc", "Malbec", "Cabernet Franc",
			"Chenin Blanc", "Petite Sirah", "Mourvedre", "Pinot Gris", "Viognier", 
			"Gruner Veltliner", "Gewurztraminer"]

def print_probability(file):
	print "\n------------- predictions -------------" 
	with io.open(file, "r") as data_file:
		for line in data_file:
			data = line.split(' ')
			data = [d.strip().split(':') for d in data]
			data.sort(key=lambda x: x[1], reverse=True)
			for (category, value) in data:
				print category_filter[int(category)-1] + ": " + str(value)
			print '\n'
		data_file.close()

def calculate_probability(input_file, output_file):
	environmentDict=dict(os.environ, LD_LIBRARY_PATH='/usr/local/lib')    
	# Hat Tip to shrikant-sharat for this secret incantation 
	# Note: only needed if you rebuilt vowpal and the new libvw.so is in /usr/local/lib

	predictCommand = ("vw -d " + input_file + " -t -i predictor.vw --link=logistic --quiet --probabilities -p " + output_file).split(' ')
	subprocess.call(predictCommand, env=environmentDict)

calculate_probability("input.txt", "output_probability.txt")
print_probability("output_probability.txt")