const dblib = require('./dblib.js');
//dblib.createDB();
dblib.runSql('sql/shopdbViews.tmpsql');
dblib.end();
