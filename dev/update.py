#-*- coding:utf8 -*-

import threading
import time
import os

cls = lambda: os.system(['clear','cls'][os.name=='nt'])

class Updater(threading.Thread):
	def __init__(self,interval):
		threading.Thread.__init__(self)
		self.interval = interval
		self.output = None
		self.enable = True
		self.clear = True

	def stop(self):
		self.enable = False

	def run(self):
		while self.enable:
			if self.output:
				if self.clear:
					cls()
				print self.output
			time.sleep(self.interval)

if __name__ == '__main__':
	u = Updater(0.500)
	u.start()
	c = 0
	try:
		while c<645000:
			time.sleep(0.030)
			u.output = '%s'%c
			c=c+1
	except KeyboardInterrupt:
		u.stop()
		u.join(1)