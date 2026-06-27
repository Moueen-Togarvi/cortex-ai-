import { NextResponse } from "next/server";
import { toolRegistry } from "@/lib/tools";

// GET /api/tools — Return the full tool registry (id, name, description, category)
export async function GET() {
  const tools = toolRegistry.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    category: tool.category,
  }));

  return NextResponse.json(tools);
}