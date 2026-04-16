import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AlimtalkModule } from './alimtalk/alimtalk.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AlimtalkModule,
  ],
})
export class AppModule {}
