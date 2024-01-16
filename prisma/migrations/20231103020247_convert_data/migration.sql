CREATE SEQUENCE pg_temp.global_id_seq;

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
	post posts%ROWTYPE;
	story stories%ROWTYPE;
	upload uploads%ROWTYPE;
	paid_post paid_posts%ROWTYPE;
	fundraiser fundraisers%ROWTYPE;
	giveaway giveaways%ROWTYPE;
	poll polls%ROWTYPE;
	playlist playlists%ROWTYPE;
	arow jsonb;
	arow_text text;
	upload_id BIGINT;
BEGIN
	OPEN cur FOR SELECT * FROM posts;
	LOOP
		FETCH cur INTO post;
		EXIT WHEN NOT FOUND;
		IF post.type = 'Text' THEN
			UPDATE posts SET "text" = (post.resource->>0)::text WHERE id = post.id;
		ELSE
			FOR arow in SELECT jsonb_array_elements FROM jsonb_array_elements(post.resource) LOOP
				arow_text := arow #>> '{}';
				IF arow_text LIKE 'media/%' THEN
					upload_id := (SELECT id FROM uploads WHERE url = arow_text);
					IF upload_id IS NOT NULL THEN
						INSERT INTO post_medias ("id", "postId", "uploadId", "updatedAt") VALUES (pg_temp.snowflake_gen(), post.id, upload_id, NOW());
					END IF;
				END IF;
			END LOOP;

			IF post.thumb IS NOT NULL AND post.thumb != '' THEN
				IF EXISTS (SELECT * FROM uploads WHERE url = post.thumb) THEN
					UPDATE posts SET "thumbId" = (SELECT "id" FROM uploads WHERE "url" = post.thumb) WHERE "id" = post.id;
				END IF;
			END IF;
		END IF;
	END LOOP;
	CLOSE cur;

	OPEN cur FOR SELECT * FROM stories;
	LOOP
		FETCH cur INTO story;
		EXIT WHEN NOT FOUND;
		
		FOR upload IN SELECT * FROM uploads WHERE url = ANY(story.medias) LOOP
			INSERT INTO story_medias ("id", "storyId", "uploadId", "updatedAt") VALUES (pg_temp.snowflake_gen(), story.id, upload.id, NOW());
		END LOOP;

	END LOOP;
	CLOSE cur;

	OPEN cur FOR SELECT * FROM paid_posts;
	LOOP
		FETCH cur INTO paid_post;
		EXIT WHEN NOT FOUND;
		IF paid_post.thumb IS NOT NULL AND paid_post.thumb != '' THEN
			upload_id := (SELECT "id" FROM uploads WHERE url = paid_post.thumb);
			IF upload_id IS NOT NULL THEN
				UPDATE paid_posts SET "thumbId" = upload_id WHERE "id" = paid_post.id;
			END IF;
		END IF;
	END LOOP;
	CLOSE cur;

	OPEN cur FOR SELECT * FROM fundraisers;
	LOOP
		FETCH cur INTO fundraiser;
		EXIT WHEN NOT FOUND;
		IF fundraiser.thumb IS NOT NULL AND fundraiser.thumb != '' THEN
			upload_id := (SELECT "id" FROM uploads WHERE url = fundraiser.thumb);
			IF upload_id IS NOT NULL THEN
				UPDATE fundraisers SET "thumbId" = upload_id WHERE "id" = fundraiser.id;
			END IF;
		END IF;
	END LOOP;
	CLOSE cur;

	OPEN cur FOR SELECT * FROM giveaways;
	LOOP
		FETCH cur INTO giveaway;
		EXIT WHEN NOT FOUND;
		IF giveaway.thumb IS NOT NULL AND giveaway.thumb != '' THEN
			upload_id := (SELECT "id" FROM uploads WHERE url = giveaway.thumb);
			IF upload_id IS NOT NULL THEN
				UPDATE giveaways SET "thumbId" = upload_id WHERE "id" = giveaway.id;
			END IF;
		END IF;
	END LOOP;
	CLOSE cur;

	OPEN cur FOR SELECT * FROM polls;
	LOOP
		FETCH cur INTO poll;
		EXIT WHEN NOT FOUND;
		IF poll.thumb IS NOT NULL AND poll.thumb != '' THEN
			upload_id := (SELECT "id" FROM uploads WHERE url = poll.thumb);
			IF upload_id IS NOT NULL THEN
				UPDATE polls SET "thumbId" = upload_id WHERE "id" = poll.id;
			END IF;
		END IF;
	END LOOP;
	CLOSE cur;

	OPEN cur FOR SELECT * FROM playlists;
	LOOP
		FETCH cur INTO playlist;
		EXIT WHEN NOT FOUND;
		IF playlist.thumb IS NOT NULL AND playlist.thumb != '' THEN
			upload_id := (SELECT "id" FROM uploads WHERE url = playlist.thumb);
			IF upload_id IS NOT NULL THEN
				UPDATE playlists SET "thumbId" = upload_id WHERE "id" = playlist.id;
			END IF;
		END IF;
	END LOOP;
	CLOSE cur;
END $$;
