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

1. `migrations/004_user_attachments.sql` - Creates the `user_attachments` table
2. `migrations/005_user_attachments_storage.sql` - Creates storage policies for attachments

### 2. Create Storage Buckets

Go to **Supabase Dashboard > Storage** and create the following bucket:

#### user-attachments bucket

| Setting            | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Name               | `user-attachments`                                           |
| Public             | No (private)                                                 |
| Allowed MIME types | `image/*`, `application/pdf`, `text/*`, `video/*`, `audio/*` |
| Max file size      | 100MB                                                        |

### 3. Apply Storage Policies

After creating the bucket, go to **Storage > user-attachments > Policies** and apply the policies from the storage migration file.

## Schema Overview

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
