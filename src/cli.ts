import { CommandFactory } from 'nest-commander';
import { CliModule } from './modules/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliModule, {
    errorHandler: (err) => {
      console.error(err);
      process.exit(1);
    },
  });
}

bootstrap();
