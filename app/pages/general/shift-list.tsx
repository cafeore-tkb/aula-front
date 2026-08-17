import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { HomeButton } from '../../components/home-button';
import { Button } from '../../components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '../../components/ui/card';
import { useAuth } from '../../lib/auth-context';
import { db, type ShiftUsual } from '../../lib/firebase';
import {
	getModuleDisplay,
	getSemesterDisplay,
} from '../../lib/shift-labels';
import styles from './shift-list.module.scss';
import { exportShiftToIcal } from '~/lib/export-ical';

export function meta() {
	return [
		{ title: 'Aula - シフト一覧' },
		{ name: 'description', content: '公開されているシフトの一覧' },
	];
}

export default function ShiftList() {
	const { user, userProfile, loading } = useAuth();
	const navigate = useNavigate();
	const [shifts, setShifts] = useState<ShiftUsual[]>([]);
	const [loadingShifts, setLoadingShifts] = useState(true);
	const [exportingId, setExportingId] = useState<string | null>(null);

	// 認証チェック
	useEffect(() => {
		if (!loading && !user) {
			navigate('/login');
		}
	}, [user, loading, navigate]);

	// シフト一覧の取得
	useEffect(() => {
		const fetchShifts = async () => {
			if (!user) return;

			try {
				setLoadingShifts(true);

				// 公開されているシフト通常設定を取得
				const shiftsRef = collection(db, 'shiftUsual');
				const querySnapshot = await getDocs(shiftsRef);
				const confirmedShiftId = `2026_spring_B`;

				const confirmedRef = doc(db, 'confirmed_shift', confirmedShiftId);
				const comsnapshot = await getDoc(confirmedRef)
				console.log(comsnapshot.data())
				const shiftsData: ShiftUsual[] = querySnapshot.docs
					.map(
						(doc) =>
							({
								uid: doc.id,
								...doc.data(),
							}) as ShiftUsual,
					)
					.filter((shift) => shift.isOpen === true);

				setShifts(shiftsData);
			} catch (error) {
				console.error('シフト取得エラー:', error);
			} finally {
				setLoadingShifts(false);
			}
		};

		fetchShifts();
	}, [user]);

	// ローディング中
	if (loading || !userProfile) {
		return (
			<div className={'common-loading-wrap'}>
				<div className={'common-loading-inner'}>
					<div className={'common-loading-spinner-teal'} />
					<p className={'common-loading-text'}>読み込み中...</p>
				</div>
			</div>
		);
	}

	const handleExport = async (shift: ShiftUsual) => {
		if (!user) return;
		
		const scheduleCollectionId =
			shift.scheduleCollectionId ??
			`schedules_${shift.year}_${shift.semester}_${shift.module}`;
		
		setExportingId(shift.uid);
		try {
			const result = await exportShiftToIcal(
				user.uid,
				user.displayName ?? user.email ?? 'ユーザー',
				{
					year: shift.year,
					semester: shift.semester,
					module: shift.module,
					scheduleCollectionId,
				},
			);
			alert(result.message);
		} finally {
			setExportingId(null);
		}
	};

	return (
		<div className={styles.shiftListPage}>
			<div className={styles.shiftListContainer}>
				{/* ヘッダー */}
				<div className={styles.shiftListHeader}>
					<h1 className={styles.shiftListTitle}>シフト一覧</h1>
					<p className={styles.shiftListSubtitle}>
						公開されているシフトの募集一覧です
					</p>
				</div>

				{/* シフト一覧 */}
				{loadingShifts ? (
					<div className={styles.shiftListLoadingWrap}>
						<div className={'common-loading-spinner-teal'} />
						<p className={'common-loading-text'}>シフトを読み込み中...</p>
					</div>
				) : shifts.length === 0 ? (
					<Card>
						<CardContent className={styles.shiftListEmptyContent}>
							<p className={styles.shiftListEmptyText}>
								現在公開されているシフトはありません
							</p>
						</CardContent>
					</Card>
				) : (
					<div className={styles.shiftListListWrap}>
						{shifts.map((shift) => {
							const semesterDisplay = getSemesterDisplay(shift.semester);
							const moduleDisplay = getModuleDisplay(shift.semester, shift.module);

							// シフト専用のコレクション名（なければデフォルト名を生成）
							const scheduleCollectionId =
								shift.scheduleCollectionId ||
								`schedules_${shift.year}_${shift.semester}_${shift.module}`;

							return (
								<Card key={shift.uid} className={styles.shiftListCard}>
									<CardHeader>
										<CardTitle className={styles.shiftListCardTitle}>
											<span className={styles.shiftListCardTitleText}>
												{shift.year}年度 {semesterDisplay} {moduleDisplay}
											</span>
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className={styles.shiftListContent}>
											{/* ボタン */}
											<div className={styles.shiftListActionRow}>
												<Button
													onClick={() =>
														navigate('/adjustment', {
															state: {
																year: shift.year,
																semester: shift.semester,
																module: shift.module,
																isTwice: shift.isTwice,
																scheduleCollectionId,
																startDate: shift.startDate,
															},
														})
													}
													className={styles.shiftListAnswerButton}
												>
													シフトを回答する
												</Button>
												<Button
													onClick={() => handleExport(shift)}
													className={styles.shiftListCalendarButton}
													disabled={exportingId === shift.uid}
												>
													<svg
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<title>カレンダー</title>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M8 7V3m8 4V3M5 11h14M5 7h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"
														/>
													</svg>
													{exportingId === shift.uid ? 'エクスポート中...' : 'カレンダーをダウンロード'}
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}

				{/* ホームに戻るボタン */}
				<div className={styles.shiftListHomeButtonWrap}>
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
