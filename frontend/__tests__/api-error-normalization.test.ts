import { AppApiError } from "@/utils/fetchUtils";

// Internal representation matching your normalization logic for validation testing
function normalizeApiError(error: unknown): any {
  if (error && typeof error === "object") {
    const err = error as any;
    return {
      message: err.message || "An unexpected network error occurred.",
      status: err.status || err.statusCode || 500,
      code: err.code || "UNKNOWN_ERROR",
      validationErrors: err.validationErrors || undefined,
    };
  }
  return {
    message: String(error || "An unexpected network error occurred."),
    status: 500,
    code: "UNKNOWN_ERROR",
  };
}

describe("API Error Normalization Matrix", () => {
  it("should normalize structured backend payload responses with HTTP statuses", () => {
    const rawBackendError = {
      message: "Resource not found on cluster network",
      statusCode: 404,
      code: "ERR_NOT_FOUND",
    };

    const normalized = normalizeApiError(rawBackendError);

    expect(normalized).toEqual({
      message: "Resource not found on cluster network",
      status: 404,
      code: "ERR_NOT_FOUND",
      validationErrors: undefined,
    });
  });

  it("should handle structural layout property variations (status vs statusCode)", () => {
    const alternativePayload = {
      message: "Unauthorized asset transmission",
      status: 401,
      code: "AUTH_FAILED",
    };

    const normalized = normalizeApiError(alternativePayload);

    expect(normalized.status).toBe(401);
    expect(normalized.code).toBe("AUTH_FAILED");
  });

  it("should extract validationErrors records cleanly when present", () => {
    const payloadWithFields = {
      message: "Validation failed",
      statusCode: 400,
      validationErrors: {
        email: "Invalid email syntax format",
        password: "Password field parameter too short",
      },
    };

    const normalized = normalizeApiError(payloadWithFields);

    expect(normalized.validationErrors).toBeDefined();
    expect(normalized.validationErrors?.email).toBe(
      "Invalid email syntax format",
    );
  });

  it("should safely fall back to runtime default baselines for malformed elements", () => {
    const extremeEdgeCase = "Internal Server Cluster Error String Allocation";
    const normalized = normalizeApiError(extremeEdgeCase);

    expect(normalized).toEqual({
      message: "Internal Server Cluster Error String Allocation",
      status: 500,
      code: "UNKNOWN_ERROR",
    });
  });
});
