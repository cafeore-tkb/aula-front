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
import { listShifts, type ShiftUsual } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import { getModuleDisplay, getSemesterDisplay } from '../../lib/shift-labels';
import styles from './shift-list.module.scss';

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

				setShifts(await listShifts('isOpen=true&limit=100'));
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
																shiftId: shift.shiftId,
																year: shift.year,
																semester: shift.semester,
																module: shift.module,
																isTwice: shift.isTwice,
															},
														})
													}
													className={styles.shiftListAnswerButton}
												>
													シフトを回答する
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
