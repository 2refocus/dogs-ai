import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const prompt = form.get("prompt") as string;
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const b64 = Buffer.from(bytes).toString("base64");

    // Always enforce square aspect ratio
    const aspectRatio = "1:1";

    const output = await replicate.run("google/nano-banana", {
      input: {
        prompt,
        image_input: [b64],
        aspect_ratio: aspectRatio,
      },
    });

    return NextResponse.json({ url: output });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
