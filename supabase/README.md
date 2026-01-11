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
5. `migrations/006_notes.sql` - Creates notes tables (`notes`, `note_blocks`, etc.)
6. `migrations/007_notes_storage.sql` - Creates storage policies for note attachments
7. `migrations/008_notes_folders.sql` - Adds folder support to notes
8. `migrations/009_fix_function_search_path.sql` - Security fix for database functions

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
| Max file size      | 10MB                                                         |

#### note-attachments bucket

| Setting            | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Name               | `note-attachments`                                           |
| Public             | No (private)                                                 |
| Allowed MIME types | `image/*`, `application/pdf`, `text/*`, `video/*`, `audio/*` |
| Max file size      | 10MB                                                         |

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

### Table: `notes`

| Column        | Type        | Description                 |
| ------------- | ----------- | --------------------------- |
| `id`          | UUID        | Primary key                 |
| `user_id`     | UUID        | Foreign key to `auth.users` |
| `parent_id`   | UUID        | Parent note (for hierarchy) |
| `title`       | TEXT        | Note title                  |
| `icon`        | TEXT        | Emoji or icon identifier    |
| `cover_image` | TEXT        | Storage path for cover      |
| `is_favorite` | BOOLEAN     | Favorited by user           |
| `is_archived` | BOOLEAN     | Soft-deleted                |
| `is_folder`   | BOOLEAN     | Is a folder (not a note)    |
| `position`    | INTEGER     | Order among siblings        |
| `created_at`  | TIMESTAMPTZ | Creation timestamp          |
| `updated_at`  | TIMESTAMPTZ | Last update timestamp       |

### Table: `note_blocks`

| Column       | Type        | Description                           |
| ------------ | ----------- | ------------------------------------- |
| `id`         | UUID        | Primary key                           |
| `note_id`    | UUID        | Foreign key to `notes`                |
| `type`       | TEXT        | Block type (paragraph, heading, etc.) |
| `content`    | JSONB       | Block content                         |
| `position`   | INTEGER     | Order within note                     |
| `created_at` | TIMESTAMPTZ | Creation timestamp                    |
| `updated_at` | TIMESTAMPTZ | Last update timestamp                 |

## Security

- **Row Level Security (RLS)**: Users can only access their own records
- **Storage Policies**: Users can only access files in their own folder
- **Signed URLs**: Private files accessed via time-limited signed URLs (1 hour expiry)
