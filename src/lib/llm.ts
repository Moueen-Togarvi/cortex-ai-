// LLM Models configuration and chat utility

export interface LLMModel {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "google" | "deepseek";
  modelId: string;
  status: "active" | "inactive";
  inputPrice: number; // per 1M tokens
  outputPrice: number;
  contextWindow: number;
  maxOutput: number;
}

export const MODEL_CONFIGS: LLMModel[] = [
  { id: "model_1", name: "GPT-4o", provider: "openai", modelId: "gpt-4o", status: "active", inputPrice: 2.5, outputPrice: 10, contextWindow: 128000, maxOutput: 16384 },
  { id: "model_2", name: "GPT-4o Mini", provider: "openai", modelId: "gpt-4o-mini", status: "active", inputPrice: 0.15, outputPrice: 0.6, contextWindow: 128000, maxOutput: 16384 },
  { id: "model_3", name: "Claude Sonnet 4", provider: "anthropic", modelId: "claude-sonnet-4-20250514", status: "active", inputPrice: 3, outputPrice: 15, contextWindow: 200000, maxOutput: 16384 },
  { id: "model_4", name: "Claude Haiku 3.5", provider: "anthropic", modelId: "claude-3-5-haiku-20241022", status: "active", inputPrice: 0.8, outputPrice: 4, contextWindow: 200000, maxOutput: 8192 },
  { id: "model_5", name: "Gemini 2.0 Flash", provider: "google", modelId: "gemini-2.0-flash", status: "active", inputPrice: 0.1, outputPrice: 0.4, contextWindow: 1048576, maxOutput: 8192 },
  { id: "model_6", name: "Gemini 1.5 Pro", provider: "google", modelId: "gemini-1.5-pro", status: "inactive", inputPrice: 1.25, outputPrice: 5, contextWindow: 2097152, maxOutput: 8192 },
  { id: "model_7", name: "DeepSeek Chat", provider: "deepseek", modelId: "deepseek-chat", status: "active", inputPrice: 0.14, outputPrice: 0.28, contextWindow: 65536, maxOutput: 8192 },
  { id: "model_8", name: "DeepSeek Reasoner", provider: "deepseek", modelId: "deepseek-reasoner", status: "active", inputPrice: 0.55, outputPrice: 2.19, contextWindow: 65536, maxOutput: 16384 },
];

export function getModelById(modelId: string): LLMModel | undefined {
  return MODEL_CONFIGS.find((m) => m.modelId === modelId);
}

export function getActiveModels(): LLMModel[] {
  return MODEL_CONFIGS.filter((m) => m.status === "active");
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolCallDef[];
  stream?: boolean;
}

export interface ToolCallDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// Demo responses for when no LLM API key is configured
const DEMO_RESPONSES: Record<string, string[]> = {
  default: [
    "Based on my analysis, here are the key findings:\n\n## Summary\n\n1. **Primary Insight** — The data shows a clear upward trend\n2. **Secondary Finding** — Correlation between variables is significant\n3. **Recommendation** — Consider increasing investment in this area\n\nWould you like me to elaborate on any of these points?",
    "I've processed your request and here's what I found:\n\n### Results\n\nThe analysis reveals several important patterns:\n- **Pattern A**: Consistent growth over the last quarter (+28%)\n- **Pattern B**: Improved efficiency metrics\n- **Pattern C**: Higher customer satisfaction scores\n\n### Next Steps\n1. Validate findings with additional data\n2. Run A/B testing\n3. Prepare executive summary",
    "Great question! Let me break this down:\n\n## Explanation\n\nThe core concept involves three main components:\n\n1. **Input Processing** — Raw data is normalized and validated\n2. **Transformation** — Data flows through a series of transformations\n3. **Output Generation** — Final results are formatted and delivered\n\n```\nInput → Validate → Transform → Enrich → Output\n```\n\nThis pipeline ensures data quality at every step.",
  ],
};

export function getDemoResponse(): string {
  const responses = DEMO_RESPONSES.default;
  return responses[Math.floor(Math.random() * responses.length)];
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = getModelById(modelId);
  if (!model) return 0;
  return (inputTokens / 1_000_000) * model.inputPrice + (outputTokens / 1_000_000) * model.outputPrice;
}