import { Module } from '@nestjs/common';
import { AiCommand } from 'src/commands/ai.command';
import { BookProcessCommand } from 'src/commands/book-process.command';
import { ExtractEntitiesCommand } from 'src/commands/extract-entities.command';
import { AppService } from 'src/controller/app.service';
import { BookMapModelOutputService } from 'src/service/book-map-model-output.service';
import { BookMapModelParserService } from 'src/service/book-map-model-parser.service';
import { BookMapModelService } from 'src/service/book-map-model.service';
import { BookSplitService } from 'src/service/book-split.service';
import { ExtractEntitiesService } from 'src/service/book/extract-entities.service';
import { FindEntityOriginService } from 'src/service/book/find-entity-origin.service';
import { PrismaService } from 'src/service/prisma.service';
import { CommandModule } from 'nestjs-command';
import configuration from 'src/config';
import { ConfigModule } from '@nestjs/config';
import { DeepSeekService } from 'src/service/ai/deepseek.service';
import { LogService } from 'src/service/logger.service';

@Module({
  imports: [
    CommandModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
  ],
  controllers: [],
  providers: [
    AppService,
    AiCommand,
    BookProcessCommand,
    ExtractEntitiesCommand,
    BookSplitService,
    BookMapModelParserService,
    BookMapModelOutputService,
    BookMapModelService,
    ExtractEntitiesService,
    FindEntityOriginService,
    DeepSeekService,
    PrismaService,
    LogService,
  ],
})
export class CliModule {}
