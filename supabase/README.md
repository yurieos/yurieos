# Supabase Setup for Your Stuff Feature

This directory contains SQL migrations for the "Your Stuff" image storage feature.

## Prerequisites

- Supabase project with authentication enabled
- Environment variables configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Setup Instructions

### 1. Run Database Migrations

Go to **Supabase Dashboard > SQL Editor** and run the migrations in order:

1. `migrations/001_user_images.sql` - Creates the `user_images` table with RLS policies
2. `migrations/002_user_images_storage.sql` - Creates storage policies

### 2. Create Storage Bucket

Go to **Supabase Dashboard > Storage** and create a new bucket:

| Setting            | Value                                   |
| ------------------ | --------------------------------------- |
| Name               | `user-images`                           |
| Public             | No (private)                            |
| Allowed MIME types | `image/png`, `image/jpeg`, `image/webp` |
| Max file size      | 5MB                                     |

### 3. Apply Storage Policies

After creating the bucket, go to **Storage > user-images > Policies** and apply the policies from `migrations/002_user_images_storage.sql`.

## Schema Overview

### Table: `user_images`

| Column         | Type        | Description                         |
| -------------- | ----------- | ----------------------------------- |
| `id`           | UUID        | Primary key                         |
| `user_id`      | UUID        | Foreign key to `auth.users`         |
| `storage_path` | TEXT        | Path in storage bucket              |
| `prompt`       | TEXT        | Original generation prompt          |
| `aspect_ratio` | TEXT        | Image aspect ratio (e.g., "1:1")    |
| `image_size`   | TEXT        | Resolution (e.g., "1K", "2K", "4K") |
| `mime_type`    | TEXT        | MIME type (default: "image/png")    |
| `created_at`   | TIMESTAMPTZ | Creation timestamp                  |

### Storage Structure

Images are stored at: `user-images/{user_id}/{image_id}.{extension}`

Example: `user-images/abc123-def456/img789.png`

## Security

- **Row Level Security (RLS)**: Users can only access their own records
- **Storage Policies**: Users can only access files in their own folder
- **Signed URLs**: Private files accessed via time-limited signed URLs (1 hour expiry)
