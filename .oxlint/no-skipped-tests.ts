/*
 * skip・only・todoで飛ばしたテストを禁じるoxlintのルール（docs/specs/single/plan.md「ごまかし防止」）
 * oxlint組み込みのvitest/jestのルールは`bun:test`・`@playwright/test`から読み込んだ`test`を認識しないため、
 * 読み込み元を見ずに`test`・`it`・`describe`の呼び出しを構文だけで判定する
 */
const RUNNERS = new Set(["test", "it", "describe"]);
const MODIFIERS = new Set(["skip", "only", "todo", "fixme"]);
const PREFIXED = new Set(["xit", "xtest", "xdescribe", "fit", "fdescribe"]);

type Node = {
	type: string;
	name?: string;
	object?: Node;
	property?: Node;
	computed?: boolean;
};

type RuleContext = {
	report: (descriptor: { node: unknown; messageId: string }) => void;
};

function rootIdentifier(node: Node): Node | undefined {
	let current: Node | undefined = node;
	while (current?.type === "MemberExpression") current = current.object;
	return current;
}

function hasModifier(node: Node): boolean {
	let current: Node | undefined = node;
	while (current?.type === "MemberExpression") {
		const property = current.property;
		if (
			!current.computed &&
			property?.type === "Identifier" &&
			MODIFIERS.has(property.name ?? "")
		) {
			return true;
		}
		current = current.object;
	}
	return false;
}

const plugin = {
	meta: { name: "kasane" },
	rules: {
		"no-skipped-tests": {
			meta: {
				type: "problem",
				docs: { description: "skip・only・todo・fixmeでテストを飛ばさない" },
				messages: {
					skipped: "skip・only・todo・fixmeでテストを飛ばさない。テストは直して全部通す",
				},
			},
			create(context: RuleContext) {
				return {
					CallExpression(node: { callee: Node }) {
						const callee = node.callee;
						if (callee.type === "Identifier" && PREFIXED.has(callee.name ?? "")) {
							context.report({ node, messageId: "skipped" });
							return;
						}
						if (callee.type !== "MemberExpression") return;
						const root = rootIdentifier(callee);
						if (root?.type !== "Identifier" || !RUNNERS.has(root.name ?? "")) return;
						if (hasModifier(callee)) context.report({ node, messageId: "skipped" });
					},
				};
			},
		},
	},
};

export default plugin;
