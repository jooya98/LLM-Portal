import { OpenAICompatProvider } from './openai-compat.js';

export class QianfanProvider extends OpenAICompatProvider {
  constructor() {
    super({
      platform: 'qianfan',
      name: 'Baidu Qianfan',
      baseUrl: 'https://qianfan.baidubce.com/v2',
    });
  }
}
