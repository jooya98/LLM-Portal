import { OpenAICompatProvider } from './openai-compat.js';

export class VolcengineProvider extends OpenAICompatProvider {
  constructor() {
    super({
      platform: 'volcengine',
      name: 'Volcengine Ark',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    });
  }
}
