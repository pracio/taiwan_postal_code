#-*- coding:utf8 -*-
import re
import codecs

pattern = '([東西南北]?)([一二三四五六七八九十]{0,2})[路段巷街里]'

p = codecs.open('p1','r','utf8')
sp = codecs.open('sp.txt','r','utf8')
f = codecs.open('set.txt','r','utf8')
w = codecs.open('out.txt','w','utf8')
lines = [i.rstrip() for i in f]
pattern = [i.rstrip() for i in p]
separator = [i.rstrip() for i in sp]
for l in lines:
	w.write(u'%s\t'%l)
	for i in pattern:
		try:
			subs = re.split(i,l)
			for s in subs:
				if s!=None and s!="":
					# w.write(u'%s\t'%s)
					b = True
					for sep in separator:
						al = s.split(sep)
						if len(al)>1:
							for a in al:
								w.write(u'%s\t'%a)
							b = False
							break
					if b:
						w.write(u'%s\t'%s)
		except Exception, e:
			print e
		w.write('\n')
w.close()
f.close()
p.close()
sp.close()