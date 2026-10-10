import type { CharacterId } from "./characters";

export type AppMode = "demo" | "live";
export type QuotaLimitReason = "session" | "ip" | "monthly" | null;
export interface QuotaSnapshot {
  remaining: number;
  sessionRemaining: number;
  ipRemaining: number;
  monthlyRemaining: number;
  resetAt: string;
  period: string;
  limitReason: QuotaLimitReason;
}
export interface SessionResponse { mode: AppMode; quota: QuotaSnapshot }
export interface ConvertRequest { characterId: CharacterId; text: string }
export interface ConvertResponse { result: string; quota: QuotaSnapshot; mode: AppMode }
export type ApiErrorCode =
  | "INVALID_INPUT" | "INVALID_SESSION" | "INVALID_ORIGIN" | "BOT_BLOCKED"
  | "INVALID_REQUEST_ID" | "DUPLICATE_REQUEST" | "QUOTA_EXCEEDED"
  | "SERVICE_UNAVAILABLE" | "MODEL_UNAVAILABLE";
export interface ApiErrorResponse {
  error: { code: ApiErrorCode; message: string };
  quota?: QuotaSnapshot;
}
