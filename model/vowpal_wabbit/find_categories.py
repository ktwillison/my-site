import sys

categories = {}

for f in sys.stdin:
	lines = f.split('\r')

	for line in lines:
		data = line.split('\t')
		categories[data[0]] = True
		# print data[100]

for category, val in categories.iteritems():
	print category