import { afterEach, describe, expect, it, vi } from 'vitest';
import { getShiftDayLabels } from '../lib/shift-days';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('getShiftDayLabels', () => {
	it('通常シフトでは曜日を返す', async () => {
		await expect(
			getShiftDayLabels({ year: 2026, semester: 'spring', module: 'A' }),
		).resolves.toEqual(['月', '火', '水', '木', '金', '土', '日']);
	});

	it('夏休み第2週では夏季休業開始後の第2月曜日から日付を返す', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () =>
					'BEGIN:VEVENT\nSUMMARY:夏季休業開始\nDTSTART;VALUE=DATE:20260808\nEND:VEVENT',
			}),
		);

		await expect(
			getShiftDayLabels({ year: 2026, semester: 'summer', module: '2' }),
		).resolves.toEqual([
			'8/17(月)',
			'8/18(火)',
			'8/19(水)',
			'8/20(木)',
			'8/21(金)',
			'8/22(土)',
			'8/23(日)',
		]);
	});

	it('保存された開始日が週末の場合も次の月曜日から表示する', async () => {
		await expect(
			getShiftDayLabels({
				year: 2026,
				semester: 'summer',
				module: '3',
				startDate: '2026-08-22',
			}),
		).resolves.toEqual([
			'8/24(月)',
			'8/25(火)',
			'8/26(水)',
			'8/27(木)',
			'8/28(金)',
			'8/29(土)',
			'8/30(日)',
		]);
	});
});
