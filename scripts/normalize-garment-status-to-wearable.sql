-- 只把非可穿行改成可穿。不改其它列，不删行，不 drop 列。
-- 生产库是 SQLite：/app/data/sqlite3.db
-- 执行前先做停机备份，并先跑下面的 SELECT 核对件数。
--
-- SELECT owner_id, status, COUNT(*) FROM garment GROUP BY owner_id, status;
-- SELECT COUNT(*) AS non_wearable FROM garment WHERE status IS NOT 'wearable';

UPDATE garment
SET status = 'wearable'
WHERE status IS NOT 'wearable';
