const dblib = require('./dblib.js');
//dblib.createDB();
//dblib.runSql('../sql/shopdbViews.tmpsql');
dblib.runSql('../sql/shopdbCopy.tmpsql', {DBFROM: 'shopdb2', DBTO: 'shopdb'});
dblib.end();
