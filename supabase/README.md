# Supabase Setup

This directory contains SQL migrations for Yurie's database features.

## Prerequisites

- Supabase project with authentication enabled
- Environment variables configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Setup Instructions

### 1. Run Database Migrations

Go to **Supabase Dashboard > SQL Editor** and run the migrations in order:

1. `migrations/001_user_images.sql` - Creates the `user_images` table with RLS policies
2. `migrations/002_user_images_storage.sql` - Creates storage policies for images
3. `migrations/004_user_attachments.sql` - Creates the `user_attachments` table
4. `migrations/005_user_attachments_storage.sql` - Creates storage policies for attachments

### 2. Create Storage Buckets

Go to **Supabase Dashboard > Storage** and create the following buckets:

#### user-images bucket

| Setting            | Value                                   |
| ------------------ | --------------------------------------- |
| Name               | `user-images`                           |
| Public             | No (private)                            |
| Allowed MIME types | `image/png`, `image/jpeg`, `image/webp` |
| Max file size      | 5MB                                     |

#### user-attachments bucket

| Setting            | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Name               | `user-attachments`                                           |
| Public             | No (private)                                                 |
| Allowed MIME types | `image/*`, `application/pdf`, `text/*`, `video/*`, `audio/*` |
| Max file size      | 100MB                                                        |

### 3. Apply Storage Policies

After creating buckets, go to **Storage > [bucket-name] > Policies** and apply the policies from the corresponding storage migration files.

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

### Table: `user_attachments`

| Column            | Type        | Description                         |
| ----------------- | ----------- | ----------------------------------- |
| `id`              | UUID        | Primary key                         |
| `user_id`         | UUID        | Foreign key to `auth.users`         |
| `chat_id`         | TEXT        | Chat this attachment belongs to     |
| `message_id`      | TEXT        | Message this attachment belongs to  |
| `storage_path`    | TEXT        | Path in storage bucket              |
| `filename`        | TEXT        | Original filename                   |
| `mime_type`       | TEXT        | MIME type of the file               |
| `file_size`       | BIGINT      | File size in bytes                  |
| `attachment_type` | TEXT        | Type: image, video, document, audio |
| `created_at`      | TIMESTAMPTZ | Creation timestamp                  |

## Security

- **Row Level Security (RLS)**: Users can only access their own records
- **Storage Policies**: Users can only access files in their own folder
- **Signed URLs**: Private files accessed via time-limited signed URLs (1 hour expiry)
