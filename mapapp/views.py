from django.shortcuts import render
# from django.views.decorators.csrf import csrf_exempt

from tempfile import NamedTemporaryFile
import os, sys
from django.http import HttpResponse

# import http.client
# python2 import httplib

# this for python3 maybe:
# import urllib.request
# import urllib.parse
# this for python2 I guess:
# import urllib
import urllib2

from osgeo import ogr, osr, gdal
import json
from collections import OrderedDict
# todo
# csrf with superagent and django (exempt only for development)
# @csrf_exempt
def upload(request):
    # import ipdb; ipdb.set_trace()
    if request.POST.get('url', False):
    	# get file
    	# conn = http.client.HTTPSConnection(request.POST['url'])
    	# conn.request("GET", "/")
    	# import ipdb; ipdb.set_trace()
    	# r1 = conn.getresponse()
    	# print(r1.status, r1.reason)
    	# data1 = r1.read()
    	# conn.close()
        # python3:
        # f = urllib.request.urlopen(request.POST['url'])
        # python2:
        # import ipdb; ipdb.set_trace()
        if request.POST['suffix'].encode('utf-8') == 'isJson':
            f = urllib2.urlopen(request.POST['url'])
            externalJson = f.read()
            # import ipdb; ipdb.set_trace()
            return HttpResponse(externalJson)
    	else:
            f = urllib2.urlopen(request.POST['url'])
    	    contents = f.read().decode('utf-8')
    	# import ipdb; ipdb.set_trace()
    	# print(f.read())
    elif request.FILES.get('inputFile', False):
	    # STEP: show uploaded file from memory and the file contents
	    upload_file = request.FILES['inputFile']
	    contents = upload_file.read().decode('utf-8')
    # import ipdb; ipdb.set_trace()
    # STEP: from memory to temprory file to have a path to file what gdal needs
    # with NamedTemporaryFile(suffix=".kml") as t:
    # issue (fixed): suffix needs to be variable and passed from request
    with NamedTemporaryFile(suffix=request.POST['suffix']) as t:
        contentsStr = contents.encode('utf-8')
        # import ipdb; ipdb.set_trace()
        t.write(contentsStr)
        # next line is what was before (python3) dont see the reason for that
        # t.write(bytes(contents, 'UTF-8'))
        t.seek(0)
        # # driver = ogr.GetDriverByName('KML')
        # # sourceData = driver.Open(t.name)
        sourceData = ogr.Open(t.name, 0)
        inLayer = sourceData.GetLayer()

        # STEP: Create new geojson from input
        # feature_collection = {"type": "FeatureCollection", "features": []}
        valuesSorted = OrderedDict([('type','FeatureCollection'),('features',[])])
        # valuesSorted['features'] = []

        for inFeature in inLayer:
            # feature_collection["features"].append(json.loads(inFeature.ExportToJson()))
            valuesSorted['features'].append(json.loads(inFeature.ExportToJson()))
        # geojsonFile = json.dumps(feature_collection, sort_keys=False)
        geojsonFile = json.dumps(valuesSorted, sort_keys=False)
        
        t.close()

        # import ipdb; ipdb.set_trace()
        # pass
        return HttpResponse(geojsonFile)
    
    # import ipdb; ipdb.set_trace()
    # pass 

