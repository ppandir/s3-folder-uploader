import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const bucket = process.env.S3_BUCKET || "sudhishna-personal";
const client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const relativePath = formData.get("relativePath");
    if (!(file instanceof File) || typeof relativePath !== "string") return NextResponse.json({ error: "A file and relative path are required." }, { status: 400 });
    const key = relativePath.replaceAll("\\", "/").split("/").filter((part) => part && part !== "." && part !== "..").join("/");
    if (!key) return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type || "application/octet-stream" }));
    return NextResponse.json({ key });
  } catch (error) {
    console.error("S3 upload failed", error);
    return NextResponse.json({ error: "S3 upload failed. Check server credentials and bucket configuration." }, { status: 500 });
  }
}
