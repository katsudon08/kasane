/*
 * テストの前に一度だけ、テスト用DBにマイグレーションを当てる（bunfig.tomlの[test].preload）
 * `drizzle-kit push`ではなくマイグレーションを当てるので、スキーマを変えて`drizzle-kit generate`を忘れるとテストが落ちる
 */
import { join } from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { env } from "../../config/env";

const pool = new Pool({ connectionString: env.DATABASE_URL });

await migrate(drizzle({ client: pool }), {
	migrationsFolder: join(import.meta.dir, "migrations"),
});

await pool.end();
