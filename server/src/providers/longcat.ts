import { OpenAICompatProvider } from './openai-compat.js';

export class LongCatProvider extends OpenAICompatProvider {
  constructor() {
    super({
      platform: 'longcat',
      name: 'LongCat',
      baseUrl: 'https://api.longcat.chat/openai/v1',
    });
  }
}
