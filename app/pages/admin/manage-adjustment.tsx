import {
	addDoc,
	collection,
	doc,
	getDocs,
	getFirestore,
	updateDoc,
} from 'firebase/firestore';
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
import { useAuth } from '../../lib/auth-context';
import type { ShiftUsual } from '../../lib/firebase';

export function meta() {
	return [
		{ title: 'Aula - 管理画面' },
		{ name: 'description', content: '管理者向けの設定画面' },
	];
}

export default function ManageAdjustment() {
	const { user, userProfile, loading } = useAuth();
	const [shiftUsual, setShiftUsual] = useState<ShiftUsual[]>([]);
	const [loadingShiftUsual, setLoadingShiftUsual] = useState(false);
	const navigate = useNavigate();
	const yearInputId = useId();
	const semesterSelectId = useId();
	const moduleSelectId = useId();
	const isTwiceSelectId = useId();

	// 新規追加フォームの状態
	const [newYear, setNewYear] = useState('');
	const [newSemester, setNewSemester] = useState('');
	const [newModule, setNewModule] = useState('');
	const [newIsTwice, setNewIsTwice] = useState('');
	const [isAdding, setIsAdding] = useState(false);

	// 認証状態とadminフラグをチェック
	useEffect(() => {
		if (!loading) {
			// 未ログインの場合はログインページにリダイレクト
			if (!user) {
				navigate('/login');
				return;
			}

			// ログイン済みでもadminフラグがない場合はホームページにリダイレクト
			if (userProfile && !userProfile.isAdmin) {
				navigate('/dashboard');
				return;
			}
		}
	}, [user, userProfile, loading, navigate]);

	//シフト一覧を取得
	useEffect(() => {
		const fetchShiftUsual = async () => {
			if (!userProfile?.isAdmin) return;

			try {
				setLoadingShiftUsual(true);
				const db = getFirestore();
				const shiftUsualCollection = collection(db, 'shiftUsual');
				const shiftUsualSnapshot = await getDocs(shiftUsualCollection);
				const shiftUsualList = shiftUsualSnapshot.docs.map(
					(doc) =>
						({
							uid: doc.id,
							...doc.data(),
						}) as ShiftUsual,
				);
				setShiftUsual(shiftUsualList);
			} catch (error) {
				console.error('Error fetching users:', error);
			} finally {
				setLoadingShiftUsual(false);
			}
		};

		fetchShiftUsual();
	}, [userProfile]);

	// ステータス更新関数
	const handleStatusChange = async (uid: string, statusValue: string) => {
		try {
			const db = getFirestore();
			const userDocRef = doc(db, 'shiftUsual', uid);

			// ステータスから各フラグを判定
			const isOpen = statusValue.includes('isOpen');

			await updateDoc(userDocRef, {
				isOpen,
			});

			// ローカルの状態を更新
			setShiftUsual((prevUsers) =>
				prevUsers.map((u) => (u.uid === uid ? { ...u, isOpen } : u)),
			);
		} catch (error) {
			console.error('Error updating user status:', error);
			alert('ステータスの更新に失敗しました');
		}
	};

	// 頻度更新関数
	const handleFrequencyChange = async (uid: string, frequencyValue: string) => {
		try {
			const db = getFirestore();
			const shiftDocRef = doc(db, 'shiftUsual', uid);

			const isTwice = frequencyValue === 'true';

			await updateDoc(shiftDocRef, {
				isTwice,
			});

			// ローカルの状態を更新
			setShiftUsual((prevShifts) =>
				prevShifts.map((s) => (s.uid === uid ? { ...s, isTwice } : s)),
			);
		} catch (error) {
			console.error('Error updating frequency:', error);
			alert('頻度の更新に失敗しました');
		}
	};

	// 新規シフト追加関数
	const handleAddShift = async () => {
		if (!newYear || !newSemester || !newModule || !newIsTwice) {
			alert('全ての項目を入力してください');
			return;
		} else {
			const yearNow = new Date().getFullYear();
			const yearInt = Number.parseInt(newYear, 10);
			if (Number.isNaN(yearInt) || yearInt < yearNow || yearInt > yearNow + 1) {
				alert(
					`年度を正しく入力してください。登録できる年度は今年度と来年度のみです`,
				);
				return;
			}
		}

		// 重複チェック
		const isDuplicate = shiftUsual.some(
			(shift) =>
				shift.year === Number.parseInt(newYear, 10) &&
				shift.semester === newSemester &&
				shift.module === newModule,
		);

		if (isDuplicate) {
			alert('同じ年度・学期・モジュールの組み合わせが既に存在します');
			return;
		}

		try {
			setIsAdding(true);
			const db = getFirestore();
			const shiftUsualCollection = collection(db, 'shiftUsual');

			// 新しいシフトを追加
			const docRef = await addDoc(shiftUsualCollection, {
				year: Number.parseInt(newYear, 10),
				semester: newSemester,
				module: newModule,
				isTwice: newIsTwice === 'true',
				isOpen: false,
			});

			// ローカルの状態を更新
			setShiftUsual((prev) => [
				...prev,
				{
					uid: docRef.id,
					year: Number.parseInt(newYear, 10),
					semester: newSemester as 'spring' | 'autumn',
					module: newModule as 'A' | 'B' | 'C',
					isOpen: false,
					isTwice: newIsTwice === 'true',
				},
			]);

			// フォームをリセット
			setNewYear('');
			setNewSemester('');
			setNewModule('');
			setNewIsTwice('');

			alert('シフトを追加しました');
		} catch (error) {
			console.error('Error adding shift:', error);
			alert('シフトの追加に失敗しました');
		} finally {
			setIsAdding(false);
		}
	};

	// ローディング中の表示
	// 管理者権限がない場合（リダイレクト処理中）
	if (!userProfile?.isAdmin) {
		return null;
	}

	// 管理者ページのメインコンテンツ
	return (
		<div className="min-h-screen bg-gray-100 py-8">
			<div className="mx-auto max-w-6xl px-4">
				<div className="mb-8 flex items-center justify-between">
					<h1 className="font-bold text-3xl text-gray-900">管理者ページ</h1>
					<div className="flex items-center space-x-2">
						<span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-600 text-sm">
							管理者
						</span>
						<span className="text-gray-600 text-sm">
							{userProfile.name || user?.displayName || 'ユーザー'}
						</span>
					</div>
				</div>
				<div>
					<div className="mb-4 font-medium text-gray-900 text-lg">
						シフト通常設定一覧
					</div>

					{/* 新規追加フォーム */}
					<div className="mb-6 rounded-lg bg-white p-6 shadow-md">
						<h2 className="mb-4 font-semibold text-gray-900 text-lg">
							新規シフト追加
						</h2>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-5">
							<div>
								<label
									htmlFor={yearInputId}
									className="mb-2 block text-gray-700 text-sm"
								>
									年度
								</label>
								<Input
									id={yearInputId}
									type="number"
									placeholder="2025"
									value={newYear}
									onChange={(e) => setNewYear(e.target.value)}
									min="2000"
								/>
							</div>
							<div>
								<label
									htmlFor={semesterSelectId}
									className="mb-2 block text-gray-700 text-sm"
								>
									学期
								</label>
								<Select value={newSemester} onValueChange={setNewSemester}>
									<SelectTrigger id={semesterSelectId}>
										<SelectValue placeholder="学期を選択" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="spring">春</SelectItem>
										<SelectItem value="autumn">秋</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<label
									htmlFor={moduleSelectId}
									className="mb-2 block text-gray-700 text-sm"
								>
									モジュール
								</label>
								<Select value={newModule} onValueChange={setNewModule}>
									<SelectTrigger id={moduleSelectId}>
										<SelectValue placeholder="モジュールを選択" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="A">A</SelectItem>
										<SelectItem value="B">B</SelectItem>
										<SelectItem value="C">C</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<label
									htmlFor={isTwiceSelectId}
									className="mb-2 block text-gray-700 text-sm"
								>
									頻度
								</label>
								<Select value={newIsTwice} onValueChange={setNewIsTwice}>
									<SelectTrigger id={isTwiceSelectId}>
										<SelectValue placeholder="頻度を選択" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="false">週1回</SelectItem>
										<SelectItem value="true">週2回</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-end">
								<Button
									onClick={handleAddShift}
									disabled={isAdding}
									className="w-full bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
								>
									{isAdding ? '追加中...' : '✓ 追加'}
								</Button>
							</div>
						</div>
					</div>

					{loadingShiftUsual ? (
						<div className="py-8 text-center">
							<p className="text-gray-500 text-sm">シフト通常設定を読み込み中...</p>
						</div>
					) : (
						<div className="rounded-lg bg-white shadow-md">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-xl">年度</TableHead>
										<TableHead className="text-xl">学期</TableHead>
										<TableHead className="text-xl">モジュール</TableHead>
										<TableHead className="text-xl">頻度</TableHead>
										<TableHead className="text-xl">公開設定</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{shiftUsual.map((su) => {
										// semesterを日本語に変換
										const semesterJa =
											su.semester === 'spring'
												? '春'
												: su.semester === 'autumn'
													? '秋'
													: su.semester;

										return (
											<TableRow
												key={su.year + su.semester + su.module}
												className={su.isOpen ? 'bg-green-200' : 'bg-gray-200'}
											>
												<TableCell className="text-xl">{su.year}</TableCell>
												<TableCell className="text-xl">{semesterJa}</TableCell>
												<TableCell className="text-xl">{su.module}</TableCell>
												<TableCell>
													<Select
														value={su.isTwice ? 'true' : 'false'}
														onValueChange={(value) => handleFrequencyChange(su.uid, value)}
													>
														<SelectTrigger
															className={`w-[120px] bg-transparent ${
																su.isTwice
																	? 'border-green-300 text-green-700 hover:bg-green-100/50'
																	: 'border-gray-300 text-gray-700 hover:bg-gray-100/50'
															}`}
														>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="false">週1回</SelectItem>
															<SelectItem value="true">週2回</SelectItem>
														</SelectContent>
													</Select>
												</TableCell>
												<TableCell>
													<Select
														value={su.isOpen ? 'isOpen' : 'isClosed'}
														onValueChange={(value) => handleStatusChange(su.uid, value)}
													>
														<SelectTrigger
															className={`w-[120px] bg-transparent ${
																su.isOpen
																	? 'border-green-300 text-green-700 hover:bg-green-100/50'
																	: 'border-gray-300 text-gray-700 hover:bg-gray-100/50'
															}`}
														>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="isOpen">公開</SelectItem>
															<SelectItem value="isClosed">非公開</SelectItem>
														</SelectContent>
													</Select>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</div>

				{/* ホームに戻るボタン */}
				<div className="mt-8">
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
