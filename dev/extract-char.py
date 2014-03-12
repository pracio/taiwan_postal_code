#-*- coding:utf8 -*-

import codecs
import sys
from update import Updater

def main():
	u = Updater(0.5)
	extracted = {}
	with codecs.open(sys.argv[1],'r','utf8') as f:
		lines = f.readlines()
		u.start()
		for l in lines:
			for n in l:
				if n!=u'\n' and n!=u'\u3000' and n!=u'\r':
					extracted[n]=1
					u.output=n
		u.stop()
	op = codecs.open('extracted.txt','w','utf-8')
	k = extracted.keys()
	k.sort()
	for c in k:
		op.write(c)
	op.close()


if __name__=='__main__':
	main()