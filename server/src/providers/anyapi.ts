import { OpenAICompatProvider } from './openai-compat.js';

export class AnyApiProvider extends OpenAICompatProvider {
  constructor() {
    super({
      platform: 'anyapi',
      name: 'AnyAPI',
      baseUrl: 'https://api.anyapi.ai/v1',
    });
  }
}
