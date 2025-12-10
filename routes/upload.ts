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

    // --- SAVE TO DISK ---
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const filename = `upload_${timestamp}_${random}.${ext}`;
    const path = `${UPLOAD_DIR}/${filename}`;

    await Bun.write(path, file);

    const protocol = c.req.header("x-forwarded-proto") || "http";
    const host = c.req.header("host");
    const url = `${protocol}://${host}/uploads/${filename}`;

    return c.json({
      success: true,
      url,
      filename,
      ext,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

export default uploadApp;
