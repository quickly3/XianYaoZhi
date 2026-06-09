import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import _ from 'lodash';

const modelMap = {
  flash: 'deepseek-v4-flash',
  pro: 'deepseek-v4-pro',
};

@Injectable()
export class DeepseekService {
  public openai: OpenAI;
  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: this.configService.get<string>('deepseek.DS_KEY'),
    });
  }

  async completion(options) {
    const { message, type } = options;

    const model = type ? modelMap[type] : modelMap.flash;

    const messages: any = [
      {
        role: 'user',
        content: message,
      },
    ];

    return await this.openai.chat.completions.create({
      messages,
      model,
      reasoning_effort: 'high',
      stream: false,
    });
  }

  async chat(options) {
    const resp = await this.completion(options);
    return _.get(resp, 'choices[0].message.content', '');
  }

  /**
   * 支持 system prompt 的对话方法。
   * @param options.system - 系统提示词
   * @param options.message - 用户消息
   * @param options.type - 模型类型（flash / pro）
   */
  async chatWithSystem(options: {
    system: string;
    message: string;
    type?: 'flash' | 'pro';
  }): Promise<string> {
    const { system, message, type } = options;

    const model = type ? modelMap[type] : modelMap.flash;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ];

    const resp = await this.openai.chat.completions.create({
      messages,
      model,
      stream: false,
    });

    return _.get(resp, 'choices[0].message.content', '');
  }
}
