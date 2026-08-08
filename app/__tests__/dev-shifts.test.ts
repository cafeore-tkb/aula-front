import { beforeEach, describe, expect, it } from 'vitest';
import { createShift, getShift, listShifts, updateShift } from '../lib/api';

const shiftInput = {
	year: 2026,
	semester: 'spring' as const,
	module: 'A' as const,
	startDate: '2026-04-01',
	endDate: '2026-05-31',
	requiredSessionsPerWeek: 1 as const,
	isVacation: false,
};

describe('development shift store', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('シフトを作成・一覧取得・更新できる', async () => {
		const created = await createShift(shiftInput);
		expect(created.version).toBe(1);
		expect(created.isOpen).toBe(false);
		expect(await listShifts('limit=100')).toEqual([created]);
		expect(await getShift(created.shiftId)).toEqual(created);

		const updated = await updateShift(created.shiftId, {
			isOpen: true,
			version: created.version,
		});
		expect(updated.isOpen).toBe(true);
		expect(updated.version).toBe(2);
		expect(await listShifts('isOpen=true')).toEqual([updated]);
	});

	it('年度・学期・モジュールの重複を拒否する', async () => {
		await createShift(shiftInput);
		await expect(createShift(shiftInput)).rejects.toMatchObject({
			status: 409,
			code: 'RESOURCE_CONFLICT',
		});
	});
});
