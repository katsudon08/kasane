#!/usr/bin/env bash
# Claude Codeのフック（PreToolUse）。コミット済みのテストと、設計書への書き込みを拒否する
# （docs/specs/single/plan.md「ごまかし防止」）
#
# - テスト（**/*.test.ts・**/*.test.tsx・e2e/**）は、gitで追跡済み（コミット済み）のファイルだけ拒否する
#   仕様から新しくテストを書くのはよい。一度コミットしたテストを、実装を通すために変えるのを防ぐ
# - 設計書（docs/specs/**）は全部拒否する。設計書を変えるのは人だけ
# 拒否するときは終了コード2で、理由を標準エラーに出す
set -euo pipefail

input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

relative() {
	local path="$1"
	path="${path#"$root"/}"
	path="${path#./}"
	printf '%s' "$path"
}

is_spec() {
	case "$1" in
	docs/specs | docs/specs/*) return 0 ;;
	esac
	return 1
}

is_test() {
	case "$1" in
	e2e | e2e/* | */e2e/* | *.test.ts | *.test.tsx) return 0 ;;
	esac
	return 1
}

# ディレクトリを渡したときは、その下に追跡済みのファイルが一つでもあれば追跡済みとみなす
is_tracked() {
	git -C "$root" ls-files --error-unmatch -- "$1" >/dev/null 2>&1
}

should_deny() {
	local path
	path=$(relative "$1")
	[ -z "$path" ] && return 1
	is_spec "$path" && return 0
	is_test "$path" && is_tracked "$path" && return 0
	return 1
}

deny() {
	echo "コミット済みのテスト（**/*.test.ts・e2e/**）と設計書（docs/specs/**）はClaudeが書き換えられません。テストが通らないときは実装を直し、設計書を変えるのは人だけです: $1" >&2
	exit 2
}

case "$tool" in
Write | Edit | MultiEdit | NotebookEdit)
	path=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
	if [ -n "$path" ] && should_deny "$path"; then
		deny "$path"
	fi
	;;
Bash)
	command=$(jq -r '.tool_input.command // empty' <<<"$input")
	# 書き込みになりうるコマンド（リダイレクト・tee・sed -i・perl -i・mv・cp・rm・touch・mkdir・git rm/checkout/restore・スクリプトの実行）でなければ通す
	# 読むだけ（cat・grep・ls・playwright test・bun test）は通す。2>&1のような標準エラーのリダイレクトは除く
	runnable=$(sed -E 's/(^|[^A-Za-z0-9_])bun[[:space:]]+(run[[:space:]]+)?test/\1buntest/g' <<<"$command")
	if ! grep -qE '(^|[^0-9&])>|\btee\b|\bsed\b[^|;&]*\s-[a-zA-Z]*i|\bperl\b[^|;&]*\s-[a-zA-Z]*i|\b(mv|cp|rm|touch|mkdir|truncate|install|checkout|restore)\b|\b(node|bun|python3?|deno)\b' <<<"$runnable"; then
		exit 0
	fi
	# コマンド文から保護対象になりうるパスを取り出し、一つでも拒否対象なら止める
	while IFS= read -r candidate; do
		[ -z "$candidate" ] && continue
		if should_deny "$candidate"; then
			deny "$command"
		fi
	done < <(grep -oE '[A-Za-z0-9_./@-]*(e2e(/[A-Za-z0-9_./@-]*)?|docs/specs(/[A-Za-z0-9_./@-]*)?|[A-Za-z0-9_./@-]+\.test\.tsx?)' <<<"$command" || true)
	;;
esac

exit 0
