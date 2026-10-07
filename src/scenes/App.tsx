// Сцена 5: «Готовые решения». Телефон влетает с поворотом, открывается каталог,
// затем три быстрые демонстрации: бронь, заявки, мероприятия.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from '../brand';
import {APP_BEATS, SCENES} from '../config';
import {ease, lbf, snap, tween} from '../anim';
import {Bg, CenterLine} from '../components/common';
import {
	BookingScreen,
	CatalogScreen,
	EventsScreen,
	FileIcon,
	PAD,
	PHONE,
	PhoneBody,
	RequestsScreen,
	SCREEN,
	Tap,
} from '../components/Phone';
import {SafeText} from '../components/SafeText';
import {T, TextSpec} from '../texts';

const S = SCENES.app.from;
export const b = (x: number) => lbf(S, x);

const A = APP_BEATS;

export const Caption: React.FC<{spec: TextSpec; from: number; to: number}> = ({spec, from, to}) => {
	const f = useCurrentFrame();
	if (f < from - 1 || f > to + 6) return null;
	const pin = snap(f, from, {stiffness: 500, damping: 24});
	const out = tween(f, [to, to + 5], [0, 1], ease.inCubic);
	const op = tween(f, [from, from + 3], [0, 1]) * (1 - out);
	return (
		<CenterLine y={372}>
			<div
				style={{
					opacity: op,
					transform: `translateY(${(1 - pin) * 40 - out * 30}px) scale(${1 + 0.06 * (1 - pin)})`,
				}}
			>
				<SafeText spec={spec} />
			</div>
		</CenterLine>
	);
};

/** Смена экранов внутри телефона: короткий кросс-фейд со сдвигом, без обрезки текста. */
export const Screen: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => {
	const f = useCurrentFrame();
	if (f < from || f >= to + 5) return null;
	const pin = tween(f, [from, from + 6], [0, 1], ease.outCubic);
	const out = tween(f, [to, to + 5], [0, 1], ease.inCubic);
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				opacity: pin * (1 - out),
				transform: `translateX(${(1 - pin) * 40 - out * 40}px) scale(${0.97 + 0.03 * pin})`,
			}}
		>
			{children}
		</div>
	);
};

const FILES = [
	{x: 175, y: 640, rot: -16},
	{x: 905, y: 720, rot: 14},
	{x: 160, y: 1110, rot: 10},
	{x: 915, y: 1190, rot: -12},
];

export const AppScene: React.FC = () => {
	const f = useCurrentFrame();

	// влёт телефона с поворотом
	const pin = snap(f, b(A.phoneIn), {stiffness: 260, damping: 20, mass: 0.9});
	const rotZ = (1 - pin) * 28;
	const rotY = (1 - pin) * -40;
	const ty = (1 - pin) * 1100;
	const pulse = 0.8 + 0.25 * Math.exp(-((f - b(Math.round(f / b(1)))) ** 2) / 8);

	// whip pan в конце
	const whip = tween(f, [b(A.whip), b(A.end)], [0, 1], ease.inExpo);
	const textOut = tween(f, [b(A.whip), b(A.whip) + 2], [1, 0]);

	const tealCover = tween(f, [0, 6], [1, 0], ease.outCubic);


	// экраны
	const cards: [number, number, number] = [
		snap(f, b(A.cards[0]), {stiffness: 600, damping: 20}),
		snap(f, b(A.cards[1]), {stiffness: 600, damping: 20}),
		snap(f, b(A.cards[2]), {stiffness: 600, damping: 20}),
	];
	const pressCard = tween(f, [b(A.tapCard), b(A.tapCard) + 3], [0, 1]) * tween(f, [b(A.tapCard) + 3, b(A.tapCard) + 7], [1, 0]);
	const tapFill = snap(f, b(A.tapDate), {stiffness: 700, damping: 18});
	const toast = snap(f, b(A.toast), {stiffness: 520, damping: 20});
	const pressSend = tween(f, [b(A.tapSend), b(A.tapSend) + 3], [0, 1]) * tween(f, [b(A.tapSend) + 3, b(A.tapSend) + 7], [1, 0]);
	const fly = tween(f, [b(A.tapSend) + 2, b(A.rowIn)], [0, 1], ease.inOutCubic);
	const rowIn = snap(f, b(A.rowIn), {stiffness: 600, damping: 24});
	const flash = Math.exp(-Math.max(0, f - b(A.rowIn)) / 7) * (f >= b(A.rowIn) ? 1 : 0) + Math.exp(-Math.max(0, f - b(A.accepted)) / 7) * (f >= b(A.accepted) ? 0.7 : 0);
	const flipT = tween(f, [b(A.accepted), b(A.accepted) + 6], [0, 1], (t) => t);
	const status = f >= b(A.accepted) + 3 ? 'done' : 'new';
	const pressReport = tween(f, [b(A.tapReport), b(A.tapReport) + 3], [0, 1]) * tween(f, [b(A.tapReport) + 3, b(A.tapReport) + 8], [1, 0]);

	// координаты касаний в кадре
	const card1 = {x: SCREEN.x + PAD + 263, y: SCREEN.y + 204 + 107};
	const cellIdx = 18;
	const date = {x: SCREEN.x + PAD + (cellIdx % 7) * 75.17 + 35, y: SCREEN.y + 330 + Math.floor(cellIdx / 7) * 75.17 + 35};
	const send = {x: SCREEN.x + PAD + 263, y: SCREEN.y + 398 + 41};
	const report = {x: SCREEN.x + PAD + 263, y: SCREEN.y + 712 + 43};
	const tapT = (at: number) => tween(f, [b(at), b(at) + 10], [0, 1], (t) => t);

	return (
		<Bg>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					transform: `translateX(${-whip * 1500}px)`,
					filter: whip > 0.02 ? `blur(${whip * 26}px)` : undefined,
				}}
			>
				<div style={{opacity: textOut}}>
					<Caption spec={T.appTitle} from={b(A.title)} to={b(A.toBooking)} />
					<Caption spec={T.capBooking} from={b(A.toBooking) + 3} to={b(A.toRequests)} />
					<Caption spec={T.capRequests} from={b(A.toRequests) + 3} to={b(A.toEvents)} />
					<Caption spec={T.capReports} from={b(A.toEvents) + 3} to={b(A.end) + 10} />
				</div>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						perspective: 1800,
					}}
				>
					<div
						style={{
							position: 'absolute',
							inset: 0,
							transform: `translateY(${ty}px) rotateZ(${rotZ}deg) rotateY(${rotY}deg) scale(${0.8 + 0.2 * pin})`,
							transformOrigin: `${PHONE.x + PHONE.w / 2}px ${PHONE.y + PHONE.h / 2}px`,
						}}
					>
						<PhoneBody glow={pulse}>
							<div style={{position: 'absolute', inset: 0, opacity: textOut}}>
								<Screen from={b(A.cards[0]) - 1} to={b(A.toBooking)}>
									<CatalogScreen cards={cards} pressed={pressCard} headerP={tween(f, [b(1) - 2, b(1) + 3], [0, 1])} />
								</Screen>
								<Screen from={b(A.toBooking)} to={b(A.toRequests)}>
									<BookingScreen tapFill={tapFill} toast={toast} busyPulse={(f % 14) / 14} />
								</Screen>
								<Screen from={b(A.toRequests)} to={b(A.toEvents)}>
									<RequestsScreen press={pressSend} fly={fly} rowIn={rowIn} flash={flash} status={status} flip={flipT} />
								</Screen>
								<Screen from={b(A.toEvents)} to={b(A.end) + 20}>
									<EventsScreen press={pressReport} glow={tween(f, [b(A.tapReport), b(A.tapReport) + 4], [0, 1]) * tween(f, [b(A.tapReport) + 6, b(A.tapReport) + 18], [1, 0])} />
								</Screen>
							</div>
						</PhoneBody>
					</div>
				</div>
				{/* вылетающие файлы отчёта */}
				<div style={{opacity: textOut}}>
					{FILES.map((p, i) => {
						const start = b(A.tapReport) + 2 + i * 2;
						const t = snap(f, start, {stiffness: 220, damping: 16});
						if (f < start) return null;
						const x = report.x + (p.x - report.x) * t;
						const y = report.y + (p.y - report.y) * t - Math.sin(Math.min(1, t) * Math.PI) * 160;
						const bob = Math.sin((f - start) / 9 + i) * 3;
						return (
							<div
								key={i}
								style={{
									position: 'absolute',
									left: x - 55,
									top: y - 70 + bob,
									transform: `rotate(${p.rot * t}deg) scale(${0.3 + 0.7 * Math.min(1, t)})`,
									filter: `drop-shadow(0 0 18px ${COLORS.teal})`,
								}}
							>
								<FileIcon size={110} variant={i} />
							</div>
						);
					})}
				</div>
				<Tap x={card1.x} y={card1.y} t={tapT(A.tapCard)} />
				<Tap x={date.x} y={date.y} t={tapT(A.tapDate)} />
				<Tap x={send.x} y={send.y} t={tapT(A.tapSend)} />
				<Tap x={report.x} y={report.y} t={tapT(A.tapReport)} />
			</div>
			{/* остаток бирюзовой заливки после zoom-through */}
			<div style={{position: 'absolute', inset: 0, background: COLORS.teal, opacity: tealCover}} />
		</Bg>
	);
};
