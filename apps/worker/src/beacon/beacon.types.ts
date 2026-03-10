/** Raw Beacon AMI API response for a meter read */
export interface BeaconMeterReadResponse {
  endpointId:   string;
  meterId:      string;
  accountId:    string;
  readTime:     string; // ISO 8601
  readValue:    number;
  flow?:        number;
  flowUnit?:    string;
  flowTime?:    string; // ISO 8601
  label?:       string; // "potable" | "reclaimed"
  resolution?:  string; // "15min" | "hourly" | "daily"
}

/** Beacon API range-read request params */
export interface BeaconReadRequest {
  accountIds: string[];
  since:      Date;
  until:      Date;
}

/** Normalized meter read ready for DB persistence */
export interface NormalizedMeterRead {
  accountId:  string;
  meterId:    string;
  readValue:  number;
  readTime:   Date;
  flow:       number | null;
  flowUnit:   string;
  flowTime:   Date | null;
  label:      string | null;
  resolution: string;
}

/** Result of a Beacon fetch + persist cycle */
export interface BeaconFetchResult {
  accountsPolled: number;
  readsIngested:  number;
  errors:         string[];
}
