import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { MapModelParseResult } from './book-map-model.types';

@Injectable()
export class BookMapModelOutputService {
  writeResult(
    outputDir: string,
    baseName: string,
    result: MapModelParseResult,
  ): void {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
      path.join(outputDir, `${baseName}.graph.json`),
      `${JSON.stringify(result.graph, null, 2)}\n`,
      'utf-8',
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}.entities.json`),
      `${JSON.stringify(result.entities, null, 2)}\n`,
      'utf-8',
    );
    fs.writeFileSync(
      path.join(outputDir, `${baseName}.map-model.md`),
      result.summaryMarkdown,
      'utf-8',
    );
  }
}