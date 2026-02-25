-- Add explicit foreign key relationship between lab_comments.user_id and profiles.id
-- This allows PostgREST to join lab_comments and profiles tables.

alter table lab_comments
add constraint lab_comments_user_id_profiles_fkey
foreign key (user_id)
references profiles (id);
