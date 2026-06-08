import { Module } from '@nestjs/common';
import { AppService } from '../service/app.service';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from 'src/config';
import { SearchService } from 'src/service/search.service';
import { AuthorService } from 'src/service/author.service';
import { ArticleService } from 'src/service/article.service';
import { GraphService } from 'src/service/graph.service';
import { CommandModule } from 'nestjs-command';
import { SyncService } from 'src/service/sync.sevice';
import { PromptsService } from 'src/service/ai/prompts.service';
import { AiCommand } from 'src/commands/ai.command';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyReportService } from 'src/service/dailyReport.service';
import { HackerNewsService } from 'src/service/hackerNews.service';
import { SpiderService } from 'src/service/spider/spider.service';
import { SpiderCommand } from 'src/commands/spider.command';
import { GitCommand } from 'src/commands/git.command';
import { GitService } from 'src/service/git.service';
import { RssService } from 'src/service/rss/rss.service';
import { AiToolService } from 'src/service/ai/aiTool.service';
import { BiliService } from 'src/service/bili/bili.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { WbgCommand } from 'src/commands/wbg.command';
import { WbgService } from 'src/service/wbg.service';
import { WbgApiService } from 'src/service/wbg-api.service';
import { BookSplitCommand } from 'src/commands/book-split.command';
import { BookSplitService } from 'src/service/book-split.service';

@Module({
  imports: [
    CommandModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        ...configService.get('es'),
      }),
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [
    AppService,
    SearchService,
    AuthorService,
    ArticleService,
    GraphService,
    AiCommand,
    SpiderCommand,
    GitCommand,
    SyncService,
    PromptsService,
    DailyReportService,
    HackerNewsService,
    SpiderService,
    RssService,
    GitService,
    AiToolService,
    BiliService,
    PrismaService,
    WbgApiService,
    WbgService,
    WbgCommand,
    BookSplitCommand,
    BookSplitService,
  ],
})
export class CliModule {}
