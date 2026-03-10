import { Controller, Get } from '@nestjs/common';
import { PrismaService }   from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const checks: Record<string, string> = { status: 'ok' };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = 'connected';
    } catch {
      checks.db = 'disconnected';
      checks.status = 'degraded';
    }

    return { ...checks, ts: new Date().toISOString() };
  }
}
