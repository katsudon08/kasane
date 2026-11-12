/*
 * カードを読み取れたときの短い効果音（仕様書README.mdの「プログラムをつくる」）
 * 音のファイルは置かず、Web Audio APIで短い2つの音を鳴らす
 * ブラウザーは、画面を一度も押していないと音を出させないので、そのときは鳴らない
 */
let context: AudioContext | null = null;

const TONES = [
	{ frequency: 880, start: 0 },
	{ frequency: 1320, start: 0.07 },
];
const TONE_SECONDS = 0.09;
const VOLUME = 0.15;

export function playScanSound(): void {
	context ??= new AudioContext();
	const audio = context;
	if (audio.state === "suspended") void audio.resume();
	const now = audio.currentTime;
	for (const { frequency, start } of TONES) {
		const oscillator = audio.createOscillator();
		const gain = audio.createGain();
		oscillator.type = "sine";
		oscillator.frequency.value = frequency;
		gain.gain.setValueAtTime(VOLUME, now + start);
		gain.gain.exponentialRampToValueAtTime(0.001, now + start + TONE_SECONDS);
		oscillator.connect(gain).connect(audio.destination);
		oscillator.start(now + start);
		oscillator.stop(now + start + TONE_SECONDS);
	}
}
