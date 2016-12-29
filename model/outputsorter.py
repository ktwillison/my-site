import sys
import operator

for line in sys.stdin:
	data = line.strip().split('\t')

	wines = []
	vals = []
	parsed = {}
	wine = ""

	for i,d in enumerate(data):
		if not i: continue

		if i%2:
			parsed[d] = 0
			wine = d

		if not (i%2):
			parsed[wine] = float(d)

	parsed = sorted(parsed.items(), key=operator.itemgetter(1))
	parsed.reverse()

	for p in parsed:
		print p[0],":",p[1] 
