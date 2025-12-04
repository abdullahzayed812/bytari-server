import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { mkdir } from "node:fs/promises";

const uploadApp = new Hono();

// Ensure uploads directory exists
const UPLOAD_DIR = "./uploads";
await mkdir(UPLOAD_DIR, { recursive: true });

uploadApp.post("/", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    // Validate file type (optional but recommended)
    if (!file.type.startsWith("image/")) {
      return c.json({ error: "Only image files are allowed" }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `image_${timestamp}_${random}.${extension}`;
    const path = `${UPLOAD_DIR}/${filename}`;

    // Write file to disk
    await Bun.write(path, file);

    // Return the public URL
    // Assuming the server serves 'uploads' directory at /uploads
    const protocol = c.req.header("x-forwarded-proto") || "http";
    const host = c.req.header("host");
    const url = `${protocol}://${host}/uploads/${filename}`;

    return c.json({
      success: true,
      url: url,
      filename: filename,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

export default uploadApp;
