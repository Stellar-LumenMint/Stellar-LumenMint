import { mapCreatorErrorToCode } from "../creator-error-codes";

describe("mapCreatorErrorToCode", () => {
  it("maps validation errors", () => {
    expect(mapCreatorErrorToCode({ missingRequired: true }, "validation")).toBe("creator_validation_missing_required");
    expect(mapCreatorErrorToCode({ invalidLength: true }, "validation")).toBe("creator_validation_invalid_length");
    expect(mapCreatorErrorToCode({ invalidPrice: true }, "validation")).toBe("creator_validation_invalid_price");
    expect(mapCreatorErrorToCode({ missingMedia: true }, "validation")).toBe("creator_validation_missing_media");
    expect(mapCreatorErrorToCode({ missingCollection: true }, "validation")).toBe("creator_validation_missing_collection");
  });
  it("maps upload errors", () => {
    expect(mapCreatorErrorToCode({ timeout: true }, "upload")).toBe("creator_upload_timeout");
    expect(mapCreatorErrorToCode({}, "upload")).toBe("creator_upload_failed");
  });
  it("maps csrf and auth_guard", () => {
    expect(mapCreatorErrorToCode({}, "csrf")).toBe("creator_csrf_fetch_failed");
    expect(mapCreatorErrorToCode({}, "auth_guard")).toBe("creator_auth_required");
  });
  it("maps request and response", () => {
    expect(mapCreatorErrorToCode({ timeout: true }, "request")).toBe("creator_request_timeout");
    expect(mapCreatorErrorToCode({}, "request")).toBe("creator_api_rejected");
    expect(mapCreatorErrorToCode({ serverUnavailable: true }, "response")).toBe("creator_server_unavailable");
    expect(mapCreatorErrorToCode({}, "response")).toBe("creator_api_rejected");
  });
  it("maps redirect and unknown", () => {
    expect(mapCreatorErrorToCode({}, "redirect")).toBe("creator_redirect_failed");
    expect(mapCreatorErrorToCode({}, "other_stage")).toBe("creator_unknown_error");
  });
});
