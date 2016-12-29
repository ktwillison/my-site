import sys

for lines in sys.stdin:
	line = lines.split('\r')
	for part in line:
		print part.strip()