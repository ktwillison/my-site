import io

def print_accuracy(file, prefix):
	count = 0
	correct = 0
	with io.open(file, "r") as data_file:
		for line in data_file:
			data = line.split()
			if len(data) == 7 and data[6].isdigit() and data[5].isdigit():
				predicted = data[5].strip()
				true_val = data[4].strip()
				if predicted == true_val: correct += 1
				count += 1
		
		print "\n-------------" + prefix + "-------------" 
		print "Correct: " + str(correct) + " out of " + str(count)
		print "Accuracy: " + str(100*correct/count) + "%"
		data_file.close()


# print_accuracy("pred.txt", "Testing")
print_accuracy("test_pred.txt", "Testing")
print_accuracy("train_pred.txt", "Training")