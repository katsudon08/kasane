/*
 * マイグレーションの検査（仕様書plan.mdの「機械的なゲート」のスキーマ検証）
 */
import { describe, expect, it } from "bun:test";
import { join } from "node:path";

const API_ROOT = join(import.meta.dir, "../../..");

describe("マイグレーション", () => {
	it("drizzle-kit checkが通る", async () => {
		const child = Bun.spawn(
			["pnpm", "exec", "drizzle-kit", "check", "--config=drizzle-test.config.ts"],
			{ cwd: API_ROOT, stdout: "ignore", stderr: "ignore" },
		);

		expect(await child.exited).toBe(0);
	}, 60_000);
});
