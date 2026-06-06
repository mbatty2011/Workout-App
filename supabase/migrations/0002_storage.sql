-- =============================================================================
-- Storage bucket for post photos (spec §2 Storage, §5.6).
-- Public read (photos on posts are shown in-feed); writes are scoped to the
-- uploading user's own folder via the object name prefix.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

-- Anyone can read post photos (feed images).
create policy "post_photos_read"
  on storage.objects for select
  using (bucket_id = 'post-photos');

-- A user may upload only into a folder named with their own uid.
create policy "post_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
