import MySQLdb
import conf

class Database:
	_columns = {}

	def __init__(self):
		"""connect to db"""
		self.connect()

	def connect(self):
		"""connect to mysql db"""
		self.conn = MySQLdb.connect('localhost', conf.dbuser, conf.dbpassword)
		self.conn.converter[246]=float
		self.conn.set_character_set('utf8')

		self.cur = self.conn.cursor()
		self.cur.execute("use %s" % conf.dbname)


	def sql(self, query, values=(), as_dict=True, debug=False):
		"""like webnotes.db.sql"""
		if not self.conn:
			self.connect()
			
		if debug:
			print query % values
		
		self.cur.execute(query, values)
		res = self.cur.fetchall()

		if as_dict:
			out = []
			for row in res:
				d = {}
				for idx, col in enumerate(self.cur.description):
					d[col[0]] = row[idx]
				out.append(d)
			return out

		return res

	def begin(self):
		self.sql("start transaction");

	def rollback(self):
		self.sql("rollback");
		
	def commit(self):
		self.sql("commit");

	def close(self, commit=False):
		"""close connection"""
		if commit:
			self.commit()
		self.conn.close()
		self.conn = None
		
	def repair_table(self, ttype, create_table):
		"""create a new table and copy records"""
		import objstore
		obs = objstore.ObjStore()
		
		# clear old?
		if ('_tmp_' + ttype) in self.table_list():
			self.sql("drop table `_tmp_%s`" % ttype)			
		
		
		self.sql("rename table `%s` to `_tmp_%s`" % (ttype, ttype))
		self.sql(create_table)
		for obj in self.sql("select * from `_tmp_%s`" % (ttype)):
			obj['type'] = ttype
			obs.post_single(obj)
			
		self.sql("drop table `_tmp_%s`" % ttype)
	
	def table_list(self):
		"""get list of tables"""
		return [d[0] for d in self.sql("show tables", as_dict=False)]

	def columns(self, table):
		"""get columns of"""
		import database
		if not self._columns.get(table):
			self._columns[table] = [c[0] for c in \
				database.get().sql("desc `%s`" % table, as_dict=False)]
		return self._columns[table]

	def sync_tables(self, table=None):
		"""make / update tables from models"""
		import model, objstore

		tables = self.table_list()
		for modelclass in model.all():
			m = modelclass({})
			if (not table) or (table==m._name):
				if not m._name in tables:
					self.sql(m._create_table)
				else:
					self.repair_table(m._name, m._create_table)
				
				# update parent-child map
				if hasattr(m, '_parent'):
					self.begin()
					objstore.post(type="_parent_child", parent=m._parent, child=m._name)
					self.commit()

conn = None	
def create_db(rootuser, rootpass):
	"""create a new db"""
	conn = MySQLdb.connect('localhost', rootuser, rootpass)
	cur = conn.cursor()
	cur.execute("create database if not exists `%s`;" % conf.dbname)
	cur.execute("create user %s@'localhost' identified by %s", (conf.dbuser, conf.dbpassword))
	cur.execute("grant all privileges on `%s`.* to '%s'" % (conf.dbname, conf.dbuser))
	cur.execute("flush privileges")

def get():
	"""return a new connection"""
	global conn
	if not conn:
		conn = Database()
	return conn
	