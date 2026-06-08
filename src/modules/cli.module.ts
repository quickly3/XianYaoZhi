import { Module } from '@nestjs/common';
import { AiCommand } from 'src/commands/ai.command';
import { BookSplitCommand } from 'src/commands/book-split.command';
import { AppService } from 'src/controller/app.service';
import { BookSplitService } from 'src/service/book-split.service';
import { CommandModule } from 'nestjs-command';

@Module({
  imports: [CommandModule],
  controllers: [],
  providers: [AppService, AiCommand, BookSplitCommand, BookSplitService],
})
export class CliModule {}
