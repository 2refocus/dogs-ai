import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

// GET /api/admin/models - Get all model configurations
export async function GET(req: NextRequest) {
  try {
    // In a real implementation, you'd store these in a database
    // For now, we'll return the static configuration
    const models = [
      {
        id: "nano-banana",
        name: "Nano Banana",
        model: "google/nano-banana",
        supportsAspectRatio: true,
        supportsUpscaling: false,
        maxInputSize: "1024x1024",
        outputSize: "1024x1024",
        isActive: true,
        description: "Fast, efficient model for quick generations"
      },
      {
        id: "sdxl",
        name: "Stable Diffusion XL",
        model: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        supportsAspectRatio: true,
        supportsUpscaling: false,
        maxInputSize: "1024x1024",
        outputSize: "1024x1024",
        isActive: true,
        description: "High-quality text-to-image generation"
      },
      {
        id: "seedream-4",
        name: "SeeDream-4",
        model: "bytedance/seedream-4",
        supportsAspectRatio: true,
        supportsUpscaling: true,
        maxInputSize: "4096x4096",
        outputSize: "4096x4096",
        scales: [2, 4],
        isActive: false,
        description: "Unified text-to-image generation and precise single-sentence editing at up to 4K resolution"
      },
      {
        id: "real-esrgan",
        name: "Real-ESRGAN",
        model: "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        supportsAspectRatio: false,
        supportsUpscaling: true,
        maxInputSize: "2048x2048",
        outputSize: "4096x4096",
        scales: [2, 4],
        isActive: true,
        description: "High-quality image upscaling"
      }
    ];

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

// POST /api/admin/models - Create or update a model configuration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, model, supportsAspectRatio, supportsUpscaling, maxInputSize, outputSize, scales, isActive, description } = body;

    // Validate required fields
    if (!id || !name || !model) {
      return NextResponse.json(
        { error: "Missing required fields: id, name, model" },
        { status: 400 }
      );
    }

    // In a real implementation, you'd save this to a database
    // For now, we'll just return success
    const modelConfig = {
      id,
      name,
      model,
      supportsAspectRatio: supportsAspectRatio ?? true,
      supportsUpscaling: supportsUpscaling ?? false,
      maxInputSize: maxInputSize ?? "1024x1024",
      outputSize: outputSize ?? "1024x1024",
      scales: scales || [],
      isActive: isActive ?? true,
      description: description || ""
    };

    return NextResponse.json({ 
      message: "Model configuration saved successfully",
      model: modelConfig
    });
  } catch (error) {
    console.error("Error saving model:", error);
    return NextResponse.json(
      { error: "Failed to save model configuration" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/models - Delete a model configuration
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("id");

    if (!modelId) {
      return NextResponse.json(
        { error: "Model ID is required" },
        { status: 400 }
      );
    }

    // In a real implementation, you'd delete from database
    // For now, we'll just return success
    return NextResponse.json({ 
      message: `Model ${modelId} deleted successfully` 
    });
  } catch (error) {
    console.error("Error deleting model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
