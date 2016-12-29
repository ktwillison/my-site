# Split stdin into 2 files: 80/20

import sys
import random

split_80 = open('split_80.txt', 'w')
split_20 = open('split_20.txt', 'w')
split_80_count = split_20_count = 0.0

for line in sys.stdin:
	if random.random() < 0.8:
		split_80_count += 1
		split_80.write(line)
	else:
		split_20_count += 1
		split_20.write(line)

split_20.close()
split_80.close()

print("Wrote " + str(split_80_count) + " lines to split_80 ("+str(100*split_80_count/(split_80_count+split_20_count)) \
	+ "%) and " + str(split_20_count) + " lines to split_20 ("+str(100*split_20_count/(split_80_count+split_20_count))+"%)")