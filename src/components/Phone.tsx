// Стилизованный телефон и экраны приложения «Готовые решения» (данные выдуманные,
// интерфейс в цветах объединения, без логотипов сторонних сервисов).
import React from 'react';
import {COLORS} from '../brand';
import {FONT_FAMILY} from '../fonts';
import {T} from '../texts';
import {SafeText} from './SafeText';
import {neonShadow} from './common';

export const PHONE = {x: 225, y: 462, w: 630, h: 1210, r: 80, bezel: 16};
export const SCREEN = {
	x: PHONE.x + PHONE.bezel,
	y: PHONE.y + PHONE.bezel,
	w: PHONE.w - PHONE.bezel * 2,
	h: PHONE.h - PHONE.bezel * 2,
};
/** Левый край текста внутри экрана и рабочая ширина. */
export const PAD = 36;
export const CONTENT_W = SCREEN.w - PAD * 2; // 526

const UI_BG = '#0A1226';
const CARD = COLORS.card;

export const PhoneBody: React.FC<{children?: React.ReactNode; glow: number}> = ({children, glow}) => (
	<div
		style={{
			position: 'absolute',
			left: PHONE.x,
			top: PHONE.y,
			width: PHONE.w,
			height: PHONE.h,
			borderRadius: PHONE.r,
			background: '#05080F',
			boxShadow: `0 0 0 3px ${COLORS.neon}, 0 0 ${18 * glow}px ${COLORS.neon}, 0 0 ${60 * glow}px ${COLORS.teal}aa, 0 40px 90px #000a`,
		}}
	>
		<div
			style={{
				position: 'absolute',
				left: PHONE.bezel,
				top: PHONE.bezel,
				width: SCREEN.w,
				height: SCREEN.h,
				borderRadius: PHONE.r - PHONE.bezel,
				background: UI_BG,
				overflow: 'hidden',
			}}
		>
			{children}
			{/* динамический остров */}
			<div
				style={{
					position: 'absolute',
					left: SCREEN.w / 2 - 70,
					top: 18,
					width: 140,
					height: 36,
					borderRadius: 18,
					background: '#000',
				}}
			/>
			{/* индикатор «домой» — ниже 1500 px только графика, без текста */}
			<div
				style={{
					position: 'absolute',
					left: SCREEN.w / 2 - 90,
					bottom: 16,
					width: 180,
					height: 8,
					borderRadius: 4,
					background: '#ffffff55',
				}}
			/>
		</div>
	</div>
);

/** Абсолютное позиционирование внутри экрана (координаты экрана). */
export const At: React.FC<{x?: number; y: number; w?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
	x = PAD,
	y,
	w,
	children,
	style,
}) => <div style={{position: 'absolute', left: x, top: y, width: w, ...style}}>{children}</div>;

/** Перевод абсолютной координаты кадра по Y в координату экрана. */
export const sy = (frameY: number) => frameY - SCREEN.y;

const Icon: React.FC<{kind: 'calendar' | 'inbox' | 'report'; size?: number}> = ({kind, size = 64}) => {
	const s = size;
	return (
		<svg width={s} height={s} viewBox="0 0 64 64">
			<rect x="0" y="0" width="64" height="64" rx="16" fill={COLORS.teal} />
			{kind === 'calendar' ? (
				<g stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round">
					<rect x="14" y="17" width="36" height="32" rx="5" />
					<path d="M14 27 H50 M24 12 V21 M40 12 V21" />
					<rect x="35" y="34" width="8" height="8" rx="1.5" fill="#fff" stroke="none" />
				</g>
			) : kind === 'inbox' ? (
				<g stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
					<path d="M13 36 L19 17 H45 L51 36 V47 H13 Z" />
					<path d="M13 36 H25 L28 41 H36 L39 36 H51" />
				</g>
			) : (
				<g stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
					<path d="M20 12 H37 L46 21 V52 H20 Z" />
					<path d="M27 32 H39 M27 40 H39 M27 24 H32" />
				</g>
			)}
		</svg>
	);
};

const StatusBar: React.FC = () => (
	<div style={{position: 'absolute', left: 0, top: 0, width: SCREEN.w, height: 70}}>
		{/* только значки, без цифр времени */}
		<div style={{position: 'absolute', right: 44, top: 28, display: 'flex', gap: 8, alignItems: 'flex-end'}}>
			{[8, 12, 16, 20].map((h) => (
				<div key={h} style={{width: 5, height: h, borderRadius: 2, background: '#fff'}} />
			))}
			<div style={{width: 34, height: 16, borderRadius: 5, border: '2px solid #fff', marginLeft: 6, position: 'relative'}}>
				<div style={{position: 'absolute', left: 2, top: 2, width: 22, height: 8, borderRadius: 2, background: '#fff'}} />
			</div>
		</div>
		<div style={{position: 'absolute', left: 44, top: 28, width: 54, height: 16, borderRadius: 8, background: '#ffffff40'}} />
	</div>
);

const Header: React.FC<{back?: boolean; title: keyof typeof T}> = ({back, title}) => (
	<At y={86}>
		<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
			{back ? (
				<svg width="30" height="30" viewBox="0 0 30 30">
					<path d="M19 5 L9 15 L19 25" stroke={COLORS.neon} strokeWidth="4" fill="none" strokeLinecap="round" />
				</svg>
			) : null}
			<SafeText spec={T[title]} />
		</div>
	</At>
);

// ---------- Каталог ----------
const CatalogCard: React.FC<{y: number; icon: 'calendar' | 'inbox' | 'report'; title: keyof typeof T; sub: keyof typeof T; p: number; pressed?: number}> = ({
	y,
	icon,
	title,
	sub,
	p,
	pressed = 0,
}) => (
	<At
		y={y}
		w={CONTENT_W}
		style={{
			height: 214,
			borderRadius: 28,
			background: CARD,
			opacity: Math.min(1, p * 1.4),
			transform: `translateY(${(1 - p) * 60}px) scale(${(0.9 + 0.1 * p) * (1 - pressed * 0.04)})`,
			boxShadow: pressed > 0 ? `0 0 0 3px ${COLORS.neon}, 0 0 30px ${COLORS.teal}` : 'none',
		}}
	>
		<div style={{position: 'absolute', left: 24, top: 22}}>
			<Icon kind={icon} size={60} />
		</div>
		<div
			style={{
				position: 'absolute',
				right: 22,
				top: 32,
				padding: '8px 16px',
				borderRadius: 20,
				border: `2px solid ${COLORS.neon}`,
			}}
		>
			<SafeText spec={T.uiHow} color={COLORS.neon} />
		</div>
		<div style={{position: 'absolute', left: 24, top: 104}}>
			<SafeText spec={T[title]} />
		</div>
		<div style={{position: 'absolute', left: 24, top: 150}}>
			<SafeText spec={T[sub]} color="#AFC3E8" />
		</div>
	</At>
);

export const CatalogScreen: React.FC<{cards: [number, number, number]; pressed: number; headerP: number}> = ({cards, pressed, headerP}) => (
	<>
		<StatusBar />
		<At y={92} style={{opacity: headerP}}>
			<SafeText spec={T.uiAppName} />
		</At>
		<At y={150} style={{opacity: headerP}}>
			<SafeText spec={T.uiCatalog} color="#8FA6CF" />
		</At>
		<CatalogCard y={204} icon="calendar" title="uiCard1" sub="uiCard1Sub" p={cards[0]} pressed={pressed} />
		<CatalogCard y={436} icon="inbox" title="uiCard2" sub="uiCard2Sub" p={cards[1]} />
		<CatalogCard y={668} icon="report" title="uiCard3" sub="uiCard3Sub" p={cards[2]} />
		<TabBar active={0} />
	</>
);

const TabBar: React.FC<{active: number}> = ({active}) => (
	<div
		style={{
			position: 'absolute',
			left: 24,
			right: 24,
			// панель целиком ниже 1500 px кадра — в ней только значки
			top: sy(1530),
			height: 76,
			borderRadius: 38,
			background: '#141F3C',
			display: 'flex',
			justifyContent: 'space-around',
			alignItems: 'center',
		}}
	>
		{[0, 1, 2, 3].map((i) => (
			<div
				key={i}
				style={{
					width: i === active ? 44 : 30,
					height: i === active ? 10 : 30,
					borderRadius: i === active ? 5 : 9,
					background: i === active ? COLORS.neon : '#ffffff30',
				}}
			/>
		))}
	</div>
);

// ---------- Бронь ----------
export const BookingScreen: React.FC<{tapFill: number; toast: number; busyPulse: number}> = ({tapFill, toast, busyPulse}) => {
	const cell = 71;
	const gap = 4.17;
	const startDow = 2; // первое число — среда
	const busy = new Set([3, 8, 9, 15, 22, 23, 29]);
	const target = 17;
	return (
		<>
			<StatusBar />
			<Header back title="uiBookTitle" />
			<At y={168}>
				<div style={{display: 'flex', gap: 12}}>
					<div style={{padding: '10px 22px', borderRadius: 24, background: COLORS.teal}}>
						<SafeText spec={T.uiBookItem} />
					</div>
					<div style={{padding: '10px 22px', borderRadius: 24, background: CARD}}>
						<SafeText spec={T.uiBookItem2} color="#C9D6F2" />
					</div>
					<div style={{width: 52, height: 48, borderRadius: 24, background: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
						<svg width="22" height="22" viewBox="0 0 22 22">
							<path d="M11 3 V19 M3 11 H19" stroke="#C9D6F2" strokeWidth="3" strokeLinecap="round" />
						</svg>
					</div>
				</div>
			</At>
			<At y={262} w={CONTENT_W}>
				<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
					<SafeText spec={T.uiMonth} />
					<div style={{display: 'flex', gap: 18}}>
						{['M14 4 L6 12 L14 20', 'M6 4 L14 12 L6 20'].map((d) => (
							<svg key={d} width="20" height="24" viewBox="0 0 20 24">
								<path d={d} stroke={COLORS.neon} strokeWidth="3" fill="none" strokeLinecap="round" />
							</svg>
						))}
					</div>
				</div>
			</At>
			<At y={330} w={CONTENT_W}>
				<div style={{display: 'grid', gridTemplateColumns: `repeat(7, ${cell}px)`, gap}}>
					{Array.from({length: 35}, (_, i) => {
						const day = i - startDow + 1;
						const valid = day >= 1 && day <= 31;
						const isTarget = day === target;
						const isBusy = busy.has(day);
						return (
							<div
								key={i}
								style={{
									width: cell,
									height: cell,
									borderRadius: 16,
									position: 'relative',
									background: valid ? '#121C36' : 'transparent',
									border: isBusy ? `2px solid ${COLORS.teal}${busyPulse > 0.5 ? 'cc' : '88'}` : '2px solid transparent',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontFamily: FONT_FAMILY,
									fontWeight: 500,
									fontSize: 24,
									color: isBusy ? '#7F95BE' : '#E6EEFF',
								}}
							>
								{isTarget ? (
									<div
										style={{
											position: 'absolute',
											inset: -2,
											borderRadius: 16,
											background: COLORS.teal,
											transform: `scale(${tapFill})`,
											boxShadow: tapFill > 0.5 ? neonShadow(COLORS.teal, 0.6) : 'none',
										}}
									/>
								) : null}
								<span style={{position: 'relative', color: isTarget && tapFill > 0.5 ? '#fff' : undefined}}>{valid ? day : ''}</span>
							</div>
						);
					})}
				</div>
			</At>
			{/* всплывающее подтверждение */}
			<At
				y={706}
				w={CONTENT_W}
				style={{
					height: 104,
					borderRadius: 26,
					background: '#14284E',
					boxShadow: `0 0 0 2px ${COLORS.neon}, 0 0 34px ${COLORS.teal}aa`,
					opacity: Math.min(1, toast * 1.5),
					transform: `translateY(${(1 - toast) * 80}px) scale(${0.85 + 0.15 * toast})`,
					display: 'flex',
					alignItems: 'center',
					gap: 18,
					paddingLeft: 24,
					boxSizing: 'border-box',
				}}
			>
				<svg width="52" height="52" viewBox="0 0 52 52">
					<circle cx="26" cy="26" r="26" fill={COLORS.teal} />
					<path d="M15 27 L23 35 L38 18" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset={40 * (1 - Math.min(1, toast))} />
				</svg>
				<SafeText spec={T.uiBooked} />
			</At>
			<TabBar active={1} />
		</>
	);
};

// ---------- Заявки ----------
const Field: React.FC<{y: number; label: keyof typeof T; value: keyof typeof T}> = ({y, label, value}) => (
	<At y={y} w={CONTENT_W} style={{height: 98, borderRadius: 20, background: '#121C36', boxSizing: 'border-box'}}>
		<div style={{position: 'absolute', left: 22, top: 14}}>
			<SafeText spec={T[label]} color="#8FA6CF" />
		</div>
		<div style={{position: 'absolute', left: 22, top: 50}}>
			<SafeText spec={T[value]} />
		</div>
	</At>
);

const Chip: React.FC<{kind: 'new' | 'done' | 'work'; flip?: number}> = ({kind, flip = 0}) => {
	const spec = kind === 'new' ? T.uiStatusNew : kind === 'done' ? T.uiStatusDone : T.uiStatusWork;
	const bg = kind === 'done' ? COLORS.teal : kind === 'new' ? 'transparent' : '#2A3F70';
	return (
		<div
			style={{
				padding: '6px 14px',
				borderRadius: 16,
				background: bg,
				border: kind === 'new' ? '2px solid #fff' : '2px solid transparent',
				transform: `scaleY(${1 - Math.sin(flip * Math.PI) * 0.9})`,
			}}
		>
			<SafeText spec={spec} />
		</div>
	);
};

const Row: React.FC<{y: number; title: keyof typeof T; status: 'new' | 'done' | 'work'; flash?: number; flip?: number; opacity?: number}> = ({
	y,
	title,
	status,
	flash = 0,
	flip = 0,
	opacity = 1,
}) => (
	<At
		y={y}
		w={CONTENT_W}
		style={{
			height: 70,
			borderRadius: 16,
			background: `rgba(33,178,165,${0.55 * flash})`,
			boxShadow: flash > 0.05 ? `0 0 ${30 * flash}px ${COLORS.neon}` : 'none',
			borderBottom: '1px solid #ffffff18',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '0 16px',
			boxSizing: 'border-box',
			opacity,
		}}
	>
		<SafeText spec={T[title]} />
		<Chip kind={status} flip={flip} />
	</At>
);

export const RequestsScreen: React.FC<{press: number; fly: number; rowIn: number; flash: number; status: 'new' | 'done'; flip: number}> = ({
	press,
	fly,
	rowIn,
	flash,
	status,
	flip,
}) => {
	const tableY = 640;
	const rowY = tableY + 66;
	// летящая карточка заявки: от кнопки «Отправить» по дуге в первую строку таблицы
	const fromX = PAD + 90;
	const fromY = 470;
	const toX = PAD;
	const toY = rowY;
	const t = fly;
	const cx = fromX + (toX - fromX) * t + Math.sin(t * Math.PI) * 170;
	const cy = fromY + (toY - fromY) * t - Math.sin(t * Math.PI) * 120;
	return (
		<>
			<StatusBar />
			<Header back title="uiFormTitle" />
			<Field y={166} label="uiFieldWhat" value="uiFieldWhatValue" />
			<Field y={278} label="uiFieldWho" value="uiFieldWhoValue" />
			<At
				y={398}
				w={CONTENT_W}
				style={{
					height: 82,
					borderRadius: 41,
					background: COLORS.teal,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					transform: `scale(${1 - press * 0.06})`,
					boxShadow: `0 0 ${10 + press * 30}px ${COLORS.teal}`,
				}}
			>
				<SafeText spec={T.uiSend} />
			</At>
			<At y={tableY - 34} w={CONTENT_W} style={{height: 2, background: '#ffffff1a'}}>
				<span />
			</At>
			<At y={tableY - 12}>
				<SafeText spec={T.uiTableTitle} />
			</At>
			<div style={{transform: `translateY(${rowIn * 80}px)`}}>
				<Row y={rowY + 0} title="uiRow1" status="work" />
				<Row y={rowY + 80} title="uiRow2" status="done" />
			</div>
			{rowIn > 0.01 ? (
				<Row y={rowY} title="uiRow3" status={status} flash={flash} flip={flip} opacity={Math.min(1, rowIn * 2)} />
			) : null}
			{fly > 0 && fly < 1 ? (
				<div
					style={{
						position: 'absolute',
						left: cx,
						top: cy,
						width: 300,
						height: 64,
						borderRadius: 16,
						background: '#14284E',
						boxShadow: `0 0 0 2px ${COLORS.neon}, 0 0 24px ${COLORS.teal}`,
						transform: `rotate(${Math.sin(t * Math.PI) * -10}deg) scale(${1 - t * 0.25})`,
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						padding: '0 14px',
						boxSizing: 'border-box',
					}}
				>
					<Icon kind="inbox" size={36} />
					<div style={{flex: 1, height: 10, borderRadius: 5, background: '#ffffff66'}} />
				</div>
			) : null}
			<TabBar active={2} />
		</>
	);
};

// ---------- Мероприятия ----------
const EventCard: React.FC<{y: number; title: keyof typeof T; hue: string; glow: number}> = ({y, title, hue, glow}) => (
	<At
		y={y}
		w={CONTENT_W}
		style={{
			height: 150,
			borderRadius: 26,
			background: CARD,
			boxShadow: glow > 0.02 ? `0 0 0 2px ${COLORS.neon}${Math.round(glow * 255).toString(16).padStart(2, '0')}` : 'none',
		}}
	>
		<div style={{position: 'absolute', left: 22, top: 22, width: 104, height: 104, borderRadius: 20, background: hue, overflow: 'hidden'}}>
			<div style={{position: 'absolute', left: 18, top: 50, width: 70, height: 70, borderRadius: 35, background: '#ffffff30'}} />
			<div style={{position: 'absolute', left: 54, top: 26, width: 46, height: 46, borderRadius: 23, background: '#ffffff22'}} />
		</div>
		<div style={{position: 'absolute', left: 148, top: 38}}>
			<SafeText spec={T[title]} />
		</div>
		<div style={{position: 'absolute', left: 148, top: 88}}>
			<SafeText spec={T.uiEventMeta} color="#8FA6CF" />
		</div>
	</At>
);

export const EventsScreen: React.FC<{press: number; glow: number}> = ({press, glow}) => (
	<>
		<StatusBar />
		<Header back title="uiEventsTitle" />
		<EventCard y={170} title="uiEvent1" hue="#2B4C8C" glow={glow} />
		<EventCard y={340} title="uiEvent2" hue="#1C6E73" glow={glow * 0.8} />
		<EventCard y={510} title="uiEvent3" hue="#4A3A8C" glow={glow * 0.6} />
		<At
			y={712}
			w={CONTENT_W}
			style={{
				height: 86,
				borderRadius: 43,
				background: COLORS.teal,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 14,
				transform: `scale(${1 - press * 0.06})`,
				boxShadow: `0 0 ${12 + press * 34}px ${COLORS.teal}`,
			}}
		>
			<svg width="30" height="30" viewBox="0 0 30 30">
				<path d="M15 4 V20 M8 13 L15 20 L22 13 M5 25 H25" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
			<SafeText spec={T.uiReport} />
		</At>
		<TabBar active={3} />
	</>
);

/** Иконка файла отчёта, вылетающая из телефона. */
export const FileIcon: React.FC<{size?: number; variant: number}> = ({size = 120, variant}) => {
	const band = [COLORS.teal, '#3A7BFF', '#7A4DFF', COLORS.neon][variant % 4];
	return (
		<div style={{position: 'relative', width: size, height: size * 1.25}}>
			<svg width={size} height={size * 1.25} viewBox="0 0 96 120" style={{position: 'absolute', inset: 0}}>
				<path d="M8 4 H62 L88 30 V112 Q88 116 84 116 H12 Q8 116 8 112 Z" fill="#F4F8FF" />
				<path d="M62 4 V30 H88" fill="#C9D6F2" />
				<rect x="8" y="72" width="80" height="30" fill={band} />
				<path d="M22 44 H60 M22 56 H50" stroke="#9FB0D0" strokeWidth="5" strokeLinecap="round" />
			</svg>
			<div style={{position: 'absolute', left: 0, width: size, top: size * 0.6 + 4, display: 'flex', justifyContent: 'center'}}>
				<SafeText spec={T.uiFile} fontSize={size * 0.19} />
			</div>
		</div>
	);
};

/** Точка касания: кольцо расходится, заливка гаснет. */
export const Tap: React.FC<{x: number; y: number; t: number}> = ({x, y, t}) => {
	if (t <= 0 || t >= 1) return null;
	const r = 26 + t * 60;
	return (
		<div
			style={{
				position: 'absolute',
				left: x - r,
				top: y - r,
				width: r * 2,
				height: r * 2,
				borderRadius: r,
				border: `4px solid rgba(255,255,255,${1 - t})`,
				background: `rgba(63,242,224,${0.35 * (1 - t)})`,
				boxShadow: `0 0 20px rgba(63,242,224,${0.6 * (1 - t)})`,
			}}
		/>
	);
};

// ---------- Сообщения (ролик 2: «до» — хаос переписок) ----------
const CHATS: {title: keyof typeof T; hue: string}[] = [
	{title: 'v2ChatActive', hue: '#2B4C8C'},
	{title: 'v2ChatDm', hue: '#1C6E73'},
	{title: 'v2ChatComments', hue: '#4A3A8C'},
	{title: 'v2ChatOrg', hue: '#6B3A5C'},
	{title: 'v2ChatActive', hue: '#2B5C6C'},
];

/** Список переписок с непрочитанными (только точки, без счётчиков). `unread` 0..1 — насколько «горит». */
export const MessagesScreen: React.FC<{unread: number; frame: number}> = ({unread, frame}) => (
	<>
		<StatusBar />
		<At y={92}>
			<SafeText spec={T.v2Messages} />
		</At>
		{CHATS.map((c, i) => {
			const y = 170 + i * 128;
			const pulse = 0.65 + 0.35 * Math.sin(frame / 4 + i * 1.7);
			return (
				<At key={i} y={y} w={CONTENT_W} style={{height: 108}}>
					<div style={{position: 'absolute', left: 0, top: 10, width: 84, height: 84, borderRadius: 42, background: c.hue}}>
						<div style={{position: 'absolute', left: 22, top: 40, width: 40, height: 32, borderRadius: '20px 20px 6px 6px', background: '#ffffff40'}} />
						<div style={{position: 'absolute', left: 30, top: 16, width: 24, height: 24, borderRadius: 12, background: '#ffffff40'}} />
					</div>
					<div style={{position: 'absolute', left: 104, top: 16}}>
						<SafeText spec={T[c.title]} />
					</div>
					<div style={{position: 'absolute', left: 104, top: 58}}>
						<SafeText spec={T.v2PreviewQ} color="#8FA6CF" />
					</div>
					<div
						style={{
							position: 'absolute',
							right: 6,
							top: 40,
							width: 26,
							height: 26,
							borderRadius: 13,
							background: COLORS.neon,
							opacity: unread * pulse,
							transform: `scale(${0.6 + 0.4 * unread})`,
							boxShadow: `0 0 ${14 * unread}px ${COLORS.neon}`,
						}}
					/>
				</At>
			);
		})}
		<TabBar active={1} />
	</>
);
