import { Module } from '@nestjs/common';
import { AiCommand } from 'src/commands/ai.command';
import { BookProcessCommand } from 'src/commands/book-process.command';
import { AppService } from 'src/controller/app.service';
import { BookSplitService } from 'src/service/book-split.service';
import { CommandModule } from 'nestjs-command';

@Module({
  imports: [CommandModule],
  controllers: [],
  providers: [AppService, AiCommand, BookProcessCommand, BookSplitService],
})
export class CliModule {}
