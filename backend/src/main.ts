import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // CORS — 허용 도메인 환경변수로 관리 (콤마 구분)
  const corsOrigins = (config.get<string>('CORS_ORIGINS') || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const port = Number(config.get<string>('PORT') || 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ORK backend running on port ${port} (CORS: ${corsOrigins.join(', ')})`);
}

bootstrap();
