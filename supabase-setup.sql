CREATE OR REPLACE FUNCTION merge_video_logs(new_logs jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _existing_logs jsonb;
  _merged_logs jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT video_watch_45d_json INTO _existing_logs
  FROM user_study_aggregate
  WHERE user_id = _user_id;

  IF _existing_logs IS NULL OR jsonb_typeof(_existing_logs) != 'array' THEN
    _existing_logs := '[]'::jsonb;
  END IF;

  WITH existing AS (
    SELECT
      e->>'video_id' AS video_id,
      e->>'watched_date' AS watched_date,
      COALESCE((e->>'watched_seconds')::int, 0) AS watched_seconds,
      e->>'video_name' AS video_name,
      e->>'subject' AS subject
    FROM jsonb_array_elements(CASE WHEN jsonb_array_length(_existing_logs) > 0 THEN _existing_logs ELSE '[]'::jsonb END) AS e
  ),
  incoming AS (
    SELECT
      i->>'video_id' AS video_id,
      i->>'watched_date' AS watched_date,
      COALESCE((i->>'watched_seconds')::int, 0) AS watched_seconds,
      i->>'video_name' AS video_name,
      i->>'subject' AS subject
    FROM jsonb_array_elements(CASE WHEN jsonb_array_length(new_logs) > 0 THEN new_logs ELSE '[]'::jsonb END) AS i
  ),
  all_keys AS (
    SELECT video_id, watched_date FROM existing
    UNION
    SELECT video_id, watched_date FROM incoming
  ),
  merged AS (
    SELECT
      k.video_id,
      k.watched_date,
      GREATEST(COALESCE(e.watched_seconds, 0), COALESCE(i.watched_seconds, 0)) AS watched_seconds,
      COALESCE(i.video_name, e.video_name) AS video_name,
      COALESCE(i.subject, e.subject) AS subject
    FROM all_keys k
    LEFT JOIN existing e ON k.video_id = e.video_id AND k.watched_date = e.watched_date
    LEFT JOIN incoming i ON k.video_id = i.video_id AND k.watched_date = i.watched_date
  ),
  ordered AS (
    SELECT * FROM merged
    ORDER BY watched_date ASC, video_id ASC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'video_id', video_id,
      'watched_date', watched_date,
      'watched_seconds', watched_seconds,
      'video_name', video_name,
      'subject', subject
    )
  ), '[]'::jsonb) INTO _merged_logs
  FROM ordered;

  INSERT INTO user_study_aggregate (user_id, video_watch_45d_json)
  VALUES (_user_id, _merged_logs)
  ON CONFLICT (user_id) 
  DO UPDATE SET video_watch_45d_json = EXCLUDED.video_watch_45d_json;

END;
$$;