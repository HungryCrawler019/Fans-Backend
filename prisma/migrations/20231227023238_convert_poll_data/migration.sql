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
	poll polls%ROWTYPE;
	arow jsonb;
	arow_text text;
BEGIN
	OPEN cur FOR SELECT * FROM polls;
	LOOP
		FETCH cur INTO poll;
		EXIT WHEN NOT FOUND;
		
		FOR arow in SELECT jsonb_array_elements FROM jsonb_array_elements(poll.answers) LOOP
			arow_text := arow #>> '{}';
			INSERT INTO poll_answers ("id", "pollId", "answer", "updatedAt") VALUES (pg_temp.snowflake_gen(), poll.id, arow_text, NOW());	
		END LOOP;
		
	END LOOP;
	CLOSE cur;
END $$;
