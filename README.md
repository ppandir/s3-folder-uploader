# S3 Dropzone

A Next.js web app for uploading files and folders to `sudhishna-personal` while preserving relative paths.

## Run

1. Install Node.js 20+ and npm.
2. Copy `.env.example` to `.env.local` and set `AWS_REGION` if needed.
3. Configure AWS credentials through an IAM role, profile, or environment supported by the AWS SDK.
4. Run `npm install` and `npm run dev`.

The backend route at `/api/upload` receives each file and writes it to S3 using its browser-provided relative path as the object key. The route sanitizes path traversal segments before upload.
