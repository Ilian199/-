// Ролик 2 «Телефон организатора»: все тайминги в долях (125 BPM, как в первом ролике).
import {beatToFrame} from '../config';

/** Сцены: [начало, конец) в долях. */
export const SCENES2 = {
	chaos: {from: 0, to: 8}, // крючок и поток уведомлений
	slogan: {from: 8, to: 11}, // свайп, «рутину в автомат», дроп на 9-й доле
	tower: {from: 11, to: 14}, // короткий 3D-стингер: башня с медиафасадом
	booking: {from: 14, to: 20},
	requests: {from: 20, to: 26},
	reports: {from: 26, to: 31},
	calm: {from: 31, to: 34}, // уведомлений больше нет
	cta: {from: 34, to: 42}, // карточка с призывом
} as const;

export const TOTAL_BEATS2 = 42;
export const DURATION2 = beatToFrame(TOTAL_BEATS2);

/** Крючок и уведомления (доли от начала ролика). */
export const CHAOS_BEATS = {
	hook: 0,
	captions: [2, 4, 6] as const,
	/** Уведомления: сначала по половинкам, к концу — по шестнадцатым (ускорение к дропу). */
	notifications: [0.25, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.375, 7.5] as const,
	/** Смахивание начинается здесь и заканчивается ровно на доле 8. */
	swipe: 7.7,
};

/** Слоган (доли от начала сцены slogan). */
export const SLOGAN2_BEATS = {line: 0.5, plate: 1, zoomThrough: 2.4};

/** Демонстрации (доли от начала своей сцены). */
export const DEMO2_BEATS = {
	booking: {tap: 1.5, toast: 2.5},
	requests: {tap: 1, rowIn: 2, accepted: 3.5},
	reports: {tap: 1.5},
};

/** Финальная карточка (доли от начала сцены cta). */
export const CTA_BEATS = {logo: 0, title: 0.5, words: [1, 1.5, 2] as const, line1: 3, line2: 3.5, link: 4, finalHit: 4};
