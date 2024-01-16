CREATE SEQUENCE IF NOT EXISTS pg_temp.global_id_seq;

CREATE OR REPLACE FUNCTION pg_temp.snowflake_gen()
    RETURNS bigint
	LANGUAGE 'plpgsql'
AS $$
DECLARE
    our_epoch bigint := 1672531200000;
    seq_id bigint;
    now_millis bigint;
    -- the id of this DB shard, must be set for each
    -- schema shard you have - you could pass this as a parameter too
    shard_id int := 1023;
    result bigint := 0;
BEGIN
    SELECT nextval('pg_temp.global_id_seq') % 1024 INTO seq_id;

    SELECT FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000) INTO now_millis;
    result := (now_millis - our_epoch) << 23;
    result := result | (shard_id << 10);
    result := result | (seq_id);
	return result;
END;
$$;

DO $$
DECLARE
	cur REFCURSOR;
	tagged_people tagged_peoples%ROWTYPE;
BEGIN
	OPEN cur FOR SELECT * FROM tagged_peoples;
	LOOP
		FETCH cur INTO tagged_people;
		EXIT WHEN NOT FOUND;
		
		UPDATE tagged_peoples SET "id" = pg_temp.snowflake_gen() WHERE "postId" = tagged_people."postId" AND "userId" = tagged_people."userId";
		
	END LOOP;
	CLOSE cur;
END $$;

ALTER TABLE "tagged_peoples" ALTER COLUMN "id" SET NOT NULL;
