# Supabase Setup

Database schema and storage configuration for Yurie.

## Prerequisites

- Supabase project with authentication enabled
- Environment variables configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Setup Instructions

### 1. Create Storage Buckets

Go to **Supabase Dashboard > Storage** and create these buckets:

| Bucket             | Public | Allowed MIME Types                           | Max Size |
| ------------------ | ------ | -------------------------------------------- | -------- |
| `user-images`      | No     | `image/png`, `image/jpeg`, `image/webp`      | 5MB      |
| `user-videos`      | No     | `video/mp4`, `video/webm`                    | 50MB     |
| `user-attachments` | No     | `image/*`, `video/*`, `audio/*`, `application/pdf` | 100MB    |

### 2. Run Database Migration

Go to **Supabase Dashboard > SQL Editor** and run:

```
migrations/001_init.sql
```

This single file creates:
- All database tables with RLS enabled
- All table security policies
- All performance indexes
- All storage bucket policies

## Schema Overview

### Tables

#### `user_images`
Stores metadata for AI-generated images.

| Column       | Type        | Description             |
| ------------ | ----------- | ----------------------- |
| id           | UUID        | Primary key             |
| user_id      | UUID        | FK to `auth.users`      |
| storage_path | TEXT        | Path in storage bucket  |
| prompt       | TEXT        | Generation prompt       |
| aspect_ratio | TEXT        | Image aspect ratio      |
| image_size   | TEXT        | Image dimensions        |
| mime_type    | TEXT        | MIME type               |
| created_at   | TIMESTAMPTZ | Creation timestamp      |

#### `user_videos`
Stores metadata for AI-generated videos.

| Column           | Type        | Description             |
| ---------------- | ----------- | ----------------------- |
| id               | UUID        | Primary key             |
| user_id          | UUID        | FK to `auth.users`      |
| storage_path     | TEXT        | Path in storage bucket  |
| prompt           | TEXT        | Generation prompt       |
| aspect_ratio     | TEXT        | Video aspect ratio      |
| resolution       | TEXT        | Video resolution        |
| duration_seconds | TEXT        | Video duration          |
| mime_type        | TEXT        | MIME type               |
| file_size        | BIGINT      | File size in bytes      |
| created_at       | TIMESTAMPTZ | Creation timestamp      |

#### `user_attachments`
Stores metadata for chat attachments.

| Column          | Type        | Description                         |
| --------------- | ----------- | ----------------------------------- |
| id              | UUID        | Primary key                         |
| user_id         | UUID        | FK to `auth.users`                  |
| chat_id         | TEXT        | Chat ID                             |
| message_id      | TEXT        | Message ID                          |
| storage_path    | TEXT        | Path in storage bucket              |
| filename        | TEXT        | Original filename                   |
| mime_type       | TEXT        | MIME type                           |
| file_size       | BIGINT      | File size in bytes                  |
| attachment_type | TEXT        | Type: image, video, document, audio |
| created_at      | TIMESTAMPTZ | Creation timestamp                  |

## Security

- **Row Level Security (RLS)**: Users can only access their own records
- **Storage Policies**: Users can only access files in their own folder (`{user_id}/...`)
- **Signed URLs**: Private files accessed via time-limited signed URLs
