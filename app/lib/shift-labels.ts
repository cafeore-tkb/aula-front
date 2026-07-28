export const getSemesterLabel = (semester: string): string => {
	switch (semester) {
		case 'spring':
			return '春';
		case 'summer':
			return '夏休み';
		case 'autumn':
			return '秋';
		default:
			return semester;
	}
};

export const getSemesterDisplay = (semester: string): string =>
	semester === 'summer'
		? getSemesterLabel(semester)
		: `${getSemesterLabel(semester)}学期`;

const parseWeekNumber = (value: string): number | null => {
	if (!/^\d+$/.test(value)) {
		return null;
	}

	const week = Number.parseInt(value, 10);
	return week > 0 ? week : null;
};

export const getModuleDisplay = (
	semester: string,
	module: string,
): string => {
	if (semester === 'summer') {
		const week = parseWeekNumber(module);
		return week ? `第${week}週` : module;
	}

	return `${module}モジュール`;
};