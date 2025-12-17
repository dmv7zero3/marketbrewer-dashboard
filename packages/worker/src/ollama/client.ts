import axios, { AxiosInstance } from "axios";

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: false;
  options?: {
    temperature?: number;
    num_ctx?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
}

export interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
  }>;
}

export class OllamaClient {
  private client: AxiosInstance;
  private model: string;

  constructor(baseURL?: string, model?: string) {
    const resolvedBaseURL =
      baseURL || process.env.OLLAMA_URL || "http://localhost:11434";
    const timeout = parseInt(process.env.OLLAMA_TIMEOUT_MS || "120000", 10);

    this.client = axios.create({ baseURL: resolvedBaseURL, timeout });
    this.model = model || process.env.OLLAMA_MODEL || "llama3.1:8b-instruct";
  }

  async generate(prompt: string): Promise<string> {
    const request: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_ctx: 4096,
      },
    };

    const response = await this.client.post<OllamaGenerateResponse>(
      "/api/generate",
      request
    );
    return response.data.response;
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.client.get<OllamaTagsResponse>("/api/tags");
      return true;
    } catch {
      return false;
    }
  }

  getModel(): string {
    return this.model;
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get<OllamaTagsResponse>("/api/tags");
      return response.data.models.map((m) => m.name);
    } catch {
      return [];
    }
  }
}
