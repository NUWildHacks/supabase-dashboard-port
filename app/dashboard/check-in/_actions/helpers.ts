import { ADMIN, DASHBOARD_CHECK_IN_PATH, JUDGE, LOGIN_PATH, JUDGE_AND_MENTOR, PARTICIPANT } from "@/constants";
import type { QRCodeScanPayload, User } from "@/types";

export const WILDHACKS_EVENT_ID = "wildhacks-2026" as const;

type ParsedScanPayloadResult = { success: true; payload: QRCodeScanPayload } | { success: false; error: string };

export const getCheckInRedirectPath = (): string => {
  return `${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_CHECK_IN_PATH)}`;
};

export const isAllowedScannableRole = (role: User["role"]): boolean => {
  return role === PARTICIPANT || role === JUDGE || role === JUDGE_AND_MENTOR;
};

export const parseScanPayload = (scanPayload: QRCodeScanPayload | string): ParsedScanPayloadResult => {
  let normalizedPayload: QRCodeScanPayload;

  if (typeof scanPayload === "string") {
    const rawPayload = scanPayload.trim();

    if (!rawPayload) {
      return { success: false, error: "QR code payload is empty" };
    }

    try {
      const parsedPayload = JSON.parse(rawPayload);

      if (parsedPayload && typeof parsedPayload === "object" && "user_id" in parsedPayload) {
        normalizedPayload = {
          user_id: typeof parsedPayload.user_id === "string" ? parsedPayload.user_id.trim() : "",
          full_name: typeof parsedPayload.full_name === "string" ? parsedPayload.full_name.trim() : undefined,
          email: typeof parsedPayload.email === "string" ? parsedPayload.email.trim() : undefined,
          role: typeof parsedPayload.role === "string" ? (parsedPayload.role as User["role"]) : undefined,
          issued_at: typeof parsedPayload.issued_at === "number" ? parsedPayload.issued_at : undefined,
          sig: typeof parsedPayload.sig === "string" ? parsedPayload.sig : undefined,
        };
      } else {
        normalizedPayload = { user_id: rawPayload };
      }
    } catch {
      normalizedPayload = { user_id: rawPayload };
    }
  } else {
    normalizedPayload = {
      ...scanPayload,
      user_id: scanPayload.user_id?.trim(),
      full_name: scanPayload.full_name?.trim(),
      email: scanPayload.email?.trim(),
    };
  }

  if (!normalizedPayload.user_id) {
    return { success: false, error: "QR code payload must include a valid user_id" };
  }

  if (
    normalizedPayload.role &&
    normalizedPayload.role !== PARTICIPANT &&
    normalizedPayload.role !== JUDGE &&
    normalizedPayload.role !== JUDGE_AND_MENTOR &&
    normalizedPayload.role !== ADMIN
  ) {
    return { success: false, error: "QR code payload contains an invalid role" };
  }

  return { success: true, payload: normalizedPayload };
};
