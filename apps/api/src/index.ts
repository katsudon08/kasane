import { createApp } from "./app";
import { db } from "./infrastructure/database/drizzle";

export const app = createApp({ db }).listen(3000);

export type App = typeof app;

console.log(`@kasane/api : ${app.server?.url.href}`);
