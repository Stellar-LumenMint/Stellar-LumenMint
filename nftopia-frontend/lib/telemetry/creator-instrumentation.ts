// Creator flow instrumentation helpers for collection, mint, and listing
import { telemetry } from "./index";
import { sanitizeTelemetryPayload } from "./sanitizer";
import { mapCreatorErrorToCode, CreatorFailureStage, CreatorErrorCode } from "./creator-error-codes";

function genAttemptId() {
  return `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowMs() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

// --- Collection Creation ---
export function emitCollectionCreateSubmitted({ surface, has_banner_image, field_count }: { surface: string; has_banner_image: boolean; field_count: number }) {
  const attempt_id = genAttemptId();
  telemetry.track("collection_create_submitted", sanitizeTelemetryPayload({ attempt_id, surface, has_banner_image, field_count, timestamp: Date.now() }));
  return { attempt_id, startMs: nowMs() };
}

export function emitCollectionCreateSucceeded({ attempt_id, startMs, upload_used, redirect_target }: { attempt_id: string; startMs: number; upload_used: boolean; redirect_target: string }) {
  const latency_ms = Math.round(nowMs() - startMs);
  telemetry.track("collection_create_succeeded", sanitizeTelemetryPayload({ attempt_id, latency_ms, upload_used, redirect_target, timestamp: Date.now() }));
}

export function emitCollectionCreateFailed({ attempt_id, startMs, error, failure_stage, validation_error_count }: { attempt_id: string; startMs: number; error: any; failure_stage: CreatorFailureStage; validation_error_count?: number }) {
  const latency_ms = Math.round(nowMs() - startMs);
  const error_code = mapCreatorErrorToCode(error, failure_stage);
  telemetry.track("collection_create_failed", sanitizeTelemetryPayload({ attempt_id, latency_ms, error_code, failure_stage, validation_error_count, timestamp: Date.now() }));
}

// --- Mint NFT ---
export function emitMintNFTSubmitted({ surface, has_media, selected_collection, price_currency }: { surface: string; has_media: boolean; selected_collection: boolean; price_currency: string }) {
  const attempt_id = genAttemptId();
  telemetry.track("mint_nft_submitted", sanitizeTelemetryPayload({ attempt_id, surface, has_media, selected_collection, price_currency, timestamp: Date.now() }));
  return { attempt_id, startMs: nowMs() };
}

export function emitMintNFTSucceeded({ attempt_id, startMs, upload_used, redirect_target }: { attempt_id: string; startMs: number; upload_used: boolean; redirect_target: string }) {
  const latency_ms = Math.round(nowMs() - startMs);
  telemetry.track("mint_nft_succeeded", sanitizeTelemetryPayload({ attempt_id, latency_ms, upload_used, redirect_target, timestamp: Date.now() }));
}

export function emitMintNFTFailed({ attempt_id, startMs, error, failure_stage, validation_error_count }: { attempt_id: string; startMs: number; error: any; failure_stage: CreatorFailureStage; validation_error_count?: number }) {
  const latency_ms = Math.round(nowMs() - startMs);
  const error_code = mapCreatorErrorToCode(error, failure_stage);
  telemetry.track("mint_nft_failed", sanitizeTelemetryPayload({ attempt_id, latency_ms, error_code, failure_stage, validation_error_count, timestamp: Date.now() }));
}

// --- Listing Creation (No-op if not implemented) ---
export function emitListingCreateSubmitted() {
  // No-op: Listing creation UI not yet implemented. Add integration here when available.
}
export function emitListingCreateSucceeded() {
  // No-op: Listing creation UI not yet implemented. Add integration here when available.
}
export function emitListingCreateFailed() {
  // No-op: Listing creation UI not yet implemented. Add integration here when available.
}
