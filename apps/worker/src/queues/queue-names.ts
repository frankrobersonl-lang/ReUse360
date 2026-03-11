/** Centralized queue name constants shared between module registration and processor decorators. */
export const QUEUE_NAMES = {
  VIOLATION_DETECTION:   'violation-detection',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
  SR_SYNC:               'sr-sync',
} as const;
