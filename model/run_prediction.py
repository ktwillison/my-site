

##########################################################################
#  Here are the essential ingredients.  You'll have to fill in the rest...;)
##########################################################################

import os
from time import asctime, time
import subprocess
import csv
import numpy as np
import pandas as pd
.
.
.
#############################################################
# Parameters and Globals
#############################################################
environmentDict=dict(os.environ, LD_LIBRARY_PATH='/usr/local/lib')    
# Hat Tip to shrikant-sharat for this secret incantation 
# Note: only needed if you rebuilt vowpal and the new libvw.so is in /usr/local/lib

parseStr = lambda x: float(x) if '.' in x else int(x)


#############################################################
# Vowpal Wabbit commands 
#############################################################
"""
WARNING:  MAKE SURE THERE ARE NO EXTRA SPACES IN THESE COMMAND STRINGS...IT GIVES A BOOST::MULTIPLE OPTIONS ERROR
"""
trainCommand = ("vw --rank 3 -q ui --loss_function=squared --l2 0.001 \
--learning_rate 0.015 --passes 20 --decay_learning_rate 0.97 --power_t 0 \
-d train_vw.data --cache_file vw.cache -f vw.model -b 20").split(' ')         

predictCommand = ("vw -t -d test_vw.data -i vw.model -p vw.predict").split(' ')

.
.
.

#############################################################
# Generate the VW Train/Test data format in a Pandas DataFrame using the apply method 
#############################################################
def genTrainInstances(aRow):  
    userid = str(aRow['userid'])
    urlid = str(aRow['urlid'])
    y_row = str(int(float(aRow['rating']))  )
    rowtag = userid+'_'+urlid
    rowText = (y_row + " 1.0  " + rowtag + "|user " + userid +" |item " +urlid)  
    return  rowText
    
def genTestInstances(aRow):  
    y_row = str(0)
    userid = str(aRow['userid'])
    urlid = str(aRow['urlid'])
    rowtag = userid+'_'+urlid
    rowText = (y_row + " 1.0  " + rowtag + "|user " + userid +" |item " +urlid)
    return  rowText
.
.
.
#############################################################
# Function to read the VW predict file, strip off the desired value and return a vector with results
#############################################################
def readPredictFile():
    y_pred = []
    with open('vw.predict', 'rb') as csvfile:
        predictions = csv.reader(csvfile, delimiter=' ', quotechar='|')
        for row in predictions:
            pred = parseStr(row[0])
            y_pred.append(val)
    return np.asarray(y_pred)  
.
.
.
#############################################################
# Function to train a VW model using DataFrame called df_train
# - Apply genTrainInstances
# - Write newly create column to flat file
# - Invoke Vowpal Wabbit for training
#############################################################
def train_model():
    global df_train, trainCommand, environmentDict

    print "Generating VW Training Instances: ", asctime()
    df_train['TrainInstances'] = df_train.apply(genTrainInstances, axis=1)
    print "Finished Generating Train Instances: ", asctime()

    print "Writing Train Instances To File: ", asctime()
    trainInstances = list(df_train['TrainInstances'].values)
    f = open('train_vw.data','w')
    f.writelines(["%s\n" % row  for row in trainInstances])
    f.close()
    print "Finished Writing Train Instances: ", asctime()

    subprocess.call(trainCommand, env=environmentDict)
    print "Finished Training: ", asctime()      
    return
.
.
.
#############################################################
# Function to test a VW model using DataFrame df_test
# - Apply genTestInstances
# - Write new column to flat file
# - Invoke Vowpal Wabbit for prediction
#############################################################
def predict_model():
    global environmentDict, predictCommand, df_test

    print "Building Test Instances: ", asctime()
    df_test['TestInstances'] = df_test.apply(genTestInstances, axis=1)
    print "Finished Generating Test Instances: ", asctime()

    print "Writing Test Instances: ", asctime()
    testInstances = list(df_test['TestInstances'].values)
    f = open('test_vw.data','w')
    f.writelines(["%s\n" % row  for row in testInstances])
    f.close()
    print "Finished Writing Test Instances: ", asctime()

    subprocess.call(predictCommand, env=environmentDict)

    df_test['y_pred'] = readPredictFile()
    return
