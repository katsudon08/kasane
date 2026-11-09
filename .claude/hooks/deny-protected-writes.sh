#!/usr/bin/env bash
# Claude Codeのフック（PreToolUse）。テストと設計書への書き込みを拒否する
# 対象: **/*.test.ts・**/*.test.tsx・e2e/**・docs/specs/**（docs/specs/single/plan.md「ごまかし防止」）
# テストと設計書を変えるのは人だけ。拒否するときは終了コード2で、理由を標準エラーに出す
set -euo pipefail

input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

is_protected() {
	local path="$1"
	path="${path#"$root"/}"
	case "$path" in
	e2e/* | */e2e/* | docs/specs/* | *.test.ts | *.test.tsx) return 0 ;;
	esac
	return 1
}

deny() {
	echo "テスト（**/*.test.ts・e2e/**）と設計書（docs/specs/**）はClaudeが書き換えられません。変えるのは人だけです: $1" >&2
	exit 2
}

case "$tool" in
Write | Edit | MultiEdit | NotebookEdit)
	path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
	if [ -n "$path" ] && is_protected "$path"; then
		deny "$path"
	fi
	;;
Bash)
	command=$(jq -r '.tool_input.command // empty' <<<"$input")
	# 保護対象のパスを含み、かつ書き込みになりうるコマンド（リダイレクト・sed -i・tee・mv・cp・rm・touch・mkdir・スクリプト実行）を拒否する
	# 読むだけ（cat・grep・ls・playwright test）は通す。2>&1のような標準エラーのリダイレクトは除く
	if grep -qE '(^|[^A-Za-z0-9_./-])(e2e/|docs/specs/)|\.test\.tsx?([^A-Za-z0-9_]|$)' <<<"$command" &&
		grep -qE '(^|[^0-9&])>|\btee\b|\bsed\b[^|;&]*\s-[a-zA-Z]*i|\bperl\b[^|;&]*\s-[a-zA-Z]*i|\b(mv|cp|rm|touch|mkdir|truncate|install)\b|\b(node|bun|python3?|deno)\b' <<<"$command"; then
		deny "$command"
	fi
	;;
esac

exit 0
