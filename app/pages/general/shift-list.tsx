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

export async function loader() {
	return null;
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
			<div className="flex min-h-screen items-center justify-center bg-gray-100">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
					<p className="text-gray-600">読み込み中...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-100 py-8">
			<div className="mx-auto max-w-4xl px-4">
				{/* ヘッダー */}
				<div className="mb-8">
					<h1 className="mb-2 font-bold text-3xl text-gray-900">シフト一覧</h1>
					<p className="text-gray-600">公開されているシフトの募集一覧です</p>
				</div>

				{/* シフト一覧 */}
				{loadingShifts ? (
					<div className="text-center">
						<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
						<p className="text-gray-600">シフトを読み込み中...</p>
					</div>
				) : shifts.length === 0 ? (
					<Card>
						<CardContent className="py-12 text-center">
							<p className="text-gray-500">現在公開されているシフトはありません</p>
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

							return (
								<Card key={shift.uid} className="transition-shadow hover:shadow-md">
									<CardHeader>
										<CardTitle className="flex items-center justify-between">
											<span>
												{shift.year}年度 {semesterJa}学期 モジュール{shift.module}
											</span>
											<span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700 text-sm">
												公開中
											</span>
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											{/* 頻度 */}
											<div>
												<span className="font-medium text-gray-700 text-sm">
													シフト頻度:
												</span>
												<span className="ml-2 text-gray-600 text-sm">
													{shift.isTwice ? '週2回' : '週1回'}
												</span>
											</div>

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
															},
														})
													}
													className="bg-purple-600 hover:bg-purple-700"
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
