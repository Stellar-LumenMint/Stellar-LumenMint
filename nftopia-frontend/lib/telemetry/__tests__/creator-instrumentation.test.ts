import {
  emitCollectionCreateSubmitted,
  emitCollectionCreateSucceeded,
  emitCollectionCreateFailed,
  emitMintNFTSubmitted,
  emitMintNFTSucceeded,
  emitMintNFTFailed,
} from "../creator-instrumentation";

describe("creator-instrumentation", () => {
  beforeEach(() => {
    jest.spyOn(require("../index").telemetry, "track").mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("correlates attempt_id and latency for collection create", () => {
    const { attempt_id, startMs } = emitCollectionCreateSubmitted({ surface: "creator_dashboard", has_banner_image: true, field_count: 5 });
    emitCollectionCreateSucceeded({ attempt_id, startMs, upload_used: true, redirect_target: "creator_dashboard_collections" });
    expect(require("../index").telemetry.track).toHaveBeenCalledWith(
      "collection_create_submitted",
      expect.objectContaining({ attempt_id, surface: "creator_dashboard", has_banner_image: true, field_count: 5 })
    );
    expect(require("../index").telemetry.track).toHaveBeenCalledWith(
      "collection_create_succeeded",
      expect.objectContaining({ attempt_id, upload_used: true, redirect_target: "creator_dashboard_collections" })
    );
  });

  it("emits collection_create_failed with error code and stage", () => {
    const { attempt_id, startMs } = emitCollectionCreateSubmitted({ surface: "creator_dashboard", has_banner_image: false, field_count: 3 });
    emitCollectionCreateFailed({ attempt_id, startMs, error: { missingRequired: true }, failure_stage: "validation", validation_error_count: 2 });
    expect(require("../index").telemetry.track).toHaveBeenCalledWith(
      "collection_create_failed",
      expect.objectContaining({ attempt_id, error_code: "creator_validation_missing_required", failure_stage: "validation", validation_error_count: 2 })
    );
  });

  it("correlates attempt_id and latency for mint NFT", () => {
    const { attempt_id, startMs } = emitMintNFTSubmitted({ surface: "creator_dashboard", has_media: true, selected_collection: true, price_currency: "STK" });
    emitMintNFTSucceeded({ attempt_id, startMs, upload_used: false, redirect_target: "collections" });
    expect(require("../index").telemetry.track).toHaveBeenCalledWith(
      "mint_nft_submitted",
      expect.objectContaining({ attempt_id, surface: "creator_dashboard", has_media: true, selected_collection: true, price_currency: "STK" })
    );
    expect(require("../index").telemetry.track).toHaveBeenCalledWith(
      "mint_nft_succeeded",
      expect.objectContaining({ attempt_id, upload_used: false, redirect_target: "collections" })
    );
  });

  it("emits mint_nft_failed with error code and stage", () => {
    const { attempt_id, startMs } = emitMintNFTSubmitted({ surface: "creator_dashboard", has_media: false, selected_collection: false, price_currency: "unknown" });
    emitMintNFTFailed({ attempt_id, startMs, error: { missingCollection: true }, failure_stage: "validation", validation_error_count: 1 });
    expect(require("../index").telemetry.track).toHaveBeenCalledWith(
      "mint_nft_failed",
      expect.objectContaining({ attempt_id, error_code: "creator_validation_missing_collection", failure_stage: "validation", validation_error_count: 1 })
    );
  });
});
