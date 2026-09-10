import { fetchWithAuth } from "./fetchWithAuth";
import { getCookie } from "@/lib/CSRFTOKEN";
import { useAuthStore } from "@/lib/stores/auth-store";

jest.mock("@/lib/CSRFTOKEN", () => ({
  getCookie: jest.fn(),
}));

const mockedGetCookie = getCookie as jest.MockedFunction<typeof getCookie>;

describe("fetchWithAuth CSRF attach", () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    const okResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => ({ ok: true }),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValue(okResponse) as unknown as typeof fetch;
    mockedGetCookie.mockResolvedValue("csrf-token-123");
    // Reset singleton auth state used for token refresh paths
    useAuthStore.setState({ accessToken: null, refreshToken: null } as never);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("attaches X-CSRF-Token on POST requests", async () => {
    await fetchWithAuth("/api/v1/test", { method: "POST", body: "{}" });
    const [input, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(input)).toBe("/api/v1/test");
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token-123");
  });

  it("attaches X-CSRF-Token on DELETE requests", async () => {
    await fetchWithAuth("/api/v1/test", { method: "DELETE" });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token-123");
  });

  it("does not attach X-CSRF-Token on GET requests", async () => {
    await fetchWithAuth("/api/v1/test", { method: "GET" });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRF-Token")).toBeNull();
  });
});