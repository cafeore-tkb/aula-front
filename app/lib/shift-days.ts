export const WEEKDAY_LABELS = [
	'月',
	'火',
	'水',
	'木',
	'金',
	'土',
	'日',
] as const;

interface ShiftDayOptions {
	year?: number;
	semester?: string;
	module?: string;
	startDate?: string;
}

const addUtcDays = (date: Date, days: number) => {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
};

const parseDate = (value: string): Date | null => {
	const match = value.match(/^(\d{4})-?(\d{2})-?(\d{2})$/);
	if (!match) return null;

	return new Date(
		Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
	);
};

const DATE_WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

const formatDateLabel = (date: Date) =>
	`${date.getUTCMonth() + 1}/${date.getUTCDate()}(${DATE_WEEKDAY_LABELS[date.getUTCDay()]})`;

const moveToNextMonday = (date: Date) => {
	const daysUntilMonday = (8 - date.getUTCDay()) % 7;
	return addUtcDays(date, daysUntilMonday);
};

const getVacationStartFromIcs = async (year: number): Promise<Date | null> => {
	try {
		const response = await fetch(`/tsukuba-calender/${year}-tsukuba.ics`);
		if (!response.ok) return null;

		const lines = (await response.text())
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n')
			.split('\n');
		const summaryIndex = lines.findIndex((line) =>
			line.includes('SUMMARY:夏季休業開始'),
		);
		if (summaryIndex < 0) return null;

		const dateLine = lines
			.slice(summaryIndex + 1)
			.find((line) => line.startsWith('DTSTART'));
		const value = dateLine?.slice(dateLine.indexOf(':') + 1).trim();
		return value ? parseDate(value) : null;
	} catch (error) {
		console.error('夏休み開始日の読み込みに失敗しました:', error);
		return null;
	}
};

export const getShiftDayLabels = async ({
	year,
	semester,
	module,
	startDate,
}: ShiftDayOptions): Promise<string[]> => {
	if (semester !== 'summer') return [...WEEKDAY_LABELS];

	const explicitStart = startDate ? parseDate(startDate) : null;
	const vacationStart =
		explicitStart ?? (year ? await getVacationStartFromIcs(year) : null);
	const week = Number.parseInt(module ?? '', 10);
	if (!vacationStart || !Number.isInteger(week) || week < 1) {
		return [...WEEKDAY_LABELS];
	}

	const firstMonday = moveToNextMonday(vacationStart);
	const weekStart = explicitStart
		? firstMonday
		: addUtcDays(firstMonday, (week - 1) * 7);

	return Array.from({ length: 7 }, (_, index) =>
		formatDateLabel(addUtcDays(weekStart, index)),
	);
};
