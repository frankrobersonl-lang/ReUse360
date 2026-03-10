import { Injectable, Logger } from '@nestjs/common';
import type {
  CityworksCreateSrRequest,
  CityworksCreateSrResponse,
  CityworksSrStatusResponse,
  SrCreateResult,
} from './cityworks.types';

@Injectable()
export class CityworksService {
  private readonly logger = new Logger(CityworksService.name);
  private readonly isTestMode: boolean;
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private token: string | null = null;

  /** Cityworks ProblemSid for water conservation violations */
  private static readonly PROBLEM_SID = 1001;

  constructor() {
    this.isTestMode = process.env.CITYWORKS_TEST_MODE === 'true';
    this.baseUrl    = process.env.CITYWORKS_BASE_URL ?? '';
    this.username   = process.env.CITYWORKS_USERNAME ?? '';
    this.password   = process.env.CITYWORKS_PASSWORD ?? '';
  }

  // ── SR Creation ────────────────────────────────────────────────

  async createServiceRequest(violation: {
    id: string;
    caseNumber: string | null;
    violationType: string;
    wateringDay: string | null;
    wateringZone: string | null;
    ordinanceRef: string | null;
    account: { serviceAddress: string; firstName: string | null; lastName: string | null } | null;
  }): Promise<SrCreateResult> {
    if (this.isTestMode) {
      return this.mockCreateSr(violation);
    }
    return this.liveCreateSr(violation);
  }

  private async mockCreateSr(violation: {
    id: string;
    caseNumber: string | null;
    account: { serviceAddress: string } | null;
  }): Promise<SrCreateResult> {
    const mockSrId = `SR-${Date.now()}`;
    this.logger.warn(
      `CITYWORKS_TEST_MODE=true — mock SR ${mockSrId} for violation ${violation.caseNumber ?? violation.id}`,
    );
    return {
      violationId:   violation.id,
      cityworksSrId: mockSrId,
      success:       true,
    };
  }

  private async liveCreateSr(violation: {
    id: string;
    caseNumber: string | null;
    violationType: string;
    wateringDay: string | null;
    wateringZone: string | null;
    ordinanceRef: string | null;
    account: { serviceAddress: string; firstName: string | null; lastName: string | null } | null;
  }): Promise<SrCreateResult> {
    await this.ensureAuthenticated();

    const description = [
      `ReUse360 Violation: ${violation.caseNumber ?? violation.id}`,
      `Type: ${violation.violationType}`,
      violation.wateringDay ? `Watering Day: ${violation.wateringDay}` : null,
      violation.wateringZone ? `Zone: ${violation.wateringZone}` : null,
      violation.ordinanceRef ? `Ordinance: ${violation.ordinanceRef}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const payload: CityworksCreateSrRequest = {
      ProblemSid:  CityworksService.PROBLEM_SID,
      Description: description,
      Address:     violation.account?.serviceAddress ?? 'Unknown',
    };

    if (violation.account?.firstName || violation.account?.lastName) {
      payload.CallerName = [violation.account.firstName, violation.account.lastName]
        .filter(Boolean)
        .join(' ');
    }

    payload.CustomFieldValues = {
      CASE_NUMBER:    violation.caseNumber ?? '',
      VIOLATION_TYPE: violation.violationType,
    };

    const res = await fetch(`${this.baseUrl}/Services/AMS/ServiceRequest/Create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.token}`,
      },
      body: JSON.stringify({ data: payload }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const error = `Cityworks SR Create ${res.status}: ${text.slice(0, 200)}`;
      return { violationId: violation.id, cityworksSrId: '', success: false, error };
    }

    const body = (await res.json()) as { Value: CityworksCreateSrResponse };
    const srId = String(body.Value.RequestId);

    this.logger.log(
      `Created Cityworks SR ${srId} for violation ${violation.caseNumber ?? violation.id}`,
    );

    return { violationId: violation.id, cityworksSrId: srId, success: true };
  }

  // ── SR Status Check ────────────────────────────────────────────

  async getSrStatus(srId: string): Promise<CityworksSrStatusResponse> {
    if (this.isTestMode) {
      return this.mockGetSrStatus(srId);
    }
    return this.liveGetSrStatus(srId);
  }

  private mockGetSrStatus(srId: string): CityworksSrStatusResponse {
    // In test mode, randomly mark ~20% of SRs as closed to simulate resolution
    const isClosed = Math.random() < 0.2;
    this.logger.warn(`CITYWORKS_TEST_MODE=true — mock status for SR ${srId}: ${isClosed ? 'CLOSED' : 'OPEN'}`);
    return {
      RequestId:  parseInt(srId.replace('SR-', '')) || 0,
      Status:     isClosed ? 'CLOSED' : 'OPEN',
      DateClosed: isClosed ? new Date().toISOString() : undefined,
      Resolution: isClosed ? 'Resolved via ReUse360' : undefined,
    };
  }

  private async liveGetSrStatus(srId: string): Promise<CityworksSrStatusResponse> {
    await this.ensureAuthenticated();

    const res = await fetch(
      `${this.baseUrl}/Services/AMS/ServiceRequest/ByIds`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.token}`,
        },
        body: JSON.stringify({ data: { RequestIds: [parseInt(srId)] } }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cityworks SR Status ${res.status}: ${text.slice(0, 200)}`);
    }

    const body = (await res.json()) as { Value: CityworksSrStatusResponse[] };
    if (!body.Value || body.Value.length === 0) {
      throw new Error(`Cityworks SR ${srId} not found`);
    }

    return body.Value[0];
  }

  // ── Authentication ─────────────────────────────────────────────

  private async ensureAuthenticated(): Promise<void> {
    if (this.token) return;

    if (!this.baseUrl || !this.username || !this.password) {
      throw new Error(
        'CITYWORKS_BASE_URL, CITYWORKS_USERNAME, and CITYWORKS_PASSWORD are required when CITYWORKS_TEST_MODE is not true',
      );
    }

    const res = await fetch(`${this.baseUrl}/Services/Authentication/Authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { LoginName: this.username, Password: this.password },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cityworks auth failed ${res.status}: ${text.slice(0, 200)}`);
    }

    const body = (await res.json()) as { Value: string };
    this.token = body.Value;
    this.logger.log('Authenticated with Cityworks');
  }
}
