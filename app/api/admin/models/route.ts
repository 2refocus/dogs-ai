import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/admin/models - Get all model configurations from database
export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("model_configs")
      .select("*")
      .order("id");

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch models: " + error.message },
        { status: 500 }
      );
    }

    // Transform snake_case to camelCase for frontend
    const models = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      model: row.model,
      supportsAspectRatio: row.supports_aspect_ratio,
      supportsUpscaling: row.supports_upscaling,
      maxInputSize: row.max_input_size,
      outputSize: row.output_size,
      scales: row.scales || [],
      isActive: row.is_active,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

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

    // Upsert to database (insert or update on conflict)
    const { data, error } = await supabaseAdmin
      .from("model_configs")
      .upsert({
        id,
        name,
        model,
        supports_aspect_ratio: supportsAspectRatio ?? true,
        supports_upscaling: supportsUpscaling ?? false,
        max_input_size: maxInputSize ?? "1024x1024",
        output_size: outputSize ?? "1024x1024",
        scales: scales || [],
        is_active: isActive ?? true,
        description: description || "",
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json(
        { error: "Failed to save model: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "Model configuration saved successfully",
      model: data
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

    const { error } = await supabaseAdmin
      .from("model_configs")
      .delete()
      .eq("id", modelId);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete model: " + error.message },
        { status: 500 }
      );
    }

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
