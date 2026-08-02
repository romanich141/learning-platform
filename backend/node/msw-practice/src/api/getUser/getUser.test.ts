import { describe, expect, test } from "vitest";
import { getUser } from "./getUser.js";
import { server } from "../../mocks/server.js";
import { delay, http, HttpResponse } from "msw";

describe("getUser", () => {
  test("return correct user", async () => {
    const user = await getUser(1);

    expect(user).toStrictEqual({
      id: "1",
      name: "John Doe",
    });
  });

  test("fetch user error", async () => {
    server.use(
      http.get("https://api.example.com/users/:id", () => {
        return HttpResponse.json({ message: "Not Found" }, { status: 404 });
      }),
    );

    await expect(getUser(1)).rejects.toThrow("Failed to fetch user");
  });

  test("network error", async () => {
    server.use(
      http.get("https://api.example.com/users/:id", () => {
        return HttpResponse.error();
      }),
    );

    await expect(getUser(1)).rejects.toThrow("Failed to fetch");
  });

  test("delay", async () => {
    server.use(
      http.get("https://api.example.com/users/:id", async () => {
        return HttpResponse.json({ id: "1", name: "John Doe" });
      }),
    );

    const user = await getUser(1);

    expect(user).toStrictEqual({
      id: "1",
      name: "John Doe",
    });
  });
});
