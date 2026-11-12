/*
 * トークンの発行とハッシュ（仕様書backend.mdの「トークン」）
 */
import { createHash, randomBytes } from "node:crypto";

// 32バイトの暗号学的な乱数をbase64urlにした文字列（43文字）。DBのIDや連番はトークンにしない
export const generateToken = (): string => randomBytes(32).toString("base64url");

// DBに保存して照合に使うSHA-256（16進の64文字）。トークンは推測できない乱数なので、ソルトも遅いハッシュも使わない
export const hashToken = (token: string): string =>
	createHash("sha256").update(token).digest("hex");
