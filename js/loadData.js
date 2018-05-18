const fs        = require('fs');
const readline  = require('readline');

const fixedRecs = {
        artik: [7, 30,30, 1, 5,5,5, 10,10,10,10,10, 4, 1, 13,13, 7, 4,1],
        prijs: [7, 3, 10, 4, 10, 10, 10],
        stock: [7, 7, 8, 7]
    };

const recFields = {
        artik :  ['itemKey','descNL','descFR','taxCode','pickWrapUnits','sellUnits',
                  'transUnit','brand','typeNL','typeFR','subTypeNL','subtypeFR','pgCatalog','suppression',
                  'intrastatNr', 'ean', 'altItemKey', 'discntGrp', 'catType'],
        prijs :  ['itemKey','currency','price','rebatePercent','nettoPrice','shopPrice','retailPrice'],
        stock :  ['itemKey','stock','nextDelivery','altItemKey'],
        tfobld:  ['itemKey','imgItem','catKey','imgCat','brand','imgBrand'],
        tfobst:  ['catKey','parCatKey','sortOrder','descNL','descFR'],
        tfocom:  ['type','catKey','lang','sortOrder','txt'],
        tfoeen:  ['itemKey','unit','number','ean','weight','length','width','height']
    };


const indexes = {
        artik:  'itemKey',
        prijs:  'itemKey',
        stock:  (tbl) => {
            let idx = tbl.idx = {};
            return (rec) => {
                    let sdt = rec.nextDelivery;
                        rec.nexDelivery = (sdt > 0)? 
                        new Date([sdt.substr(0,4),sdt.substr(4,2),sdt.substr(6,2)].join('-') + ' 00:00') : 0;
                    idx[rec.itemKey] = rec;
                };
            },
        tfobld: 'itemKey',
        tfobst: (tbl) => {
            let idx   = tbl.idx    = {G:{}, P:{}};
            return (rec) => {
                    rec.sortOrder  = parseInt(rec.sortOrder);
                    rec.typ  = rec.sortOrder && 'G' || 'P';
/*     if (rec.catKey == '06051520777') {
                     console.log('Break here!');
     } */
                    idx[rec.typ][rec.catKey] = rec;
                };
            },
        tfocom: (tbl) => {
            let idx = tbl.idx = {NL: {}, FR: {}};
            return (rec) => {
                    let lidx = idx[rec.lang] || (idx[rec.lang] = {}),
                        irec  = lidx[rec.catKey];
                    if (!irec) { 
                        lidx[rec.catKey] = rec; 
                    } else {
                        irec.txt += rec.txt;
                    }
                };
            },
        tfoeen: (tbl) => {
            let idx  = tbl.idx = {};
            return (rec) => {
                    let iidx = idx[rec.itemKey] || (idx[rec.itemKey] = []);
                    iidx.push(rec);
                    iidx[rec.unit] = rec;
                };
            }
    };
const structMaxDepth = 4;
const postProcesses = { };
const decimalFields = {
        price:          4,
        rebatePercent:  2,
        nettoPrice:     4,
        shopPrice:      4,
        retailPrice:    4
    };

function recTrim(rec) {
    if (rec && rec.length) for (var i=0; i<rec.length; i++) { rec[i] = rec[i] && rec[i].trim(); }
    return rec;
}

function getFieldParser(data){
    let fr = fixedRecs[data];
    return fr ? (line) => {
           var rec = [], s=0, l, v;
           for (var i=0; i<fr.length; i++) {
               l = fr[i];
               v = line.substr(s,l);
               s+=l;
               rec.push(v.trim());
           }
           return rec;
        } : (line) => { return recTrim(line.split('\t')); }
}

function idxUpdate(idx,v,rec) {
    var ival = idx[v];
    if (ival) {
        if (ival != rec) {
            if (ival.constructor == Array) { 
                ival.push(rec); 
            } else {
                idx[v] = [ival,rec];
            }
        }
    } else { idx[v] = rec; }
}

function getRecordLoader(data,tbl) {
    let fields    = recFields[data], 
        fldParser = getFieldParser(data), 
        idx       = indexes[data],
        idxUpdFn  = () => {};
    if (idx) { 
        if (idx.constructor == Function) {
            idxUpdFn = idx(tbl);
        } else if (idx.constructor == Array) {
            tbl.idx = [];
            for (var i=0;i<idx.length; i++) { tbl.idx.push({}); }
            idxUpdFn = (rec) => {
                var ifld;
                for (var i=0;i<idx.length; i++) { 
                    ifld = idx[i];
                    idxUpdate(tbl.idx[i],rec[ifld],rec);
                }
            };
        } else  {
            tbl.idx = {}; 
            idxUpdFn = (rec) => { idxUpdate(tbl.idx,rec[idx],rec); };
        }
    }
    return (fields)? (line) => {
            var rec = fldParser(line), f, d, obj = {_row: rec};
            for (var i=0; i<fields.length; i++) {
                f      = fields[i];
                v      = rec[i];
                if (d = decimalFields[f]) {
                    v = rec[i] = v.substr(0,v.length-d) + '.' + v.substr(v.length-d);
                }
                obj[f] = v;
            }
            obj.idx = tbl.length;
            tbl.push(obj);
            idxUpdFn(obj);
        } : fldParser;
}

function loadData(data, cb) {
    let rl  = readline.createInterface({ input:  fs.createReadStream('data/'+data+'.txt', {encoding: "latin1"}) });
    let tbl = [];
    return new Promise(function(resolve, reject) {
        rl.on('line', getRecordLoader(data,tbl));
        rl.on('close', () => { 
            var postFn = postProcesses[data];
            if (postFn) tbl = postFn(tbl);
            if (cb) cb(tbl);
            resolve(tbl);
        });
    });
}

var data;
module.exports = data = {
    loadItems : (cb) => { return loadData('artik', cb); },
    loadPrice : (cb) => { return loadData('prijs', cb); },
    loadStock : (cb) => { return loadData('stock', cb); },
    loadStruct: (cb) => { return loadData('tfobst', cb); },
    loadImgs  : (cb) => { return loadData('tfobld', cb); },
    loadDesc  : (cb) => { return loadData('tfocom', cb); },
    loadUnits : (cb) => { return loadData('tfoeen', cb); },
    loadAll   : (cb) => {
        let lib = {};
        return data.loadItems(null
            ).then((tbl) => { lib.items = tbl;
                    return data.loadPrice(null);
            }).then((tbl) => { lib.price = tbl;
                return data.loadStock(null);
            }).then((tbl) => { lib.stock = tbl;
                return data.loadStruct(null);
            }).then((tbl) => { lib.struct = tbl;
                return data.loadDesc(null);
            }).then((tbl) => { lib.desc = tbl;
                return data.loadImgs(null);
            }).then((tbl) => { lib.imgs = tbl;
                return data.loadUnits(null);
            }).then((tbl) => { lib.units = tbl;
                if (cb) cb(lib);
                return lib;
            });
    }
}

/*
data.loadAll((lib) => {
    var itgrps = {'02020400004':true, '01010120440':true};

    for (var itgrp in itgrps) {
        console.log("-[NL] ----\n",lib.desc.idx.NL[itgrp]);
        console.log("-[FR] ----\n",lib.desc.idx.FR[itgrp]);
    }
    

}).then ((lib) => {
    console.log("END");
    console.log(lib);
});
*/