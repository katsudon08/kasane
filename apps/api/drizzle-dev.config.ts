import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const { error } = config({
	path: new URL(".env.local", import.meta.url),
	override: true,
});

if (error) {
	throw error;
}

export default defineConfig({
	out: "./drizzle",
	schema: "./src/infrastructure/db/schema.ts",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
