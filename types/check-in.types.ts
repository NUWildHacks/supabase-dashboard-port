import type { ActionResult } from "./action-result.types";
import type { BaseModel } from "./base-model.types";
import type { DietaryRestriction, Role } from "./user.types";

export type QRCodeScanPayload = {
  user_id: string;
  full_name?: string;
  email?: string;
  role?: Role;
  issued_at?: number;
  sig?: string;
};

export type EventCheckIn = BaseModel & {
  event_id: string;
  user_id: string;
  checked_in_at: number;
  checked_in_by: string;
  scan_payload: QRCodeScanPayload;
};

export type CheckInActionResponse = ActionResult & {
  check_in?: EventCheckIn;
  already_checked_in?: boolean;
  dietary_restrictions?: DietaryRestriction[];
  requires_wildhacks_check_in?: boolean;
};

export type GetEventCheckInsActionResponse = ActionResult & {
  check_ins?: EventCheckIn[];
};
