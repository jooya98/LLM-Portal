import { OpenAICompatProvider } from './openai-compat.js';

export class BaiProvider extends OpenAICompatProvider {
  constructor() {
    super({
      platform: 'bai',
      name: 'B.AI',
      baseUrl: 'https://api.b.ai/v1',
    });
  }
}
