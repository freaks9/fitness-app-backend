-- 1. Remove orphaned comments that have no matching profile
-- (This is necessary because test data might have been created without profiles)
delete from lab_comments
where user_id not in (select id from profiles);

-- 2. Add the foreign key constraint
alter table lab_comments
add constraint lab_comments_user_id_profiles_fkey
foreign key (user_id)
references profiles (id);
