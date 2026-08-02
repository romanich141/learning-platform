import { describe, expect, test } from "vitest";
import { getUserWithRetry } from "./getUserWithRetry.js";
import { server } from "../../mocks/server.js";
import { http, HttpResponse } from "msw";

describe("getUser", () => {
  test("return correct data after all attempts of reties", async () => {
    server.use(
      http.get(
        "https://api.example.com/users/:id",
        () => {
          return HttpResponse.json({ message: "Server Error" }, { status: 500 });
        },
        {
          once: true,
        },
      ),
      http.get(
        "https://api.example.com/users/:id",
        () => {
          return HttpResponse.json({ message: "Server Error" }, { status: 500 });
        },
        {
          once: true,
        },
      ),
    );

    const user = await getUserWithRetry(1, 3, 100);

    expect(user).toStrictEqual({
      id: "1",
      name: "John Doe",
    });
  });

  test("throw an error while all attenpts were rejected", async () => {
    server.use(
      http.get("https://api.example.com/users/:id", () => {
        return HttpResponse.json({ message: "Server Error" }, { status: 500 });
      }),
    );

    await expect(getUserWithRetry(1, 3, 100)).rejects.toThrow("Failed to fetch");
  });
});
