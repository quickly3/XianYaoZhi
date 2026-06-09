import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DeepseekService } from 'src/service/ai/deepseek.service';
import {
  entityExtractionSystemPrompt,
  buildEntityExtractionPrompt,
} from './extract-entities.prompt';

export interface ExtractEntitiesOptions {
  /** 书籍目录名，如 ShanHaiJing */
  book: string;
  /** 可选，仅处理指定章节前缀（如 01）。不传则处理全部章节 */
  chapter?: string;
  /** 章节来源目录名，默认 txt_chapters */
  sourceDir?: string;
}

@Injectable()
export class ExtractEntitiesService {
  constructor(private readonly deepseekService: DeepseekService) {}

  /**
   * 对指定书籍的章节执行实体提取，结果保存到 entities 目录。
   */
  async extract(options: ExtractEntitiesOptions): Promise<void> {
    const { book, chapter } = options;
    const sourceDir =
      options.sourceDir ?? path.join('book', book, 'txt_chapters');
    const entitiesDir = path.join('book', book, 'entities');

    // 确保 entities 目录存在
    fs.mkdirSync(entitiesDir, { recursive: true });

    // 获取所有章节文件
    const absSourceDir = path.resolve(sourceDir);
    if (!fs.existsSync(absSourceDir)) {
      console.error(`目录不存在: ${absSourceDir}`);
      return;
    }

    const files = fs
      .readdirSync(absSourceDir)
      .filter((f) => f.endsWith('.txt'))
      .sort();

    const targetFiles = chapter
      ? files.filter((f) => f.startsWith(chapter))
      : files;

    if (targetFiles.length === 0) {
      console.log(`未找到匹配的章节文件（目录: ${absSourceDir}）`);
      return;
    }

    console.log(`将处理 ${targetFiles.length} 个章节...`);

    for (const file of targetFiles) {
      const filePath = path.join(absSourceDir, file);
      const chapterName = file.replace(/\.txt$/, '');
      const outputPath = path.join(entitiesDir, `${chapterName}.json`);

      // 跳过已存在的输出文件（支持断点续传）
      if (fs.existsSync(outputPath)) {
        console.log(`[跳过] ${chapterName} — 已存在`);
        continue;
      }

      console.log(`[处理中] ${chapterName}...`);

      const text = fs.readFileSync(filePath, 'utf-8');
      const userPrompt = buildEntityExtractionPrompt(text);

      try {
        const rawResponse = await this.deepseekService.chatWithSystem({
          system: entityExtractionSystemPrompt,
          message: userPrompt,
          type: 'flash',
        });

        const parsed = this.parseResponse(rawResponse);
        fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');
        console.log(`[完成] ${chapterName} → ${outputPath}`);
      } catch (err) {
        console.error(`[失败] ${chapterName}:`, err.message);
      }

      // 请求间短暂延迟，避免触发限流
      await this.sleep(500);
    }

    console.log('全部处理完成！');
  }

  /**
   * 从 AI 返回的文本中提取并解析 JSON 对象。
   * 兼容可能被 Markdown 代码块包裹的情况。
   */
  private parseResponse(raw: string): Record<string, string[]> {
    // 尝试去除可能的 Markdown 代码块标记
    let jsonStr = raw.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      // 确保返回结构完整
      const defaultStructure: Record<string, string[]> = {
        places: [],
        creatures: [],
        plants: [],
        minerals: [],
        artifacts: [],
        characters: [],
        tribes: [],
      };

      return { ...defaultStructure, ...parsed };
    } catch {
      console.warn('JSON 解析失败，尝试修复...');
      // 如果解析失败，尝试将原始内容作为 fallback
      return {
        places: [],
        creatures: [],
        plants: [],
        minerals: [],
        artifacts: [],
        characters: [],
        tribes: [],
        _raw: [jsonStr],
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
