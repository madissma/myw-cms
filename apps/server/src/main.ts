import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { corsOrigins } from './common/config/env.validation';
import { tracer } from './common/middleware/tracer.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  const prefix = config.get<string>('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(prefix);

  // traceId 必须最先注入：信封、审计、异常过滤都从 req.traceId 取值
  app.use(tracer);

  // 纯 API 服务，CSP 对 JSON 无意义且会挡掉 Swagger UI 的内联脚本
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
    exposedHeaders: ['x-trace-id', 'ETag'],
  });
  // 部署在 nginx 之后时，clientIp 依赖 X-Forwarded-For
  app.set('trust proxy', true);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableShutdownHooks();

  setupSwagger(app, prefix, logger);

  const port = Number(config.get<string>('PORT')) || 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`森芝宝 CMS 服务已启动: http://localhost:${port}/${prefix}`);
}

/** 生产默认关闭；确需开放时显式设 SWAGGER_ENABLED=true */
function setupSwagger(app: NestExpressApplication, prefix: string, logger: Logger) {
  const isProd = process.env.NODE_ENV === 'production';
  const enabled = process.env.SWAGGER_ENABLED ? process.env.SWAGGER_ENABLED === 'true' : !isProd;
  if (!enabled) return;

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('森芝宝官网 CMS API')
      .setDescription('前台只读（/public）与后台维护（/admin）接口')
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
    customSiteTitle: '森芝宝 CMS 接口文档',
  });
  logger.log(`接口文档: http://localhost:${process.env.PORT || 3001}/api/docs (前缀 /${prefix})`);
}

void bootstrap();
