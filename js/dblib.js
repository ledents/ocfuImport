const mysql      = require('mysql2');
const dbSettings = require('./dbSettings');
const fs	 = require('fs');

var con = mysql.createConnection(dbSettings);

const BATCH_SIZE = 512;

const DB_SHOP       = 'shopdb2';
const TBL_BRANDS    = DB_SHOP+'.impBrands';
const TBL_CATS      = DB_SHOP+'.impCats';
const TBL_CATXT     = DB_SHOP+'.impCaTxt';
const TBL_ITEMS     = DB_SHOP+'.impItems';
const TBL_ITEMTXT   = DB_SHOP+'.impItemTxt';
const TBL_ITEMSTOCK = DB_SHOP+'.impItemStock';
const TBL_ITEMPRICE = DB_SHOP+'.impItemPrice';

var dblib;
var TBLS = {
    brands : {
        dbName: `${TBL_BRANDS}`,
        cnt   : 0,
        batch : [],
        SQL : {
            create:
                `CREATE OR REPLACE TABLE ${TBL_BRANDS} (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    name VARCHAR(64) NOT NULL,
                    img VARCHAR(255) NOT NULL DEFAULT '',
                    PRIMARY KEY (name),
                    INDEX idxId (id)
                ) COLLATE='utf8_general_ci'`,
            upload: `REPLACE INTO ${TBL_BRANDS} (id, name,img) VALUES ?`,
            select: `SELECT * FROM ${TBL_BRANDS}`
            }
    },
    cats : {
        dbName: `${TBL_CATS}`,
        cnt   : 0,
        batch : [],
        SQL : {
            create:
                `CREATE OR REPLACE TABLE ${TBL_CATS} (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    supId TINYINT UNSIGNED NOT NULL DEFAULT '0',
                    catKey VARCHAR(15) NOT NULL,
                    parCatKey VARCHAR(15) NULL DEFAULT NULL,
                    lvl TINYINT NOT NULL DEFAULT '0',
                    sortOrder SMALLINT UNSIGNED NOT NULL DEFAULT '0',
                    img VARCHAR(255) NOT NULL DEFAULT '',
                    PRIMARY KEY (supId, catKey),
                    INDEX idIdx (id),
                    INDEX parentIdx (parCatKey)
                ) COLLATE='utf8_general_ci'`,
            upload: `REPLACE INTO ${TBL_CATS} (id, catKey, parCatKey, lvl, sortOrder, img) VALUES ?`,
            select: `SELECT * FROM ${TBL_CATS}`
            }
    },
    caTxt : {
        dbName: `${TBL_CATXT}`,
        cnt   : 0,
        batch : [],
        SQL : {
            create:
                `CREATE OR REPLACE TABLE ${TBL_CATXT} (
                    supId TINYINT UNSIGNED NOT NULL DEFAULT '0',
                    catKey VARCHAR(15) NOT NULL,
                    lang TINYINT UNSIGNED NOT NULL DEFAULT '2',
                    title VARCHAR(255) NOT NULL DEFAULT '',
                    txt  TEXT NULL,
                    PRIMARY KEY (supId, catKey, lang)
                ) COLLATE='utf8_general_ci'`,
            upload: `REPLACE INTO ${TBL_CATXT} (catKey, lang, title, txt) VALUES ?`,
            select: `SELECT * FROM ${TBL_CATXT} where supId = ?`
            }
    },
    items : {
        dbName: `${TBL_ITEMS}`,
        cnt   : 0,
        batch : [],
        SQL : {
            create:
                `CREATE OR REPLACE TABLE ${TBL_ITEMS} (
                    id INT(11) NOT NULL AUTO_INCREMENT,
                    supId TINYINT UNSIGNED NOT NULL DEFAULT '0',
                    itemKey VARCHAR(15) NOT NULL,
                    brand VARCHAR(64) NOT NULL DEFAULT '',
                    ean VARCHAR(15) NULL,
                    intraStat VARCHAR(15) NULL,
                    altItemKey VARCHAR(15) NULL,
                    taxCode TINYINT UNSIGNED NULL DEFAULT 3,
                    img VARCHAR(255) NOT NULL DEFAULT '',
                    pgCatalog SMALLINT,
                    catKey VARCHAR(15),
                    sortOrder SMALLINT UNSIGNED NOT NULL DEFAULT '0',
                    whenCreated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    whenModified TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                    INDEX idIdx (id),
                    PRIMARY KEY (supId, itemKey)
                ) COLLATE='utf8_general_ci'`,
            upload: `REPLACE INTO ${TBL_ITEMS} (id, itemKey, brand, ean, intraStat, 
                altItemKey, taxCode, img, pgCatalog, catKey, sortOrder, whenCreated, whenModified) VALUES ? `,
            select: `SELECT * FROM ${TBL_ITEMS} WHERE supId = ?`
            }
    },
    itemTxt: {
        dbName: `${TBL_ITEMTXT}`,
        cnt   : 0,
        batch : [],
        SQL : {
            create:
                `CREATE OR REPLACE TABLE ${TBL_ITEMTXT} (
                    supId TINYINT UNSIGNED NOT NULL DEFAULT '0',
                    itemKey VARCHAR(15) NOT NULL,
                    lang  TINYINT UNSIGNED NOT NULL DEFAULT '2',
                    title VARCHAR(255) NOT NULL DEFAULT '',
                    txt  TEXT NULL,
                    PRIMARY KEY (supId, itemKey, lang)
                ) COLLATE='utf8_general_ci'`,
            upload: `REPLACE INTO ${TBL_ITEMTXT} (itemKey, lang, title, txt) VALUES ?`,
            select: `SELECT * FROM ${TBL_ITEMTXT} WHERE supId = ?`
            }
    },
    itemStock: {
        dbName: `${TBL_ITEMSTOCK}`,
        cnt   : 0,
        batch : [],
        SQL : {
            create:
                `CREATE OR REPLACE TABLE ${TBL_ITEMSTOCK} (
                    supId TINYINT UNSIGNED NOT NULL DEFAULT '0',
                    itemKey VARCHAR(15) NOT NULL,
                    stock  SMALLINT UNSIGNED,
                    nextDelivery DATE,
                    altItemKey VARCHAR(15),
                    PRIMARY KEY (supId, itemKey)
                ) COLLATE='utf8_general_ci'`,
            upload: `REPLACE INTO ${TBL_ITEMSTOCK} (itemKey, stock, nextDelivery, altItemKey) VALUES ?`,
            select: `SELECT * FROM ${TBL_ITEMSTOCK} WHERE supId = ?`
            }
    },
    itemPrice: {
        dbName: `${TBL_ITEMPRICE}`,
        cnt   : 0,
        batch : [],
        SQL : {
            create:
                `CREATE OR REPLACE TABLE ${TBL_ITEMPRICE} (
                    supId TINYINT UNSIGNED NOT NULL DEFAULT '0',
                    itemKey VARCHAR(15) NOT NULL,
                    currency CHAR(3), 
                    price NUMERIC(10,4) NOT NULL,
                    units SMALLINT UNSIGNED NOT NULL,
                    PRIMARY KEY (supId, itemKey)
                ) COLLATE='utf8_general_ci'`,
            upload: `REPLACE INTO ${TBL_ITEMPRICE} (itemKey, currency, price, units) VALUES ?`,
            select: `SELECT * FROM ${TBL_ITEMPRICE} WHERE supId = ?`
            }
    }
    
}; 
function query(sql, qargs) {
    return new Promise(function(resolve, reject) {
            con.query(sql, qargs || [], (err, res, flds) => {
            if (err) { reject(err); return; }
            res._flds = flds; 
            resolve(res);
        }); 
    });
}

function batchSend(sql, data, cnt, tbl) {
    return new Promise(function(resolve, reject) {
        con.query(sql, [data],  (err) => {
            if (err) { reject(err); return; }
            console.log('-> Loaded ',cnt, tbl, 'records...')
            resolve(data.length);
        }); 
    });
}

function batchUpload(tblName, rec) {
    var ret = null, tbl = TBLS[tblName], batch = tbl.batch;
    batch.push(rec);
    if (batch.length >= BATCH_SIZE) {
        ret = batchSend(tbl.SQL.upload, batch, tbl.cnt+=batch.length, tbl.dbName);
        tbl.batch = [];
    }
    return ret;
}



/*
var items = [], nItems=0,
    brands= [], nBrands=0;
*/
module.exports = dblib = {
    createDB: function () {
                let ret = null;
                ret = query(`CREATE DATABASE IF NOT EXISTS ${DB_SHOP}`);
                for (let tblName in TBLS) {
                    ret = query(TBLS[tblName].SQL.create);
                }
                return ret;
              },
    batchUploadBrands: (rec) => { return batchUpload('brands', rec); },
    batchUploadCats:  (rec) => { return batchUpload('cats', rec); },
    batchUploadCaTxt:  (rec) => { return batchUpload('caTxt', rec); },
    batchUploadItems:  (rec) => { return batchUpload('items', rec); },
    batchUploadItemTxt:  (rec) => { return batchUpload('itemTxt', rec); },
    batchUploadItemStock:  (rec) => { return batchUpload('itemStock', rec); },
    batchUploadItemPrice:  (rec) => { return batchUpload('itemPrice', rec); },
/*    function (rec) {
                var ret = null;
                items.push(rec);
                if (items.length >= BATCH_SIZE) {
                    ret = batchInsert(SQL.items.insert, items, nItems+=items.length, "impItems");
                    items = [];
                }
                return ret;
              },
*/              
    batchEnd: function () {
                let ret = null;
                for (let name in TBLS) {
                    let tbl = TBLS[name], batch = tbl.batch;
 console.log("?batchEnd? [",name,"] -> ", batch.length);
                    if (batch.length) {
                        ret = batchSend(tbl.SQL.upload, batch, tbl.cnt+=batch.length, tbl.dbName);
                        tbl.batch = [];
                    }
                }
                return ret;
            },
    selBrands: function () {
                return query(TBLS.brands.SQL.select).then((tbl) => {
                   tbl.idx = {};
                   for (let i=0; i < tbl.length; i++) {
                       let rec = tbl[i];
                       tbl.idx[rec.name] = rec;
                   }
                   return tbl;
                });
            },
    selCats: function () {
                return query(TBLS.cats.SQL.select).then((tbl) => {
                    tbl.idx = [];
                    for (let i=0; i < tbl.length; i++) {
                        let rec = tbl[i], idx = tbl.idx[rec.supId] || (tbl.idx[rec.supId] = {});
                        idx[rec.catKey] = rec;
                    }
                    return tbl;
                });
            },
    selCaTxt: function (supId) {
                return query(TBLS.caTxt.SQL.select, [supId]).then((tbl) => {
                    tbl.idx = [];
                    for (let i=0; i < tbl.length; i++) {
                        let rec   = tbl[i], 
                            supId = rec.supId || 0,
                            lang  = rec.lang || 0,
                            sIdx  = (tbl.idx[supId] || (tbl.idx[supId] = [])),
                            lIdx  = sIdx[lang] || (sIdx[lang] = {});
                        lidx[rec.catKey] = rec;
                    }
                    return tbl;
                });
            }, 
    selItems: function (supId) {
                return query(TBLS.items.SQL.select, [supId]).then((tbl) => {
                    tbl.idx = [];
                    for (let i=0; i < tbl.length; i++) {
                        let rec = tbl[i], idx = tbl.idx[rec.supId] || (tbl.idx[rec.supId] = {});
                        idx[rec.itemKey] = rec;
                        // Remove garbage values...
                        switch (it.ean) {
                            case "GEEN":
                            case "X":
                            case "TBC": rec.ean = "";
                                break;  
                        }
                    }
                    return tbl;
                });
            },
    selItemTxt: function (supId) {
                return query(TBLS.itemTxt.SQL.select, [supId]).then((tbl) => {
                    tbl.idx = [];
                    for (let i=0; i < tbl.length; i++) {
                        let rec   = tbl[i], 
                            supId = rec.supId || 0,
                            lang  = rec.lang || 0,
                            sIdx  = (tbl.idx[supId] || (tbl.idx[supId] = [])),
                            lIdx  = sIdx[lang] || (sIdx[lang] = {});
                        lidx[rec.itemKey] = rec;
                    }
                    return tbl;
                });
            }, 
    query: query,
    runSql: function (fsql) {
		var sqls = fs.readFileSync(fsql).toString().split(';'), sql;
	    	for (let i=0; i<sqls.length; i++) {
			sql = sqls[i].trim();
			if (sql.length) {
				sql = eval(['`',sql.replace(/`/g, '\\`'),'`'].join(''));
				((sql) => {
				query(sql).catch((err) => {
				   console.log('SQL ERROR: ', err, '\n While executing =>',sql,'<');
				}).then(() => {
				   console.log('SQL =>', sql,'<\n=>Executed Successfully!');
				});
				})(sql);
			}
		}
	    },
    end: () => { dblib.batchEnd(); con.end(); }
};
/*
dblib.createDB();
dblib.end();
*/
