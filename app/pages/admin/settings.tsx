import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { HomeButton } from '../../components/home-button';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
	type BusinessEvent,
	createBusinessEvent,
	createEventPosition,
	createSlot,
	deleteSlot,
	type EventPosition,
	listBusinessEvents,
	listEventPositions,
	listShifts,
	listSlots,
	type ShiftUsual,
	type Slot,
} from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { getModuleDisplay, getSemesterLabel } from '../../lib/shift-labels';
import styles from './settings.module.scss';

const days = ['月', '火', '水', '木', '金', '土', '日'];
const periods = [1, 2, 3, 4, 5, 6, 7, 8];

export function meta() {
	return [
		{ title: 'Aula - 業務・枠設定' },
		{ name: 'description', content: '業務イベント、担当区分、シフト枠の管理' },
	];
}

export default function Settings() {
	const { user, userProfile, loading } = useAuth();
	const navigate = useNavigate();
	const [events, setEvents] = useState<BusinessEvent[]>([]);
	const [shifts, setShifts] = useState<ShiftUsual[]>([]);
	const [positions, setPositions] = useState<EventPosition[]>([]);
	const [slots, setSlots] = useState<Slot[]>([]);
	const [eventId, setEventId] = useState('');
	const [shiftId, setShiftId] = useState('');
	const [eventName, setEventName] = useState('');
	const [eventStart, setEventStart] = useState('');
	const [eventEnd, setEventEnd] = useState('');
	const [positionName, setPositionName] = useState('');
	const [positionId, setPositionId] = useState('');
	const [dayOfWeek, setDayOfWeek] = useState('1');
	const [period, setPeriod] = useState('1');
	const [startTime, setStartTime] = useState('08:40');
	const [endTime, setEndTime] = useState('09:55');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!loading && !user) navigate('/login');
		else if (!loading && userProfile && !userProfile.isAdmin)
			navigate('/dashboard');
	}, [loading, navigate, user, userProfile]);

	useEffect(() => {
		if (!userProfile?.isAdmin) return;
		void Promise.all([listBusinessEvents(), listShifts('limit=100')])
			.then(([eventList, shiftList]) => {
				setEvents(eventList);
				setShifts(shiftList);
				setEventId((current) => current || eventList[0]?.eventId || '');
				setShiftId((current) => current || shiftList[0]?.shiftId || '');
			})
			.catch(() => setError('設定情報を読み込めませんでした。'));
	}, [userProfile]);

	useEffect(() => {
		if (!eventId) {
			setPositions([]);
			setPositionId('');
			return;
		}
		void listEventPositions(eventId)
			.then((items) => {
				setPositions(items);
				setPositionId((current) =>
					items.some((item) => item.positionId === current)
						? current
						: items[0]?.positionId || '',
				);
			})
			.catch(() => setError('担当区分を読み込めませんでした。'));
	}, [eventId]);

	useEffect(() => {
		if (!shiftId) {
			setSlots([]);
			return;
		}
		void listSlots(shiftId)
			.then(setSlots)
			.catch(() => setError('シフト枠を読み込めませんでした。'));
	}, [shiftId]);

	const run = async (action: () => Promise<void>) => {
		setBusy(true);
		setError(null);
		try {
			await action();
		} catch (caught) {
			console.error(caught);
			setError('保存に失敗しました。入力内容と参照状態を確認してください。');
		} finally {
			setBusy(false);
		}
	};

	const addEvent = () =>
		run(async () => {
			if (!eventName.trim() || !eventStart || !eventEnd)
				throw new Error('required');
			const created = await createBusinessEvent({
				name: eventName.trim(),
				startDate: eventStart,
				endDate: eventEnd,
			});
			setEvents((current) => [...current, created]);
			setEventId(created.eventId);
			setEventName('');
		});

	const addPosition = () =>
		run(async () => {
			if (!eventId || !positionName.trim()) throw new Error('required');
			const created = await createEventPosition(eventId, {
				name: positionName.trim(),
				description: null,
				displayOrder: positions.length * 10,
			});
			setPositions((current) => [...current, created]);
			setPositionId(created.positionId);
			setPositionName('');
		});

	const addSlot = () =>
		run(async () => {
			if (!shiftId || !eventId || !positionId) throw new Error('required');
			const created = await createSlot(shiftId, {
				eventId,
				positionId,
				dayOfWeek: Number(dayOfWeek),
				period: Number(period),
				displayOrder: slots.length * 10,
				startTime: `${startTime}:00`,
				endTime: `${endTime}:00`,
			});
			setSlots((current) => [...current, created]);
		});

	const removeSlot = (slot: Slot) =>
		run(async () => {
			await deleteSlot(slot.shiftId, slot.slotId);
			setSlots((current) => current.filter((item) => item.slotId !== slot.slotId));
		});

	if (loading || !userProfile?.isAdmin) return null;

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<div className={styles.header}>
					<h1 className={styles.title}>業務・シフト枠設定</h1>
					<div className={styles.userMeta}>
						<span className={styles.badge}>管理者</span>
						<span className={styles.userName}>{userProfile.displayName}</span>
					</div>
				</div>

				{error && <p className={styles.error}>{error}</p>}

				<section className={styles.card}>
					<h2>1. 業務イベント</h2>
					<div className={styles.formRow}>
						<Input
							aria-label="イベント名"
							placeholder="通常練習"
							value={eventName}
							onChange={(e) => setEventName(e.target.value)}
						/>
						<Input
							aria-label="イベント開始日"
							type="date"
							value={eventStart}
							onChange={(e) => setEventStart(e.target.value)}
						/>
						<Input
							aria-label="イベント終了日"
							type="date"
							value={eventEnd}
							onChange={(e) => setEventEnd(e.target.value)}
						/>
						<Button disabled={busy} onClick={() => void addEvent()}>
							追加
						</Button>
					</div>
					<label className={styles.field}>
						<span>設定対象イベント</span>
						<select value={eventId} onChange={(e) => setEventId(e.target.value)}>
							<option value="">選択してください</option>
							{events.map((event) => (
								<option key={event.eventId} value={event.eventId}>
									{event.name}（{event.startDate}〜{event.endDate}）
								</option>
							))}
						</select>
					</label>
				</section>

				<section className={styles.card}>
					<h2>2. 担当区分</h2>
					<div className={styles.formRow}>
						<Input
							aria-label="担当区分名"
							placeholder="練習生"
							value={positionName}
							onChange={(e) => setPositionName(e.target.value)}
						/>
						<Button disabled={busy || !eventId} onClick={() => void addPosition()}>
							追加
						</Button>
					</div>
					<p className={styles.tags}>
						{positions.length
							? positions.map((position) => position.name).join(' / ')
							: '担当区分は未登録です。'}
					</p>
				</section>

				<section className={styles.card}>
					<h2>3. シフト枠</h2>
					<div className={styles.formGrid}>
						<label className={styles.field}>
							<span>シフト</span>
							<select value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
								<option value="">選択してください</option>
								{shifts.map((shift) => (
									<option key={shift.shiftId} value={shift.shiftId}>
										{shift.year} {getSemesterLabel(shift.semester)}{' '}
										{getModuleDisplay(shift.semester, shift.module)}
									</option>
								))}
							</select>
						</label>
						<label className={styles.field}>
							<span>担当区分</span>
							<select
								value={positionId}
								onChange={(e) => setPositionId(e.target.value)}
							>
								<option value="">選択してください</option>
								{positions.map((position) => (
									<option key={position.positionId} value={position.positionId}>
										{position.name}
									</option>
								))}
							</select>
						</label>
						<label className={styles.field}>
							<span>曜日</span>
							<select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
								{days.map((day, index) => (
									<option key={day} value={index + 1}>
										{day}曜日
									</option>
								))}
							</select>
						</label>
						<label className={styles.field}>
							<span>時限</span>
							<select value={period} onChange={(e) => setPeriod(e.target.value)}>
								{periods.map((periodNumber) => (
									<option key={periodNumber} value={periodNumber}>
										{periodNumber}限
									</option>
								))}
							</select>
						</label>
						<div className={styles.field}>
							<span>開始</span>
							<Input
								aria-label="枠の開始時刻"
								type="time"
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
							/>
						</div>
						<div className={styles.field}>
							<span>終了</span>
							<Input
								aria-label="枠の終了時刻"
								type="time"
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
							/>
						</div>
					</div>
					<Button
						disabled={busy || !shiftId || !positionId}
						onClick={() => void addSlot()}
					>
						枠を追加
					</Button>
					<div className={styles.slotList}>
						{slots.map((slot) => {
							const position = positions.find(
								(item) => item.positionId === slot.positionId,
							);
							return (
								<div className={styles.slotRow} key={slot.slotId}>
									<span>
										{days[slot.dayOfWeek - 1]}曜 {slot.period}限　
										{slot.startTime.slice(0, 5)}〜{slot.endTime.slice(0, 5)}　
										{position?.name || slot.positionId}
									</span>
									<Button
										variant="outline"
										disabled={busy}
										onClick={() => void removeSlot(slot)}
									>
										削除
									</Button>
								</div>
							);
						})}
						{!slots.length && <p>このシフトに枠はありません。</p>}
					</div>
				</section>

				<div className={styles.homeButtonWrap}>
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
