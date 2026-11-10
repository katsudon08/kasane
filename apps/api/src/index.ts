import { createApp } from "./app";
import { db } from "./infrastructure/database/drizzle";

export const app = createApp({ db })
	.ws("/ws", {
		message(ws, message) {
			ws.send(message);
		},
	})
	.listen(3000);

export type App = typeof app;

console.log(`@kasane/api : ${app.server?.url.href}`);
