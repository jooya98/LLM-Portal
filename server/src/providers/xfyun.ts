import { OpenAICompatProvider } from './openai-compat.js';

export class XfyunProvider extends OpenAICompatProvider {
  constructor() {
    super({
      platform: 'xfyun',
      name: 'iFlytek Spark',
      baseUrl: 'https://spark-api-open.xf-yun.com/v1',
    });
  }
}
