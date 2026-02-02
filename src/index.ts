import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { getEnv } from "./utils/env";
import { createManifestRoute } from "./routes/manifest";
import { createDownloadRoute } from "./routes/download";

const app = new Hono();
const env = getEnv();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.use(
  "*",
  basicAuth({
    username: env.AUTH_USERNAME,
    password: env.AUTH_PASSWORD,
  }),
);

app.route("/download", createDownloadRoute(env));
app.route("/", createManifestRoute(env));

export default {
  port: env.PORT,
  fetch: app.fetch,
};
