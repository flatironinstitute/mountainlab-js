import numpy as np
import requests
import json
import os
import io
from mltools import mdaio

class MLStudyScript:
    def __init__(self):
        self._object={}
        self._results_object={}
    def setObject(self,obj):
        self._object=obj
    def setResultsObject(self,obj):
        self._results_object=obj
    def result(self,name):
        return self._results_object[name]['value']
    def loadResult(self,name):
        return loadFile(self.result(name))
    def loadTextResult(self,name):
        return loadTextFile(self.result(name))
    def loadJsonResult(self,name):
        return loadJsonFile(self.result(name))
    def loadMdaResult(self,name):
        return loadMdaFile(self.result(name))
    def getResultPath(self,name):
        return getFilePath(self.result(name))

class MLStudyDataset:
    def __init__(self):
        self._object={}
    def setObject(self,obj):
        self._object=obj
    def fileNames(self):
        return self._object['files'].keys()
    def file(self,file_name):
        return self._object['files'][file_name]
    def loadFile(self,name):
        return loadFile(self.file(name))
    def loadTextFile(self,name):
        return loadTextFile(self.file(name))
    def loadJsonFile(self,name):
        return loadJsonFile(self.file(name))
    def loadMdaFile(self,name):
        return loadMdaFile(self.file(name))
    def getFilePath(self,name):
        return getFilePath(self.file(name))

class MLStudy:
    _docstor_url='https://docstor1.herokuapp.com'
    def __init__(self,id='',path=''):
        self._study={}
        self.load(id=id,path=path)
    def setDocStorUrl(self,url):
        self._docstor_url=url
    def load(self,id='',path=''):
        if id:
            req=requests.post(self._docstor_url+'/api/getDocument',json={"id":id,"include_content":True})
            if (req.status_code != 200):
                raise ValueError('Unable to load study with id: '+id)
            self._study=json.loads(req.json()['content'])
            return True
        else:
            if not path:
                path='/working/_private/data/workspace.mlw'
            self._study=json.load(open(path))
            return True
    def description(self):
        return self._study['description']
    def scriptNames(self):
        return self._study['scripts'].keys()
    def script(self,script_name):
        X=MLStudyScript()
        X.setObject(self._study['scripts'][script_name])
        X.setResultsObject(self._study['results_by_script'][script_name])
        return X;
    def datasetIds(self):
        return self._study['datasets'].keys()
    def dataset(self,dataset_id):
        X=MLStudyDataset()
        X.setObject(self._study['datasets'][dataset_id])
        return X;

def _prv_locate(sha1,size,fcs):
    cmd='ml-prv-locate --sha1={} --size={} --fcs={}'.format(sha1,size,fcs)
    str0=os.popen(cmd).read().strip()
    if os.path.isfile(str0):
        return str0
    else:
        return None
    
def getFilePath(obj):
    if type(obj)==str:
        if obj.endswith('.prv'):
            prv=json.load(open(obj))
            return getFilePath({'prv':prv})
        else:
            return obj
    if 'prv' in obj:
        path0=_prv_locate(sha1=obj['prv']['original_checksum'],size=obj['prv']['original_size'],fcs=obj['prv']['original_fcs'])
        if path0:
            return path0
        checksum=obj['prv']['original_checksum']
        return _get_file_path_from_checksum(checksum)
    else:
        return None

def loadFile(obj):
    if type(obj)==str:
        path0=getFilePath(obj) # in case .prv file
        with open(path0, "rb") as binary_file:
            return binary_file.read()
    elif 'prv' in obj:
        checksum=obj['prv']['original_checksum']
        return _download_file_from_checksum(checksum)
    else:
        return None

    
def _get_kbucket_url_from_checksum(checksum):
    return 'https://kbucket.flatironinstitute.org/download/'+checksum

def _download_and_get_file_path_from_checksum(checksum):
    if ('KBUCKET_DOWNLOAD_DIRECTORY' in os.environ) and (os.path.isdir(os.environ['KBUCKET_DOWNLOAD_DIRECTORY'])):
        url=_get_kbucket_url_from_checksum(checksum)
        kbucket_download_directory=os.environ['KBUCKET_DOWNLOAD_DIRECTORY']
        file_path=os.path.join(kbucket_download_directory,checksum)
        if not os.path.isfile(file_path):
            _download_to_file(url,file_path)
        return file_path
    else:
        return None

def _download_file_from_checksum(checksum):
    if ('KBUCKET_DOWNLOAD_DIRECTORY' in os.environ) and (os.path.isdir(os.environ['KBUCKET_DOWNLOAD_DIRECTORY'])):
        file_path=_download_and_get_file_path_from_checksum(checksum)
        with open(file_path, "rb") as binary_file:
            return binary_file.read()
    else:
        url=_get_kbucket_url_from_checksum(checksum)
        req=requests.get(url)
        return req.content

def _download_to_file(url,file_path):
    import urllib.request
    tmp_file_name=file_path+'.downloading'
    urllib.request.urlretrieve(url, tmp_file_name)
    os.rename(tmp_file_name,file_path)

def loadTextFile(obj):
    return loadFile(obj).decode('utf-8')

def loadJsonFile(obj):
    return json.loads(loadTextFile(obj))

def _read_int32(f):
    return struct.unpack('<i',f.read(4))[0]
    
def _read_int64(f):
    return struct.unpack('<q',f.read(8))[0]

def _header_from_bytes(Bytes):
    f=io.BytesIO(Bytes)
    ret=mdaio._header_from_file(f)
    f.close()
    return ret;
    
def _mda_from_bytes(Bytes):
    H=_header_from_bytes(Bytes)
    if (H is None):
        print ("Problem reading mda header of binary data")
        return None
    ret=np.array([])
    buf=io.BytesIO(Bytes).getbuffer()
    try:
        buf=buf[H.header_size:]
        #This is how I do the column-major order
        ret=np.frombuffer(buf,dtype=H.dt,count=H.dimprod)
        ret=np.reshape(ret,H.dims,order='F')
        return ret
    except Exception as e: # catch *all* exceptions
        print (e)
        return None

def loadMdaFile(obj):
    return _mda_from_bytes(loadFile(obj))
