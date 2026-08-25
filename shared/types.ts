// ---- Platform & Model Types ----

export interface PreviewKey { keyName: string; keyValue: string; detectedPlatform: string | null; prefix: string; isDuplicate?: boolean; }
export interface ImportKey { keyName: string; keyValue: string; platform: string; }
export interface PreviewResponse { keys: PreviewKey[]; total: number; skipped: string[]; duplicates: number; }
export interface ImportSelectedRequest { keys: ImportKey[]; }
export interface ImportSelectedResponse { imported: number; skipped: string[]; errors: Array<{ key: string; error: string }>; total: number; }

export type Platform =
  | 'google' | 'groq' | 'cerebras' | 'nvidia' | 'mistral' | 'sambanova'
  | 'openrouter' | 'github' | 'cohere' | 'cloudflare' | 'zhipu' | 'ollama'
  | 'kilo' | 'pollinations' | 'llm7' | 'huggingface' | 'opencode' | 'ovh'
  | 'agnes' | 'reka' | 'siliconflow' | 'routeway' | 'bazaarlink' | 'ainative'
  | 'aion' | 'requesty' | 'navy' | 'nara' | 'sealion' | 'orcarouter'
  | 'modelscope' | 'aihorde' | 'custom'
  // Upstream v0.8.5 providers
  | 'bai' | 'anyapi' | 'qianfan' | 'volcengine' | 'longcat' | 'xfyun';

export interface Model { id: number; platform: Platform; modelId: string; displayName: string; intelligenceRank: number; speedRank: number; sizeLabel: string; rpmLimit: number | null; rpdLimit: number | null; tpmLimit: number | null; tpdLimit: number | null; monthlyTokenBudget: string; contextWindow: number | null; enabled: boolean; supportsVision: boolean; supportsTools: boolean; }
export type QuirkSeverity = 'info' | 'warning' | 'blocker';
export interface Quirk { slug: string; title: string; body: string; severity: QuirkSeverity; }
export interface QuirkTarget { platform: Platform | null; modelGlob: string | null; }
export interface ModelListRow { platform: string; model_id: string; display_name: string; context_window: number | null; enabled: number; available: number; }
export type KeyStatus = 'healthy' | 'rate_limited' | 'invalid' | 'error' | 'unknown';
export interface ApiKeyModel { id: number; kind: 'chat' | 'embedding' | 'image' | 'audio'; modelId: string; displayName: string; family?: string | null; }
export interface ApiKeyCooldown { modelId: string; expiresAtMs: number; remainingMs: number; }
export interface ApiKey { id: number; platform: Platform; label: string; maskedKey: string; baseUrl: string | null; status: KeyStatus; enabled: boolean; keyless: boolean; createdAt: string; lastCheckedAt: string | null; lastHealthError: string | null; models?: ApiKeyModel[]; cooldowns?: ApiKeyCooldown[]; }
export interface ApiKeyCreate { platform: Platform; key: string; label?: string; }

export interface FallbackEntry { modelId: number; platform: Platform; displayName: string; intelligenceRank: number; speedRank: number; priority: number; enabled: boolean; groupKey?: string; canonicalId?: string; groupLabel?: string; }
export interface ModelGroupInfo { groupKey: string; canonicalId: string; groupLabel: string; }
export interface UnifyOverrides { merges: { into: string; keys: string[] }[]; splits: { member: string; groupKey?: string }[]; }
export interface UnifySettings { enabled: boolean; overrides: UnifyOverrides; }

export interface ChatToolCallFunction { name: string; arguments: string; }
export interface ChatToolCall { id: string; type: 'function'; function: ChatToolCallFunction; thought_signature?: string; }
export interface ChatToolFunctionDefinition { name: string; description?: string; parameters?: Record<string, unknown>; strict?: boolean; }
export interface ChatToolDefinition { type: 'function'; function: ChatToolFunctionDefinition; }
export type ChatToolChoice = 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string; }; };
export type ChatContentBlock = string | { type?: string; text?: string; [key: string]: unknown };
export type ChatContent = string | null | ChatContentBlock[];
export interface ChatMessage { role: 'system' | 'user' | 'assistant' | 'tool'; content: ChatContent; name?: string; tool_call_id?: string; tool_calls?: ChatToolCall[]; reasoning_content?: string; }
export interface ChatCompletionRequest { model?: string; messages: ChatMessage[]; temperature?: number; max_tokens?: number; stream?: boolean; top_p?: number; stop?: string | string[]; tools?: ChatToolDefinition[]; tool_choice?: ChatToolChoice; parallel_tool_calls?: boolean; }
export interface ChatCompletionChoice { index: number; message: ChatMessage; finish_reason: string | null; logprobs?: unknown; }
export interface TokenUsage { prompt_tokens: number; completion_tokens: number; total_tokens: number; }
export interface ChatCompletionResponse { id: string; object: 'chat.completion'; created: number; model: string; choices: ChatCompletionChoice[]; usage: TokenUsage; _routed_via?: { platform: Platform; model: string; }; }
export interface ChatCompletionChunk { id: string; object: 'chat.completion.chunk'; created: number; model: string; choices: { index: number; delta: { role?: 'assistant'; content?: string; reasoning_content?: string; tool_calls?: ChatToolCall[]; }; finish_reason: string | null; }[]; }

export interface AnalyticsSummary { totalRequests: number; successRate: number; totalInputTokens: number; totalOutputTokens: number; avgLatencyMs: number; estimatedCostSavings: number; }
export interface PlatformStats { platform: Platform; requests: number; successRate: number; avgLatencyMs: number; totalInputTokens: number; totalOutputTokens: number; }
export interface TimelinePoint { timestamp: string; requests: number; successCount: number; failureCount: number; }
export interface RequestLog { id: number; platform: Platform; modelId: string; status: 'success' | 'error'; inputTokens: number; outputTokens: number; latencyMs: number; error: string | null; createdAt: string; }
export interface RateLimitStatus { platform: Platform; modelId: string; rpm: { used: number; limit: number | null }; rpd: { used: number; limit: number | null }; tpm: { used: number; limit: number | null }; available: boolean; nextResetAt: string | null; }
export type QuotaMetric = 'requests' | 'tokens' | 'credits' | 'neurons';
export type QuotaResetStrategy = 'fixed_calendar' | 'rolling_window' | 'token_bucket' | 'provider_reported' | 'unknown';
export type QuotaObservationSource = 'header' | 'quota_api' | 'error_body' | 'local_usage' | 'documentation' | 'probe';
export interface ProviderQuotaState { platform: Platform; keyId: number; quotaPoolKey: string; metric: QuotaMetric; limit: number | null; remaining: number | null; resetAt: string | null; resetStrategy: QuotaResetStrategy; source: QuotaObservationSource; confidence: number; notes: string | null; observedAt: string; updatedAt: string; }
export interface ProviderQuotaObservation extends ProviderQuotaState { id: string; statusCode: number | null; retryAfterMs: number | null; providerAccountId: string | null; modelId: string | null; endpoint: string | null; rawJson: string | null; createdAt: string; }
