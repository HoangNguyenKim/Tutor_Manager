import { Global, Module } from '@nestjs/common';
import { BACKEND_CONFIG, configProvider } from './config.provider';

@Global()
@Module({
  providers: [configProvider],
  exports: [BACKEND_CONFIG],
})
export class ConfigModule {}
