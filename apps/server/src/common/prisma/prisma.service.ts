import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // 只输出 warn / error，正常运行不刷日志；用 stdout 而非 event，避开未注册 $on 监听器的运行期告警
      log: [
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    // 仅 SQLite 需要 PRAGMA；迁移到 MySQL/PG 时按 provider 跳过
    if (this.isSqlite()) {
      const mode = await this.applyPragmas();
      this.logger.log(`SQLite PRAGMA 已应用 (journal_mode=${mode ?? 'n/a'} / busy_timeout=5000 / foreign_keys=ON)`);
    }
  }

  /**
   * journal_mode / busy_timeout 这类 PRAGMA 会回一行结果，
   * 用 $executeRawUnsafe 会被 Prisma 拒收（P2010: Execute returned results），
   * 因此统一走 $queryRawUnsafe，只从 journal_mode 的返回值里取实际生效的模式。
   */
  private async applyPragmas(): Promise<string | undefined> {
    const rows: Record<string, unknown>[] = await this.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await this.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
    await this.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
    const first = rows?.[0];
    const value = first ? Object.values(first)[0] : undefined;
    return typeof value === 'string' ? value : undefined;
  }

  private isSqlite(): boolean {
    const url = process.env.DATABASE_URL || '';
    return url.startsWith('file:') || url.startsWith('sqlite:');
  }
}
