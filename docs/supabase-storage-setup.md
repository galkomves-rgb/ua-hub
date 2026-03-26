# Supabase Storage Setup

This project now uploads profile photos and listing photos directly from the frontend to Supabase Storage using the authenticated Supabase browser session.

## Buckets

Create these buckets in Supabase → Storage:

- `avatars`
- `listing-images`

Recommended visibility:

- `avatars` → Public
- `listing-images` → Public

The frontend stores the resulting public URL in the profile/listing payload, so these buckets should stay public for read access.

## Required environment variables

### Railway backend

Set these variables in the Railway backend service:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Notes:

- `SUPABASE_URL` is already used by auth/runtime config.
- `SUPABASE_ANON_KEY` is exposed by `/api/config` to the frontend runtime config.
- `SUPABASE_SERVICE_ROLE_KEY` is not required for the current direct browser upload flow, but should exist on the backend for future admin/server-side storage tasks.

### Vercel frontend

Recommended fallback variables in Vercel:

```env
VITE_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_API_BASE_URL=https://YOUR_RAILWAY_BACKEND_URL
VITE_PUBLIC_SITE_URL=https://YOUR_VERCEL_SITE_URL
```

These Vercel variables are optional if `/api/config` is working correctly, but they are recommended as a safety fallback.

## Upload path format

The frontend uploads files under the authenticated Supabase user folder:

- avatar: `USER_ID/avatar-UUID.ext`
- listing image: `USER_ID/listing-UUID.ext`

This allows clean per-user access policies.

## Storage policies

Run equivalent policies for both `avatars` and `listing-images`.

### 1. Allow authenticated uploads into own folder

```sql
create policy "Authenticated users can upload into own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

```sql
create policy "Authenticated users can upload listing images into own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

### 2. Allow authenticated updates in own folder

```sql
create policy "Authenticated users can update own avatar files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

```sql
create policy "Authenticated users can update own listing files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Allow authenticated deletes in own folder

```sql
create policy "Authenticated users can delete own avatar files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

```sql
create policy "Authenticated users can delete own listing files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. Public read access

If the buckets are public, public read is handled by the bucket visibility setting. You do not need signed URLs for the current frontend implementation.

## Where to find the values

In Supabase project settings:

- `SUPABASE_URL` / `VITE_PUBLIC_SUPABASE_URL`:
  - Settings → API → Project URL
- `SUPABASE_ANON_KEY` / `VITE_PUBLIC_SUPABASE_ANON_KEY`:
  - Settings → API → `anon` / `publishable` key
- `SUPABASE_SERVICE_ROLE_KEY`:
  - Settings → API → `service_role` key

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the frontend.

## Verification checklist

1. Log in through the app.
2. Open Supabase → Storage and confirm both buckets exist.
3. Upload a profile photo in the account page.
4. Upload listing images in the create listing flow.
5. Confirm uploaded objects appear under a user-id folder.
6. Confirm the saved `avatar_url` / listing image URLs open publicly.

## Failure modes

- `Bucket not found`:
  - create `avatars` and `listing-images`
- `row level security` or `permission denied`:
  - create the policies above
- missing Supabase config in frontend:
  - set `SUPABASE_URL` and `SUPABASE_ANON_KEY` on Railway and/or Vercel
