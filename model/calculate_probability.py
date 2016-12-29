import io

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


print_probability("probs.txt")