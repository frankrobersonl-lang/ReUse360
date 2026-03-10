/** Payload sent to Cityworks to create a Service Request */
export interface CityworksCreateSrRequest {
  ProblemSid:   number;
  Description:  string;
  Address:      string;
  CallerName?:  string;
  CallerPhone?: string;
  CustomFieldValues?: Record<string, string>;
}

/** Cityworks response after creating an SR */
export interface CityworksCreateSrResponse {
  RequestId:   number;
  RequestType: string;
  Status:      string;
  Description: string;
}

/** Cityworks response for SR status check */
export interface CityworksSrStatusResponse {
  RequestId:   number;
  Status:      string;  // "OPEN" | "IN_PROGRESS" | "CLOSED" | "CANCELLED"
  DateClosed?: string;  // ISO 8601
  Resolution?: string;
}

/** Internal result of SR creation */
export interface SrCreateResult {
  violationId:  string;
  cityworksSrId: string;
  success:      boolean;
  error?:       string;
}

/** Internal result of the SR sync cycle */
export interface SrSyncResult {
  created:  number;
  synced:   number;
  resolved: number;
  errors:   string[];
}
