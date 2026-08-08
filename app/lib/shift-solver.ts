export interface SolverTrainee {
	id: number;
	grade: number;
	first: boolean;
	availability: boolean[];
}

export interface SolverExaminer extends SolverTrainee {
	isHigh: boolean;
}

export interface SolverInput {
	days: number;
	periodsPerDay: number;
	trainees: SolverTrainee[];
	examiners: SolverExaminer[];
}

export interface SolverSlotOutput {
	slotIndex: number;
	traineeIds: number[];
	examinerIds: number[];
}

export interface SolverOutput {
	complete: boolean;
	slots: SolverSlotOutput[];
	unassignedTraineeIds: number[];
}

const boolToken = (value: boolean) => (value ? 'TRUE' : 'FALSE');

function validateInput(input: SolverInput): number {
	if (!Number.isInteger(input.days) || input.days < 1) {
		throw new Error('days must be a positive integer');
	}
	if (!Number.isInteger(input.periodsPerDay) || input.periodsPerDay < 1) {
		throw new Error('periodsPerDay must be a positive integer');
	}
	const slotCount = input.days * input.periodsPerDay;
	if (input.trainees.length < 1 || input.examiners.length < 1) {
		throw new Error('at least one trainee and examiner are required');
	}
	const participants = [...input.trainees, ...input.examiners];
	if (
		new Set(participants.map((person) => person.id)).size !== participants.length
	) {
		throw new Error('participant IDs must be unique');
	}
	for (const person of participants) {
		if (!Number.isInteger(person.id) || !Number.isInteger(person.grade)) {
			throw new Error('participant ID and grade must be integers');
		}
		if (person.availability.length !== slotCount) {
			throw new Error(`availability must contain exactly ${slotCount} values`);
		}
	}
	return slotCount;
}

/** input-format.pdfと同じ標準入力テキストを生成する。 */
export function serializeSolverInput(input: SolverInput): string {
	validateInput(input);
	const lines = [
		`${input.trainees.length} ${input.examiners.length}`,
		`${input.days} ${input.periodsPerDay}`,
	];
	for (const trainee of input.trainees) {
		lines.push(
			[
				trainee.id,
				trainee.grade,
				boolToken(trainee.first),
				...trainee.availability.map(boolToken),
			].join(' '),
		);
	}
	for (const examiner of input.examiners) {
		lines.push(
			[
				examiner.id,
				examiner.grade,
				boolToken(examiner.first),
				boolToken(examiner.isHigh),
				...examiner.availability.map(boolToken),
			].join(' '),
		);
	}
	return `${lines.join('\n')}\n`;
}

/** output-format.pdfに従うJSONを検証して読み込む。 */
export function parseSolverOutput(value: string | unknown): SolverOutput {
	const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
	if (!parsed || typeof parsed !== 'object')
		throw new Error('invalid solver output');
	const output = parsed as Partial<SolverOutput>;
	if (
		typeof output.complete !== 'boolean' ||
		!Array.isArray(output.slots) ||
		!Array.isArray(output.unassignedTraineeIds)
	) {
		throw new Error('invalid solver output');
	}
	for (const slot of output.slots) {
		if (
			!Number.isInteger(slot?.slotIndex) ||
			!Array.isArray(slot?.traineeIds) ||
			!Array.isArray(slot?.examinerIds) ||
			!slot.traineeIds.every(Number.isInteger) ||
			!slot.examinerIds.every(Number.isInteger)
		) {
			throw new Error('invalid solver slot');
		}
	}
	if (!output.unassignedTraineeIds.every(Number.isInteger)) {
		throw new Error('invalid unassigned trainee IDs');
	}
	return output as SolverOutput;
}

/**
 * PDF仕様と同じ制約でローカルに解く。
 * 研修生と枠の最大マッチング後、1人構成へ試験官2人、2人構成へ3人を割り当てる。
 */
export function solveSchedule(input: SolverInput): SolverOutput {
	const slotCount = validateInput(input);
	const examinerCandidates = Array.from({ length: slotCount }, (_, slotIndex) =>
		input.examiners.filter((person) => person.availability[slotIndex]),
	);

	// 試験官2人なら研修生1人、3人以上なら研修生2人まで受け入れられる。
	const seats = examinerCandidates.flatMap((candidates, slotIndex) =>
		Array.from(
			{ length: candidates.length >= 3 ? 2 : candidates.length >= 2 ? 1 : 0 },
			() => ({ slotIndex }),
		),
	);
	const seatToTrainee = new Map<number, number>();
	const traineeById = new Map(
		input.trainees.map((person) => [person.id, person]),
	);
	const candidateSeatIndexes = new Map(
		input.trainees.map((trainee) => [
			trainee.id,
			seats.flatMap((seat, index) =>
				trainee.availability[seat.slotIndex] ? [index] : [],
			),
		]),
	);

	const tryAssign = (traineeId: number, visited: Set<number>): boolean => {
		for (const seatIndex of candidateSeatIndexes.get(traineeId) ?? []) {
			if (visited.has(seatIndex)) continue;
			visited.add(seatIndex);
			const current = seatToTrainee.get(seatIndex);
			if (current === undefined || tryAssign(current, visited)) {
				seatToTrainee.set(seatIndex, traineeId);
				return true;
			}
		}
		return false;
	};

	const orderedTrainees = [...input.trainees].sort(
		(a, b) =>
			(candidateSeatIndexes.get(a.id)?.length ?? 0) -
			(candidateSeatIndexes.get(b.id)?.length ?? 0),
	);
	for (const trainee of orderedTrainees) tryAssign(trainee.id, new Set());

	const traineeIdsBySlot = Array.from(
		{ length: slotCount },
		() => [] as number[],
	);
	for (const [seatIndex, traineeId] of seatToTrainee) {
		traineeIdsBySlot[seats[seatIndex].slotIndex].push(traineeId);
	}

	const examinerAssignmentCount = new Map(
		input.examiners.map((person) => [person.id, 0]),
	);
	const slots = traineeIdsBySlot.map((traineeIds, slotIndex) => {
		const requiredExaminers =
			traineeIds.length >= 2 ? 3 : traineeIds.length === 1 ? 2 : 0;
		const examinerIds = [...examinerCandidates[slotIndex]]
			.sort((a, b) => {
				const aCount = examinerAssignmentCount.get(a.id) ?? 0;
				const bCount = examinerAssignmentCount.get(b.id) ?? 0;
				const aScore = aCount / (a.isHigh ? 2 : 1);
				const bScore = bCount / (b.isHigh ? 2 : 1);
				return (
					aScore - bScore || Number(b.isHigh) - Number(a.isHigh) || a.id - b.id
				);
			})
			.slice(0, requiredExaminers)
			.map((person) => person.id);
		for (const examinerId of examinerIds) {
			examinerAssignmentCount.set(
				examinerId,
				(examinerAssignmentCount.get(examinerId) ?? 0) + 1,
			);
		}
		return { slotIndex, traineeIds, examinerIds };
	});

	const assignedTrainees = new Set(slots.flatMap((slot) => slot.traineeIds));
	const unassignedTraineeIds = input.trainees
		.filter((trainee) => !assignedTrainees.has(trainee.id))
		.map((trainee) => trainee.id);
	// Mapを参照して、入力に存在しないIDが混入しないことも明示的に保証する。
	for (const id of assignedTrainees) {
		if (!traineeById.has(id))
			throw new Error('solver generated an unknown trainee ID');
	}
	return {
		complete: unassignedTraineeIds.length === 0,
		slots,
		unassignedTraineeIds,
	};
}
