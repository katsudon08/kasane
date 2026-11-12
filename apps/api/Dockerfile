# APIのイメージ（Railwayで1台だけ動かす。docs/deploy.md）
# ビルドの文脈はリポジトリのルート。apps/apiは@kasane/coreをworkspaceで使うため
# Node・pnpm・Bunの版は、mise.tomlとpackage.jsonのpackageManagerに合わせる

# 依存を入れる。pnpmはNodeで動くので、Nodeのイメージで入れる
FROM node:26.10.0-slim AS deps
WORKDIR /app
RUN npm install --global pnpm@12.9.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
# APIとAPIが使うworkspaceのパッケージの、実行に要る依存だけを入れる（drizzle-kitなどの開発用は入れない）
RUN pnpm install --frozen-lockfile --prod --filter "@kasane/api..."
COPY apps/api apps/api
COPY packages/core packages/core

# 動かす。pnpmのnode_modulesは相対のシンボリックリンクなので、/appごと写せばそのまま動く
FROM oven/bun:1.4.2-slim
ENV NODE_ENV=production
COPY --from=deps /app /app
WORKDIR /app/apps/api
USER bun
CMD ["bun", "run", "src/index.ts"]
