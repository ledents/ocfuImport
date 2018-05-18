REPLACE INTO compuit112_oc399.ocfu_manufacturer
SELECT * FROM shopdb.ocfu_manufacturer
;
REPLACE INTO compuit112_oc399.ocfu_manufacturer_to_store
SELECT * FROM shopdb.ocfu_manufacturer_to_store
;
REPLACE INTO compuit112_oc399.ocfu_category
SELECT * FROM shopdb.ocfu_category
;
REPLACE INTO compuit112_oc399.ocfu_category_description
SELECT * FROM shopdb.ocfu_category_description
;
/*TRUNCATE TABLE compuit112_oc399.ocfu_category_path*/
REPLACE INTO compuit112_oc399.ocfu_category_path
SELECT * FROM shopdb.ocfu_category_path
;
REPLACE INTO compuit112_oc399.ocfu_category_to_store
SELECT * FROM shopdb.ocfu_category_to_store
;
REPLACE INTO compuit112_oc399.ocfu_product
SELECT * FROM shopdb.ocfu_product
;
REPLACE INTO compuit112_oc399.ocfu_product_description
SELECT * FROM shopdb.ocfu_product_description
;
REPLACE INTO compuit112_oc399.ocfu_product_to_category
SELECT * FROM shopdb.ocfu_product_to_category
;
REPLACE INTO compuit112_oc399.ocfu_product_to_store
SELECT * FROM shopdb.ocfu_product_to_store
;

