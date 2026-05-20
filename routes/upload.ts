import { Hono } from "hono";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "../lib/r2";

const uploadApp = new Hono();

uploadApp.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    // --- VALIDATION (Images + PDF) ---
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "pdf"];
    const ext = file.name.split(".").pop()?.toLowerCase();

    const isImage = file.type.startsWith("image/");
    const isPDF = file.type === "application/pdf";

    if (!ext || !allowedExtensions.includes(ext)) {
      return c.json({ error: "Only image or PDF files are allowed" }, 400);
    }

    // Fix RN odd MIME cases
    if (ext === "pdf" && !(isPDF || file.type === "application/octet-stream")) {
      return c.json({ error: "Invalid PDF file" }, 400);
    }
    if (["jpg", "jpeg", "png", "webp"].includes(ext) && !isImage) {
      return c.json({ error: "Invalid image file" }, 400);
    }

    // --- UPLOAD TO R2 ---
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const filename = `upload_${timestamp}_${random}.${ext}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filename,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
      })
    );

    const url = `${R2_PUBLIC_URL}/${filename}`;

    return c.json({ success: true, url, filename, ext });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

export default uploadApp;
