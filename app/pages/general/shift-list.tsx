import { collection, getDocs } from 'firebase/firestore';
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

				// 公開されているシフト通常設定を取得
				const shiftsRef = collection(db, 'shiftUsual');
				const querySnapshot = await getDocs(shiftsRef);
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
			<div className={styles.loadingWrap}>
				<div className={styles.loadingInner}>
					<div className={styles.spinner} />
					<p className={styles.loadingText}>読み込み中...</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				{/* ヘッダー */}
				<div className={styles.header}>
					<h1 className={styles.title}>シフト一覧</h1>
					<p className={styles.subtitle}>公開されているシフトの募集一覧です</p>
				</div>

				{/* シフト一覧 */}
				{loadingShifts ? (
					<div className={styles.listLoadingWrap}>
						<div className={styles.spinner} />
						<p className={styles.loadingText}>シフトを読み込み中...</p>
					</div>
				) : shifts.length === 0 ? (
					<Card>
						<CardContent className={styles.emptyContent}>
							<p className={styles.emptyText}>現在公開されているシフトはありません</p>
						</CardContent>
					</Card>
				) : (
					<div className={styles.listWrap}>
						{shifts.map((shift) => {
							// 学期の日本語変換
							const semesterJa =
								shift.semester === 'spring'
									? '春'
									: shift.semester === 'autumn'
										? '秋'
										: shift.semester;

							// シフト専用のコレクション名（なければデフォルト名を生成）
							const scheduleCollectionId =
								shift.scheduleCollectionId ||
								`schedules_${shift.year}_${shift.semester}_${shift.module}`;

							return (
								<Card
									key={shift.uid}
									className={styles.shiftCard}
								>
									<CardHeader>
										<CardTitle className={styles.shiftTitle}>
											<span>
												{shift.year}年度 {semesterJa}学期 {shift.module}モジュール
											</span>
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className={styles.shiftContent}>
											{/* ボタン */}
											<div className={styles.actionRow}>
												<Button
													onClick={() =>
														navigate('/adjustment', {
															state: {
																year: shift.year,
																semester: shift.semester,
																module: shift.module,
																isTwice: shift.isTwice,
																scheduleCollectionId,
															},
														})
													}
													className={styles.answerButton}
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
				<div className={styles.homeButtonWrap}>
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
