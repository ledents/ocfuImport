const dataLoader= require('./loadData');
const dblib     = require('./dblib');

const MAX_CAT_DEPTH         = 3;
const MAX_TITLE_SUFFIX_LEN  = 32;

var dbBrands, dbItems, dbCats;

function uploadBrands(data) {
    let items  = data.items, 
        imgs   = data.imgs,
        brands = dbBrands,
        idx    = brands.idx || {};

    for (let i=0; i<items.length; i++) {
        let it = items[i],
            brand = it.brand,
            img = imgs.idx[it.itemKey],
            br = idx[brand];
        if (!br) { brands.push(br = (idx[brand] = {id: 0, name: brand, img: ''})); }
        br.name = brand;
        if (img && img.imgBrand) { br.img = img.imgBrand; }
    }

    for (let i=0; i<brands.length; i++) {
        let br = brands[i];
        dblib.batchUploadBrands([br.id, br.name, br.img]);
    }
    dblib.batchEnd();
}

function uploadItems(data) {
    let items  = data.items,
        struct = data.struct,
        descs  = data.desc,
        imgs   = data.imgs,
        stock  = data.stock,
        prices = data.price,
        cats   = dbCats,
        dtNow  = new Date();

    function lookupItemCatBranch(catKey, it, img) {
        if (!catKey) return null;
        let cat     = struct.idx.G[catKey] || struct.idx.P[catKey],
            dbCat   = dbCats.idx[catKey],
            parCat  = lookupItemCatBranch(cat.parCatKey, it);
        cat.img = (img && img.imgCat) || (dbCat && dbCat.img) || '';
        cat.lvl = parCat && (parCat.lvl+1) || 1;
        if (cat.lvl <= MAX_CAT_DEPTH) {
            if (!dbCat) {
                cat.id = 0;
                dbCats.push(cat);
                dbCats.idx[catKey] = cat;
            }
            it.parCatKey = cat.catKey;
        }
        return cat;
    }

    for (let i=0; i<items.length; i++) {
        let it   = items[i],
            idx  = dbItems.idx[0] || (dbItems.idx[0] = {}),
            dbIt = idx[it.itemKey],
            img     = imgs.idx[it.itemKey],
            itStr   = struct.idx.P[it.itemKey],
            catStr  = (itStr && itStr.parCatKey) && (struct.idx.G[itStr.parCatKey] || struct.idx.P[itStr.parCatKey]),
            itDesc  = descs.idx.NL[it.itemKey]
            catDesc = catStr && descs.idx.NL[catStr.catKey];

        // Remove garbage ean values
        switch (it.ean) {
            case "GEEN":
            case "TBC":
            case "X":  it.ean = ""; break;                  
        }

        // Lookup for the best item description and title
        it.title= { NL: it.descNL, FR: it.descFr};
        itDesc  = itDesc && itDesc.txt || '';
        catDesc = catDesc && catDesc.txt;
        it.txt  = { NL: itDesc };
        it.parCatKey = itStr && itStr.parCatKey || '';
        
/*        if (it.itemKey == '0009901') {
            console.log ("Break here !!!");
        }*/

        // Check if title should be taken from item category Record
        if ((itDesc.length <= MAX_TITLE_SUFFIX_LEN) && (catStr && catStr.descNL)) {
            it.title.NL = catStr.descNL +(itDesc ?  ' '+itDesc : '');
            it.txt.NL   = catDesc;
            it.parCatKey = catStr.parCatKey;
        }

        if (img) { it.img = img.imgItem; }

        // Lookup item category branch
        lookupItemCatBranch(it.parCatKey, it, img);
      
        if (dbIt) {
            //console.log(dbIt);
            it.id           = dbIt.id;
            it.brand        = it.brand || dbIt.brand;
            it.ean          = it.ean || dbIt.ean;
            it.intraStat    = it.intrastat ||  dbIt.intraStat;
            it.altProduct   = it.altProduct || dbIt.altItemKey;
            it.taxCode      = it.taxCode || dbIt.taxCode;
            it.img          = it.img || dbIt.img;
            it.catKey       = it.catKey || dbIt.catKey;
            it.whenCreated  = dbIt.whenCreated;
        }
        dblib.batchUploadItems([it.id, it.itemKey, it.brand, it.ean, it.intrastatNr, it.altItemKey, it.taxCode, 
            it.img || '', it.pgCatalog, it.parCatKey, 0, it.whenCreated || dtNow,dtNow]);
        dblib.batchUploadItemTxt([it.itemKey,2,it.title.NL, it.txt.NL]);
        let ist = stock.idx[it.itemKey], price = prices.idx[it.itemKey];
        if (ist) {
            dblib.batchUploadItemStock([it.itemKey, ist.stock, ist.nextDelivery, ist.altItemKey]);
        }
        if (price) {
            dblib.batchUploadItemPrice([it.itemKey, price.currency, price.nettoPrice, it.pickWrapUnits || it.sellUnits ]);
        }
       // let 
    }
    dblib.batchEnd();

    for (let i=0; i<dbCats.length; i++) {
        let cat = dbCats[i], catTxt = descs.idx.NL[cat.itemKey];
        dblib.batchUploadCats([cat.id, cat.catKey, cat.parCatKey, cat.lvl, cat.sortOrder, cat.img]);
        dblib.batchUploadCaTxt([cat.catKey,2,cat.descNL,catTxt && catTxt.txt || null]);
    }
    dblib.batchEnd();
}

dblib.createDB();
dblib.selBrands().then((_dbBrands) => { return dbBrands = _dbBrands; });
dblib.selCats().then((_dbCats) => { return dbCats = _dbCats; });
dblib.selItems(0).then((_dbItems) => {
    dbItems = _dbItems;
    dataLoader.loadAll().then((data) => {
        uploadBrands(data);
        uploadItems(data);
        dblib.end();
    });
});

