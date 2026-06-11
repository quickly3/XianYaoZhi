import { Injectable } from '@nestjs/common';
import { DeepSeekService } from 'src/service/ai/deepseek.service';
import { PrismaService } from 'src/service/prisma.service';
import {
  entityExtractionSystemPrompt,
  buildEntityExtractionPrompt,
} from './extract-entities.prompt';

export interface ExtractEntitiesOptions {
  /** 书籍名称，如 ShanHaiJing，对应 Chapter.bookName */
  book: string;
  /** 可选，仅处理指定章节标题前缀（如 01）。不传则处理全部章节 */
  chapter?: string;
}

@Injectable()
export class ExtractEntitiesService {
  constructor(
    private readonly DeepSeekService: DeepSeekService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 从数据库中读取 status='init' 的 Chapter，
   * 通过 AI 提取实体后写入 Entity 表，
   * 并将 Chapter 状态更新为 'extracted'。
   */
  async extract(options: ExtractEntitiesOptions): Promise<void> {
    const { book, chapter } = options;

    // 查询 status='init' 的章节
    const chapters = await this.prisma.chapter.findMany({
      where: {
        bookName: book,
        status: 'init',
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 如果指定了章节前缀，进一步过滤
    const targetChapters = chapter
      ? chapters.filter((c) => c.title.startsWith(chapter))
      : chapters;

    if (targetChapters.length === 0) {
      const extra = chapter ? `, chapter: ${chapter}` : '';
      console.log(`未找到 status='init' 的章节（book: ${book}${extra}）`);
      return;
    }

    console.log(`将处理 ${targetChapters.length} 个章节...`);

    for (const ch of targetChapters) {
      const content = ch.content;
      if (!content) {
        console.warn(`[跳过] ${ch.title}: 内容为空`);
        continue;
      }

      console.log(`[处理中] ${ch.title}...`);

      const userPrompt = buildEntityExtractionPrompt(content);

      try {
        const rawResponse = await this.DeepSeekService.chatWithSystem({
          system: entityExtractionSystemPrompt,
          message: userPrompt,
          type: 'flash',
        });

        const parsed = this.parseResponse(rawResponse);

        // 将提取的实体写入 Entity 表
        await this.saveEntities(ch.bookId, ch.id, parsed);

        // 更新 Chapter 状态为 extracted
        await this.prisma.chapter.update({
          where: { id: ch.id },
          data: { status: 'extracted' },
        });

        const count = this.countEntities(parsed);
        console.log(`[完成] ${ch.title} → 已保存 ${count} 个实体`);
      } catch (err) {
        console.error(`[失败] ${ch.title}:`, err);
      }

      // 请求间短暂延迟，避免触发限流
      await this.sleep(500);
    }

    console.log('全部处理完成！');
  }

  /**
   * 将解析后的实体数据批量写入 Entity 表。
   */
  private async saveEntities(
    bookId: number,
    chapterId: number,
    parsed: Record<string, string[]>,
  ): Promise<void> {
    const categoryMap: Record<string, string> = {
      places: '地点',
      creatures: '异兽',
      plants: '植物',
      minerals: '矿物',
      artifacts: '器物',
      characters: '人物',
      tribes: '族群',
    };

    const entities: Array<{
      bookId: number;
      chapterId: number;
      name: string;
      category: string;
      origin: string;
      description: string;
      aliases: string;
    }> = [];

    for (const [key, names] of Object.entries(parsed)) {
      if (key === '_raw' || !Array.isArray(names)) continue;
      const category = categoryMap[key] || key;
      for (const name of names) {
        entities.push({
          bookId,
          chapterId,
          name,
          category,
          origin: '',
          description: '',
          aliases: '',
        });
      }
    }

    if (entities.length > 0) {
      await this.prisma.entity.createMany({
        data: entities,
      });
    }
  }

  /**
   * 统计提取到的实体总数。
   */
  private countEntities(parsed: Record<string, string[]>): number {
    let count = 0;
    for (const [key, value] of Object.entries(parsed)) {
      if (key === '_raw') continue;
      if (Array.isArray(value)) count += value.length;
    }
    return count;
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
