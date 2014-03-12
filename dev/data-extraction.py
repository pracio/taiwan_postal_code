#-*- coding:utf8 -*-

import csv
import json
import sys
import codecs
import re
from update import Updater

pattern = u'([東西南北]?)([一二三四五六七八九十]{0,4})[路段巷街里]'
eliminate = [u'縣',u'市',u'區',u'鄉',u'鎮',u'村',u'路',u'巷',u'街']
splitter = [u"大道",u"新城",u"營區",u"新村",u"村"]
pool = []
result = []

def main():
	u = Updater(0.5)
	with open(sys.argv[1],'r') as f:
		last = update_pool(get_a_line(f.readline()))
		lines = f.readlines()
		u.start()
		for l in lines:
			r = get_a_line(l)
			if equal(r,last):
				last['data']=last['data']+r['data']
			else:
				result.append(last)
				last = r
				last = update_pool(last)
				u.output = '%s.%s%s%s'%(len(result),last['city'],last['area'],last['road'])
		pool_dup = sorted(pool,reverse=True,key=lambda x:len(x))
		for r in result:
			r['feat']=find_feature(pool_dup,r['city']+r['area']+r['road'])
			u.output = 'changing:%s%s%s,%s'%(r['city'],r['area'],r['road'],r['feat'])
		u.stop()
		print 'writing files'
		po = codecs.open('word_pool.js','w','utf-8')
		po.write(u'var pool=')
		po.write(json.dumps(pool_dup,encoding='utf8',ensure_ascii=False))
		po.write(u';')
		po.close()
		ro = codecs.open('data.js','w','utf-8')
		ro.write(u'var database=')
		ro.write(json.dumps(result,encoding='utf8',ensure_ascii=False))
		ro.write(u';')
		ro.close()

def find_feature(pool,line):
	feat = []
	for i in range(len(pool)):
		idx = line.find(pool[i])
		if idx>=0:
			feat.append(i)
			line = line.replace(pool[i],"")
	return feat

def insert_pool(s):
	if not s in pool:
		pool.append(s)
		return len(pool)-1
	else:
		return pool.index(s)

def update_pool(record):
	feature = []
	m=re.split(pattern,record['road'])
	for i in m:
		if i!=u'' and i!=None:
			b = True
			for s in splitter:
				al = i.split(s)
				if len(al)>1:
					for a in al:
						if a!=u'' and i!=None:
							feature.append(insert_pool(a))
							b = False
							break
			if b:
				feature.append(insert_pool(i))
			#feature.append(insert_pool(i))
	for i in ['city','area']:
		p = purify(record[i])
		feature.append(insert_pool(p))
	record['feat']=feature
	return record

def equal(one,two):
	return one['road']==two['road'] and one['city']==two['city'] and one['area']==two['area']

def purify(word):
	for i in eliminate:
		idx = word.find(i)
		if idx>=0:
			return word[0:idx]
	return word

def get_a_line(line):
	ret = {}
	sub = []
	ret['data']=[]
	for s in line.decode('utf-8').split(u' '):
		if (s is not u'') and (s != u'\n'):
			sub.append(s)
	if len(sub)<3:
		print sub
	ret['city']=sub[0][5:8]
	ret['area']=sub[0][8:]
	ret['road']=sub[1]
	data = {}
	data['code']=sub[0][0:5]
	data['type']=sub[2]
	if len(sub)==4:
		data['desc']=sub[3]
	else:
		data['desc']=''
	ret['data'].append(data)
	return ret

if __name__ == '__main__':
	main()