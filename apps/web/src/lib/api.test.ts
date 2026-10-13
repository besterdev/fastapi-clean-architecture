import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, http, RequestError } from "./api";

const mock = new MockAdapter(http);
const user = { id: 1, email: "test@example.com" };

beforeEach(() => {
  mock.reset();
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe("API session handling", () => {
  it("shares one refresh for concurrent unauthorized requests", async () => {
    let release!: (value: [number, object]) => void;
    mock.onGet("users/profile").replyOnce(401);
    mock.onGet("users/profile").reply(200, user);
    mock.onGet("data/users").replyOnce(401);
    mock.onGet("data/users").reply(200, { data: [user] });
    mock.onPost("users/refresh-token").reply(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = Promise.all([api("users/profile"), api("data/users")]);
    await vi.waitFor(() => expect(mock.history.post).toHaveLength(1));
    release([200, user]);
    expect(await pending).toEqual([user, { data: [user] }]);
    expect(mock.history.post).toHaveLength(1);
  });

  it("does not refresh a failed login", async () => {
    mock
      .onPost("users/login")
      .reply(401, { message: "Invalid email or password" });
    await expect(api("users/login", {})).rejects.toThrow(
      "Invalid email or password",
    );
    expect(mock.history.post).toHaveLength(1);
  });

  it("ends the client session when refresh is revoked", async () => {
    mock.onGet("users/profile").reply(401);
    mock
      .onPost("users/refresh-token")
      .reply(401, { message: "Please sign in again" });
    await expect(api("users/profile")).rejects.toMatchObject({ status: 401 });
    expect(window.dispatchEvent).toHaveBeenCalledOnce();
    expect(mock.history.get).toHaveLength(1);
  });

  it("preserves a session on upstream outages and stops retry loops", async () => {
    mock.onGet("users/profile").reply(401);
    mock
      .onPost("users/refresh-token")
      .reply(502, { message: "Service unavailable" });
    await expect(api("users/profile")).rejects.toBeInstanceOf(RequestError);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
    mock.reset();
    mock.onGet("users/profile").reply(401);
    mock.onPost("users/refresh-token").reply(200, user);
    await expect(api("users/profile")).rejects.toMatchObject({ status: 401 });
    expect(mock.history.get).toHaveLength(2);
    expect(mock.history.post).toHaveLength(1);
  });
});
