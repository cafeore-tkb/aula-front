import { collection, getDocs, getFirestore } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { useAuth } from '../../lib/auth-context';
import type { ShiftListItem, UserProfile } from '../../lib/firebase';

interface StaffMember {
	userId: string;
	name: string;
	isExaminer: boolean;
}

interface TimeSlot {
	trainee: StaffMember | null;
	examiners: StaffMember[];
}

export function meta() {
	return [
		{ title: 'シフト作成 - Aula' },
		{ name: 'description', content: 'シフトを組むページ' },
	];
}

export default function ScheduleShift() {
	const { user, userProfile, loading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [shiftData, setShiftData] = useState<ShiftListItem | null>(null);
	const [trainees, setTrainees] = useState<StaffMember[]>([]);
	const [examiners, setExaminers] = useState<StaffMember[]>([]);
	const isDesktop = useMediaQuery({ minWidth: 1024 }); // lg以上
	const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 }); // md-lg
	const isMobile = useMediaQuery({ maxWidth: 767 }); // md未満

	// 曜日と時限の定義
	const day = ['月', '火', '水', '木', '金', '土', '日'];
	const periods = [1, 2, 3, 4, 5, 6, 7, 8];

	// 時間割の状態管理（8時限 × 7曜日）
	// 各セルに練習生1人と試験官2名以上を割り当て
	const [schedule, setSchedule] = useState<TimeSlot[][]>(
		Array(8)
			.fill(null)
			.map(() =>
				Array(7)
					.fill(null)
					.map(() => ({
						trainee: null,
						examiners: [],
					})),
			),
	);

	// 選択中のスタッフとセル
	const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
	const [selectedCell, setSelectedCell] = useState<{
		period: number;
		day: number;
	} | null>(null);

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

	// URL パラメータから shiftUid を取得してシフトデータを取得
	useEffect(() => {
		const fetchShiftData = async () => {
			const state = location.state as { shiftUid?: string } | null;
			if (!state?.shiftUid || !userProfile?.isAdmin) {
				navigate('/admin/manage-adjustment');
				return;
			}

			try {
				setLoadingUsers(true);
				const db = getFirestore();

				// shiftUsual と shiftUnusual から該当するシフトを検索
				const usualShiftsCollection = collection(db, 'shiftUsual');
				const usualShiftsSnapshot = await getDocs(usualShiftsCollection);
				let foundShift = usualShiftsSnapshot.docs
					.map(
						(doc) =>
							({
								uid: doc.id,
								year: doc.data().year || 2024,
								semester: doc.data().semester || 'spring',
								module: doc.data().module || 'A',
								isScheduled: doc.data().isScheduled || false,
							}) as ShiftListItem,
					)
					.find((shift) => shift.uid === state.shiftUid);

				if (!foundShift) {
					const unusualShiftsCollection = collection(db, 'shiftUnusual');
					const unusualShiftsSnapshot = await getDocs(unusualShiftsCollection);
					foundShift = unusualShiftsSnapshot.docs
						.map(
							(doc) =>
								({
									uid: doc.id,
									year: doc.data().year || 9999,
									semester: doc.data().semester || 'spring',
									module: doc.data().module || 'A',
									isScheduled: doc.data().isScheduled || false,
								}) as ShiftListItem,
						)
						.find((shift) => shift.uid === state.shiftUid);
				}

				if (!foundShift) {
					console.error('Shift not found');
					navigate('/admin/manage-adjustment');
					return;
				}

				setShiftData(foundShift);
				console.log('Loaded shift:', foundShift);

				// シフト回答データを取得して、回答したユーザーのみを抽出
				const collectionName = `schedules_${foundShift.year}_${foundShift.semester}_${foundShift.module}`;
				console.log('Fetching shift responses from:', collectionName);

				try {
					// まずシフト回答データを取得
					const shiftResponsesCollection = collection(db, collectionName);
					const shiftResponsesSnapshot = await getDocs(shiftResponsesCollection);

					console.log(
						`Fetched ${shiftResponsesSnapshot.docs.length} shift responses`,
					);

					// リストで管理
					const traineeList: StaffMember[] = [];
					const examinerList: StaffMember[] = [];

					// userコレクションを一度だけ取得
					const usersCollection = collection(db, 'users');
					const usersSnapshot = await getDocs(usersCollection);

					// 各シフト回答を処理
					for (const shiftDoc of shiftResponsesSnapshot.docs) {
						const shiftResponseData = shiftDoc.data();
						const userId = shiftResponseData.userId;

						if (!userId) {
							console.log('No userId in shift response:', shiftDoc.id);
							continue;
						}

						console.log('Processing shift response for userId:', userId);

						// userコレクションから該当ユーザーのドキュメントを取得
						const userDoc = usersSnapshot.docs.find((doc) => doc.id === userId);

						if (!userDoc) {
							console.log('User not found:', userId);
							continue;
						}

						const userData = userDoc.data() as UserProfile;
						console.log('User data:', {
							userId,
							name: userData.name,
							isExaminer: userData.isExaminer,
						});

						// StaffMemberオブジェクトを作成
						const staffMember: StaffMember = {
							userId: userId,
							name: userData.name || '名前未設定',
							isExaminer: userData.isExaminer || false,
						};

						// isExaminer フラグで試験官を判定
						if (userData.isExaminer === true) {
							examinerList.push(staffMember);
						} else {
							traineeList.push(staffMember);
						}
					}

					// 状態を更新
					setTrainees(traineeList);
					setExaminers(examinerList);

					console.log('Trainees:', traineeList);
					console.log('Examiners:', examinerList);
				} catch (error) {
					console.error('Error fetching shift data:', error);
				}
			} catch (error) {
				console.error('Error fetching shift data:', error);
			} finally {
				setLoadingUsers(false);
			}
		};

		fetchShiftData();
	}, [location.state, userProfile, navigate]);

	return (
		<div className={`min-h-screen bg-slate-50 ${isMobile ? 'py-4' : 'py-8'}`}>
			<div
				className={`mx-auto ${isMobile ? 'max-w-full px-3' : isTablet ? 'max-w-6xl px-4' : 'max-w-7xl px-6'}`}
			>
				{/* ヘッダー */}
				<div className="mb-6 flex w-full items-center justify-between">
					<h1
						className={`font-bold text-slate-800 ${isMobile ? 'text-2xl' : 'text-3xl'}`}
					>
						シフト作成
					</h1>
					{loadingUsers ? (
						<div className="mt-2 flex items-center gap-2">
							<div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
							<span className="text-slate-500 text-sm">読み込み中...</span>
						</div>
					) : shiftData ? (
						<div className="mt-2 items-end text-lg text-slate-600">
							{shiftData.year}年度{' '}
							{shiftData.semester === 'spring' ? '春学期' : '秋学期'} モジュール
							{shiftData.module}
						</div>
					) : null}
				</div>

				{/* メインコンテンツ */}
				<div className={`${isDesktop ? 'flex gap-6' : 'space-y-6'}`}>
					{/* 左側：時間割表と練習生 */}
					<div className={`${isDesktop ? 'flex-1' : 'w-full'}`}>
						<div className={`flex ${isMobile ? 'flex-col' : 'h-full flex-col'}`}>
							<div
								className={`grid ${isMobile ? 'grid-cols-8' : 'flex-1 grid-cols-8'} rounded-xl border border-slate-200 bg-white shadow-lg ${
									isMobile
										? 'gap-0.5 p-1'
										: isTablet
											? 'gap-1 p-2'
											: 'gap-2 p-3 xl:gap-3 xl:p-4'
								}`}
							>
								{/* ヘッダー行 */}
								<Card className="rounded-lg bg-blue-500 text-white shadow-sm">
									<CardContent
										className={`text-center font-semibold ${
											isMobile
												? 'p-0.5 text-xs'
												: isTablet
													? 'p-1 text-xs'
													: 'p-1 text-xs sm:p-1.5 lg:p-2 lg:text-sm'
										}`}
									>
										時限
									</CardContent>
								</Card>
								{day.map((dayName) => (
									<Card
										key={dayName}
										className="rounded-lg bg-blue-500 text-white shadow-sm"
									>
										<CardContent
											className={`text-center font-semibold ${
												isMobile
													? 'p-0.5 text-xs'
													: isTablet
														? 'p-1 text-xs'
														: 'p-1 text-xs sm:p-1.5 lg:p-2 lg:text-sm'
											}`}
										>
											{isMobile ? dayName : `${dayName}曜日`}
										</CardContent>
									</Card>
								))}

								{/* 時間割セル */}
								{periods.map((period, periodIndex) => (
									<React.Fragment key={period}>
										{/* 時限・時間表示 */}
										<Card className="rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
											<CardContent
												className={`text-center font-medium ${
													isMobile
														? 'p-0.5'
														: isTablet
															? 'p-1'
															: 'p-1 sm:p-1.5 lg:p-2 xl:p-2.5'
												}`}
											>
												<div className={isMobile ? 'text-xs' : 'text-xs lg:text-sm'}>
													<div className="font-semibold text-slate-700">{period}限</div>
												</div>
											</CardContent>
										</Card>

										{/* 各曜日のセル */}
										{day.map((dayName, dayIndex) => {
											const timeSlot = schedule[periodIndex][dayIndex];
											const hasTrainee = timeSlot.trainee !== null;
											const examinerCount = timeSlot.examiners.length;
											const isComplete = hasTrainee && examinerCount >= 2;
											const isPartial = hasTrainee || examinerCount > 0;

											return (
												<Button
													key={`${period}-${dayName}`}
													variant={isComplete ? 'default' : 'outline'}
													className={`h-full w-full rounded-lg border font-medium shadow-sm ${
														isMobile
															? 'p-0.5 text-xs'
															: isTablet
																? 'p-1 text-xs'
																: 'p-2 text-xs lg:text-sm'
													} ${
														isComplete
															? 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600'
															: isPartial
																? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200'
																: 'text-slate-600 hover:border-blue-300 hover:bg-blue-50'
													}`}
													onClick={() =>
														setSelectedCell({ period: periodIndex, day: dayIndex })
													}
												>
													<div className="flex flex-col items-center justify-center gap-0.5">
														{hasTrainee ? (
															<div className="max-w-full truncate text-xs">
																練: {timeSlot.trainee?.name}
															</div>
														) : (
															<div className="text-slate-400 text-xs">練習生なし</div>
														)}
														<div className="text-xs">
															試験官: {examinerCount}名
															{examinerCount < 2 && (
																<span className="text-red-500"> (不足)</span>
															)}
														</div>
													</div>
												</Button>
											);
										})}
									</React.Fragment>
								))}
							</div>
						</div>

						{/* セル詳細カード */}
						{selectedCell && (
							<Card className="mt-6 border-2 border-blue-400 bg-blue-50 shadow-lg">
								<CardContent className="p-4">
									<div className="mb-3 flex items-center justify-between">
										<h3 className="font-bold text-slate-800">
											{periods[selectedCell.period]}限・{day[selectedCell.day]}曜日
										</h3>
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setSelectedCell(null);
												setSelectedStaff(null);
											}}
										>
											閉じる
										</Button>
									</div>
									
									{/* 練習生 */}
									<div className="mb-3">
										<h4 className="mb-1 font-semibold text-slate-700 text-sm">練習生</h4>
										{schedule[selectedCell.period][selectedCell.day].trainee ? (
											<div className="flex items-center justify-between rounded bg-white p-2">
												<span className="text-sm">
													{schedule[selectedCell.period][selectedCell.day].trainee?.name}
												</span>
												<Button
													variant="ghost"
													size="sm"
													className="text-red-600 hover:bg-red-50 hover:text-red-700"
													onClick={() => {
														const newSchedule = [...schedule];
														newSchedule[selectedCell.period][selectedCell.day].trainee = null;
														setSchedule(newSchedule);
													}}
												>
													削除
												</Button>
											</div>
										) : (
											<p className="text-slate-500 text-sm">未割り当て</p>
										)}
									</div>
									
									{/* 試験官 */}
									<div>
										<h4 className="mb-1 font-semibold text-slate-700 text-sm">
											試験官 ({schedule[selectedCell.period][selectedCell.day].examiners.length}名)
										</h4>
										{schedule[selectedCell.period][selectedCell.day].examiners.length > 0 ? (
											<div className="space-y-1">
												{schedule[selectedCell.period][selectedCell.day].examiners.map((examiner) => (
													<div
														key={examiner.userId}
														className="flex items-center justify-between rounded bg-white p-2"
													>
														<span className="text-sm">{examiner.name}</span>
														<Button
															variant="ghost"
															size="sm"
															className="text-red-600 hover:bg-red-50 hover:text-red-700"
															onClick={() => {
																const newSchedule = [...schedule];
																newSchedule[selectedCell.period][selectedCell.day].examiners =
																	newSchedule[selectedCell.period][selectedCell.day].examiners.filter(
																		(e) => e.userId !== examiner.userId
																	);
																setSchedule(newSchedule);
															}}
														>
															削除
														</Button>
													</div>
												))}
											</div>
										) : (
											<p className="text-slate-500 text-sm">未割り当て</p>
										)}
									</div>
								</CardContent>
							</Card>
						)}

						{/* 練習生ボタン */}
						<div className="mt-6">
							<h3 className="mb-3 font-semibold text-slate-800">
								練習生 ({trainees.length})
								{selectedCell && (
									<span className="ml-2 text-blue-600 text-sm">
										← セルをクリック後、ここから練習生を選択
									</span>
								)}
							</h3>
							<div className="flex flex-wrap gap-2">
								{trainees.length > 0 ? (
									trainees.map((trainee) => {
										const isSelected = selectedStaff?.userId === trainee.userId;
										return (
											<Button
												key={trainee.userId}
												variant={isSelected ? 'default' : 'outline'}
												className={`${
													isSelected
														? 'bg-blue-500 text-white hover:bg-blue-600'
														: 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'
												}`}
												onClick={() => {
													if (selectedCell) {
														// 選択中のセルに練習生を割り当て
														const newSchedule = [...schedule];
														newSchedule[selectedCell.period][selectedCell.day].trainee =
															trainee;
														setSchedule(newSchedule);
														setSelectedCell(null);
														setSelectedStaff(null);
													} else {
														// 練習生を選択
														setSelectedStaff(trainee);
													}
												}}
											>
												{trainee.name}
											</Button>
										);
									})
								) : (
									<p className="text-slate-500 text-sm">練習生が見つかりません</p>
								)}
							</div>
						</div>
					</div>

					{/* 右側：試験官リスト */}
					<div className={`${isDesktop ? 'w-80' : 'w-full'}`}>
						<Card className="shadow-lg">
							<CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
								<h3 className="mb-4 font-semibold text-slate-800">
									試験官 ({examiners.length})
									{selectedCell && (
										<div className="mt-1 text-blue-600 text-xs">
											{periods[selectedCell.period]}限・{day[selectedCell.day]}曜日に追加
										</div>
									)}
								</h3>
								<div className="space-y-2">
									{examiners.length > 0 ? (
										examiners.map((examiner) => {
											const isSelected = selectedStaff?.userId === examiner.userId;
											return (
												<Button
													key={examiner.userId}
													variant={isSelected ? 'default' : 'outline'}
													className={`w-full justify-start ${
														isSelected
															? 'bg-blue-500 text-white hover:bg-blue-600'
															: 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
													}`}
													onClick={() => {
														if (selectedCell) {
															// 選択中のセルに試験官を追加
															const newSchedule = [...schedule];
															const cell = newSchedule[selectedCell.period][selectedCell.day];
															// 既に追加されていない場合のみ追加
															if (!cell.examiners.find((e) => e.userId === examiner.userId)) {
																cell.examiners = [...cell.examiners, examiner];
															}
															setSchedule(newSchedule);
															setSelectedStaff(null);
														} else {
															// 試験官を選択
															setSelectedStaff(examiner);
														}
													}}
												>
													<span className="font-medium text-slate-700 text-sm">
														{examiner.name}
													</span>
												</Button>
											);
										})
									) : (
										<p className="text-slate-500 text-sm">試験官が見つかりません</p>
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
