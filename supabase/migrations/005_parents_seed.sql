-- =============================================================================
-- 005_parents_seed.sql — Add parent demo users (Maria Cortes & Gilberto Silva)
-- Run in Supabase SQL Editor (service_role context bypasses RLS)
-- Safe to re-run: ON CONFLICT DO NOTHING everywhere
--
-- UUID key:
--   Maria Cortes    a9000000-0000-0000-0000-000000000009
--   Gilberto Silva  aa000000-0000-0000-0000-00000000000a
--   Places          b1000000-0000-0000-0000-000000000034–036
--   Gems            c1000000-0000-0000-0000-000000000046–048
--   Gem images      f9000000-0000-0000-0000-000000000001–004
-- =============================================================================


-- =============================================================================
-- 1. AUTH USERS
-- encrypted_password is empty → demo accounts, cannot log in with a password.
-- The handle_new_user trigger fires automatically and creates a profile row.
-- To give them real login access later, see the note at the bottom of this file.
-- =============================================================================
INSERT INTO auth.users (
  instance_id, id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change_token_new, email_change,
  is_super_admin, is_sso_user
) VALUES
  -- Parent 1: Maria Cortes
  ('00000000-0000-0000-0000-000000000000',
   'a9000000-0000-0000-0000-000000000009', 'authenticated', 'authenticated',
   'mariadelourdescortesvazquez@gmail.com', '', now() - interval '30 days',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Maria Cortes","avatar_url":"https://picsum.photos/seed/mariacortes/200/200"}'::jsonb,
   now()-interval'30 days', now()-interval'30 days', '', '', '', '', false, false),

  -- Parent 2: Gilberto Silva Sr.
  ('00000000-0000-0000-0000-000000000000',
   'aa000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated',
   'gssgilbertosilvasilva@gmail.com', '', now() - interval '25 days',
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Gilberto Silva","avatar_url":"https://picsum.photos/seed/gilbertosilvasr/200/200"}'::jsonb,
   now()-interval'25 days', now()-interval'25 days', '', '', '', '', false, false)

ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 2. PROFILE ENRICHMENT
-- The trigger auto-created the rows with a generic handle/display_name.
-- Update with the real values here.
-- =============================================================================
UPDATE public.profiles SET
  handle        = 'mariacortes',
  display_name  = 'Maria Cortes',
  avatar_url    = 'https://picsum.photos/seed/mariacortes/200/200',
  bio           = 'Exploring meaningful places through Gem.',
  taste_tagline = 'weekend café finds and quiet corners',
  taste_tags    = ARRAY['coffee','calm','focus','local','cozy']
WHERE id = 'a9000000-0000-0000-0000-000000000009';

UPDATE public.profiles SET
  handle        = 'gilbertosilva',
  display_name  = 'Gilberto Silva',
  avatar_url    = 'https://picsum.photos/seed/gilbertosilvasr/200/200',
  bio           = 'Saving favorite places and family memories on Gem.',
  taste_tagline = 'the parks, the paths, and the places nobody finds',
  taste_tags    = ARRAY['outdoor','hidden','scenic','local','weekend']
WHERE id = 'aa000000-0000-0000-0000-00000000000a';


-- =============================================================================
-- 3. PLACES
-- =============================================================================
INSERT INTO public.places
  (id, name, address, city, state, latitude, longitude, category, created_by)
VALUES
  -- Maria's weekend work café: Sightglass Coffee, SoMa
  ('b1000000-0000-0000-0000-000000000034',
   'Sightglass Coffee',
   '270 7th St, San Francisco', 'San Francisco', 'CA',
   37.7762, -122.4094, 'coffee',
   'a9000000-0000-0000-0000-000000000009'),

  -- Gilberto's SF park: Yerba Buena Gardens
  ('b1000000-0000-0000-0000-000000000035',
   'Yerba Buena Gardens',
   '750 Howard St, San Francisco', 'San Francisco', 'CA',
   37.7840, -122.4025, 'hidden',
   'aa000000-0000-0000-0000-00000000000a'),

  -- Gilberto's niche spot: the MLK Jr. Memorial Waterfall inside Yerba Buena
  ('b1000000-0000-0000-0000-000000000036',
   'MLK Jr. Memorial Waterfall',
   'Yerba Buena Gardens, San Francisco', 'San Francisco', 'CA',
   37.7838, -122.4018, 'hidden',
   'aa000000-0000-0000-0000-00000000000a')

ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 4. GEMS
-- =============================================================================
INSERT INTO public.gems
  (id, author_id, place_id, title, caption, category, mood_tags, visibility, created_at)
VALUES

  -- Maria: weekend work café gem
  ('c1000000-0000-0000-0000-000000000046',
   'a9000000-0000-0000-0000-000000000009',
   'b1000000-0000-0000-0000-000000000034',
   'Sightglass on a Saturday Morning',
   'High ceilings, incredible light, and a latte that makes you actually want to sit down and work. Get here before 10am for a table by the window — after that it fills up fast.',
   'coffee',
   ARRAY['focus','cozy','local','calm','weekend'],
   'public',
   now() - interval '10 days'),

  -- Gilberto: Yerba Buena Gardens main park gem
  ('c1000000-0000-0000-0000-000000000047',
   'aa000000-0000-0000-0000-00000000000a',
   'b1000000-0000-0000-0000-000000000035',
   'Yerba Buena on a Sunday',
   'A calm green escape in the middle of SoMa. Families, shade, and enough open space to actually breathe. Easy BART access — get off at Powell and walk two blocks. Perfect weekend afternoon spot.',
   'hidden',
   ARRAY['outdoor','calm','local','weekend','walkable'],
   'public',
   now() - interval '7 days'),

  -- Gilberto: MLK Jr. Waterfall niche spot
  ('c1000000-0000-0000-0000-000000000048',
   'aa000000-0000-0000-0000-00000000000a',
   'b1000000-0000-0000-0000-000000000036',
   'The Waterfall Most People Walk Right Past',
   'The Martin Luther King Jr. Memorial waterfall is tucked inside Yerba Buena Gardens and almost nobody stops. The inscriptions on the wall behind the water are worth reading slowly. One of the most peaceful ten minutes you can find in downtown SF.',
   'hidden',
   ARRAY['hidden','scenic','calm','solo','walkable'],
   'public',
   now() - interval '5 days')

ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 5. GEM IMAGES  (explicit IDs so this block is safe to re-run)
-- =============================================================================
INSERT INTO public.gem_images (id, gem_id, storage_path, order_index, alt_text) VALUES
  ('f9000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000046',
   'https://picsum.photos/seed/sightglass1/600/400', 0,
   'Sightglass Coffee interior, morning light'),

  ('f9000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000047',
   'https://picsum.photos/seed/yerbabuena1/600/400', 0,
   'Yerba Buena Gardens greenspace'),

  ('f9000000-0000-0000-0000-000000000003',
   'c1000000-0000-0000-0000-000000000047',
   'https://picsum.photos/seed/yerbabuena2/600/400', 1,
   'Yerba Buena Gardens paths and trees'),

  ('f9000000-0000-0000-0000-000000000004',
   'c1000000-0000-0000-0000-000000000048',
   'https://picsum.photos/seed/mlkwaterfall1/600/400', 0,
   'MLK Jr. Memorial Waterfall at Yerba Buena')

ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- 6. FOLLOWS
-- Parents follow each other and Gil; Gil follows his parents;
-- a few other demo users follow the parents so their posts surface in feeds.
-- =============================================================================
INSERT INTO public.follows (follower_id, following_id) VALUES
  -- Maria follows Gil and Gilberto
  ('a9000000-0000-0000-0000-000000000009', 'f594d26c-9dc8-46ce-9589-9b56aed27adf'),
  ('a9000000-0000-0000-0000-000000000009', 'aa000000-0000-0000-0000-00000000000a'),

  -- Gilberto follows Gil and Maria
  ('aa000000-0000-0000-0000-00000000000a', 'f594d26c-9dc8-46ce-9589-9b56aed27adf'),
  ('aa000000-0000-0000-0000-00000000000a', 'a9000000-0000-0000-0000-000000000009'),

  -- Gil follows his parents
  ('f594d26c-9dc8-46ce-9589-9b56aed27adf', 'a9000000-0000-0000-0000-000000000009'),
  ('f594d26c-9dc8-46ce-9589-9b56aed27adf', 'aa000000-0000-0000-0000-00000000000a'),

  -- A few demo users follow the parents so their gems show up in feeds
  ('a1000000-0000-0000-0000-000000000001', 'a9000000-0000-0000-0000-000000000009'),
  ('a6000000-0000-0000-0000-000000000006', 'a9000000-0000-0000-0000-000000000009'),
  ('a3000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-00000000000a'),
  ('a7000000-0000-0000-0000-000000000007', 'aa000000-0000-0000-0000-00000000000a')

ON CONFLICT (follower_id, following_id) DO NOTHING;


-- =============================================================================
-- 7. GEM LIKES  (a handful so the posts don't look brand new/empty)
-- =============================================================================
INSERT INTO public.gem_likes (gem_id, user_id) VALUES
  -- Maria's Sightglass gem liked by Eva and Priya (coffee fans)
  ('c1000000-0000-0000-0000-000000000046', 'a1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000046', 'a4000000-0000-0000-0000-000000000004'),
  ('c1000000-0000-0000-0000-000000000046', 'f594d26c-9dc8-46ce-9589-9b56aed27adf'),

  -- Gilberto's Yerba Buena gem liked by Alex and Kai (outdoor fans)
  ('c1000000-0000-0000-0000-000000000047', 'a3000000-0000-0000-0000-000000000003'),
  ('c1000000-0000-0000-0000-000000000047', 'a7000000-0000-0000-0000-000000000007'),
  ('c1000000-0000-0000-0000-000000000047', 'f594d26c-9dc8-46ce-9589-9b56aed27adf'),

  -- Gilberto's waterfall gem liked by Eva and Alex
  ('c1000000-0000-0000-0000-000000000048', 'a1000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000048', 'a3000000-0000-0000-0000-000000000003')

ON CONFLICT (gem_id, user_id) DO NOTHING;


-- =============================================================================
-- DONE
-- =============================================================================
-- To verify, run:
--   SELECT id, handle, display_name, email_col, bio
--   FROM public.profiles p
--   JOIN auth.users u ON u.id = p.id
--   WHERE p.id IN (
--     'a9000000-0000-0000-0000-000000000009',
--     'aa000000-0000-0000-0000-00000000000a'
--   );
--
-- NOTE: These are demo-only accounts (empty encrypted_password).
-- They will appear in the app as real profiles but CANNOT log in.
--
-- TO GIVE THEM REAL LOGIN ACCESS:
--   Option A (recommended): Go to Supabase Dashboard → Authentication → Users
--     → "Invite user" with their real email. They receive a magic-link email
--     and set their own password. The profile row already exists so the trigger
--     skips re-creation (ON CONFLICT DO NOTHING in the trigger upsert).
--     After invite, run:
--       UPDATE auth.users
--       SET email_confirmed_at = now()
--       WHERE id IN ('a9000000-0000-0000-0000-000000000009',
--                    'aa000000-0000-0000-0000-00000000000a');
--
--   Option B: Use the Supabase Admin API:
--     supabase.auth.admin.updateUserById(userId, { password: 'newpassword' })
--     This sets a real bcrypt-hashed password so they can log in with email+password.
-- =============================================================================
