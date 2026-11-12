import { createApp } from "./app";
import { env } from "./config/env";
import { db } from "./infrastructure/database/drizzle";

export const app = createApp({ db }).listen(env.PORT);

export type App = typeof app;

console.log(`@kasane/api : ${app.server?.url.href}`);
