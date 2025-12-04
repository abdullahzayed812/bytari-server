import { expect } from "bun:test";

const SERVER_URL = "http://localhost:3001";

console.log("🚀 Starting Upload Verification");

// 1. Create a dummy image file
const dummyImage = new Blob(["fake image content"], { type: "image/jpeg" });
const formData = new FormData();
formData.append("file", dummyImage, "test-image.jpg");

try {
    // 2. Upload to server
    console.log("📤 Uploading file...");
    const response = await fetch(`${SERVER_URL}/upload`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Upload response:", data);

    if (!data.success || !data.url) {
        throw new Error("Invalid response format");
    }

    // 3. Verify file exists (by fetching the URL)
    console.log(`🔍 Verifying file access at ${data.url}...`);
    const fileResponse = await fetch(data.url);

    if (!fileResponse.ok) {
        throw new Error(`Failed to fetch uploaded file: ${fileResponse.status}`);
    }

    console.log("✅ File is accessible!");
    console.log("🎉 Verification Successful!");

} catch (error) {
    console.error("❌ Verification Failed:", error);
    process.exit(1);
}
