/*
 * 仕様書の児童向けの文言（`<ruby>迷路<rt>めいろ</rt></ruby>`の形）から、画面の文字に合う正規表現を作る
 * ルビの読みは、要素の名前（getByRoleのname）では「この 名前 なまえ で」のように空白で区切られ、
 * 要素の文字（getByText・hasText）では区切られない。どちらにも合うように、文字の間の空白はあってもなくてもよいことにする
 */
const RUBY = /<ruby>(.+?)<rt>(.+?)<\/rt><\/ruby>/g;

function escape(text: string): string {
	return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

// ルビのない部分。空白で区切り、正規表現の記号を文字として扱う
function plainParts(text: string): string[] {
	return text
		.split(/\s+/)
		.filter((part) => part !== "")
		.map(escape);
}

function pattern(spec: string, readingPart: (reading: string) => string): RegExp {
	const parts: string[] = [];
	let index = 0;
	for (const match of spec.matchAll(RUBY)) {
		const [whole, base = "", reading = ""] = match;
		parts.push(...plainParts(spec.slice(index, match.index)));
		parts.push(escape(base), readingPart(escape(reading)));
		index = match.index + whole.length;
	}
	parts.push(...plainParts(spec.slice(index)));
	return new RegExp(parts.join(String.raw`\s*`));
}

/*
 * 要素の文字（getByText・hasText）に合わせる正規表現。読みがないと合わない
 * 児童画面は漢字にすべてルビを振る決まりなので（README.md「文言のルール」）、ルビのない実装は通さない
 */
export function rubyText(spec: string): RegExp {
	return pattern(spec, (reading) => reading);
}

/*
 * 要素の名前（getByRoleのname）に合わせる正規表現。読みはあってもなくてもよい
 * 読みを読み上げから外す実装（<rt>にaria-hidden）だと、名前には読みが入らないため。ルビがあることはrubyTextで確かめる
 */
export function rubyName(spec: string): RegExp {
	return pattern(spec, (reading) => `(?:${reading})?`);
}
