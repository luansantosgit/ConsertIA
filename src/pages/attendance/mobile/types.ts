import type { AttendanceModalsState } from '../useAttendanceModals';

/** Config único para os componentes do layout mobile (regra: config object em vez de N props). */
export interface MobileLayoutConfig {
  m: AttendanceModalsState;
}

export interface MobileListConfig {
  m: AttendanceModalsState;
}
