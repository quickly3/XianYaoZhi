import { Injectable } from '@nestjs/common';
import {
  EntityCategory,
  EntityRecord,
  MapModelParseResult,
  PlaceNode,
  SourceInfo,
  SpatialEdge,
} from './book-map-model.types';

interface SectionLead {
  sectionName?: string;
  firstMountainName?: string;
}

interface TraverseMatch {
  direction: string;
  distanceLi: number;
  targetName: string;
}

interface EffectParseResult {
  effects: string[];
  description?: string;
}

interface MapBuildContext {
  book: string;
  chapter: string;
  sourceFile: string;
  nodes: PlaceNode[];
  entities: EntityRecord[];
  edges: SpatialEdge[];
  placeIndex: Map<string, PlaceNode>;
  entityIndex: Map<string, EntityRecord>;
  edgeIndex: Set<string>;
  placeCounter: number;
  entityCounter: number;
}

const CHINESE_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const CHINESE_UNITS: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
  万: 10000,
};

@Injectable()
export class BookMapModelParserService {
  parseDocument(
    content: string,
    options: { book: string; sourceFile: string },
  ): MapModelParseResult {
    const title = this.extractTitle(content);
    const paragraphs = this.splitParagraphs(content);
    const context = this.createContext(options.book, title, options.sourceFile);
    let currentSection = title;
    let previousMountainId: string | undefined;
    let routeOrder = 0;

    for (const paragraph of paragraphs) {
      const source = this.createSource(context, paragraph);
      const sectionLead = this.extractSectionLead(paragraph);

      if (sectionLead.sectionName || sectionLead.firstMountainName) {
        currentSection = sectionLead.sectionName ?? currentSection;
        previousMountainId = undefined;
        routeOrder = 0;

        if (sectionLead.firstMountainName) {
          routeOrder += 1;
          const firstMountain = this.upsertPlace(context, {
            name: sectionLead.firstMountainName,
            type: this.inferPlaceType(sectionLead.firstMountainName),
            source,
            routeSection: currentSection,
            routeOrder,
          });
          previousMountainId = firstMountain.id;
        }
      }

      const traverse = this.extractTraverse(paragraph);
      let paragraphPlaceId = previousMountainId;

      if (traverse) {
        routeOrder += 1;
        const target = this.upsertPlace(context, {
          name: traverse.targetName,
          type: this.inferPlaceType(traverse.targetName),
          source,
          routeSection: currentSection,
          routeOrder,
        });

        if (previousMountainId) {
          this.addEdge(context, {
            from: previousMountainId,
            to: target.id,
            relation: 'traverse',
            direction: traverse.direction,
            distanceLi: traverse.distanceLi,
            snippet: this.extractTraverseSnippet(paragraph),
            source,
          });
        }

        previousMountainId = target.id;
        paragraphPlaceId = target.id;
      }

      const waterSources = this.extractWaterFlows(paragraph);
      for (const flow of waterSources) {
        const waterNode = this.upsertPlace(context, {
          name: flow.from,
          type: 'river',
          source,
        });
        const targetNode = this.upsertPlace(context, {
          name: flow.to,
          type: this.inferPlaceType(flow.to),
          source,
        });
        this.addEdge(context, {
          from: waterNode.id,
          to: targetNode.id,
          relation: 'watersFlow',
          direction: flow.direction,
          snippet: flow.snippet,
          source,
        });
      }

      const locationForEntities =
        waterSources.length === 1
          ? this.getPlaceId(context, waterSources[0].from, 'river')
          : paragraphPlaceId;

      if (paragraphPlaceId) {
        for (const relation of this.extractViewRelations(paragraph)) {
          const target = this.upsertPlace(context, {
            name: relation.target,
            type: this.inferPlaceType(relation.target),
            source,
          });
          this.addEdge(context, {
            from: paragraphPlaceId,
            to: target.id,
            relation: relation.relation,
            direction: relation.direction,
            snippet: relation.snippet,
            source,
          });
        }
      }

      if (locationForEntities) {
        for (const entity of this.extractEntities(paragraph)) {
          this.upsertEntity(context, {
            ...entity,
            locatedAtId: locationForEntities,
            source: this.createSource(context, entity.snippet),
          });
        }
      }
    }

    return {
      graph: {
        metadata: {
          book: context.book,
          chapter: context.chapter,
          sourceFile: context.sourceFile,
          coordinateSystem: 'relative',
          distanceUnit: '里',
          notes: [
            '规则抽取结果，仅基于当前章节文本。',
            '保留原文异体字、造字描述与异写，不做外部校勘。',
            '坐标需由后续脚本根据 traverse 边再行推算。',
          ],
        },
        nodes: context.nodes,
        edges: context.edges,
      },
      entities: {
        metadata: {
          book: context.book,
          chapter: context.chapter,
          sourceFile: context.sourceFile,
          notes: [
            '仅收录规则可稳定识别的命名实体。',
            '未命名的泛称物产默认不拆分为独立实体。',
          ],
        },
        entities: context.entities,
      },
      summaryMarkdown: this.buildSummaryMarkdown(context),
    };
  }

  private extractTitle(content: string): string {
    const firstLine = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    if (!firstLine) {
      return '未命名章节';
    }

    return firstLine.replace(/^#+\s*/, '');
  }

  private splitParagraphs(content: string): string[] {
    const lines = content.split(/\r?\n/);
    const bodyLines = [...lines];

    while (bodyLines.length > 0 && bodyLines[0].trim() === '') {
      bodyLines.shift();
    }

    if (bodyLines[0]?.trim().startsWith('#')) {
      bodyLines.shift();
    }

    const paragraphs: string[] = [];
    let buffer: string[] = [];

    for (const line of bodyLines) {
      if (line.trim() === '') {
        if (buffer.length > 0) {
          paragraphs.push(buffer.join('').trim());
          buffer = [];
        }
        continue;
      }

      buffer.push(line.trim());
    }

    if (buffer.length > 0) {
      paragraphs.push(buffer.join('').trim());
    }

    return paragraphs.filter((paragraph) => paragraph.length > 0);
  }

  private createContext(
    book: string,
    chapter: string,
    sourceFile: string,
  ): MapBuildContext {
    return {
      book,
      chapter,
      sourceFile,
      nodes: [],
      entities: [],
      edges: [],
      placeIndex: new Map(),
      entityIndex: new Map(),
      edgeIndex: new Set(),
      placeCounter: 0,
      entityCounter: 0,
    };
  }

  private createSource(context: MapBuildContext, snippet: string): SourceInfo {
    return {
      book: context.book,
      chapter: context.chapter,
      file: context.sourceFile,
      snippet,
    };
  }

  private extractSectionLead(paragraph: string): SectionLead {
    const firstSection = paragraph.match(
      /^([^。]+?)之首曰([^。]+?)。其首曰([^，。]+?(?:山|山之尾|山之首))/,
    );
    if (firstSection) {
      return {
        sectionName: firstSection[2].trim(),
        firstMountainName: firstSection[3].trim(),
      };
    }

    const wrappedSection = paragraph.match(
      /^《([^》]+)》之首[，]?曰([^，。]+?(?:山|山之尾|山之首))/,
    );
    if (wrappedSection) {
      return {
        sectionName: wrappedSection[1].trim(),
        firstMountainName: wrappedSection[2].trim(),
      };
    }

    return {};
  }

  private extractTraverse(paragraph: string): TraverseMatch | undefined {
    const match = paragraph.match(
      /^(?:又)?(东南|东北|西南|西北|东|西|南|北)([零〇一二三四五六七八九十百千万两]+)里(?:，)?(?:曰|至于)?([^，。]+?(?:山|山之尾|山之首))(?:[，。]|$)/,
    );

    if (!match) {
      return undefined;
    }

    return {
      direction: match[1],
      distanceLi: this.chineseNumberToInt(match[2]),
      targetName: match[3].trim(),
    };
  }

  private extractTraverseSnippet(paragraph: string): string {
    return `${paragraph.split('。')[0].trim()}。`;
  }

  private extractWaterFlows(paragraph: string): Array<{
    from: string;
    to: string;
    direction: string;
    snippet: string;
  }> {
    const matches = paragraph.matchAll(
      /([^，。]+?(?:之水|水))出(?:焉|于其阴|于其阳)?，?(?:而)?(东南|东北|西南|西北|东|西|南|北)流(?:注于|至于)([^，。]+)[，。]/g,
    );

    return [...matches].map((match) => ({
      from: match[1].trim(),
      to: match[3].trim(),
      direction: match[2],
      snippet: match[0].trim(),
    }));
  }

  private extractViewRelations(paragraph: string): Array<{
    relation: 'overlooks' | 'locatedAt';
    target: string;
    direction?: string;
    snippet: string;
  }> {
    const relations: Array<{
      relation: 'overlooks' | 'locatedAt';
      target: string;
      direction?: string;
      snippet: string;
    }> = [];

    for (const match of paragraph.matchAll(/临于([^，。]+?)(?:之上)?[，。]/g)) {
      relations.push({
        relation: 'overlooks',
        target: match[1].trim(),
        snippet: match[0].trim(),
      });
    }

    for (const match of paragraph.matchAll(
      /(东南|东北|西南|西北|东|西|南|北)望([^，。]+)[，。]/g,
    )) {
      relations.push({
        relation: 'overlooks',
        direction: match[1],
        target: match[2].trim(),
        snippet: match[0].trim(),
      });
    }

    for (const match of paragraph.matchAll(/处于([^，。]+)[，。]/g)) {
      relations.push({
        relation: 'locatedAt',
        target: match[1].trim(),
        snippet: match[0].trim(),
      });
    }

    return relations;
  }

  private extractEntities(paragraph: string): Array<{
    name: string;
    category: Exclude<EntityCategory, 'place'>;
    type: string;
    snippet: string;
    description?: string;
    effects?: string[];
    uncertain?: boolean;
  }> {
    const entities: Array<{
      name: string;
      category: Exclude<EntityCategory, 'place'>;
      type: string;
      snippet: string;
      description?: string;
      effects?: string[];
      uncertain?: boolean;
    }> = [];
    const sentences = paragraph
      .split('。')
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .map((sentence) => `${sentence}。`);

    for (const sentence of sentences) {
      const parsed = this.extractEntityFromSentence(sentence);
      if (parsed) {
        entities.push(parsed);
      }

      for (const listEntity of this.extractListedBirdEntities(sentence)) {
        entities.push(listEntity);
      }
    }

    return entities;
  }

  private extractEntityFromSentence(sentence: string):
    | {
        name: string;
        category: Exclude<EntityCategory, 'place'>;
        type: string;
        snippet: string;
        description?: string;
        effects?: string[];
        uncertain?: boolean;
      }
    | undefined {
    const patterns = [
      {
        test: /有草焉/,
        name: /(?:其名曰|名曰)([^，。]+)/,
        category: 'plant' as const,
        type: 'plant',
      },
      {
        test: /有木焉/,
        name: /(?:其名曰|名曰)([^，。]+)/,
        category: 'plant' as const,
        type: 'plant',
      },
      {
        test: /有兽焉|水有兽焉/,
        name: /(?:其名曰|其名|名曰)([^，。]+)/,
        category: 'creature' as const,
        type: 'beast',
      },
      {
        test: /有鸟焉/,
        name: /(?:其名曰|其名|名曰)([^，。]+)/,
        category: 'creature' as const,
        type: 'bird',
      },
      {
        test: /有鱼焉|其中有[^。]*鱼/,
        name: /(?:其名曰|其名|名曰)([^，。]+)/,
        category: 'creature' as const,
        type: 'fish',
      },
      {
        test: /其中多[^，。]+，佩之/,
        name: /其中多([^，。]+)/,
        category: 'object' as const,
        type: 'mineral',
      },
    ];

    for (const pattern of patterns) {
      if (!pattern.test.test(sentence)) {
        continue;
      }

      const nameMatch = sentence.match(pattern.name);
      if (!nameMatch) {
        continue;
      }

      const name = nameMatch[1].trim();
      const effectInfo = this.extractEffects(sentence, name);
      return {
        name,
        category: pattern.category,
        type: pattern.type,
        snippet: sentence,
        description: effectInfo.description,
        effects: effectInfo.effects.length > 0 ? effectInfo.effects : undefined,
      };
    }

    return undefined;
  }

  private extractListedBirdEntities(sentence: string): Array<{
    name: string;
    category: 'creature';
    type: 'bird';
    snippet: string;
    uncertain?: boolean;
  }> {
    const match = sentence.match(/有([^，。]+(?:、[^，。]+)+)。/);
    if (!match) {
      return [];
    }

    const rawList = match[1]
      .split('、')
      .map((item) => item.trim())
      .filter(Boolean);

    if (rawList.length < 2) {
      return [];
    }

    if (!rawList.every((item) => item.length <= 6)) {
      return [];
    }

    return rawList.map((item) => ({
      name: item,
      category: 'creature',
      type: 'bird',
      snippet: sentence,
      uncertain: true,
    }));
  }

  private extractEffects(sentence: string, name: string): EffectParseResult {
    const clauses = sentence
      .replace(name, '')
      .split('，')
      .map((item) => item.replace(/。$/, '').trim())
      .filter(Boolean);

    const effects = clauses.filter((clause) =>
      /^(食之|佩之|见则|可以|自为|冬死而复生|饮食自然|自歌自舞)/.test(clause),
    );
    const description = clauses.find((clause) => !effects.includes(clause));

    return {
      effects,
      description,
    };
  }

  private chineseNumberToInt(input: string): number {
    let result = 0;
    let section = 0;
    let number = 0;

    for (const char of input) {
      if (char in CHINESE_DIGITS) {
        number = CHINESE_DIGITS[char];
        continue;
      }

      const unit = CHINESE_UNITS[char];
      if (!unit) {
        continue;
      }

      if (unit === 10000) {
        section = (section + number) * unit;
        result += section;
        section = 0;
        number = 0;
        continue;
      }

      section += (number || 1) * unit;
      number = 0;
    }

    return result + section + number;
  }

  private inferPlaceType(name: string): string {
    if (name.endsWith('海')) return 'sea';
    if (name.endsWith('泽') || name.endsWith('渊')) return 'marsh';
    if (name.endsWith('谷')) return 'valley';
    if (name.endsWith('区')) return 'lake';
    if (name.endsWith('水') || name.endsWith('江') || name.endsWith('河')) {
      return 'river';
    }
    if (name.includes('山') || name.endsWith('丘')) return 'mountain';
    return 'toponym';
  }

  private upsertPlace(
    context: MapBuildContext,
    input: {
      name: string;
      type: string;
      source: SourceInfo;
      routeSection?: string;
      routeOrder?: number;
      notes?: string;
      uncertain?: boolean;
    },
  ): PlaceNode {
    const key = `${input.type}:${input.name}`;
    const existing = context.placeIndex.get(key);
    if (existing) {
      if (existing.routeSection == null && input.routeSection) {
        existing.routeSection = input.routeSection;
      }
      if (existing.routeOrder == null && input.routeOrder != null) {
        existing.routeOrder = input.routeOrder;
      }
      if (!existing.notes && input.notes) {
        existing.notes = input.notes;
      }
      if (input.uncertain) {
        existing.uncertain = true;
      }
      return existing;
    }

    context.placeCounter += 1;
    const node: PlaceNode = {
      id: `place-${String(context.placeCounter).padStart(3, '0')}`,
      name: input.name,
      category: 'place',
      type: input.type,
      source: input.source,
      routeSection: input.routeSection,
      routeOrder: input.routeOrder,
      notes: input.notes,
      uncertain: input.uncertain,
    };

    context.nodes.push(node);
    context.placeIndex.set(key, node);
    return node;
  }

  private getPlaceId(
    context: MapBuildContext,
    name: string,
    type: string,
  ): string | undefined {
    return context.placeIndex.get(`${type}:${name}`)?.id;
  }

  private addEdge(context: MapBuildContext, edge: SpatialEdge): void {
    const key = [
      edge.relation,
      edge.from,
      edge.to,
      edge.direction ?? '',
      edge.distanceLi ?? '',
      edge.snippet,
    ].join('|');

    if (context.edgeIndex.has(key)) {
      return;
    }

    context.edgeIndex.add(key);
    context.edges.push(edge);
  }

  private upsertEntity(
    context: MapBuildContext,
    input: {
      name: string;
      category: Exclude<EntityCategory, 'place'>;
      type: string;
      locatedAtId: string;
      source: SourceInfo;
      description?: string;
      effects?: string[];
      uncertain?: boolean;
    },
  ): EntityRecord {
    const key = `${input.category}:${input.type}:${input.name}`;
    const existing = context.entityIndex.get(key);

    if (existing) {
      if (!existing.locatedAt.includes(input.locatedAtId)) {
        existing.locatedAt.push(input.locatedAtId);
      }
      if (!existing.description && input.description) {
        existing.description = input.description;
      }
      if (input.effects?.length) {
        existing.effects = Array.from(
          new Set([...(existing.effects ?? []), ...input.effects]),
        );
      }
      if (input.uncertain) {
        existing.uncertain = true;
      }
      this.attachEntityToPlace(context, input.locatedAtId, existing.id);
      return existing;
    }

    context.entityCounter += 1;
    const entity: EntityRecord = {
      id: `entity-${String(context.entityCounter).padStart(3, '0')}`,
      name: input.name,
      category: input.category,
      type: input.type,
      locatedAt: [input.locatedAtId],
      source: input.source,
      description: input.description,
      effects: input.effects,
      uncertain: input.uncertain,
    };

    context.entities.push(entity);
    context.entityIndex.set(key, entity);
    this.attachEntityToPlace(context, input.locatedAtId, entity.id);
    return entity;
  }

  private attachEntityToPlace(
    context: MapBuildContext,
    placeId: string,
    entityId: string,
  ): void {
    const place = context.nodes.find((node) => node.id === placeId);
    if (!place) {
      return;
    }

    const next = new Set(place.containsEntity ?? []);
    next.add(entityId);
    place.containsEntity = [...next];
  }

  private buildSummaryMarkdown(context: MapBuildContext): string {
    const routeSections = new Set(
      context.nodes
        .map((node) => node.routeSection)
        .filter((section): section is string => Boolean(section)),
    );

    const lines = [
      `# ${context.chapter} 地图建模摘要`,
      '',
      '## 来源',
      '',
      `- 书籍：${context.book}`,
      `- 章节：${context.chapter}`,
      `- 源文件：${context.sourceFile}`,
      '',
      '## 输出统计',
      '',
      `- 地点节点：${context.nodes.length}`,
      `- 空间关系边：${context.edges.length}`,
      `- 命名实体：${context.entities.length}`,
      `- 路线分段：${routeSections.size}`,
      '',
      '## 抽取规则',
      '',
      '- 经行路线：识别“又东三百里曰某山”“东南四百五十里曰某山”等句式。',
      '- 水流关系：识别“某水出焉，而南流注于某处”“某水出于其阴，北流至于某处”等句式。',
      '- 视域关系：识别“临于”“东望”“北望”“处于”等句式。',
      '- 命名实体：优先抽取“其名曰”“名曰”“其名”明确指称的草、木、兽、鸟、鱼与矿物。',
      '',
      '## 注意',
      '',
      '- 当前为规则建模结果，适合做地图草图、关系图和后续人工校订。',
      '- 原文异体字、造字描述与疑似异写均保留，不进行自动规范化。',
      '- 坐标未在本阶段直接生成，建议后续按 traverse 边独立推算。',
      '',
    ];

    return lines.join('\n');
  }
}
