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
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
					<p className="text-slate-600">読み込み中...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 py-8">
			<div className="mx-auto max-w-4xl px-4">
				{/* ヘッダー */}
				<div className="mb-8">
					<h1 className="mb-2 font-bold text-3xl text-slate-800">シフト一覧</h1>
					<p className="text-slate-600">公開されているシフトの募集一覧です</p>
				</div>

				{/* シフト一覧 */}
				{loadingShifts ? (
					<div className="text-center">
						<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
						<p className="text-slate-600">シフトを読み込み中...</p>
					</div>
				) : shifts.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center">
							<p className="text-slate-500">現在公開されているシフトはありません</p>
						</CardContent>
					</Card>
				) : (
					<div className="space-y-4">
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
									className="border-teal-200 bg-teal-50 transition-shadow hover:shadow-md"
								>
									<CardHeader>
										<CardTitle className="flex items-center justify-between">
											<span>
												{shift.year}年度 {semesterJa}学期 {shift.module}モジュール
											</span>
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											{/* ボタン */}
											<div className="flex gap-2 pt-2">
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
													className="bg-teal-500 hover:bg-teal-600 hover:text-white"
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
				<div className="mt-8">
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
