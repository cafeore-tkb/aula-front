import {
	addDoc,
	collection,
	doc,
	getDocs,
	query,
	serverTimestamp,
	setDoc,
	Timestamp,
	where,
} from 'firebase/firestore';
import React, { useEffect, useId, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useLocation } from 'react-router';
import { HomeButton } from '../../components/home-button';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import { List } from 'lucide-react';

export function meta() {
	return [
		{ title: 'Aula - 調整画面' },
		{ name: 'description', content: 'シフト調整画面' },
	];
}

export interface shiftData {
	id: number;
	year: number;
	semester: string;
	module: string;
	userId: string;
	userName: string;
	userEmail: string;
	scheduleData: {day:string; period:string; isSelected:boolean; startTime:string; endTime:string}[];
	isTwice: boolean;
	comment: string;
	frequency: string;
	updatedAt: Timestamp;
	};

export default function Adjustment() {
	const location = useLocation();
	const shiftInfo = location.state as {
		year?: number;
		semester?: string;
		module?: string;
		isTwice?: boolean;
		scheduleCollectionId?: string;
	} | null;

	const day = ['月', '火', '水', '木', '金', '土', '日'];
	const periods = ['1', '2', '3', '4', '5', '6', '7', '8'];
	const startTimes = [
		'8:40',
		'10:10',
		'12:15',
		'13:45',
		'15:15',
		'16:45',
		'18:15',
		'19:45',
	];
	const endTimes = [
		'9:55',
		'11:25',
		'13:30',
		'15:00',
		'16:30',
		'18:00',
		'19:30',
		'21:00',
	];

	// 8x7の2次元配列を初期化（periods x day）
	const [schedule, setSchedule] = useState<boolean[][]>(() =>
		Array(periods.length)
			.fill(null)
			.map(() => Array(day.length).fill(false)),
	);

	// 練習頻度を管理するstate
	const [frequency, setFrequency] = useState<string>('週1回');

	// コメント欄のstate
	const [comment, setComment] = useState<string>('');

	// 認証情報を取得
	const { user } = useAuth();

	// 保存中かどうかの状態
	const [isSaving, setIsSaving] = useState<boolean>(false);

	// 編集モード/閲覧モードの状態
	const [isEditMode, setIsEditMode] = useState<boolean>(false);

	// ローディング状態
	const [isLoading, setIsLoading] = useState<boolean>(true);

	// 既存のドキュメントIDを保持
	const [existingDocId, setExistingDocId] = useState<string | null>(null);

	// 登録済みデータを読み込む
	useEffect(() => {
		const loadExistingSchedule = async () => {
			if (!user || !shiftInfo) {
				setIsLoading(false);
				return;
			}

			try {
				// シフト専用のコレクション名（なければデフォルト名を生成）
				const collectionName =
					shiftInfo.scheduleCollectionId ||
					`schedules_${shiftInfo.year}_${shiftInfo.semester}_${shiftInfo.module}`;

				// 同じシフト情報で登録済みのデータを検索
				const schedulesRef = collection(db, collectionName);
				const q = query(schedulesRef, where('userId', '==', user.uid));

				const querySnapshot = await getDocs(q);

				if (!querySnapshot.empty) {
					// 最新のデータを取得（最初のドキュメント）
					const docSnapshot = querySnapshot.docs[0];
					const docData = docSnapshot.data();

					// ドキュメントIDを保存
					setExistingDocId(docSnapshot.id);

					// スケジュールデータを復元
					if (docData.scheduleData) {
						const newSchedule = Array(periods.length)
							.fill(null)
							.map(() => Array(day.length).fill(false));

						docData.scheduleData.forEach(
							(cell: { period: string; day: string; isSelected: boolean }) => {
								const periodIndex = periods.indexOf(cell.period);
								const dayIndex = day.indexOf(cell.day);
								if (periodIndex !== -1 && dayIndex !== -1 && cell.isSelected) {
									newSchedule[periodIndex][dayIndex] = true;
								}
							},
						);

						setSchedule(newSchedule);
					}

					// 頻度とコメントを復元
					if (docData.frequency) {
						setFrequency(docData.frequency);
					}
					if (docData.comment) {
						setComment(docData.comment);
					}

					// データがある場合は閲覧モードで開始
					setIsEditMode(false);
				} else {
					// データがない場合は編集モードで開始
					setIsEditMode(true);
				}
			} catch (error) {
				console.error('データ読み込みエラー:', error);
			} finally {
				setIsLoading(false);
			}
		};

		loadExistingSchedule();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user, shiftInfo]);

	// Firestoreに保存する関数
	const handleSave = async () => {
		if (!user) {
			alert('ログインが必要です');
			return;
		}

		try {
			setIsSaving(true);

			// 時間割データを整理
			const scheduleData = schedule.flatMap((row, periodIndex) =>
				row.map((isSelected, dayIndex) => ({
					period: periods[periodIndex],
					day: day[dayIndex],
					isSelected,
					startTime: startTimes[periodIndex],
					endTime: endTimes[periodIndex],
				})),
			);

			const dataToSave = {
				userId: user.uid,
				userEmail: user.email,
				userName: user.displayName || user.email || 'ユーザー',
				scheduleData,
				frequency,
				comment,
				// シフト情報を追加
				...(shiftInfo && {
					year: shiftInfo.year,
					semester: shiftInfo.semester,
					module: shiftInfo.module,
					isTwice: shiftInfo.isTwice,
				}),
				updatedAt: serverTimestamp(),
			};

			// シフト専用のコレクション名（なければデフォルト名を生成）
			const collectionName =
				shiftInfo?.scheduleCollectionId ||
				`schedules_${shiftInfo?.year}_${shiftInfo?.semester}_${shiftInfo?.module}`;

			// 既存のドキュメントがある場合は更新、ない場合は新規作成
			if (existingDocId) {
				// 既存のドキュメントを更新
				await setDoc(doc(db, collectionName, existingDocId), dataToSave);
			} else {
				// 新規作成
				const docRef = await addDoc(collection(db, collectionName), {
					...dataToSave,
					createdAt: serverTimestamp(),
				});
				setExistingDocId(docRef.id);
			}

			alert('保存しました！');
			setIsEditMode(false); // 保存後に閲覧モードに戻る
		} catch (error) {
			console.error('保存エラー:', error);
			alert('保存に失敗しました');
		} finally {
			setIsSaving(false);
		}
	};

	// セルの状態をトグルする関数
	const toggleCell = (periodIndex: number, dayIndex: number) => {
		setSchedule((prev) => {
			const newSchedule = [...prev];
			newSchedule[periodIndex] = [...newSchedule[periodIndex]];
			newSchedule[periodIndex][dayIndex] = !newSchedule[periodIndex][dayIndex];
			return newSchedule;
		});
	};

	// 曜日（列）全体をトグルする関数
	const toggleColumnAll = (dayIndex: number) => {
		setSchedule((prev) => {
			// その列が全てtrueかどうかをチェック
			const isAllTrue = prev.every((row) => row[dayIndex] === true);

			const newSchedule = [...prev];
			for (let periodIndex = 0; periodIndex < periods.length; periodIndex++) {
				newSchedule[periodIndex] = [...newSchedule[periodIndex]];
				// 全てtrueなら全てfalseに、そうでなければ全てtrueに
				newSchedule[periodIndex][dayIndex] = !isAllTrue;
			}
			return newSchedule;
		});
	};

	// 時限（行）全体をトグルする関数
	const toggleRowAll = (periodIndex: number) => {
		setSchedule((prev) => {
			// その行が全てtrueかどうかをチェック
			const isAllTrue = prev[periodIndex].every((cell) => cell === true);

			const newSchedule = [...prev];
			// 全てtrueなら全てfalseに、そうでなければ全てtrueに
			newSchedule[periodIndex] = new Array(day.length).fill(!isAllTrue);
			return newSchedule;
		});
	};

	const subjectNameId = useId();
	const weekly1Id = useId();
	const weekly2Id = useId();
	const examId = useId();

	// レスポンシブ対応
	const isDesktop = useMediaQuery({ minWidth: 1024 }); // lg以上
	const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 }); // md-lg
	const isMobile = useMediaQuery({ maxWidth: 767 }); // md未満

	// ローディング中の表示
	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
					<p className="text-slate-600">データを読み込み中...</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`bg-slate-50 ${isMobile ? 'min-h-screen p-4' : 'p-4 lg:h-screen lg:overflow-hidden lg:p-6'}`}
		>
			<div
				className={`flex ${isMobile ? 'min-h-full flex-col gap-4' : isTablet ? 'h-full flex-col gap-4' : 'h-full flex-row gap-3 xl:gap-6'}`}
			>
				{/* モバイル時：シフト情報を一番上に表示 */}
				{isMobile && shiftInfo && (
					<Card className="border-violet-200 bg-violet-50 shadow-md">
						<CardContent className="p-3">
							<div className="flex items-center space-x-2">
								<span className="text-xl">📋</span>
								<div>
									<h2 className="font-bold text-violet-900 text-xs">
										{shiftInfo.year}年度 {shiftInfo.semester === 'spring' ? '春' : '秋'}
										学期 {shiftInfo.module}モジュール
									</h2>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* 左側：時間割表 */}
				<div
					className={`${isDesktop ? 'h-full w-3/4 flex-1 overflow-hidden' : 'w-full'}`}
				>
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
							{day.map((dayName, index) => (
								<Card
									key={dayName}
									className={`rounded-lg bg-blue-500 text-white shadow-sm transition-colors hover:bg-blue-600 ${
										isEditMode ? 'cursor-pointer' : 'cursor-default opacity-75'
									}`}
									onClick={() => isEditMode && toggleColumnAll(index)}
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
									<Card
										className={`rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition-colors hover:bg-slate-200 ${
											isEditMode ? 'cursor-pointer' : 'cursor-default opacity-75'
										}`}
										onClick={() => isEditMode && toggleRowAll(periodIndex)}
									>
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
												{!isMobile && (
													<div className="whitespace-nowrap text-slate-500 text-xs">
														{isDesktop ? (
															`${startTimes[periodIndex]}-${endTimes[periodIndex]}`
														) : isTablet ? (
															startTimes[periodIndex]
														) : (
															<span className="hidden sm:inline lg:hidden">
																{startTimes[periodIndex]}
															</span>
														)}
													</div>
												)}
											</div>
										</CardContent>
									</Card>

									{/* 各曜日のセル */}
									{day.map((dayName, dayIndex) => {
										const isSelected = schedule[periodIndex][dayIndex];
										return (
											<Button
												key={`${period}-${dayName}`}
												variant={isSelected ? 'default' : 'ghost'}
												className={`h-full w-full rounded-lg border font-semibold shadow-sm transition-all duration-300 hover:shadow-md ${
													isMobile
														? 'text-xs'
														: isTablet
															? 'text-sm'
															: 'lg:text-sm xl:text-base'
												} ${
													isSelected
														? 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600'
														: 'text-slate-600 hover:bg-gray-200 hover:text-slate-800'
												} ${!isEditMode && 'cursor-default opacity-75'}`}
												onClick={() => isEditMode && toggleCell(periodIndex, dayIndex)}
												disabled={!isEditMode}
											>
												{isSelected ? '〇' : '×'}
											</Button>
										);
									})}
								</React.Fragment>
							))}
						</div>
					</div>
				</div>

				{/* 右側：入力欄 (1/4の幅) */}
				<div
					className={`${isMobile ? 'mt-4 w-full' : isTablet ? 'mt-4 w-full' : 'mt-0 h-full w-1/4'} flex flex-col`}
				>
					<div
						className={`flex flex-col ${isMobile ? 'space-y-2' : isTablet ? 'space-y-3' : 'h-full space-y-3'}`}
					>
						{/* シフト情報表示（タブレット・デスクトップのみ） */}
						{!isMobile && shiftInfo && (
							<Card className="border-violet-200 bg-violet-50 shadow-md">
								<CardContent className={isMobile ? 'p-3' : 'p-4'}>
									<div className="flex items-center space-x-2">
										<span className={isMobile ? 'text-xl' : 'text-2xl'}>📋</span>
										<div>
											<h2
												className={`font-bold text-violet-900 ${
													isMobile
														? 'text-xs'
														: isTablet
															? 'text-sm'
															: 'text-sm lg:text-base'
												}`}
											>
												{shiftInfo.year}年度 {shiftInfo.semester === 'spring' ? '春' : '秋'}
												学期 {shiftInfo.module}モジュール
											</h2>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* ユーザー名表示 */}
						{user && (
							<Card className="border-sky-200 bg-sky-50 shadow-md">
								<CardContent className={isMobile ? 'p-2' : 'p-3'}>
									<div className="flex items-center space-x-2">
										<div
											className={`flex items-center justify-center rounded-full bg-sky-500 shadow-sm ${
												isMobile ? 'h-6 w-6' : 'h-8 w-8'
											}`}
										>
											<span
												className={`font-bold text-white ${isMobile ? 'text-xs' : 'text-sm'}`}
											>
												{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
											</span>
										</div>
										<div>
											<p className={`text-sky-600 ${isMobile ? 'text-xs' : 'text-xs'}`}>
												ログイン中
											</p>
											<p
												className={`font-semibold text-sky-900 ${isMobile ? 'text-xs' : 'text-sm'}`}
											>
												{user.displayName || user.email || 'ユーザー'}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* コメント欄 */}
						<Card className="rounded-xl border-slate-200 bg-white shadow-md">
							<CardContent className={isMobile ? 'p-3' : 'p-4'}>
								<label
									htmlFor={subjectNameId}
									className={`mb-2 flex items-center font-semibold text-slate-700 ${
										isMobile ? 'text-xs' : 'text-sm'
									}`}
								>
									<span className={`mr-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
										💬
									</span>
									コメント
								</label>
								<textarea
									id={subjectNameId}
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									rows={isMobile ? 2 : 3}
									className={`w-full resize-none rounded-lg border border-slate-300 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 ${
										isMobile ? 'p-2 text-xs' : 'p-3 text-sm'
									}`}
									placeholder="ご要望やコメントがあればお書きください..."
									disabled={!isEditMode}
								/>
							</CardContent>
						</Card>

						{/* 希望頻度 */}
						{shiftInfo?.isTwice && (
							<Card className="rounded-xl border-slate-200 bg-white shadow-md">
								<CardContent className={isMobile ? 'p-3' : 'p-4'}>
									<h3
										className={`mb-3 flex items-center font-semibold text-slate-700 ${
											isMobile ? 'text-xs' : 'text-sm'
										}`}
									>
										<span className={`mr-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
											📊
										</span>
										希望頻度
									</h3>
									<RadioGroup
										value={frequency}
										onValueChange={setFrequency}
										className={isMobile ? 'space-y-1.5' : 'space-y-2'}
										disabled={!isEditMode}
									>
										<div
											className={`flex items-center space-x-3 rounded-lg border border-slate-200 bg-slate-50 transition-all hover:border-teal-300 hover:bg-teal-50 ${
												isMobile ? 'p-2' : 'p-3'
											} ${!isEditMode && 'opacity-60'}`}
										>
											<RadioGroupItem
												value="週1回"
												id={weekly1Id}
												className="text-teal-600"
												disabled={!isEditMode}
											/>
											<label
												htmlFor={weekly1Id}
												className={`flex-1 font-medium text-slate-800 ${
													isMobile ? 'text-xs' : 'text-sm'
												} ${isEditMode ? 'cursor-pointer' : 'cursor-default'}`}
											>
												週1回
											</label>
										</div>
										<div
											className={`flex items-center space-x-3 rounded-lg border border-slate-200 bg-slate-50 transition-all hover:border-teal-300 hover:bg-teal-50 ${
												isMobile ? 'p-2' : 'p-3'
											} ${!isEditMode && 'opacity-60'}`}
										>
											<RadioGroupItem
												value="週2回"
												id={weekly2Id}
												className="text-teal-600"
												disabled={!isEditMode}
											/>
											<label
												htmlFor={weekly2Id}
												className={`flex-1 font-medium text-slate-800 ${
													isMobile ? 'text-xs' : 'text-sm'
												} ${isEditMode ? 'cursor-pointer' : 'cursor-default'}`}
											>
												週2回
											</label>
										</div>
										<div
											className={`flex items-center space-x-3 rounded-lg border border-slate-200 bg-slate-50 transition-all hover:border-teal-300 hover:bg-teal-50 ${
												isMobile ? 'p-2' : 'p-3'
											} ${!isEditMode && 'opacity-60'}`}
										>
											<RadioGroupItem
												value="試験官"
												id={examId}
												className="text-teal-600"
												disabled={!isEditMode}
											/>
											<label
												htmlFor={examId}
												className={`flex-1 font-medium text-slate-800 ${
													isMobile ? 'text-xs' : 'text-sm'
												} ${isEditMode ? 'cursor-pointer' : 'cursor-default'}`}
											>
												試験官
											</label>
										</div>
									</RadioGroup>
								</CardContent>
							</Card>
						)}

						{/* ボタン */}
						<div className="flex gap-3">
							{!isEditMode ? (
								<Button
									className={`flex-1 transform rounded-lg bg-amber-500 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-amber-600 hover:shadow-xl ${
										isMobile ? 'py-2' : 'py-3'
									}`}
									onClick={() => setIsEditMode(true)}
								>
									<span
										className={`flex items-center justify-center gap-2 ${
											isMobile ? 'text-xs' : 'text-sm'
										}`}
									>
										📝 編集する
									</span>
								</Button>
							) : (
								<Button
									className={`flex-1 transform rounded-lg bg-teal-600 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-teal-700 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100 ${
										isMobile ? 'py-2' : 'py-3'
									}`}
									onClick={handleSave}
									disabled={isSaving}
								>
									{isSaving ? (
										<span
											className={`flex items-center justify-center gap-2 ${
												isMobile ? 'text-xs' : 'text-sm'
											}`}
										>
											<div
												className={`animate-spin rounded-full border-2 border-white border-t-transparent ${
													isMobile ? 'h-3 w-3' : 'h-4 w-4'
												}`}
											/>
											保存中...
										</span>
									) : (
										<span
											className={`flex items-center justify-center gap-2 ${
												isMobile ? 'text-xs' : 'text-sm'
											}`}
										>
											💾 保存する
										</span>
									)}
								</Button>
							)}
						</div>

						{/* ホームに戻るボタン */}
						<HomeButton />
					</div>
				</div>
			</div>
		</div>
	);
}
