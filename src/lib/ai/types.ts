export interface PromptTemplate {
  key: string;
  label: string;
  purpose: string;
  condition: string;
  tone: string;
  systemPrompt: string;
  userPrompt: (context: string) => string;
}

export interface GenerationRequest {
  templateKey: string;
  context: string;
}

export interface GenerationHistoryItem {
  id: string;
  templateKey: string;
  context: string;
  result: string;
  createdAt: string;
}
