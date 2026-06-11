import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DeepSeekService } from 'src/service/ai/deepseek.service';
import {
  entityOriginSystemPrompt,
  buildEntityOriginPrompt,
} from './extract-entities.prompt';

export interface FindOriginOptions {
  /** 书籍目录名，如 ShanHaiJing */
  book: string;
  /** 可选，仅处理指定章节前缀（如 01）。不传则处理全部章节 */
  chapter?: string;
}

/** 单个实体的出处结果 */
export interface EntityOrigin {
  /** 实体名称 */
  name: string;
  /** 实体分类（places / creatures / plants 等） */
  category: string;
  /** 原文出处段落 */
  origin: string;
}

/** 一个章节的出处查询结果 */
export interface ChapterOriginResult {
  /** 章节名，如 01-南山经 */
  chapter: string;
  /** 该章节所有实体的出处 */
  entities: EntityOrigin[];
}

@Injectable()
export class FindEntityOriginService {
  constructor(private readonly DeepSeekService: DeepSeekService) {}

  /**
   * 读取 entities 目录下的 JSON 文件，为每个实体查找原文出处，
   * 结果保存到 origins 目录。
   */
  async findOrigins(options: FindOriginOptions): Promise<void> {
    const { book, chapter } = options;
    const entitiesDir = path.join('book', book, 'entities');
    const txtDir = path.join('book', book, 'txt_chapters');
    const originsDir = path.join('book', book, 'origins');

    if (!fs.existsSync(entitiesDir)) {
      console.error(`entities 目录不存在: ${entitiesDir}`);
      return;
    }

    fs.mkdirSync(originsDir, { recursive: true });

    // 获取所有 entities JSON 文件
    const entityFiles = fs
      .readdirSync(entitiesDir)
      .filter((f) => f.endsWith('.json'))
      .sort();

    const targetFiles = chapter
      ? entityFiles.filter((f) => f.startsWith(chapter))
      : entityFiles;

    if (targetFiles.length === 0) {
      console.log(`未找到匹配的 entities 文件（目录: ${entitiesDir}）`);
      return;
    }

    console.log(`将处理 ${targetFiles.length} 个章节的实体出处...`);

    for (const entityFile of targetFiles) {
      const chapterName = entityFile.replace(/\.json$/, '');
      const entityFilePath = path.join(entitiesDir, entityFile);
      const txtFilePath = path.join(txtDir, `${chapterName}.txt`);
      const outputPath = path.join(originsDir, `${chapterName}.origins.json`);

      if (!fs.existsSync(txtFilePath)) {
        console.warn(`[跳过] 找不到对应原文: ${txtFilePath}`);
        continue;
      }

      console.log(`[处理中] ${chapterName}...`);

      const entities: Record<string, string[]> = JSON.parse(
        fs.readFileSync(entityFilePath, 'utf-8'),
      );
      const fullText = fs.readFileSync(txtFilePath, 'utf-8');

      const result: ChapterOriginResult = {
        chapter: chapterName,
        entities: [],
      };

      // 遍历所有分类
      const categories = [
        'places',
        'creatures',
        'plants',
        'minerals',
        'artifacts',
        'characters',
        'tribes',
      ];

      for (const category of categories) {
        const names: string[] = entities[category] || [];
        for (const name of names) {
          console.log(`  [查询] ${category}: ${name}`);

          try {
            const userPrompt = buildEntityOriginPrompt(name, fullText);
            const origin = await this.DeepSeekService.chatWithSystem({
              system: entityOriginSystemPrompt,
              message: userPrompt,
              type: 'flash',
            });

            result.entities.push({
              name,
              category,
              origin: origin.trim(),
            });
          } catch (err) {
            console.error(`  [失败] ${name}:`, err);
            result.entities.push({
              name,
              category,
              origin: '',
            });
          }

          // 请求间短暂延迟
          await this.sleep(300);
        }
      }

      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`[完成] ${chapterName} → ${outputPath}`);
    }

    console.log('全部出处查询完成！');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
