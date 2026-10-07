// Ролик 2, сцены 4–7: тот же телефон, но вместо потока вопросов — готовые решения.
// Бронь → заявки → отчёт, затем «вы занимаетесь делом, а не перепиской».
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from '../brand';
import {beatToFrame} from '../config';
import {ease, snap, tween} from '../anim';
import {Bg, CenterLine} from '../components/common';
import {BookingScreen, EventsScreen, FileIcon, PAD, PhoneBody, RequestsScreen, SCREEN, Tap} from '../components/Phone';
import {SafeText, safeFontSize} from '../components/SafeText';
import {Caption, Screen} from '../scenes/App';
import {T} from '../texts';
import {DEMO2_BEATS as D, SCENES2} from './config';

const START = SCENES2.booking.from;
/** Кадр абсолютной доли `beat` относительно начала этой последовательности. */
const at = (beat: number) => beatToFrame(beat) - beatToFrame(START);
const sb = (scene: {from: number}, x: number) => at(scene.from + x);

const FILES = [
	{x: 175, y: 640, rot: -16},
	{x: 905, y: 720, rot: 14},
	{x: 160, y: 1110, rot: 10},
	{x: 915, y: 1190, rot: -12},
];

export const Demos: React.FC = () => {
	const f = useCurrentFrame();
	const {booking, requests, reports, calm} = SCENES2;

	// подписи одной серии — одним кеглем
	const capFs = Math.min(safeFontSize(T.v2CapBooking), safeFontSize(T.v2CapRequests), safeFontSize(T.v2CapReports));
	const cap = (spec: typeof T.v2CapBooking) => ({...spec, maxFontSize: Math.min(spec.maxFontSize, capFs)});

	// бронь
	const tapDate = sb(booking, D.booking.tap);
	const tapFill = snap(f, tapDate, {stiffness: 700, damping: 18});
	const toast = snap(f, sb(booking, D.booking.toast), {stiffness: 520, damping: 20});
	// заявки
	const tapSend = sb(requests, D.requests.tap);
	const rowInF = sb(requests, D.requests.rowIn);
	const acceptedF = sb(requests, D.requests.accepted);
	const pressSend = tween(f, [tapSend, tapSend + 3], [0, 1]) * tween(f, [tapSend + 3, tapSend + 7], [1, 0]);
	const fly = tween(f, [tapSend + 2, rowInF], [0, 1], ease.inOutCubic);
	const rowIn = snap(f, rowInF, {stiffness: 600, damping: 24});
	const flash =
		(f >= rowInF ? Math.exp(-(f - rowInF) / 7) : 0) + (f >= acceptedF ? 0.7 * Math.exp(-(f - acceptedF) / 7) : 0);
	const flipT = tween(f, [acceptedF, acceptedF + 6], [0, 1], (t) => t);
	// отчёт
	const tapReport = sb(reports, D.reports.tap);
	const pressReport = tween(f, [tapReport, tapReport + 3], [0, 1]) * tween(f, [tapReport + 3, tapReport + 8], [1, 0]);

	// телефон проявляется после вспышки и уходит вниз перед финальной фразой
	const phoneIn = tween(f, [0, 8], [0, 1], ease.outCubic);
	const calmF = at(calm.from);
	const phoneOut = tween(f, [calmF - 4, calmF + 10], [0, 1], ease.inOutCubic);

	const cellIdx = 18;
	const date = {x: SCREEN.x + PAD + (cellIdx % 7) * 75.17 + 35, y: SCREEN.y + 330 + Math.floor(cellIdx / 7) * 75.17 + 35};
	const send = {x: SCREEN.x + PAD + 263, y: SCREEN.y + 398 + 41};
	const report = {x: SCREEN.x + PAD + 263, y: SCREEN.y + 712 + 43};
	const tapT = (fr: number) => tween(f, [fr, fr + 10], [0, 1], (t) => t);

	const calm1 = snap(f, calmF + 2, {stiffness: 420, damping: 24});
	const calm2 = snap(f, sb(calm, 1), {stiffness: 420, damping: 24});
	const calmFs = Math.min(safeFontSize(T.v2Calm1), safeFontSize(T.v2Calm2));
	const calmDrift = tween(f, [calmF, at(calm.to)], [0, 1], (t) => t);
	const calmOut = tween(f, [at(calm.to) - 5, at(calm.to)], [1, 0], ease.inCubic);

	return (
		<Bg>
			<Caption spec={cap(T.v2CapBooking)} from={at(booking.from) + 4} to={at(requests.from)} />
			<Caption spec={cap(T.v2CapRequests)} from={at(requests.from) + 3} to={at(reports.from)} />
			<Caption spec={cap(T.v2CapReports)} from={at(reports.from) + 3} to={calmF - 3} />
			<div
				style={{
					position: 'absolute',
					inset: 0,
					opacity: phoneIn * (1 - phoneOut),
					transform: `translateY(${(1 - phoneIn) * 40 + phoneOut * 260}px) scale(${0.96 + 0.04 * phoneIn - 0.08 * phoneOut})`,
				}}
			>
				<PhoneBody glow={0.9}>
					<Screen from={0} to={at(requests.from)}>
						<BookingScreen tapFill={tapFill} toast={toast} busyPulse={(f % 14) / 14} />
					</Screen>
					<Screen from={at(requests.from)} to={at(reports.from)}>
						<RequestsScreen press={pressSend} fly={fly} rowIn={rowIn} flash={flash} status={f >= acceptedF + 3 ? 'done' : 'new'} flip={flipT} />
					</Screen>
					<Screen from={at(reports.from)} to={calmF + 20}>
						<EventsScreen
							press={pressReport}
							glow={tween(f, [tapReport, tapReport + 4], [0, 1]) * tween(f, [tapReport + 6, tapReport + 18], [1, 0])}
						/>
					</Screen>
				</PhoneBody>
			</div>
			<div style={{opacity: 1 - phoneOut}}>
				{FILES.map((p, i) => {
					const start = tapReport + 2 + i * 2;
					if (f < start) return null;
					const t = snap(f, start, {stiffness: 220, damping: 16});
					const x = report.x + (p.x - report.x) * t;
					const y = report.y + (p.y - report.y) * t - Math.sin(Math.min(1, t) * Math.PI) * 160;
					return (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: x - 55,
								top: y - 70 + Math.sin((f - start) / 9 + i) * 3,
								transform: `rotate(${p.rot * t}deg) scale(${0.3 + 0.7 * Math.min(1, t)})`,
								filter: `drop-shadow(0 0 18px ${COLORS.teal})`,
							}}
						>
							<FileIcon size={110} variant={i} />
						</div>
					);
				})}
			</div>
			<Tap x={date.x} y={date.y} t={tapT(tapDate)} />
			<Tap x={send.x} y={send.y} t={tapT(tapSend)} />
			<Tap x={report.x} y={report.y} t={tapT(tapReport)} />
			{/* спокойствие: уведомлений больше нет */}
			{f >= calmF ? (
				<div style={{opacity: calmOut}}>
					<CenterLine y={820}>
						<div style={{opacity: Math.min(1, calm1 * 1.5), transform: `translateY(${(1 - calm1) * 40}px) scale(${1 + 0.03 * calmDrift})`}}>
							<SafeText spec={T.v2Calm1} fontSize={calmFs} />
						</div>
					</CenterLine>
					<CenterLine y={940}>
						<div style={{opacity: Math.min(1, calm2 * 1.5), transform: `translateY(${(1 - calm2) * 40}px) scale(${1 + 0.03 * calmDrift})`}}>
							<SafeText spec={T.v2Calm2} fontSize={calmFs} color={COLORS.neon} />
						</div>
					</CenterLine>
				</div>
			) : null}
		</Bg>
	);
};
