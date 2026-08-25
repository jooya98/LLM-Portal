import { OpenAICompatProvider } from './openai-compat.js';
import type { KeyValidationResult, ProviderFetchOptions } from './base.js';
import type { QuotaObservationContext } from '../services/provider-quota.js';

const DOMESTIC_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';
const GLOBAL_BASE_URL = 'https://api.z.ai/api/paas/v4';

export class ZhipuProvider extends OpenAICompatProvider {
  private readonly globalKeys = new Set<string>();

  constructor(opts: { timeoutMs?: number } = {}) {
    super({
      platform: 'zhipu',
      name: 'Zhipu AI',
      baseUrl: DOMESTIC_BASE_URL,
      timeoutMs: opts.timeoutMs,
    });
  }

  private static apiKeyOf(init: RequestInit): string | undefined {
    const raw = init.headers;
    const auth = raw instanceof Headers
      ? raw.get('authorization')
      : (raw as Record<string, string> | undefined)?.['Authorization']
        ?? (raw as Record<string, string> | undefined)?.['authorization'];
    return auth?.startsWith('Bearer ') ? auth.slice('Bearer '.length) : undefined;
  }

  private resolveUrl(url: string, init: RequestInit): string {
    if (!url.startsWith(DOMESTIC_BASE_URL)) return url;
    const apiKey = ZhipuProvider.apiKeyOf(init);
    if (!apiKey || !this.globalKeys.has(apiKey)) return url;
    return GLOBAL_BASE_URL + url.slice(DOMESTIC_BASE_URL.length);
  }

  protected override fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs?: number,
    fetchOpts?: ProviderFetchOptions,
  ): Promise<Response> {
    return super.fetchWithTimeout(this.resolveUrl(url, init), init, timeoutMs, fetchOpts);
  }

  override async validateKey(apiKey: string, quotaContext?: QuotaObservationContext): Promise<KeyValidationResult> {
    this.globalKeys.delete(apiKey);

    const domesticRes = await this.fetchCatalogEndpoint(`${DOMESTIC_BASE_URL}/models`, apiKey, quotaContext);
    if (domesticRes.status !== 401 && domesticRes.status !== 403) {
      return this.validationResult(domesticRes);
    }

    let globalRes: Response;
    try {
      globalRes = await this.fetchCatalogEndpoint(`${GLOBAL_BASE_URL}/models`, apiKey, quotaContext);
    } catch {
      return this.validationResult(domesticRes);
    }

    if (globalRes.status !== 401 && globalRes.status !== 403) {
      this.globalKeys.add(apiKey);
      return this.validationResult(globalRes);
    }

    return this.validationResult(domesticRes);
  }
}
