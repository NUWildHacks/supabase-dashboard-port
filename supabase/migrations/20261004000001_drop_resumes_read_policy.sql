-- The resumes bucket is server-only. Server actions use the secret key (which bypasses
-- storage policies) to upload, delete, and create signed download URLs. This policy let
-- any authenticated user list and download every resume, so remove it.
drop policy if exists "resumes read authenticated" on storage.objects;
