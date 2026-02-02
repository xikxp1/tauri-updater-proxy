import { Hono } from "hono";
import { getEnv } from "./utils/env";

const app = new Hono();
const env = getEnv();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

export default {
  port: env.PORT,
  fetch: app.fetch,
};
