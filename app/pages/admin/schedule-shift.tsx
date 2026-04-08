import { collection, getDocs, getFirestore } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { useAuth } from '../../lib/auth-context';
import type { ShiftListItem, UserProfile } from '../../lib/firebase';

/**
 * スタッフメンバーの情報を表すインターフェース
 */
interface StaffMember {
	userId: string; // ユーザーID
	name: string; // 名前
	isExaminer: boolean; // 試験官フラグ
	scheduleData: { period: number; day: string; canBeAssigned: boolean }[]; // スケジュールデータ
	comment?: string; // コメント（任意）
}

/**
 * 時間割の各セルを表すインターフェース
 */
interface TimeSlot {
	trainees: StaffMember[]; // 割り当てられた練習生（複数名）
	examiners: StaffMember[]; // 割り当てられた試験官（複数名）
	vacantUserIds: string[]; // この時間に入れる練習生と試験官のuserIdリスト
}

/**
 * ページメタデータを定義する関数
 * タイトルと説明を設定
 */
export function meta() {
	return [
		{ title: 'シフト作成 - Aula' },
		{ name: 'description', content: 'シフトを組むページ' },
	];
}

/**
 * シフト作成ページのメインコンポーネント
 * 管理者がシフトを組むためのインターフェースを提供
 */
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

	/**
	 * ローカルストレージのキーを生成するヘルパー関数
	 * シフトごとに一意のキーを生成
	 */
	const getStorageKey = useCallback(
		(shiftUid: string) => `schedule_shift_${shiftUid}`,
		[],
	);

	/**
	 * 時間割の状態管理（8時限 × 7曜日）
	 * 各セルに練習生1人以上と試験官2名以上を割り当てる
	 */
	const [schedule, setSchedule] = useState<TimeSlot[][]>(() => {
		// 初期状態は空のスケジュール
		return Array(8)
			.fill(null)
			.map(() =>
				Array(7)
					.fill(null)
					.map(() => ({
						trainees: [],
						examiners: [],
						vacantUserIds: [], // 初期状態では空
					})),
			);
	});

	// 選択中のスタッフとセルの状態管理
	const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null); // 選択中のスタッフ
	const [selectedCell, setSelectedCell] = useState<{
		period: number; // 時限
		day: number; // 曜日
	} | null>(null); // 選択中のセル
	const [staffType, setStaffType] = useState<'trainee' | 'examiner'>('trainee'); // トグル用の状態（練習生/試験官）

	/**
	 * Escapeキーでセル選択を解除するイベントリスナー
	 * コンポーネントマウント時に登録、アンマウント時に削除
	 */
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setSelectedCell(null);
				setSelectedStaff(null);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, []);
	/**
	 * scheduleが変更されたらローカルストレージに保存
	 * ユーザーが作業中のデータを失わないように自動保存
	 */
	useEffect(() => {
		if (shiftData && trainees.length > 0 && examiners.length > 0) {
			const storageKey = getStorageKey(shiftData.uid);
			// シリアライズ可能な形式に変換（userIdのみを保存）
			const serializable = schedule.map((row) =>
				row.map((slot) => ({
					traineeUserIds: slot.trainees.map((t) => t.userId),
					examinerUserIds: slot.examiners.map((e) => e.userId),
				})),
			);
			localStorage.setItem(storageKey, JSON.stringify(serializable));
			console.log('Saved schedule to localStorage');
		}
	}, [schedule, shiftData, trainees, examiners, getStorageKey]);
	/**
	 * 認証状態とadminフラグをチェック
	 * 未ログインまたは非管理者の場合は適切なページにリダイレクト
	 */
	useEffect(() => {
		if (!loading) {
			// 未ログインの場合はログインページにリダイレクト
			if (!user) {
				navigate('/login');
				return;
			}

			// ログイン済みでもadminフラグがない場合はダッシュボードにリダイレクト
			if (userProfile && !userProfile.isAdmin) {
				navigate('/dashboard');
				return;
			}
		}
	}, [user, userProfile, loading, navigate]);

	/**
	 * URLパラメータからshiftUidを取得してシフトデータを取得
	 * シフト回答データとユーザー情報を読み込み、スタッフリストを構築
	 */
	useEffect(() => {
		const fetchShiftData = async () => {
			// location.stateからshiftUidを取得
			const state = location.state as { shiftUid?: string } | null;
			if (!state?.shiftUid || !userProfile?.isAdmin) {
				navigate('/admin/manageAdjustment');
				return;
			}

			try {
				setLoadingUsers(true);
				const db = getFirestore();

				// shiftUsualコレクションから該当するシフトを検索
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
								comment: doc.data().comment || '',
							}) as ShiftListItem,
					)
					.find((shift) => shift.uid === state.shiftUid);

				// shiftUsualで見つからない場合はshiftUnusualから検索
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
									comment: doc.data().comment || '',
								}) as ShiftListItem,
						)
						.find((shift) => shift.uid === state.shiftUid);
				}

				// シフトが見つからない場合はエラー
				if (!foundShift) {
					console.error('Shift not found');
					navigate('/admin/manageAdjustment');
					return;
				}

				setShiftData(foundShift);
				console.log('Loaded shift:', foundShift);

				// シフト回答データを取得（コレクション名を動的に生成）
				const collectionName = `schedules_${foundShift.year}_${foundShift.semester}_${foundShift.module}`;
				console.log('Fetching shift responses from:', collectionName);

				try {
					// シフト回答データを取得
					const shiftResponsesCollection = collection(db, collectionName);
					const shiftResponsesSnapshot = await getDocs(shiftResponsesCollection);

					console.log(
						`Fetched ${shiftResponsesSnapshot.docs.length} shift responses`,
					);

					// 練習生と試験官のリストを初期化
					const traineeList: StaffMember[] = [];
					const examinerList: StaffMember[] = [];

					// スケジュールを初期化（8時限 × 7曜日の空の配列）
					const newSchedule: TimeSlot[][] = Array(8)
						.fill(null)
						.map(() =>
							Array(7)
								.fill(null)
								.map(() => ({
									trainees: [],
									examiners: [],
									vacantUserIds: [],
								})),
						);

					// パフォーマンス向上のため、userコレクションを一度だけ取得
					const usersCollection = collection(db, 'users');
					const usersSnapshot = await getDocs(usersCollection);

					// 各シフト回答を処理してスタッフリストを構築
					for (const shiftDoc of shiftResponsesSnapshot.docs) {
						const shiftResponseData = shiftDoc.data();
						const userId = shiftResponseData.userId;

						// userIdが存在しない場合はスキップ
						if (!userId) {
							console.log('No userId in shift response:', shiftDoc.id);
							continue;
						}

						console.log('Processing shift response for userId:', userId);

						// userコレクションから該当ユーザーの情報を取得
						const userDoc = usersSnapshot.docs.find((doc) => doc.id === userId);

						// ユーザーが見つからない場合はスキップ
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

						// デバッグ用：スケジュールデータの構造を確認
						console.log(
							'Schedule data for user:',
							userId,
							shiftResponseData.scheduleData,
						);

						// StaffMemberオブジェクトを作成（ユーザー情報とスケジュールデータを統合）
						const staffMember: StaffMember = {
							userId: userId,
							name: userData.name || '名前未設定',
							isExaminer: userData.isExaminer || false,
							scheduleData: shiftResponseData.scheduleData.map(
								(slot: { period: number; day: string; isSelected: boolean }) => ({
									period: slot.period,
									day: slot.day,
									canBeAssigned: slot.isSelected,
								}),
							),
                            comment: shiftResponseData.comment || '',
						};

						// scheduleDataからvacantUserIdsに追加（空き時間情報を記録）
						if (
							shiftResponseData.scheduleData &&
							Array.isArray(shiftResponseData.scheduleData)
						) {
							for (const slot of shiftResponseData.scheduleData) {
								const period = slot.period;
								const day = slot.day;
								// 時限と曜日が有効な範囲内の場合のみ追加
								if (period >= 0 && period < 8 && day >= 0 && day < 7) {
									newSchedule[period][day].vacantUserIds.push(userId);
								}
							}
						}

						// isExaminerフラグに基づいて試験官または練習生リストに追加
						if (userData.isExaminer === true) {
							examinerList.push(staffMember);
						} else {
							traineeList.push(staffMember);
						}
					}

					// スタッフリストの状態を更新
					setTrainees(traineeList);
					setExaminers(examinerList);

					// ローカルストレージから保存されたスケジュールを復元（作業の継続）
					const storageKey = getStorageKey(foundShift.uid);
					const savedScheduleJson = localStorage.getItem(storageKey);

					// 保存されたデータがある場合は復元
					if (savedScheduleJson) {
						try {
							const savedSchedule = JSON.parse(savedScheduleJson);
							// 保存されたデータを使用してスケジュールを復元（8時限 × 7曜日）
							const restoredSchedule: TimeSlot[][] = Array(8)
								.fill(null)
								.map((_, p) =>
									Array(7)
										.fill(null)
										.map((_, d) => {
											const saved = savedSchedule[p]?.[d];
											// 保存されたデータがない場合は空のセル
											if (!saved) {
												return {
													trainees: [],
													examiners: [],
													vacantUserIds: newSchedule[p][d].vacantUserIds,
												};
											}

											// 保存されたuserIdリストから練習生リストを復元
											const trainees = (saved.traineeUserIds || [])
												.map((userId: string) =>
													traineeList.find((t) => t.userId === userId),
												)
												.filter(Boolean) as StaffMember[];

											// 保存されたuserIdリストから試験官リストを復元
											const examiners = (saved.examinerUserIds || [])
												.map((userId: string) =>
													examinerList.find((e) => e.userId === userId),
												)
												.filter(Boolean) as StaffMember[];

											return {
												trainees,
												examiners,
												vacantUserIds: newSchedule[p][d].vacantUserIds,
											};
										}),
								);
							setSchedule(restoredSchedule);
							console.log('Restored schedule from localStorage');
						} catch (error) {
							console.error('Failed to restore schedule from localStorage:', error);
							setSchedule(newSchedule);
						}
					} else {
						setSchedule(newSchedule);
					}

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
	}, [location.state, userProfile, navigate, getStorageKey]);

	// ===== レンダリング前の計算処理 =====

	/**
	 * 各練習生の割り当てコマ数を計算
	 * スタッフリストに割り当て数を表示するために使用
	 */
	const traineeAssignments = trainees.map((trainee) => {
		let count = 0;
		// 全てのセルをチェックして割り当て数をカウント
		for (let p = 0; p < 8; p++) {
			for (let d = 0; d < 7; d++) {
				if (schedule[p][d].trainees.find((t) => t.userId === trainee.userId)) {
					count++;
				}
			}
		}
		return { trainee, count };
	});

	/**
	 * 各試験官の割り当てコマ数を計算
	 * スタッフリストに割り当て数を表示するために使用
	 */
	const examinerAssignments = examiners.map((examiner) => {
		let count = 0;
		// 全てのセルをチェックして割り当て数をカウント
		for (let p = 0; p < 8; p++) {
			for (let d = 0; d < 7; d++) {
				if (schedule[p][d].examiners.find((e) => e.userId === examiner.userId)) {
					count++;
				}
			}
		}
		return { examiner, count };
	});

	/**
	 * 各セルの状態を事前計算
	 * レンダリング時の条件判定を簡潔にするため
	 */
	const cellStates = schedule.map((row, periodIndex) =>
		row.map((timeSlot, dayIndex) => {
			const traineeCount = timeSlot.trainees.length; // 練習生の人数
			const examinerCount = timeSlot.examiners.length; // 試験官の人数
			const isComplete = traineeCount > 0 && examinerCount >= 2; // 完了状態（練習生1人以上＋試験官2人以上）
			const isPartial = traineeCount > 0 || examinerCount > 0; // 部分的に割り当てあり
			const isSelectedNow =
				selectedCell?.period === periodIndex && selectedCell?.day === dayIndex; // 現在選択中
			const canAssignTrainee =
				selectedStaff !== null && selectedStaff.isExaminer === false; // 練習生を割り当て可能

			return {
				timeSlot,
				traineeCount,
				examinerCount,
				isComplete,
				isPartial,
				isSelectedNow,
				canAssignTrainee,
			};
		}),
	);

	// ===== イベントハンドラー関数群 =====

	/**
	 * セルクリック時の処理
	 * 練習生が選択されている場合は割り当て、それ以外は詳細表示
	 */
	const handleCellClick = (periodIndex: number, dayIndex: number) => {
		if (selectedStaff !== null && selectedStaff.isExaminer === false) {
			// 練習生が選択されている場合：クリックしたセルに割り当て
			console.log('Assigning trainee:', {
				trainee: selectedStaff.name,
				period: periodIndex,
				day: dayIndex,
			});

			const newSchedule = [...schedule];
			const cell = newSchedule[periodIndex][dayIndex];
			// 重複チェック：既に追加されていない場合のみ追加
			if (!cell.trainees.find((t) => t.userId === selectedStaff.userId)) {
				cell.trainees = [...cell.trainees, selectedStaff];
			}
			setSchedule(newSchedule);
			setSelectedStaff(null); // 選択状態を解除
			console.log('Trainee assigned successfully');
		} else {
			// それ以外の場合：セルを選択（詳細表示用）
			setSelectedCell({ period: periodIndex, day: dayIndex });
		}
	};

	/**
	 * 練習生クリック時の処理
	 * 選択/選択解除をトグル
	 */
	const handleTraineeClick = (trainee: StaffMember) => {
		const isSelected =
			selectedStaff?.userId === trainee.userId && !selectedStaff.isExaminer;
		if (isSelected) {
			// 既に選択されている場合は選択解除
			setSelectedStaff(null);
			console.log('Trainee deselected');
		} else {
			// 新しく選択
			console.log('Trainee selected:', trainee.name, 'userId:', trainee.userId);
			setSelectedStaff(trainee);
			setSelectedCell(null); // セル選択を解除
		}
	};

	/**
	 * 試験官クリック時の処理
	 * セルが選択されている場合は追加、それ以外は選択
	 */
	const handleExaminerClick = (examiner: StaffMember) => {
		if (selectedCell) {
			// セルが選択されている場合：そのセルに試験官を追加
			const newSchedule = [...schedule];
			const cell = newSchedule[selectedCell.period][selectedCell.day];
			// 重複チェック：既に追加されていない場合のみ追加
			if (!cell.examiners.find((e) => e.userId === examiner.userId)) {
				cell.examiners = [...cell.examiners, examiner];
			}
			setSchedule(newSchedule);
			setSelectedStaff(null); // 選択状態を解除
		} else {
			// セルが選択されていない場合：試験官を選択状態にする
			setSelectedStaff(examiner);
		}
	};

	/**
	 * スタッフタイプ切り替え時の処理
	 * 練習生/試験官のトグルボタン
	 */
	const handleStaffTypeChange = (type: 'trainee' | 'examiner') => {
		setStaffType(type);
		setSelectedStaff(null); // スタッフ選択を解除
	};

	return (
		<div className={`min-h-screen bg-slate-50 ${isMobile ? 'py-4' : 'py-8'}`}>
			<div
				className={`mx-auto ${isMobile ? 'max-w-full px-3' : isTablet ? 'max-w-6xl px-4' : 'max-w-7xl px-6'}`}
			>
				{/* ヘッダー */}
				<div className="mb-6">
					<div className="flex w-full items-center justify-between">
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
								{shiftData.semester === 'spring' ? '春学期 ' : '秋学期 '}
								{shiftData.module}モジュール
							</div>
						) : null}
					</div>
				</div>

				{/* メインコンテンツ */}
				<div className={`${isDesktop ? 'flex gap-6' : 'space-y-6'}`}>
					{/* 左側：時間割表のみ */}
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
											const cellState = cellStates[periodIndex][dayIndex];
											const {
												timeSlot,
												examinerCount,
												isComplete,
												isPartial,
												isSelectedNow,
												canAssignTrainee,
											} = cellState;

											return (
												<Button
													key={`${period}-${dayName}`}
													variant={isComplete ? 'default' : 'outline'}
													className={`h-full w-full rounded-lg border font-medium shadow-sm transition-all duration-200 ${
														isMobile
															? 'p-0.5 text-xs'
															: isTablet
																? 'p-1 text-xs'
																: 'p-2 text-xs lg:text-sm'
													} ${
														isSelectedNow
															? 'scale-105 border-4 border-blue-500 ring-4 ring-blue-200'
															: ''
													} ${
														canAssignTrainee
															? 'cursor-pointer border-blue-400 bg-blue-100 ring-2 ring-blue-300 hover:bg-blue-200 hover:ring-4 hover:ring-blue-400'
															: ''
													} ${
														!canAssignTrainee
															? isComplete
																? 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600'
																: isPartial
																	? 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200'
																	: 'text-slate-600 hover:border-blue-300 hover:bg-blue-50'
															: ''
													}`}
													onClick={() => handleCellClick(periodIndex, dayIndex)}
												>
													<div className="flex flex-col items-center justify-center gap-0.5">
														<div className="max-w-full text-xs">
															{timeSlot.trainees.length > 0 ? (
																<div className="flex flex-col gap-0.5">
																	{timeSlot.trainees.map((trainee, idx) => (
																		<div key={trainee.userId} className="truncate font-semibold">
																			練{idx + 1}: {trainee.name}
																		</div>
																	))}
																</div>
															) : (
																<div className="font-semibold">練習生: 0名</div>
															)}
														</div>
														<div className="max-w-full text-xs">
															{examinerCount > 0 ? (
																<div className="flex flex-col gap-0.5">
																	{timeSlot.examiners.map((examiner, idx) => (
																		<div key={examiner.userId} className="truncate">
																			試{idx + 1}: {examiner.name}
																		</div>
																	))}
																	{examinerCount < 2 && (
																		<span className="text-red-500 text-xs">
																			(あと{2 - examinerCount}名必要)
																		</span>
																	)}
																</div>
															) : (
																<div>
																	試験官: 0名
																	<span className="text-red-500"> (不足)</span>
																</div>
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
										<h4 className="mb-1 font-semibold text-slate-700 text-sm">
											練習生 (
											{schedule[selectedCell.period][selectedCell.day].trainees.length}名)
										</h4>
										{schedule[selectedCell.period][selectedCell.day].trainees.length >
										0 ? (
											<div className="space-y-1">
												{schedule[selectedCell.period][selectedCell.day].trainees.map(
													(trainee) => (
														<div
															key={trainee.userId}
															className="flex items-center justify-between rounded bg-white p-2"
														>
															<span className="text-sm">{trainee.name}</span>
															<Button
																variant="ghost"
																size="sm"
																className="text-red-600 hover:bg-red-50 hover:text-red-700"
																onClick={() => {
																	const newSchedule = [...schedule];
																	newSchedule[selectedCell.period][selectedCell.day].trainees =
																		newSchedule[selectedCell.period][
																			selectedCell.day
																		].trainees.filter((t) => t.userId !== trainee.userId);
																	setSchedule(newSchedule);
																}}
															>
																削除
															</Button>
														</div>
													),
												)}
											</div>
										) : (
											<p className="text-slate-500 text-sm">未割り当て</p>
										)}
									</div>

									{/* 試験官 */}
									<div>
										<h4 className="mb-1 font-semibold text-slate-700 text-sm">
											試験官 (
											{schedule[selectedCell.period][selectedCell.day].examiners.length}名)
										</h4>
										{schedule[selectedCell.period][selectedCell.day].examiners.length >
										0 ? (
											<div className="space-y-1">
												{schedule[selectedCell.period][selectedCell.day].examiners.map(
													(examiner) => (
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
																		newSchedule[selectedCell.period][
																			selectedCell.day
																		].examiners.filter((e) => e.userId !== examiner.userId);
																	setSchedule(newSchedule);
																}}
															>
																削除
															</Button>
														</div>
													),
												)}
											</div>
										) : (
											<p className="text-slate-500 text-sm">未割り当て</p>
										)}
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					{/* 右側：スタッフリスト（トグルで練習生/試験官を切り替え） */}
					<div className={`${isDesktop ? 'w-80' : 'w-full'}`}>
						<Card className="shadow-lg">
							<CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
								{/* トグルボタン */}
								<div className="mb-4 flex gap-2">
									<Button
										variant={staffType === 'trainee' ? 'default' : 'outline'}
										className={`flex-1 transition-all ${
											staffType === 'trainee'
												? 'bg-blue-500 text-white hover:bg-blue-600'
												: 'text-slate-600 hover:bg-slate-100'
										}`}
										onClick={() => handleStaffTypeChange('trainee')}
									>
										練習生 ({trainees.length})
									</Button>
									<Button
										variant={staffType === 'examiner' ? 'default' : 'outline'}
										className={`flex-1 transition-all ${
											staffType === 'examiner'
												? 'bg-blue-500 text-white hover:bg-blue-600'
												: 'text-slate-600 hover:bg-slate-100'
										}`}
										onClick={() => handleStaffTypeChange('examiner')}
									>
										試験官 ({examiners.length})
									</Button>
								</div>

								{/* 選択中のセル情報 */}
								{selectedCell && (
									<div className="mb-3 rounded bg-blue-50 p-3">
										<div className="mb-1 font-semibold text-blue-900 text-sm">
											📍 {periods[selectedCell.period]}限・{day[selectedCell.day]}曜日
										</div>
										<div className="text-slate-600 text-xs">
											練習生:{' '}
											{schedule[selectedCell.period][selectedCell.day].trainees.length}名
										</div>
										<div className="text-slate-600 text-xs">
											試験官:{' '}
											{schedule[selectedCell.period][selectedCell.day].examiners.length}名
										</div>
									</div>
								)}

								{/* ヘルプテキスト */}
								{selectedStaff && staffType === 'trainee' && (
									<div className="mb-3 animate-pulse rounded bg-blue-50 p-2 text-center text-blue-600 text-sm">
										👆 割り当てるセルをクリック
									</div>
								)}

								{/* スタッフリスト */}
								<div className="space-y-2">
									{staffType === 'trainee' ? (
										// 練習生リスト
										trainees.length > 0 ? (
											traineeAssignments.map(({ trainee, count: assignedCount }) => {
												const isSelected =
													selectedStaff?.userId === trainee.userId &&
													!selectedStaff.isExaminer;

												return (
													<Button
														key={trainee.userId}
														variant={isSelected ? 'default' : 'outline'}
														className={`h-auto w-full flex-col items-start justify-start gap-1.5 py-2.5 text-left transition-all duration-200 ${
															isSelected
																? 'scale-105 bg-blue-500 text-white shadow-lg hover:bg-blue-600'
																: assignedCount > 0
																	? 'border-emerald-300 bg-emerald-50 hover:border-emerald-500 hover:bg-emerald-100'
																	: 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'
														}`}
														onClick={() => handleTraineeClick(trainee)}
													>
                                                        <div className="flex w-full items-center justify-between gap-2">
                                                            <span className="font-medium text-slate-700 text-sm">
                                                                {trainee.name}
                                                            </span>
                                                            {assignedCount > 0 && (
                                                                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white text-xs">
                                                                    {assignedCount}コマ
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p
                                                            className={`w-full whitespace-normal break-words text-left text-xs leading-snug ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}
                                                        >
                                                            {trainee.comment}
                                                        </p>
													</Button>
												);
											})
										) : (
											<p className="text-slate-500 text-sm">練習生がいません</p>
										)
									) : // 試験官リスト
									examiners.length > 0 ? (
										examinerAssignments.map(({ examiner, count: assignedCount }) => {
											const isSelected = selectedStaff?.userId === examiner.userId;

											return (
												<Button
													key={examiner.userId}
													variant={isSelected ? 'default' : 'outline'}
														className={`h-auto w-full flex-col items-start justify-start gap-1.5 py-2.5 text-left transition-all duration-200 ${
														isSelected
															? 'bg-blue-500 text-white hover:bg-blue-600'
															: assignedCount > 0
																? 'border-emerald-300 bg-emerald-50 hover:border-emerald-500 hover:bg-emerald-100'
																: 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
													}`}
													onClick={() => handleExaminerClick(examiner)}
												>
                                                    <div className="flex w-full items-center justify-between gap-2">
                                                            <span className="font-medium text-slate-700 text-sm">
                                                            {examiner.name}
                                                        </span>
                                                        {assignedCount > 0 && (
                                                                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white text-xs">
                                                                {assignedCount}コマ
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p
                                                        className={`w-full whitespace-normal break-words text-left text-xs leading-snug ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}
                                                    >
                                                        {examiner.comment}
                                                    </p>
                                                </Button>
											);
										})
									) : (
										<p className="text-slate-500 text-sm">試験官がいません</p>
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
