import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? "unknown";
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "bizdhan";

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64File = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await uploadToCloudinary(base64File, folder);

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    logger.error("Upload failed", { error, requestId });
    return NextResponse.json(
      { message: "Upload failed", error: (error as Error).message },
      { status: 500 }
    );
  }
}
