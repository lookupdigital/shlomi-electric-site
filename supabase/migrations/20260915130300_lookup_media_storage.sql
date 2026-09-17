-- Lookup website infrastructure — 4/4: media storage.
-- Public-read bucket for site images (featured images, OG images, logo, favicon, content images).
-- Uploads limited to 5 MB raster images (no SVG — it can carry scripts). Only admins can write.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']
);

create policy "media: admin read"
  on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
create policy "media: admin upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
