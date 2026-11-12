/*
 * 穴をうめるときの光る球の見た目（仕様書README.mdの「1ターンの動き」のfill）
 * うめる区切りの進み具合p（0〜1）から、球の各部品の大きさ・濃さ・高さを求める
 * - 前半（〜GROW_END）: 穴の上に現れ、弾むように大きくなる。まわりを輪が回り、光の粒が広がる
 * - 後半: 穴へ沈みながら縮み、床に光の輪（衝撃波）が広がる。終わると穴は床に変わる
 * 光は材質の発光だけで描く（後処理は使わない）。3Dは、この値をuseFrameの中でrefに書き込む
 */

// 大きくなり終わる時点
const GROW_END = 0.55;
// 浮かせる高さ（マスの単位）
const FLOAT_HEIGHT = 0.45;

export type OrbLook = {
	// 芯の大きさ（1で決めた大きさ）と、縦のつぶれ具合（1でつぶれない）
	coreScale: number;
	coreSquash: number;
	// まわりのぼんやりした光
	glowScale: number;
	glowOpacity: number;
	// まわりを回る2本の輪
	ringScale: number;
	ringAngle: number;
	// まわりを回る光の粒
	sparkRadius: number;
	sparkScale: number;
	sparkAngle: number;
	// 床に広がる光の輪
	shockScale: number;
	shockOpacity: number;
	// 球の真ん中の高さ（マスの床から）
	height: number;
};

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function easeOut(t: number): number {
	return 1 - (1 - t) ** 3;
}

function easeIn(t: number): number {
	return t ** 3;
}

// 少し行き過ぎてから戻る
function easeOutBack(t: number): number {
	const overshoot = 1.9;
	return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;
}

export function orbLook(progress: number): OrbLook {
	const p = clamp01(progress);
	const grow = clamp01(p / GROW_END);
	const sink = clamp01((p - GROW_END) / (1 - GROW_END));
	// 大きくなった後は、脈打つように少しふくらむ
	const pulse = 1 + 0.08 * Math.sin(p * Math.PI * 12) * grow;

	return {
		coreScale: easeOutBack(grow) * (1 - 0.6 * sink) * pulse,
		coreSquash: 1 - 0.6 * easeIn(sink),
		glowScale: (0.3 + 0.9 * easeOut(grow)) * pulse * (1 - 0.4 * sink),
		glowOpacity: easeOut(grow) * (1 - sink),
		ringScale: easeOut(grow) * (1 - easeIn(sink)),
		ringAngle: p * Math.PI * 4,
		sparkRadius: 0.2 + 0.4 * easeOut(grow) + 0.4 * sink,
		sparkScale: easeOut(grow) * (1 - sink),
		sparkAngle: p * Math.PI * 3,
		shockScale: sink === 0 ? 0 : 0.4 + 1.4 * easeOut(sink),
		shockOpacity: sink === 0 ? 0 : 1 - sink,
		height: FLOAT_HEIGHT * (1 - easeIn(sink)),
	};
}
