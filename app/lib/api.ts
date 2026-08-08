const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(
	/\/$/,
	'',
);
const DEV_AUTH_ENABLED =
	import.meta.env.DEV && import.meta.env.VITE_DEV_MODE === 'true';

export interface ApiErrorBody {
	code: string;
	message: string;
	details?: Array<{ field?: string; reason: string }>;
	requestId?: string;
}

export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details?: ApiErrorBody['details'];

	constructor(status: number, body?: ApiErrorBody) {
		super(body?.message || `API request failed (${status})`);
		this.name = 'ApiError';
		this.status = status;
		this.code = body?.code || 'UNKNOWN_ERROR';
		this.details = body?.details;
	}
}

interface ApiEnvelope<T> {
	data: T;
	pagination?: {
		nextCursor: string | null;
		hasNext: boolean;
		limit: number;
	};
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	if (
		init.body &&
		!(init.body instanceof FormData) &&
		!headers.has('Content-Type')
	) {
		headers.set('Content-Type', 'application/json');
	}
	headers.set('Accept', 'application/json');

	const response = await fetch(`${API_BASE_URL}${path}`, {
		...init,
		headers,
		credentials: 'include',
	});

	if (response.status === 204) {
		return undefined as T;
	}

	const contentType = response.headers.get('content-type') || '';
	const payload = contentType.includes('application/json')
		? await response.json()
		: null;

	if (!response.ok) {
		throw new ApiError(response.status, payload?.error);
	}

	return (payload as ApiEnvelope<T>).data;
}

export interface AuthUser {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
}

export interface CafeoreStatus {
	statusId: string;
	name: string;
	isFirstYear: boolean;
	isExaminer: boolean;
	isApprentice: boolean;
	version: number;
}

interface ApiUser {
	userId: string;
	name: string;
	displayName: string;
	email: string;
	entranceYear: number;
	photoUrl: string | null;
	cafeoreStatusId: string;
	cafeoreStatus?: CafeoreStatus;
	isAdmin: boolean;
	isGraduated: boolean;
	createdAt: string;
	updatedAt: string;
	lastLoginAt: string | null;
	version: number;
}

export interface UserProfile extends ApiUser {
	// Existing components use these aliases while the migration is in progress.
	uid: string;
	gmail: string;
	year: number;
	photoURL?: string;
	isFirstYear: boolean;
	isExaminer: boolean;
}

function normalizeUser(user: ApiUser): UserProfile {
	const statusId = user.cafeoreStatusId || '';
	return {
		...user,
		uid: user.userId,
		gmail: user.email,
		year: user.entranceYear,
		photoURL: user.photoUrl || undefined,
		isFirstYear: user.cafeoreStatus?.isFirstYear ?? statusId.includes('first'),
		isExaminer: user.cafeoreStatus?.isExaminer ?? statusId.includes('examiner'),
	};
}

export interface AuthSession {
	authenticated: boolean;
	identity: { email: string };
	hasProfile: boolean;
	user: ApiUser | null;
}

export interface Shift {
	shiftId: string;
	year: number;
	semester: 'spring' | 'summer' | 'autumn';
	module: 'A' | 'B' | 'C' | `${number}`;
	startDate: string;
	endDate: string;
	requiredSessionsPerWeek: 1 | 2;
	isVacation: boolean;
	isOpen: boolean;
	createdAt: string;
	updatedAt: string;
	version: number;
}

export interface ShiftUsual extends Shift {
	uid: string;
	isTwice: boolean;
	isScheduled: boolean;
}

export interface ShiftListItem {
	uid: string;
	shiftId: string;
	year: number;
	semester: string;
	module: string;
	isScheduled: boolean;
	comment?: string;
}

export interface Slot {
	slotId: string;
	shiftId: string;
	eventId: string;
	positionId: string;
	dayOfWeek: number;
	period: number;
	displayOrder: number;
	startTime: string;
	endTime: string;
	version: number;
}

export interface BusinessEvent {
	eventId: string;
	name: string;
	startDate: string;
	endDate: string;
	createdAt: string;
	updatedAt: string;
	version: number;
}

export interface EventPosition {
	positionId: string;
	eventId: string;
	name: string;
	description: string | null;
	displayOrder: number;
	createdAt: string;
	updatedAt: string;
	version: number;
}

export interface ShiftResponseAnswer {
	slotId: string;
	isAvailable: boolean;
}

export interface ShiftResponse {
	responseId: string;
	shiftId: string;
	userId: string;
	user?: UserProfile;
	frequency: 'ONCE_WEEKLY' | 'TWICE_WEEKLY' | 'EXAMINER';
	comment: string;
	answers: ShiftResponseAnswer[];
	submittedAt: string;
	updatedAt: string;
	version: number;
}

export interface ConfirmedAssignment {
	assignmentId: string;
	slotId: string;
	userId: string;
	confirmedBy: string;
	confirmedAt: string;
}

function normalizeShift(shift: Shift): ShiftUsual {
	return {
		...shift,
		uid: shift.shiftId,
		isTwice: shift.requiredSessionsPerWeek === 2,
		isScheduled: false,
	};
}

const DEV_SHIFTS_STORAGE_KEY = 'aula.dev.shifts.v1';

function loadDevShifts(): Shift[] {
	if (typeof window === 'undefined') return [];
	try {
		const stored = window.localStorage.getItem(DEV_SHIFTS_STORAGE_KEY);
		return stored ? (JSON.parse(stored) as Shift[]) : [];
	} catch {
		return [];
	}
}

function saveDevShifts(shifts: Shift[]): void {
	if (typeof window !== 'undefined') {
		window.localStorage.setItem(DEV_SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
	}
}

function createDevId(prefix: string): string {
	const uuid = globalThis.crypto?.randomUUID
		? globalThis.crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	return `${prefix}-${uuid}`;
}

export async function getAuthSession(): Promise<{
	session: AuthSession;
	user: AuthUser | null;
	profile: UserProfile | null;
}> {
	if (DEV_AUTH_ENABLED) {
		const now = new Date().toISOString();
		const profile = normalizeUser({
			userId: 'local-development-user',
			name: '開発ユーザー',
			displayName: '開発ユーザー',
			email: 'developer@localhost',
			entranceYear: new Date().getFullYear(),
			photoUrl: null,
			cafeoreStatusId: 'second-examiner',
			cafeoreStatus: {
				statusId: 'second-examiner',
				name: '2年目試験官',
				isFirstYear: false,
				isExaminer: true,
				isApprentice: false,
				version: 1,
			},
			isAdmin: true,
			isGraduated: false,
			createdAt: now,
			updatedAt: now,
			lastLoginAt: now,
			version: 1,
		});
		return {
			session: {
				authenticated: true,
				identity: { email: profile.email },
				hasProfile: true,
				user: profile,
			},
			user: {
				uid: profile.userId,
				email: profile.email,
				displayName: profile.displayName,
				photoURL: profile.photoUrl,
			},
			profile,
		};
	}

	const session = await apiRequest<AuthSession>('/auth/session');
	const profile = session.hasProfile ? await getMyProfile() : null;
	const user = session.authenticated
		? {
				uid: profile?.userId || session.identity.email,
				email: session.identity.email,
				displayName: profile?.displayName || null,
				photoURL: profile?.photoUrl || null,
			}
		: null;
	return { session, user, profile };
}

export async function getMyProfile(): Promise<UserProfile> {
	return normalizeUser(await apiRequest<ApiUser>('/users/me'));
}

export async function createMyProfile(input: {
	name: string;
	displayName: string;
	entranceYear: number;
	photoUrl: string | null;
	cafeoreStatusId: string;
}): Promise<UserProfile> {
	return normalizeUser(
		await apiRequest<ApiUser>('/users/me', {
			method: 'POST',
			body: JSON.stringify(input),
		}),
	);
}

export async function updateMyProfile(
	input: Partial<
		Pick<
			ApiUser,
			'name' | 'displayName' | 'entranceYear' | 'photoUrl' | 'cafeoreStatusId'
		>
	> & { version: number },
): Promise<UserProfile> {
	return normalizeUser(
		await apiRequest<ApiUser>('/users/me', {
			method: 'PATCH',
			body: JSON.stringify(input),
		}),
	);
}

export async function listUsers(): Promise<UserProfile[]> {
	const users = await apiRequest<ApiUser[]>('/users?limit=100');
	return users.map(normalizeUser);
}

export async function updateUser(
	userId: string,
	input: Partial<
		Pick<ApiUser, 'cafeoreStatusId' | 'isAdmin' | 'isGraduated'>
	> & { version: number },
): Promise<UserProfile> {
	return normalizeUser(
		await apiRequest<ApiUser>(`/users/${encodeURIComponent(userId)}`, {
			method: 'PATCH',
			body: JSON.stringify(input),
		}),
	);
}

export function listCafeoreStatuses(): Promise<CafeoreStatus[]> {
	return apiRequest<CafeoreStatus[]>('/cafeore-statuses?limit=100');
}

export function listBusinessEvents(): Promise<BusinessEvent[]> {
	return apiRequest<BusinessEvent[]>('/events?limit=100');
}

export function createBusinessEvent(input: {
	name: string;
	startDate: string;
	endDate: string;
}): Promise<BusinessEvent> {
	return apiRequest<BusinessEvent>('/events', {
		method: 'POST',
		body: JSON.stringify(input),
	});
}

export function listEventPositions(eventId: string): Promise<EventPosition[]> {
	return apiRequest<EventPosition[]>(
		`/events/${encodeURIComponent(eventId)}/positions?limit=100`,
	);
}

export function createEventPosition(
	eventId: string,
	input: { name: string; description: string | null; displayOrder: number },
): Promise<EventPosition> {
	return apiRequest<EventPosition>(
		`/events/${encodeURIComponent(eventId)}/positions`,
		{ method: 'POST', body: JSON.stringify(input) },
	);
}

export async function listShifts(query = ''): Promise<ShiftUsual[]> {
	if (DEV_AUTH_ENABLED) {
		const params = new URLSearchParams(query);
		const shifts = loadDevShifts().filter((shift) => {
			if (params.has('year') && shift.year !== Number(params.get('year')))
				return false;
			if (params.has('semester') && shift.semester !== params.get('semester'))
				return false;
			if (params.has('module') && shift.module !== params.get('module'))
				return false;
			if (
				params.has('isOpen') &&
				shift.isOpen !== (params.get('isOpen') === 'true')
			) {
				return false;
			}
			return true;
		});
		return shifts.map(normalizeShift);
	}
	const shifts = await apiRequest<Shift[]>(`/shifts${query ? `?${query}` : ''}`);
	return shifts.map(normalizeShift);
}

export async function getShift(shiftId: string): Promise<ShiftUsual> {
	if (DEV_AUTH_ENABLED) {
		const shift = loadDevShifts().find((item) => item.shiftId === shiftId);
		if (!shift) {
			throw new ApiError(404, {
				code: 'RESOURCE_NOT_FOUND',
				message: 'シフトが見つかりません。',
			});
		}
		return normalizeShift(shift);
	}
	return normalizeShift(
		await apiRequest<Shift>(`/shifts/${encodeURIComponent(shiftId)}`),
	);
}

export async function createShift(input: {
	year: number;
	semester: Shift['semester'];
	module: Shift['module'];
	startDate: string;
	endDate: string;
	requiredSessionsPerWeek: 1 | 2;
	isVacation: boolean;
}): Promise<ShiftUsual> {
	if (DEV_AUTH_ENABLED) {
		const shifts = loadDevShifts();
		if (
			shifts.some(
				(shift) =>
					shift.year === input.year &&
					shift.semester === input.semester &&
					shift.module === input.module,
			)
		) {
			throw new ApiError(409, {
				code: 'RESOURCE_CONFLICT',
				message: '同じ年度・学期・モジュールのシフトが既にあります。',
			});
		}
		const now = new Date().toISOString();
		const created: Shift = {
			...input,
			shiftId: createDevId('shift'),
			isOpen: false,
			createdAt: now,
			updatedAt: now,
			version: 1,
		};
		saveDevShifts([...shifts, created]);
		return normalizeShift(created);
	}
	return normalizeShift(
		await apiRequest<Shift>('/shifts', {
			method: 'POST',
			body: JSON.stringify(input),
		}),
	);
}

export async function updateShift(
	shiftId: string,
	input: Partial<
		Pick<
			Shift,
			'startDate' | 'endDate' | 'requiredSessionsPerWeek' | 'isVacation' | 'isOpen'
		>
	> & { version: number },
): Promise<ShiftUsual> {
	if (DEV_AUTH_ENABLED) {
		const shifts = loadDevShifts();
		const index = shifts.findIndex((item) => item.shiftId === shiftId);
		if (index < 0) {
			throw new ApiError(404, {
				code: 'RESOURCE_NOT_FOUND',
				message: 'シフトが見つかりません。',
			});
		}
		if (shifts[index].version !== input.version) {
			throw new ApiError(409, {
				code: 'VERSION_CONFLICT',
				message: '別の操作で更新されています。再読み込みしてください。',
			});
		}
		const { version: _version, ...changes } = input;
		const updated: Shift = {
			...shifts[index],
			...changes,
			updatedAt: new Date().toISOString(),
			version: shifts[index].version + 1,
		};
		shifts[index] = updated;
		saveDevShifts(shifts);
		return normalizeShift(updated);
	}
	return normalizeShift(
		await apiRequest<Shift>(`/shifts/${encodeURIComponent(shiftId)}`, {
			method: 'PATCH',
			body: JSON.stringify(input),
		}),
	);
}

export function listSlots(shiftId: string): Promise<Slot[]> {
	return apiRequest<Slot[]>(
		`/shifts/${encodeURIComponent(shiftId)}/slots?limit=100`,
	);
}

export function createSlot(
	shiftId: string,
	input: Omit<Slot, 'slotId' | 'shiftId' | 'version'>,
): Promise<Slot> {
	return apiRequest<Slot>(`/shifts/${encodeURIComponent(shiftId)}/slots`, {
		method: 'POST',
		body: JSON.stringify(input),
	});
}

export function deleteSlot(shiftId: string, slotId: string): Promise<void> {
	return apiRequest<void>(
		`/shifts/${encodeURIComponent(shiftId)}/slots/${encodeURIComponent(slotId)}`,
		{ method: 'DELETE' },
	);
}

export function getMyShiftResponse(shiftId: string): Promise<ShiftResponse> {
	return apiRequest<ShiftResponse>(
		`/shifts/${encodeURIComponent(shiftId)}/responses/me`,
	);
}

export function createShiftResponse(
	shiftId: string,
	input: Pick<ShiftResponse, 'frequency' | 'comment' | 'answers'>,
): Promise<ShiftResponse> {
	return apiRequest<ShiftResponse>(
		`/shifts/${encodeURIComponent(shiftId)}/responses`,
		{ method: 'POST', body: JSON.stringify(input) },
	);
}

export function replaceMyShiftResponse(
	shiftId: string,
	input: Pick<ShiftResponse, 'frequency' | 'comment' | 'answers' | 'version'>,
): Promise<ShiftResponse> {
	return apiRequest<ShiftResponse>(
		`/shifts/${encodeURIComponent(shiftId)}/responses/me`,
		{ method: 'PUT', body: JSON.stringify(input) },
	);
}

export async function listShiftResponses(
	shiftId: string,
): Promise<ShiftResponse[]> {
	const responses = await apiRequest<Array<ShiftResponse & { user?: ApiUser }>>(
		`/shifts/${encodeURIComponent(shiftId)}/responses?limit=100`,
	);
	return responses.map((response) => ({
		...response,
		user: response.user ? normalizeUser(response.user) : undefined,
	}));
}

export function listConfirmedAssignments(
	shiftId: string,
): Promise<ConfirmedAssignment[]> {
	return apiRequest<ConfirmedAssignment[]>(
		`/shifts/${encodeURIComponent(shiftId)}/confirmed-assignments?limit=100`,
	);
}

export function listMyConfirmedAssignments(
	shiftId: string,
): Promise<ConfirmedAssignment[]> {
	return apiRequest<ConfirmedAssignment[]>(
		`/shifts/${encodeURIComponent(shiftId)}/confirmed-assignments/me`,
	);
}

export function replaceConfirmedAssignments(
	shiftId: string,
	assignments: Array<{ slotId: string; userId: string }>,
): Promise<ConfirmedAssignment[]> {
	return apiRequest<ConfirmedAssignment[]>(
		`/shifts/${encodeURIComponent(shiftId)}/confirmed-assignments`,
		{ method: 'PUT', body: JSON.stringify({ assignments }) },
	);
}

export async function downloadResponsesCsv(shiftId: string): Promise<void> {
	const response = await fetch(
		`${API_BASE_URL}/shifts/${encodeURIComponent(shiftId)}/responses.csv`,
		{ credentials: 'include' },
	);
	if (!response.ok) {
		let body: { error?: ApiErrorBody } | undefined;
		try {
			body = await response.json();
		} catch {
			body = undefined;
		}
		throw new ApiError(response.status, body?.error);
	}
	const blob = await response.blob();
	const disposition = response.headers.get('content-disposition') || '';
	const filename =
		disposition.match(/filename="?([^";]+)"?/)?.[1] || 'responses.csv';
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

export function redirectToAccessLogin(returnTo = '/dashboard'): void {
	if (typeof window !== 'undefined') {
		window.location.assign(returnTo);
	}
}

export function redirectToAccessLogout(): void {
	if (typeof window !== 'undefined') {
		window.location.assign(
			DEV_AUTH_ENABLED ? '/login' : '/cdn-cgi/access/logout',
		);
	}
}
