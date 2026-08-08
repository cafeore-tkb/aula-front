import { useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { HomeButton } from '../../components/home-button';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../../components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../components/ui/table';
import {
	ApiError,
	createShift,
	downloadResponsesCsv,
	listShifts,
	type ShiftUsual,
	updateShift,
} from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { getModuleDisplay, getSemesterLabel } from '../../lib/shift-labels';
import styles from './manage-adjustment.module.scss';

export function meta() {
	return [
		{ title: 'Aula - シフト募集管理' },
		{ name: 'description', content: 'シフト募集の作成と公開設定' },
	];
}

export default function ManageAdjustment() {
	const { user, userProfile, loading } = useAuth();
	const navigate = useNavigate();
	const [shifts, setShifts] = useState<ShiftUsual[]>([]);
	const [loadingShifts, setLoadingShifts] = useState(true);
	const [isAdding, setIsAdding] = useState(false);
	const [exportingId, setExportingId] = useState<string | null>(null);
	const [year, setYear] = useState('');
	const [semester, setSemester] = useState('');
	const [module, setModule] = useState('');
	const [frequency, setFrequency] = useState('');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const yearId = useId();
	const semesterId = useId();
	const moduleId = useId();
	const frequencyId = useId();
	const startDateId = useId();
	const endDateId = useId();

	useEffect(() => {
		if (!loading && !user) navigate('/login');
		else if (!loading && userProfile && !userProfile.isAdmin)
			navigate('/dashboard');
	}, [loading, navigate, user, userProfile]);

	useEffect(() => {
		if (!userProfile?.isAdmin) return;
		let active = true;
		void listShifts('limit=100')
			.then((data) => active && setShifts(data))
			.catch((error) => console.error('Failed to load shifts:', error))
			.finally(() => active && setLoadingShifts(false));
		return () => {
			active = false;
		};
	}, [userProfile]);

	const updateOne = async (
		shift: ShiftUsual,
		changes: { isOpen?: boolean; requiredSessionsPerWeek?: 1 | 2 },
	) => {
		try {
			const updated = await updateShift(shift.shiftId, {
				...changes,
				version: shift.version,
			});
			setShifts((current) =>
				current.map((item) => (item.shiftId === shift.shiftId ? updated : item)),
			);
		} catch (error) {
			console.error('Failed to update shift:', error);
			alert(
				error instanceof ApiError ? error.message : 'シフトの更新に失敗しました',
			);
		}
	};

	const handleAdd = async () => {
		if (!year || !semester || !module || !frequency || !startDate || !endDate) {
			alert('全ての項目を入力してください');
			return;
		}
		if (endDate < startDate) {
			alert('終了日は開始日以降にしてください');
			return;
		}
		try {
			setIsAdding(true);
			const created = await createShift({
				year: Number(year),
				semester: semester as ShiftUsual['semester'],
				module: module as ShiftUsual['module'],
				startDate,
				endDate,
				requiredSessionsPerWeek: frequency === '2' ? 2 : 1,
				isVacation: semester === 'summer',
			});
			setShifts((current) => [...current, created]);
			setYear('');
			setSemester('');
			setModule('');
			setFrequency('');
			setStartDate('');
			setEndDate('');
		} catch (error) {
			console.error('Failed to create shift:', error);
			alert(
				error instanceof ApiError ? error.message : 'シフトの追加に失敗しました',
			);
		} finally {
			setIsAdding(false);
		}
	};

	const exportCsv = async (shift: ShiftUsual) => {
		try {
			setExportingId(shift.shiftId);
			await downloadResponsesCsv(shift.shiftId);
		} catch (error) {
			console.error('Failed to download CSV:', error);
			alert('CSVの出力に失敗しました');
		} finally {
			setExportingId(null);
		}
	};

	if (loading || !userProfile?.isAdmin) return null;

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<div className={styles.header}>
					<h1 className={styles.title}>管理者ページ</h1>
					<div className={styles.manageUserInfo}>
						<span className={styles.manageAdminBadge}>管理者</span>
						<span className={styles.userName}>{userProfile.displayName}</span>
					</div>
				</div>

				<div className={styles.manageSectionHeading}>シフト設定一覧</div>
				<div className={styles.manageFormCard}>
					<h2 className={styles.manageFormTitle}>新規シフト追加</h2>
					<div className={styles.manageFormGrid}>
						<div>
							<label htmlFor={yearId} className={styles.manageLabel}>
								年度
							</label>
							<Input
								id={yearId}
								type="number"
								value={year}
								onChange={(e) => setYear(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor={semesterId} className={styles.manageLabel}>
								学期
							</label>
							<Select
								value={semester}
								onValueChange={(value) => {
									setSemester(value);
									setModule('');
								}}
							>
								<SelectTrigger id={semesterId}>
									<SelectValue placeholder="学期" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="spring">春</SelectItem>
									<SelectItem value="summer">夏休み</SelectItem>
									<SelectItem value="autumn">秋</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<label htmlFor={moduleId} className={styles.manageLabel}>
								モジュール
							</label>
							{semester === 'summer' ? (
								<Input
									id={moduleId}
									type="number"
									min="1"
									value={module}
									onChange={(e) => setModule(e.target.value)}
								/>
							) : (
								<Select value={module} onValueChange={setModule}>
									<SelectTrigger id={moduleId}>
										<SelectValue placeholder="モジュール" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="A">A</SelectItem>
										<SelectItem value="B">B</SelectItem>
										<SelectItem value="C">C</SelectItem>
									</SelectContent>
								</Select>
							)}
						</div>
						<div>
							<label htmlFor={frequencyId} className={styles.manageLabel}>
								頻度
							</label>
							<Select value={frequency} onValueChange={setFrequency}>
								<SelectTrigger id={frequencyId}>
									<SelectValue placeholder="頻度" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">週1回</SelectItem>
									<SelectItem value="2">週2回</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<label htmlFor={startDateId} className={styles.manageLabel}>
								開始日
							</label>
							<Input
								id={startDateId}
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor={endDateId} className={styles.manageLabel}>
								終了日
							</label>
							<Input
								id={endDateId}
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
							/>
						</div>
						<div className={styles.manageAddButtonWrap}>
							<Button onClick={handleAdd} disabled={isAdding}>
								{isAdding ? '追加中...' : '✓ 追加'}
							</Button>
						</div>
					</div>
				</div>

				{loadingShifts ? (
					<p>読み込み中...</p>
				) : (
					<div className={styles.manageTableCard}>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>年度</TableHead>
									<TableHead>学期</TableHead>
									<TableHead>モジュール</TableHead>
									<TableHead>頻度</TableHead>
									<TableHead>公開</TableHead>
									<TableHead>操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{shifts.map((shift) => (
									<TableRow
										key={shift.shiftId}
										className={
											shift.isOpen ? styles.manageRowOpen : styles.manageRowClosed
										}
									>
										<TableCell>{shift.year}</TableCell>
										<TableCell>{getSemesterLabel(shift.semester)}</TableCell>
										<TableCell>
											{getModuleDisplay(shift.semester, shift.module)}
										</TableCell>
										<TableCell>
											<Select
												value={String(shift.requiredSessionsPerWeek)}
												onValueChange={(value) =>
													void updateOne(shift, {
														requiredSessionsPerWeek: value === '2' ? 2 : 1,
													})
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="1">週1回</SelectItem>
													<SelectItem value="2">週2回</SelectItem>
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell>
											<Select
												value={shift.isOpen ? 'open' : 'closed'}
												onValueChange={(value) =>
													void updateOne(shift, { isOpen: value === 'open' })
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="open">公開</SelectItem>
													<SelectItem value="closed">非公開</SelectItem>
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell>
											<div className={styles.manageActionButtons}>
												<Button
													onClick={() =>
														navigate('/admin/scheduleShift', {
															state: { shiftId: shift.shiftId },
														})
													}
												>
													シフトを組む
												</Button>
												<Button
													variant="outline"
													disabled={exportingId === shift.shiftId}
													onClick={() => void exportCsv(shift)}
												>
													{exportingId === shift.shiftId ? '出力中...' : 'CSV出力'}
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
				<div className={styles.homeButtonWrap}>
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
