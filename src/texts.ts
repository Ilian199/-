// Все 2D-тексты ролика в одном месте. Здесь меняются формулировки.
// Каждый текст рисуется только через <SafeText spec={T.xxx}/>: размер шрифта
// подбирается под ширину maxWidth с учётом letter-spacing и максимального масштаба
// анимации (maxScale), поэтому строка не выходит за безопасную зону 888 px.

import {SAFE} from './config';

export type TextSpec = {
	text: string;
	weight: 300 | 400 | 500 | 600 | 700;
	/** Разрядка в em. */
	letterSpacing?: number;
	/** Максимальный масштаб, до которого анимация увеличивает текст. */
	maxScale: number;
	/** Верхний предел размера шрифта, px. */
	maxFontSize: number;
	/** Доступная ширина, px (по умолчанию вся безопасная зона, 888). */
	maxWidth?: number;
};

const H = (text: string, maxFontSize: number, maxScale = 1.15, letterSpacing = -0.005): TextSpec => ({
	text,
	weight: 700,
	letterSpacing,
	maxScale,
	maxFontSize,
});

/** Ширина колонки экрана телефона (для подписей интерфейса). */
export const PHONE_TEXT_W = 520;

const UI = (text: string, maxFontSize: number, weight: TextSpec['weight'] = 500, maxWidth = PHONE_TEXT_W): TextSpec => ({
	text,
	weight,
	letterSpacing: 0,
	maxScale: 1.08,
	maxFontSize,
	maxWidth,
});

export const T = {
	// сцена 3 — проблема
	problem1: H('заявки в переписках', 150, 1.25),
	problem2: H('таблицы вручную', 150, 1.25),
	problem3: H('кто взял колонку?', 150, 1.25),
	familiar: H('знакомо?', 330, 1.3),
	// сцена 4 — слоган
	sloganA: H('рутину в', 300, 1.12),
	sloganB: H('автомат', 300, 1.12),
	// сцена 5 — приложение
	appTitle: H('«Готовые решения»', 120, 1.1),
	capBooking: H('бронь без постов на стене', 96, 1.1),
	capRequests: H('заявка сама в учёте', 96, 1.1),
	capReports: H('отчёт в пару нажатий', 96, 1.1),
	// интерфейс телефона
	uiAppName: UI('Готовые решения', 44, 700),
	uiCatalog: UI('Каталог решений', 26, 400),
	uiCard1: UI('Бронь техники и инвентаря', 33, 600, 460),
	uiCard1Sub: UI('Календарь, заявки на бронь', 23, 400, 460),
	uiCard2: UI('Приём заявок', 33, 600, 460),
	uiCard2Sub: UI('Таблица учёта, статусы, уведомления', 23, 400, 460),
	uiCard3: UI('Мероприятия и отчёты', 33, 600, 460),
	uiCard3Sub: UI('Список мероприятий, отчёт в пару нажатий', 23, 400, 460),
	uiHow: UI('Как работает', 24, 500, 200),
	uiApply: UI('Оставить заявку', 24, 600, 220),
	uiBookTitle: UI('Бронь техники и инвентаря', 33, 600, 460),
	uiBookItem: UI('Проектор', 29, 500, 200),
	uiBookItem2: UI('Колонка', 29, 500, 200),
	uiMonth: UI('Октябрь', 31, 600, 240),
	uiBooked: UI('Бронь подтверждена', 31, 600, 360),
	uiFormTitle: UI('Новая заявка', 35, 600),
	uiFieldWhat: UI('Что нужно сделать', 22, 400, 400),
	uiFieldWhatValue: UI('Афиша к мероприятию', 29, 500, 400),
	uiFieldWho: UI('Контакт', 22, 400, 400),
	uiFieldWhoValue: UI('Староста группы', 29, 500, 400),
	uiSend: UI('Отправить', 31, 600, 300),
	uiTableTitle: UI('Учёт заявок', 33, 600),
	uiRow1: UI('Пропуск на вход', 24, 500, 250),
	uiRow2: UI('Заказ аудитории', 24, 500, 250),
	uiRow3: UI('Афиша к мероприятию', 24, 500, 250),
	uiStatusNew: UI('Новая', 22, 600, 120),
	uiStatusDone: UI('Принята', 22, 600, 120),
	uiStatusWork: UI('В работе', 22, 600, 120),
	uiEventsTitle: UI('Мероприятия', 35, 600),
	uiEvent1: UI('Лекция о профессиях', 29, 600, 340),
	uiEvent2: UI('Турнир по настольным играм', 29, 600, 340),
	uiEvent3: UI('Субботник во дворе', 29, 600, 340),
	uiEventMeta: UI('участники · фото · итоги', 21, 400, 340),
	uiReport: UI('Выгрузить отчёт', 31, 600, 360),
	uiFile: UI('отчёт', 20, 500, 90),
	// сцена 6 — шаги
	step1: H('выбери решение', 150, 1.2),
	step2: H('оставь заявку', 150, 1.2),
	step3: H('мы настроим', 150, 1.2),
	// финал
	finalLink: {text: 'vk.ru/cifropraktika_petrsu', weight: 600, letterSpacing: 0, maxScale: 1.06, maxFontSize: 70, maxWidth: SAFE.maxWidth - 64},
	finalLine1: H('приложение «Готовые решения»', 76, 1.06, 0),
	finalLine2: H('в нашей группе', 76, 1.06, 0),
} satisfies Record<string, TextSpec>;

export type TextId = keyof typeof T;
