CREATE OR REPLACE VIEW shopdb.ocfu_category
AS
SELECT cat.id AS `category_id`,
		IF(cat.img != '', concat("webshop/",cat.img), '') AS `image`,
		IF(par.id IS NULL, 0, par.id) AS `parent_id`,
		IF(par.id IS NULL, 1, 0) AS `top`,
		4 AS `column`,
		cat.sortOrder AS `sort_order`,
		1 AS `status`,
	   now() AS `date_added`,
	   now() AS`date_modified`
FROM shopdb.impCats AS `cat`
 LEFT JOIN shopdb.impCats AS `par`
   ON par.catKey = cat.parCatKey 
;
-- 
--   
CREATE OR REPLACE VIEW shopdb.ocfu_category_description
AS
SELECT cat.id AS `category_id`, 
	   Txt.lang AS `language_id`, 
	   Txt.title AS `name`,
	   IF(Txt.txt IS NULL, '', Txt.txt) AS `description`,
	   Txt.title AS `meta_title`,
	   '' AS `meta_description`,
	   '' AS `meta_keyword`
FROM shopdb.impCats AS `cat`
 LEFT JOIN shopdb.impCaTxt AS `Txt`
   ON Txt.supId = cat.supId and Txt.catKey = cat.catKey
;
-- 
--   
CREATE OR REPLACE VIEW shopdb.ocfu_category_path
AS
SELECT cat.id AS `category_id`, cat.id AS `path_id`, 0 AS level
FROM shopdb.impCats AS `cat`
;
--
--
CREATE OR REPLACE VIEW shopdb.ocfu_category_to_store
AS 
SELECT id AS `category_id`, 0 AS `store_id`
FROM shopdb.impCats
;
--
--
CREATE OR REPLACE VIEW shopdb.ocfu_product
AS
SELECT it.id AS `product_id`, it.itemKey AS `model`, '' AS `sku`, '' AS `upc`, 
		 ean, '' AS `jan`, '' AS `isbn`, '' AS `mpn`,
		 CAST(it.pgCatalog AS CHAR) AS `location`,
		 st.stock AS `quantity`, IF(st.stock>0, 7, 5) AS `stock_status_id`, 
		 IF(it.img != '', concat("webshop/",it.img), '') AS `image`,
		 br.id AS `manufacturer_id`, 1 AS `shipping`, (pr.price * 1.3) AS `price`, 0 AS `points`,
		 it.taxCode AS `tax_clASs_id`, st.nextDelivery AS `date_available`,
		 0 AS `weight`, 0 AS `weight_clASs_id`, 0 AS `length`, 0 AS `width`,
		 0 AS `height`, 0 AS `length_clASs_id`, 1 AS `subtract`, 1 AS `minimum`,
		 it.sortOrder AS `sort_order`, 1 AS `status`, 0 AS `viewed`, it.whenCreated AS `date_added`, it.whenModified AS `date_modified`
FROM shopdb.impItems AS `it`
  LEFT JOIN shopdb.impItemTxt `tx`
	 ON tx.supId = it.supId and tx.itemKey = it.itemKey 
  LEFT JOIN shopdb.impItemPrice `pr`
    ON pr.supId = it.supId and pr.itemKey = it.itemKey
  LEFT JOIN shopdb.impItemStock `st`
    ON st.supId = it.supId and st.itemKey = it.itemKey
  LEFT JOIN shopdb.impBrands `br`
    ON br.name = it.brand 
;
--
--
CREATE OR REPLACE VIEW shopdb.ocfu_product_description
AS
SELECT it.id AS `product_id`,
	tx.lang AS `language_id`,
	tx.title AS `name`,
	IF(tx.txt IS NULL, '', tx.txt) AS `description`,
	'' AS `tag`,
	tx.title AS `meta_title`,
	'' AS `meta_description`,
	'' AS `meta_keyword`
FROM shopdb.impItems AS `it`
 LEFT JOIN shopdb.impItemTxt AS `tx`
   ON tx.supId = it.supId and tx.itemKey = it.itemKey 
;   
--
--
CREATE OR REPLACE VIEW shopdb.ocfu_product_to_category
AS
SELECT it.id AS `product_id`, cat.id AS `category_id`
FROM shopdb.impItems AS `it`,
     shopdb.impCats AS `cat`
where cat.catKey = it.catKey and cat.supId = it.supId 
;
--
--
CREATE OR REPLACE VIEW shopdb.ocfu_product_to_store
AS
SELECT  it.id AS `product_id`,
	 0 AS `store_id`
FROM shopdb.impItems AS `it`
;
--
--
CREATE OR REPLACE VIEW shopdb.ocfu_manufacturer
AS
SELECT id as `manufacturer_id`,
	   name,
	   IF(img != '', concat("merken/",img), '') AS `image`,
	   0 as `sort_order`
FROM shopdb.impBrands
;

CREATE OR REPLACE VIEW shopdb.ocfu_manufacturer_to_store
AS
SELECT id as `manufacturer_id`,
       0 as `store_id`
FROM shopdb.impBrands
;
