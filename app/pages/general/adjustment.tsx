import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useId, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';

export function meta() {
	return [
		{ title: 'Aula - 調整画面' },
		{ name: 'description', content: 'シフト調整画面' },
	];
}

export default function Adjustment() {
	const day = ['月', '火', '水', '木', '金', '土', '日'];
	const periods = ['1', '2', '3', '4', '5', '6', '7', '8'];
	const startTimes = [
		'8:40',
		'10:10',
		'12:15',
		'13:45',
		'15:15',
		'18:00',
		'18:15',
		'19:45',
	];
	const endTimes = [
		'9:55',
		'11:25',
		'13:30',
		'15:00',
		'16:45',
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

	// 授業頻度を管理するstate
	const [frequency, setFrequency] = useState<string>('週1回');

	// コメント欄のstate
	const [comment, setComment] = useState<string>('');

	// 認証情報を取得
	const { user } = useAuth();

	// 保存中かどうかの状態
	const [isSaving, setIsSaving] = useState<boolean>(false);

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

			// Firestoreに保存
			await addDoc(collection(db, 'schedules'), {
				userId: user.uid,
				userEmail: user.email,
				userName: user.displayName || user.email || 'ユーザー',
				scheduleData,
				frequency,
				comment,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			});

			alert('保存しました！');
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

	return (
		<div className="min-h-screen bg-slate-50 p-1 sm:p-2 lg:h-screen lg:p-2 xl:p-3">
			<div className="flex h-full flex-col gap-1 lg:flex-row lg:gap-3 xl:gap-4">
				{/* 左側：時間割表 (3/4の幅) */}
				<div className="h-full flex-1 overflow-hidden lg:w-3/4">
					<div className="flex h-full flex-col">
						<div className="grid flex-1 grid-cols-8 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg sm:gap-2 sm:p-3 lg:gap-2 lg:p-3 xl:gap-3 xl:p-4">
							{/* ヘッダー行 */}
							<Card className="rounded-lg bg-blue-500 text-white shadow-sm">
								<CardContent className="p-1 text-center font-semibold text-xs sm:p-1.5 lg:p-2 lg:text-sm">
									時限
								</CardContent>
							</Card>
							{day.map((dayName, index) => (
								<Card
									key={dayName}
									className="cursor-pointer rounded-lg bg-blue-500 text-white shadow-sm transition-colors hover:bg-blue-600"
									onClick={() => toggleColumnAll(index)}
								>
									<CardContent className="p-1 text-center font-semibold text-xs sm:p-1.5 lg:p-2 lg:text-sm">
										<span className="hidden md:inline">{dayName}曜日</span>
										<span className="md:hidden">{dayName}</span>
									</CardContent>
								</Card>
							))}

							{/* 時間割セル */}
							{periods.map((period, periodIndex) => (
								<React.Fragment key={period}>
									{/* 時限・時間表示 */}
									<Card
										className="cursor-pointer rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition-colors hover:bg-slate-200"
										onClick={() => toggleRowAll(periodIndex)}
									>
										<CardContent className="p-1 text-center font-medium sm:p-1.5 lg:p-2 xl:p-2.5">
											<div className="text-xs lg:text-sm">
												<div className="font-semibold text-slate-700">{period}限</div>
												<div className="whitespace-nowrap text-slate-500 text-xs">
													<span className="hidden lg:inline">
														{startTimes[periodIndex]}-{endTimes[periodIndex]}
													</span>
													<span className="hidden sm:inline lg:hidden">
														{startTimes[periodIndex]}
													</span>
												</div>
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
												className={`h-full w-full rounded-lg border font-semibold shadow-sm transition-all duration-300 hover:shadow-md lg:text-sm xl:text-base ${
													isSelected
														? 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-600'
														: 'text-slate-600 hover:bg-gray-200 hover:text-slate-800'
												}`}
												onClick={() => toggleCell(periodIndex, dayIndex)}
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
				<div className="mt-2 lg:mt-0 lg:w-1/4">
					<div className="flex flex-col space-y-2 lg:space-y-2 xl:space-y-2">
						{/* タイトル */}
						<div className="text-center lg:text-left">
							<h2 className="mb-1 font-bold text-blue-600 text-lg sm:text-xl lg:text-xl xl:text-2xl">
								秋Aシフト調査
							</h2>
							<p className="text-slate-600 text-xs lg:text-sm">
								希望する時限を選択してください
							</p>
						</div>

						{/* ユーザー名表示 */}
						{user && (
							<Card className="border-indigo-200 bg-indigo-50 shadow-sm">
								<CardContent className="p-2 lg:p-3">
									<div className="flex items-center space-x-2">
										<div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500">
											<span className="font-semibold text-white text-xs">
												{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
											</span>
										</div>
										<div>
											<p className="text-slate-500 text-xs">ログイン中</p>
											<p className="font-medium text-slate-800 text-sm">
												{user.displayName || user.email || 'ユーザー'}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						)}
						<Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
							<CardContent className="p-3 lg:p-4">
								<label
									htmlFor={subjectNameId}
									className="mb-2 block font-semibold text-slate-700 text-sm"
								>
									💬 コメント
								</label>
								<textarea
									id={subjectNameId}
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									rows={2}
									className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
									placeholder="ご要望やコメントがあればお書きください..."
								/>
							</CardContent>
						</Card>

						<Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
							<CardContent className="p-3 lg:p-4">
								<h3 className="mb-2 font-semibold text-slate-700 text-sm">
									📊 希望頻度
								</h3>
								<RadioGroup
									value={frequency}
									onValueChange={setFrequency}
									className="space-y-1"
								>
									<div className="flex items-center space-x-2 rounded-lg p-2 transition-colors hover:bg-slate-50">
										<RadioGroupItem
											value="週1回"
											id={weekly1Id}
											className="text-indigo-600"
										/>
										<label
											htmlFor={weekly1Id}
											className="flex-1 cursor-pointer font-medium text-sm"
										>
											週1回
										</label>
									</div>
									<div className="flex items-center space-x-2 rounded-lg p-2 transition-colors hover:bg-slate-50">
										<RadioGroupItem
											value="週2回"
											id={weekly2Id}
											className="text-indigo-600"
										/>
										<label
											htmlFor={weekly2Id}
											className="flex-1 cursor-pointer font-medium text-sm"
										>
											週2回
										</label>
									</div>
									<div className="flex items-center space-x-2 rounded-lg p-2 transition-colors hover:bg-slate-50">
										<RadioGroupItem
											value="試験官"
											id={examId}
											className="text-indigo-600"
										/>
										<label
											htmlFor={examId}
											className="flex-1 cursor-pointer font-medium text-sm"
										>
											試験官
										</label>
									</div>
								</RadioGroup>
							</CardContent>
						</Card>
						<div className="flex gap-2">
							<Button
								className="flex-1 transform rounded-lg bg-indigo-500 py-2 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-indigo-600 hover:shadow-xl"
								onClick={handleSave}
								disabled={isSaving}
							>
								{isSaving ? (
									<span className="flex items-center justify-center">保存中...</span>
								) : (
									<span className="flex items-center justify-center">💾 保存</span>
								)}
							</Button>
							<Button
								variant="outline"
								className="flex-1 rounded-lg border-slate-300 py-2 font-semibold text-slate-600 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-md"
								onClick={() => {
									setSchedule(
										Array(periods.length)
											.fill(null)
											.map(() => Array(day.length).fill(false)),
									);
									setFrequency('週1回');
									setComment('');
								}}
							>
								🗑️ クリア
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
