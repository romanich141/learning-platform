import { http, HttpResponse } from "msw";

const getUserHandler = http.get("https://api.example.com/users/:id", () => {
  return HttpResponse.json({ id: "1", name: "John Doe" });
});

export const handlers = [getUserHandler];
