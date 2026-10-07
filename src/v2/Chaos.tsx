// Ролик 2, сцена 1: «узнаёте свой телефон?» — уведомления сыплются всё чаще
// (на доли, к концу на шестнадцатые), в конце их смахивают одним движением.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from '../brand';
import {beatToFrame} from '../config';
import {ease, snap, tween} from '../anim';
import {Bg} from '../components/common';
import {MessagesScreen, PhoneBody} from '../components/Phone';
import {SafeText, safeFontSize} from '../components/SafeText';
import {Caption} from '../scenes/App';
import {T, TextSpec} from '../texts';
import {CHAOS_BEATS} from './config';

const F = beatToFrame;

type Src = 'dm' | 'comment' | 'chat';
const SRC: Record<Src, {spec: TextSpec; color: string; icon: string}> = {
	dm: {spec: T.v2SrcDm, color: '#2B6CD8', icon: 'M8 10 H32 V28 H18 L11 34 V28 H8 Z'},
	comment: {spec: T.v2SrcComment, color: '#7A4DFF', icon: 'M8 9 H32 V27 H8 Z M13 16 H27 M13 21 H23'},
	chat: {spec: T.v2SrcChat, color: COLORS.teal, icon: 'M5 12 H25 V26 H14 L9 31 V26 H5 Z M15 8 H35 V22 H30'},
};
const MSGS: [Src, TextSpec][] = [
	['dm', T.v2Msg1],
	['comment', T.v2Msg2],
	['chat', T.v2Msg3],
	['dm', T.v2Msg4],
	['comment', T.v2Msg5],
	['chat', T.v2Msg6],
	['dm', T.v2Msg7],
	['chat', T.v2Msg8],
];

const BANNER = {x: 120, w: 840, h: 128, top: 452, step: 120, visible: 8};

const Banner: React.FC<{src: Src; msg: TextSpec; style: React.CSSProperties}> = ({src, msg, style}) => {
	const s = SRC[src];
	return (
		<div
			style={{
				position: 'absolute',
				left: BANNER.x,
				width: BANNER.w,
				height: BANNER.h,
				borderRadius: 30,
				background: 'rgba(31,52,96,0.96)',
				boxShadow: '0 18px 40px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08)',
				...style,
			}}
		>
			<div style={{position: 'absolute', left: 24, top: 26, width: 76, height: 76, borderRadius: 20, background: s.color}}>
				<svg width="76" height="76" viewBox="0 0 40 40">
					<path d={s.icon} stroke="#fff" strokeWidth="2.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
				</svg>
			</div>
			<div style={{position: 'absolute', left: 122, top: 22}}>
				<SafeText spec={s.spec} color="#AFC3E8" />
			</div>
			<div style={{position: 'absolute', right: 28, top: 24}}>
				<SafeText spec={T.v2Now} color="#7F95BE" />
			</div>
			<div style={{position: 'absolute', left: 122, top: 64}}>
				<SafeText spec={msg} />
			</div>
		</div>
	);
};

export const Chaos: React.FC = () => {
	const f = useCurrentFrame();
	const times = CHAOS_BEATS.notifications.map(F);
	const arrived = times.filter((t) => f >= t).length;
	// смахивание: всё уезжает влево, текст гаснет раньше, чем коснётся края зоны
	const swipe = tween(f, [F(CHAOS_BEATS.swipe), F(8)], [0, 1], ease.inExpo);
	const swipeFade = tween(swipe, [0, 0.12], [1, 0], (t) => t);
	const pressure = Math.min(1, arrived / times.length);
	const capFs = Math.min(safeFontSize(T.v2Chaos1), safeFontSize(T.v2Chaos2), safeFontSize(T.v2Chaos3));

	return (
		<Bg>
			{/* телефон с непрочитанными: темнеет по мере потока уведомлений */}
			<div style={{position: 'absolute', inset: 0, opacity: 1 - 0.45 * pressure - 0.5 * swipe}}>
				<PhoneBody glow={0.35 + 0.4 * pressure}>
					<MessagesScreen unread={Math.min(1, arrived / 3)} frame={f} />
				</PhoneBody>
			</div>
			{/* стопка уведомлений: новое сверху, старые сдвигаются вниз */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					transform: `translateX(${-swipe * 1300}px)`,
					filter: swipe > 0.02 ? `blur(${swipe * 22}px)` : undefined,
					opacity: swipeFade,
				}}
			>
				{times.map((t, i) => {
					if (f < t) return null;
					const k = arrived - 1 - i; // 0 — самое новое
					if (k >= BANNER.visible) return null;
					const pin = snap(f, t, {stiffness: 620, damping: 28});
					// каждое следующее уведомление пружиной сдвигает это на слот вниз
					const slot = times.slice(i + 1).reduce((acc, tj) => acc + (f >= tj ? Math.min(1, snap(f, tj, {stiffness: 520, damping: 26})) : 0), 0);
					const y = BANNER.top + slot * BANNER.step - (1 - pin) * 60;
					const depth = 1 - Math.min(k, 6) * 0.025;
					const rot = (i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.4);
					const dx = ((i * 37) % 3 - 1) * 14;
					const [src, msg] = MSGS[i % MSGS.length];
					return (
						<Banner
							key={i}
							src={src}
							msg={msg}
							style={{
								top: y,
								opacity: Math.min(1, pin * 1.6),
								filter: k >= BANNER.visible - 1 ? 'brightness(0.45)' : undefined,
								transform: `translateX(${dx}px) rotate(${rot}deg) scale(${depth * (0.94 + 0.06 * Math.min(1, pin))})`,
								zIndex: 100 - k,
							}}
						/>
					);
				})}
			</div>
			{/* крючок и подписи — сверху, над стопкой */}
			<div style={{opacity: swipeFade}}>
				<Caption spec={T.v2Hook} from={F(CHAOS_BEATS.hook)} to={F(CHAOS_BEATS.captions[0])} />
				{CHAOS_BEATS.captions.map((c, i) => (
					<CaptionFixed
						key={c}
						spec={[T.v2Chaos1, T.v2Chaos2, T.v2Chaos3][i]}
						fontSize={capFs}
						from={F(c)}
						to={i < 2 ? F(CHAOS_BEATS.captions[i + 1]) : F(9)}
					/>
				))}
			</div>
		</Bg>
	);
};

/** Подпись с общим кеглем для серии (не больше безопасного для каждой строки). */
const CaptionFixed: React.FC<{spec: TextSpec; fontSize: number; from: number; to: number}> = ({spec, fontSize, from, to}) => (
	<Caption spec={{...spec, maxFontSize: Math.min(spec.maxFontSize, fontSize)}} from={from} to={to} />
);
