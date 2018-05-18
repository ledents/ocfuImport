const dblib = require('./dblib.js');
//dblib.createDB();
//dblib.runSql('../sql/shopdbViews.tmpsql');
dblib.runSql('../sql/shopdbCopy.tmpsql', {DBFROM: 'shopdb', DBTO: 'shopdb2'});
dblib.end();
