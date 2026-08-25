import { OpenAICompatProvider } from './openai-compat.js';

export class OrcaRouterProvider extends OpenAICompatProvider {
  constructor() {
    super({
      platform: 'orcarouter',
      name: 'OrcaRouter',
      baseUrl: 'https://api.orcarouter.ai/v1',
    });
  }
}
