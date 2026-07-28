import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
	getModuleDisplay,
	getSemesterDisplay,
} from './shift-labels';

type Semester = 'spring' | 'summer' | 'autumn';
type Module = 'A' | 'B' | 'C' | `${number}`;

export interface ExportResult {
	success: boolean;
	message: string;
}

interface HolidayEntry {
	date: Date;
	type: 'holiday' | 'sub_day';
	subDay?: string;
	note?: string;
}

const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日'];

const DAY_TO_RRULE: Record<string, string> = {
	月: 'MO',
	火: 'TU',
	水: 'WE',
	木: 'TH',
	金: 'FR',
	土: 'SA',
	日: 'SU',
};

const DAY_TO_JS: Record<string, number> = {
	日: 0,
	月: 1,
	火: 2,
	水: 3,
	木: 4,
	金: 5,
	土: 6,
};

const PERIOD_TIMES: Record<number, { startTime: string; endTime: string }> = {
	0: { startTime: '08:40', endTime: '09:55' },
	1: { startTime: '10:10', endTime: '11:25' },
	2: { startTime: '12:15', endTime: '13:30' },
	3: { startTime: '13:45', endTime: '15:00' },
	4: { startTime: '15:15', endTime: '16:30' },
	5: { startTime: '16:45', endTime: '18:00' },
	6: { startTime: '18:15', endTime: '19:30' },
	7: { startTime: '19:45', endTime: '21:00' },
};

const pad2 = (n: number) => String(n).padStart(2, '0');

function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
}

function parseIcsDate(value: string): Date {
	const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
	if (!m) throw new Error(`Invalid ICS date: ${value}`);
	return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function unfoldIcsLines(text: string): string[] {
	return text
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.replace(/\n[ \t]/g, '')
		.split('\n');
}

function unescapeIcal(str: string): string {
	return str
		.replace(/\\n/g, '\n')
		.replace(/\\,/g, ',')
		.replace(/\\;/g, ';')
		.replace(/\\\\/g, '\\');
}

function escapeIcal(str: string): string {
	return str
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\n/g, '\\n');
}

function toIcalLocal(date: Date, timeStr: string): string {
	const [h, m] = timeStr.split(':').map(Number);
	const d = new Date(date);
	d.setHours(h, m, 0, 0);

	return (
		`${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
		`T${pad2(d.getHours())}${pad2(d.getMinutes())}00`
	);
}

function toIcalUtc(date: Date): string {
	return (
		`${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
		`T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
	);
}

function toIcalUntil(end: Date): string {
	const d = new Date(end);
	d.setHours(23, 59, 59, 0);
	return toIcalUtc(d);
}

interface IcsEvent {
	summary: string;
	start: Date;
	end?: Date;
}

async function loadTsukubaIcs(year: number): Promise<string> {
	const res = await fetch(`/tsukuba-calender/${year}-tsukuba.ics`);

	if (!res.ok) {
		throw new Error(`${year}年度の筑波大学カレンダーICSを読み込めません。`);
	}

	return await res.text();
}

function parseIcsEvents(icsText: string): IcsEvent[] {
	const lines = unfoldIcsLines(icsText);
	const events: IcsEvent[] = [];

	let inEvent = false;
	let summary = '';
	let start: Date | null = null;
	let end: Date | undefined;

	for (const line of lines) {
		if (line === 'BEGIN:VEVENT') {
			inEvent = true;
			summary = '';
			start = null;
			end = undefined;
			continue;
		}

		if (line === 'END:VEVENT') {
			if (inEvent && summary && start) {
				events.push({ summary, start, end });
			}
			inEvent = false;
			continue;
		}

		if (!inEvent) continue;

		const colon = line.indexOf(':');
		if (colon === -1) continue;

		const name = line.slice(0, colon);
		const value = line.slice(colon + 1);

		if (name.startsWith('SUMMARY')) {
			summary = unescapeIcal(value);
		}

		if (name.startsWith('DTSTART')) {
			start = parseIcsDate(value);
		}

		if (name.startsWith('DTEND')) {
			end = addDays(parseIcsDate(value), -1);
		}
	}

	return events;
}

async function getAcademicCalendar(year: number): Promise<IcsEvent[]> {
	const icsText = await loadTsukubaIcs(year);
	return parseIcsEvents(icsText);
}

function findFirst(events: IcsEvent[], keyword: string): IcsEvent | undefined {
	return events.find((e) => e.summary.includes(keyword));
}

function findAll(events: IcsEvent[], keyword: string): IcsEvent[] {
	return events
		.filter((e) => e.summary.includes(keyword))
		.sort((a, b) => a.start.getTime() - b.start.getTime());
}

async function getModuleDateRange(
	year: number,
	semester: Semester,
	module: Module,
): Promise<{ start: Date; end: Date }> {
	const events = await getAcademicCalendar(year);

	if (semester === 'summer') {
		const vacationStart = findFirst(events, '夏季休業開始')?.start;
		const vacationEnd = findFirst(events, '夏季休業終了')?.start;
		const week = Number.parseInt(module, 10);

		if (!vacationStart || !vacationEnd) {
			throw new Error(
				`${year}年度 夏休み期間の開始・終了日がICSから見つかりません。`,
			);
		}

		if (!Number.isInteger(week) || week <= 0) {
			throw new Error('夏休みシフトのモジュールは1以上の週番号を指定してください。');
		}

		const start = addDays(vacationStart, (week - 1) * 7);
		const end = addDays(start, 6);

		if (start > vacationEnd) {
			throw new Error(
				`${year}年度 夏休み第${week}週は夏休み期間外のためエクスポートできません。`,
			);
		}

		return {
			start,
			end: end > vacationEnd ? vacationEnd : end,
		};
	}

	const semJa = semester === 'spring' ? '春' : '秋';

	const semesterStart = findFirst(events, `${semJa}学期授業開始`)?.start;
	const semesterEnd = findFirst(events, `${semJa}学期授業終了`)?.start;

	if (!semesterStart || !semesterEnd) {
		throw new Error(`${year}年度 ${semJa}学期の開始・終了日がICSから見つかりません。`);
	}

	const reserveA = findAll(events, `${semJa}Aモジュール後予備日`);
	const reserveB = findAll(events, `${semJa}Bモジュール後予備日`);

	if (module === 'A') {
		return {
			start: semesterStart,
			end: reserveA.length > 0 ? addDays(reserveA[0].start, -1) : semesterEnd,
		};
	}

	if (module === 'B') {
		return {
			start: reserveA.length > 0 ? addDays(reserveA[reserveA.length - 1].start, 1) : semesterStart,
			end: reserveB.length > 0 ? addDays(reserveB[0].start, -1) : semesterEnd,
		};
	}

	return {
		start: reserveB.length > 0 ? addDays(reserveB[reserveB.length - 1].start, 1) : semesterStart,
		end: semesterEnd,
	};
}

async function getHolidays(year: number): Promise<HolidayEntry[]> {
	const events = await getAcademicCalendar(year);
	const result: HolidayEntry[] = [];

	for (const e of events) {
		const sub = e.summary.match(/^([月火水木金土日])曜授業$/);

		if (sub) {
			result.push({
				date: e.start,
				type: 'sub_day',
				subDay: sub[1],
				note: e.summary,
			});
			continue;
		}

		const ignore =
			e.summary.includes('授業開始') ||
			e.summary.includes('授業終了') ||
			e.summary.includes('休業開始') ||
			e.summary.includes('休業終了') ||
			e.summary.includes('モジュール後予備日');

		if (!ignore) {
			result.push({
				date: e.start,
				type: 'holiday',
				note: e.summary,
			});
		}
	}

	return result;
}

function getFirstOccurrence(start: Date, targetJsDay: number): Date {
	const d = new Date(start);
	d.setDate(d.getDate() + ((targetJsDay - d.getDay() + 7) % 7));
	return d;
}

function buildExdates(
	holidays: HolidayEntry[],
	dayName: string,
	startTime: string,
	start: Date,
	end: Date,
): string[] {
	const jsDay = DAY_TO_JS[dayName];

	return holidays
		.filter((h) => {
			if (h.date < start || h.date > end) return false;

			if (h.type === 'holiday') {
				return h.date.getDay() === jsDay;
			}

			if (h.type === 'sub_day') {
				return h.date.getDay() === jsDay;
			}

			return false;
		})
		.map((h) => toIcalLocal(h.date, startTime));
}

function buildRdates(
	holidays: HolidayEntry[],
	dayName: string,
	startTime: string,
	start: Date,
	end: Date,
): string[] {
	return holidays
		.filter((h) => {
			if (h.date < start || h.date > end) return false;
			return h.type === 'sub_day' && h.subDay === dayName;
		})
		.map((h) => toIcalLocal(h.date, startTime));
}

function getIdFromUserLikeObject(u: any): string | null {
	if (!u) return null;

	if (typeof u === 'string') return u;

	return (
		u.uid ??
		u.userId ??
		u.id ??
		u.email ??
		null
	);
}

function getAssignedUserIds(slot: any): string[] {
	if (!slot) return [];

	const ids: string[] = [];

	const pushOne = (value: any) => {
		const id = getIdFromUserLikeObject(value);
		if (id) ids.push(id);
	};

	const pushArray = (values: any) => {
		if (!Array.isArray(values)) return;
		for (const v of values) pushOne(v);
	};

	pushArray(slot.userIds);
	pushArray(slot.assignedUserIds);
	pushArray(slot.users);
	pushArray(slot.assignedUsers);

	pushArray(slot.assignedExaminers);
	pushArray(slot.assignedTrainees);

	pushOne(slot.userId);
	pushOne(slot.uid);
	pushOne(slot.assignedUserId);
	pushOne(slot.assignedUser);
	pushOne(slot.user);

	return [...new Set(ids)];
}

function getNameFromUserLikeObject(u: any): string | null {
	if (!u) return null;

	if (typeof u === 'string') return null;

	return (
		u.name ??
		u.displayName ??
		u.userName ??
		u.email ??
		null
	);
}

function getNamesFromUserArray(values: any): (string)[] {
	if (!Array.isArray(values)) return [];

	return values
		.map((u) => getNameFromUserLikeObject(u))
		.filter((name): name is string => name !== null);
}

function convertConfirmedScheduleToScheduleData(
	confirmedData: any,
	userId: string,
) {
	const result: any[] = [];
	const confirmedSchedule = confirmedData.confirmedSchedule ?? [];

	for (const periodRow of confirmedSchedule) {
		const periodIndex = periodRow.periodIndex;
		const periodLabel = periodRow.periodLabel ?? `${periodIndex + 1}限`;
		const slots = periodRow.slots ?? [];

		const time = PERIOD_TIMES[periodIndex];
		if (!time) continue;

		for (let dayIndex = 0; dayIndex < slots.length; dayIndex++) {
			const slot = slots[dayIndex];
			const day = DAY_NAMES[dayIndex];

			if (!slot || !day) continue;

			const examinerIds = getAssignedUserIds({
				assignedUsers: slot.assignedExaminers ?? [],
			});

			const traineeIds = getAssignedUserIds({
				assignedUsers: slot.assignedTrainees ?? [],
			});

			const isExaminer = examinerIds.includes(userId);
			const isTrainee = traineeIds.includes(userId);

			if (!isExaminer && !isTrainee) continue;

			const examinerNames = getNamesFromUserArray(slot.assignedExaminers);
			const traineeNames = getNamesFromUserArray(slot.assignedTrainees);

			let partnerLabel = '';
			let partnerNames: string[] = [];

			if (isExaminer) {
				partnerLabel = '練習生';
				partnerNames = traineeNames;
			} else if (isTrainee) {
				partnerLabel = '試験官';
				partnerNames = examinerNames;
			}

			result.push({
				day,
				period: String(periodIndex + 1),
				periodLabel,
				startTime: time.startTime,
				endTime: time.endTime,
				isSelected: true,
				canBeAssigned: true,
				partnerLabel,
				partnerNames,
			});
		}
	}

	return result;
}

export async function generateIcalContent(
	scheduleData: any[],
	shiftInfo: { year: number; semester: Semester; module: Module },
	userName: string,
): Promise<string> {
	const { start, end } = await getModuleDateRange(
		shiftInfo.year,
		shiftInfo.semester,
		shiftInfo.module,
	);

	const holidays = await getHolidays(shiftInfo.year);

	const until = toIcalUntil(end);
	const dtstamp = toIcalUtc(new Date());
	const now = Date.now();

	const events = scheduleData
		.filter((cell) => cell.isSelected === true || cell.canBeAssigned === true)
		.map((cell, i) => {
			const jsDay = DAY_TO_JS[cell.day];
			const rruleDay = DAY_TO_RRULE[cell.day];

			if (jsDay === undefined || !rruleDay) return null;

			const firstDate = getFirstOccurrence(start, jsDay);
			const dtstart = toIcalLocal(firstDate, cell.startTime);
			const dtend = toIcalLocal(firstDate, cell.endTime);

			const uid =
				`aula-confirmed-${shiftInfo.year}-${shiftInfo.semester}-${shiftInfo.module}-` +
				`${cell.day}-${cell.period}-${now}-${i}@aula`;

			const summary = escapeIcal(
				`珈琲・俺練習シフト ${cell.day}曜 ${cell.period}限 (${cell.startTime}〜${cell.endTime})`,
			);

			const partnerText =
				cell.partnerLabel && cell.partnerNames?.length > 0
					? `${cell.partnerLabel}: ${cell.partnerNames.join('、')}`
					: `担当: ${userName}`;

			const description = escapeIcal(
				`${shiftInfo.year}年度 ${getSemesterDisplay(shiftInfo.semester)} ${getModuleDisplay(shiftInfo.semester, shiftInfo.module)}\n${partnerText}`,
			);

			const exdates = buildExdates(holidays, cell.day, cell.startTime, start, end);
			const rdates = buildRdates(holidays, cell.day, cell.startTime, start, end);

			const exdateLine =
				exdates.length > 0
					? `EXDATE;TZID=Asia/Tokyo:${exdates.join(',')}`
					: null;

			const rdateLine =
				rdates.length > 0
					? `RDATE;TZID=Asia/Tokyo:${rdates.join(',')}`
					: null;

			return [
				'BEGIN:VEVENT',
				`UID:${uid}`,
				`DTSTAMP:${dtstamp}`,
				`DTSTART;TZID=Asia/Tokyo:${dtstart}`,
				`DTEND;TZID=Asia/Tokyo:${dtend}`,
				`RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};UNTIL=${until}`,
				exdateLine,
				rdateLine,
				`SUMMARY:${summary}`,
				`DESCRIPTION:${description}`,
				'END:VEVENT',
			]
				.filter(Boolean)
				.join('\r\n');
		})
		.filter(Boolean);

	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Aula//Confirmed Shift Calendar//JA',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'X-WR-CALNAME:Aula 珈琲・俺練習シフト',
		'X-WR-TIMEZONE:Asia/Tokyo',
		...events,
		'END:VCALENDAR',
	].join('\r\n') + '\r\n';
}

export function downloadIcal(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();

	URL.revokeObjectURL(url);
}

export async function exportShiftToIcal(
	userId: string,
	userName: string,
	shift: {
		year: number;
		semester: string;
		module: string;
		scheduleCollectionId?: string;
	},
): Promise<ExportResult> {
	try {
		const confirmedShiftId = `${shift.year}_${shift.semester}_${shift.module}`;

		const confirmedRef = doc(db, 'confirmed_shift', confirmedShiftId);
		const confirmedSnap = await getDoc(confirmedRef);

		if (!confirmedSnap.exists()) {
			return {
				success: false,
				message: '確定シフトがまだ作成されていません。',
			};
		}

		const confirmedData = confirmedSnap.data();

		const scheduleData = convertConfirmedScheduleToScheduleData(
			confirmedData,
			userId,
		);

		if (scheduleData.length === 0) {
			return {
				success: false,
				message: 'あなたに割り当てられた確定シフトがありません。',
			};
		}

		const content = await generateIcalContent(
			scheduleData,
			{
				year: shift.year,
				semester: shift.semester as Semester,
				module: shift.module as Module,
			},
			userName,
		);

		const filename =
			`珈琲・俺練習シフト_${shift.year}年度_${getSemesterDisplay(shift.semester)}_${getModuleDisplay(shift.semester, shift.module)}.ics`;

		downloadIcal(content, filename);

		return {
			success: true,
			message: '確定シフトのカレンダーをダウンロードしました！',
		};
	} catch (error) {
		console.error('confirmed shift iCal export error:', error);
		const msg = error instanceof Error ? error.message : 'エクスポートに失敗しました';
		return { success: false, message: msg };
	}
}