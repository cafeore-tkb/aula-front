import { describe, expect, it } from 'vitest';
import {
	parseSolverOutput,
	type SolverInput,
	serializeSolverInput,
	solveSchedule,
} from '../lib/shift-solver';

const input: SolverInput = {
	days: 2,
	periodsPerDay: 3,
	trainees: [
		{
			id: 101,
			grade: 1,
			first: true,
			availability: [true, false, true, false, true, false],
		},
		{
			id: 102,
			grade: 2,
			first: false,
			availability: [false, true, false, true, false, true],
		},
	],
	examiners: [
		{
			id: 201,
			grade: 3,
			first: false,
			isHigh: true,
			availability: [true, true, false, false, true, true],
		},
		{
			id: 202,
			grade: 4,
			first: true,
			isHigh: false,
			availability: [false, true, false, true, true, false],
		},
		{
			id: 203,
			grade: 2,
			first: false,
			isHigh: false,
			availability: [true, false, true, true, false, true],
		},
	],
};

describe('shift solver format adapter', () => {
	it('input-format.pdfの行構成でシリアライズする', () => {
		const lines = serializeSolverInput(input).trimEnd().split('\n');
		expect(lines).toHaveLength(7);
		expect(lines[0]).toBe('2 3');
		expect(lines[1]).toBe('2 3');
		expect(lines[2]).toBe('101 1 TRUE TRUE FALSE TRUE FALSE TRUE FALSE');
		expect(lines[4]).toBe('201 3 FALSE TRUE TRUE TRUE FALSE FALSE TRUE TRUE');
	});

	it('参加可能なメンバーだけで全練習生を割り当てる', () => {
		const output = solveSchedule(input);
		expect(output.complete).toBe(true);
		expect(output.slots).toHaveLength(6);
		expect(output.unassignedTraineeIds).toEqual([]);
		expect(output.slots.flatMap((slot) => slot.traineeIds).sort()).toEqual([
			101, 102,
		]);
		for (const slot of output.slots.filter((item) => item.traineeIds.length)) {
			expect(slot.examinerIds).toHaveLength(2);
		}
	});

	it('output-format.pdfのJSONを検証して読み込む', () => {
		const output = solveSchedule(input);
		expect(parseSolverOutput(JSON.stringify(output))).toEqual(output);
		expect(() => parseSolverOutput('{"complete":true}')).toThrow(
			'invalid solver output',
		);
	});
});
