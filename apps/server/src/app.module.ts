import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'node:path';
import { envValidationSchema } from './common/config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { RateLimitGuard } from './common/auth/rate-limit.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthModule } from './modules/auth/auth.module';
import { SystemModule } from './modules/system/system.module';
import { SiteModule } from './modules/site/site.module';
import { MediaModule } from './modules/media/media.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { ContentModule } from './modules/content/content.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { PageModule } from './modules/page/page.module';
import { MessageModule } from './modules/message/message.module';
import { PublicModule } from './modules/public/public.module';

const uploadRoot = () => resolve(process.env.UPLOAD_DIR || './storage/uploads');
const uploadPublicPath = () => ensureRoot(process.env.UPLOAD_PUBLIC_PATH || '/uploads');

/**
 * 上传目录以静态资源方式直出，避免走一遍鉴权与信封。
 * 用 forRootAsync 而不是 forRoot：模块文件求值时 ConfigModule 尚未加载 .env，
 * 直读 process.env 会拿不到 UPLOAD_DIR。
 */
const staticUploads = ServeStaticModule.forRootAsync({
  useFactory: () => [
    {
      rootPath: uploadRoot(),
      serveRoot: uploadPublicPath(),
      serveStaticOptions: { index: false, fallthrough: true, maxAge: '7d' },
    },
  ],
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      envFilePath: ['.env.local', '.env'],
    }),
    staticUploads,
    PrismaModule,
    AuditModule,
    AuthModule,
    SystemModule,
    SiteModule,
    MediaModule,
    TaxonomyModule,
    ContentModule,
    NavigationModule,
    PageModule,
    MessageModule,
    PublicModule,
  ],
  providers: [
    // 守卫按声明顺序执行：先认证，再鉴权，最后限流
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    // 拦截器：数组首位在最外层，信封必须最后包装，
    // 因此 Transform 在前、Audit 在后，Audit 才能读到未被包装的原始返回值（取 id 用）
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}

function ensureRoot(raw: string): string {
  const trimmed = raw.trim();
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash === '/' ? '/' : withSlash.replace(/\/+$/, '');
}
