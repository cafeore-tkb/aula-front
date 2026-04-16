import {
	addDoc,
	collection,
	doc,
	getDocs,
	query,
	serverTimestamp,
	setDoc,
	where,
} from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import React, { useEffect, useId, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useLocation } from 'react-router';
import { HomeButton } from '../../components/home-button';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { useAuth } from '../../lib/auth-context';
import { db } from '../../lib/firebase';
import styles from './general-pages.module.scss';

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
			<div className={styles.loadingWrap}>
				<div className={styles.loadingInner}>
					<div className={styles.tealSpinner} />
					<p className={styles.loadingText}>データを読み込み中...</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`${styles.adjustmentPage} ${isMobile ? styles.adjustmentPageMobile : styles.adjustmentPageDesktop}`}
		>
			<div
				className={`${styles.adjustmentLayout} ${isMobile ? styles.adjustmentLayoutMobile : isTablet ? styles.adjustmentLayoutTablet : styles.adjustmentLayoutDesktop}`}
			>
				{/* モバイル時：シフト情報を一番上に表示 */}
				{isMobile && shiftInfo && (
					<Card className={styles.adjustmentShiftInfoCard}>
						<CardContent className={styles.adjustmentShiftInfoContentMobile}>
							<div className={styles.adjustmentShiftInfoRow}>
								<span className={styles.adjustmentShiftIconMobile}>📋</span>
								<div>
									<h2 className={styles.adjustmentShiftInfoTitleMobile}>
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
					className={isDesktop ? styles.adjustmentGridPaneDesktop : styles.adjustmentGridPaneDefault}
				>
					<div className={isMobile ? styles.adjustmentGridWrapMobile : styles.adjustmentGridWrapDesktop}>
						<div
							className={`${styles.adjustmentScheduleGrid} ${
								isMobile
									? styles.adjustmentScheduleGridMobile
									: isTablet
										? styles.adjustmentScheduleGridTablet
										: styles.adjustmentScheduleGridDesktop
							}`}
						>
							{/* ヘッダー行 */}
							<Card className={styles.adjustmentDayHeaderCard}>
								<CardContent
									className={`${styles.adjustmentDayHeaderText} ${
										isMobile
											? styles.adjustmentDayHeaderTextMobile
											: isTablet
												? styles.adjustmentDayHeaderTextTablet
												: styles.adjustmentDayHeaderTextDesktop
									}`}
								>
									時限
								</CardContent>
							</Card>
							{day.map((dayName, index) => (
								<Card
									key={dayName}
									className={`${styles.adjustmentDayHeaderCard} ${
										isEditMode ? styles.adjustmentDayHeaderCardEditable : styles.adjustmentDayHeaderCardReadonly
									}`}
									onClick={() => isEditMode && toggleColumnAll(index)}
								>
									<CardContent
										className={`${styles.adjustmentDayHeaderText} ${
											isMobile
												? styles.adjustmentDayHeaderTextMobile
												: isTablet
													? styles.adjustmentDayHeaderTextTablet
													: styles.adjustmentDayHeaderTextDesktop
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
										className={`${styles.adjustmentTimeHeaderCard} ${
											isEditMode ? styles.adjustmentTimeHeaderCardEditable : styles.adjustmentTimeHeaderCardReadonly
										}`}
										onClick={() => isEditMode && toggleRowAll(periodIndex)}
									>
										<CardContent
											className={`${styles.adjustmentTimeHeaderContent} ${
												isMobile
													? styles.adjustmentTimeHeaderContentMobile
													: isTablet
														? styles.adjustmentTimeHeaderContentTablet
														: styles.adjustmentTimeHeaderContentDesktop
											}`}
										>
											<div className={isMobile ? styles.adjustmentPeriodTextMobile : styles.adjustmentPeriodTextDesktop}>
												<div className={styles.adjustmentPeriodMain}>{period}限</div>
												{!isMobile && (
													<div className={styles.adjustmentPeriodSub}>
														{isDesktop ? (
															`${startTimes[periodIndex]}-${endTimes[periodIndex]}`
														) : isTablet ? (
															startTimes[periodIndex]
														) : (
															<span className={styles.adjustmentPeriodSubResponsiveOnly}>
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
												className={`${styles.adjustmentSlotButtonBase} ${
													isMobile
															? styles.adjustmentSlotButtonMobile
														: isTablet
																? styles.adjustmentSlotButtonTablet
																: styles.adjustmentSlotButtonDesktop
												} ${
													isSelected
															? styles.adjustmentSlotButtonSelected
															: styles.adjustmentSlotButtonUnselected
													} ${!isEditMode ? styles.adjustmentSlotButtonReadonly : ''}`}
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
					className={`${styles.adjustmentSidePane} ${isMobile ? styles.adjustmentSidePaneMobile : isTablet ? styles.adjustmentSidePaneTablet : styles.adjustmentSidePaneDesktop}`}
				>
					<div
						className={`${styles.adjustmentSideStack} ${isMobile ? styles.adjustmentSideStackMobile : isTablet ? styles.adjustmentSideStackTablet : styles.adjustmentSideStackDesktop}`}
					>
						{/* シフト情報表示（タブレット・デスクトップのみ） */}
						{!isMobile && shiftInfo && (
							<Card className={styles.adjustmentShiftInfoCard}>
								<CardContent className={isMobile ? styles.adjustmentShiftInfoContentMobile : styles.adjustmentShiftInfoContentDesktop}>
									<div className={styles.adjustmentShiftInfoRow}>
										<span className={isMobile ? styles.adjustmentShiftIconMobile : styles.adjustmentShiftIconDesktop}>📋</span>
										<div>
											<h2
												className={`${styles.adjustmentShiftInfoTitle} ${
													isMobile
														? styles.adjustmentShiftInfoTitleMobile
														: isTablet
															? styles.adjustmentShiftInfoTitleTablet
															: styles.adjustmentShiftInfoTitleDesktop
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
							<Card className={styles.adjustmentUserCard}>
								<CardContent className={isMobile ? styles.adjustmentUserCardContentMobile : styles.adjustmentUserCardContentDesktop}>
									<div className={styles.adjustmentUserRow}>
										<div
											className={`${styles.adjustmentAvatarCircle} ${
												isMobile ? styles.adjustmentAvatarCircleMobile : styles.adjustmentAvatarCircleDesktop
											}`}
										>
											<span
												className={`${styles.adjustmentAvatarInitial} ${isMobile ? styles.adjustmentAvatarInitialMobile : styles.adjustmentAvatarInitialDesktop}`}
											>
												{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
											</span>
										</div>
										<div>
											<p className={styles.adjustmentUserLoginLabel}>
												ログイン中
											</p>
											<p
												className={`${styles.adjustmentUserLoginName} ${isMobile ? styles.adjustmentUserLoginNameMobile : styles.adjustmentUserLoginNameDesktop}`}
											>
												{user.displayName || user.email || 'ユーザー'}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* コメント欄 */}
						<Card className={styles.adjustmentFormCard}>
							<CardContent className={isMobile ? styles.adjustmentFormCardContentMobile : styles.adjustmentFormCardContentDesktop}>
								<label
									htmlFor={subjectNameId}
									className={`${styles.adjustmentFormLabel} ${
										isMobile ? styles.adjustmentFormLabelMobile : styles.adjustmentFormLabelDesktop
									}`}
								>
									<span className={isMobile ? styles.adjustmentFormLabelIconMobile : styles.adjustmentFormLabelIconDesktop}>
										💬
									</span>
									コメント
								</label>
								<textarea
									id={subjectNameId}
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									rows={isMobile ? 2 : 3}
									className={`${styles.adjustmentCommentInput} ${
										isMobile ? styles.adjustmentCommentInputMobile : styles.adjustmentCommentInputDesktop
									}`}
									placeholder="ご要望やコメントがあればお書きください..."
									disabled={!isEditMode}
								/>
							</CardContent>
						</Card>

						{/* 希望頻度 */}
						{shiftInfo?.isTwice && (
							<Card className={styles.adjustmentFormCard}>
								<CardContent className={isMobile ? styles.adjustmentFormCardContentMobile : styles.adjustmentFormCardContentDesktop}>
									<h3
										className={`${styles.adjustmentFormLabel} ${
											isMobile ? styles.adjustmentFormLabelMobile : styles.adjustmentFormLabelDesktop
										}`}
									>
										<span className={isMobile ? styles.adjustmentFormLabelIconMobile : styles.adjustmentFormLabelIconDesktop}>
											📊
										</span>
										希望頻度
									</h3>
									<RadioGroup
										value={frequency}
										onValueChange={setFrequency}
										className={isMobile ? styles.adjustmentFrequencyGroupMobile : styles.adjustmentFrequencyGroupDesktop}
										disabled={!isEditMode}
									>
										<div
											className={`${styles.adjustmentFrequencyOption} ${isMobile ? styles.adjustmentFrequencyOptionMobile : styles.adjustmentFrequencyOptionDesktop} ${!isEditMode ? styles.adjustmentFrequencyOptionDisabled : ''}`}
										>
											<RadioGroupItem
												value="週1回"
												id={weekly1Id}
												className={styles.adjustmentFrequencyRadio}
												disabled={!isEditMode}
											/>
											<label
												htmlFor={weekly1Id}
												className={`${styles.adjustmentFrequencyLabel} ${isMobile ? styles.adjustmentFrequencyLabelMobile : styles.adjustmentFrequencyLabelDesktop} ${isEditMode ? styles.adjustmentFrequencyLabelClickable : styles.adjustmentFrequencyLabelReadonly}`}
											>
												週1回
											</label>
										</div>
										<div
											className={`${styles.adjustmentFrequencyOption} ${isMobile ? styles.adjustmentFrequencyOptionMobile : styles.adjustmentFrequencyOptionDesktop} ${!isEditMode ? styles.adjustmentFrequencyOptionDisabled : ''}`}
										>
											<RadioGroupItem
												value="週2回"
												id={weekly2Id}
												className={styles.adjustmentFrequencyRadio}
												disabled={!isEditMode}
											/>
											<label
												htmlFor={weekly2Id}
												className={`${styles.adjustmentFrequencyLabel} ${isMobile ? styles.adjustmentFrequencyLabelMobile : styles.adjustmentFrequencyLabelDesktop} ${isEditMode ? styles.adjustmentFrequencyLabelClickable : styles.adjustmentFrequencyLabelReadonly}`}
											>
												週2回
											</label>
										</div>
										<div
											className={`${styles.adjustmentFrequencyOption} ${isMobile ? styles.adjustmentFrequencyOptionMobile : styles.adjustmentFrequencyOptionDesktop} ${!isEditMode ? styles.adjustmentFrequencyOptionDisabled : ''}`}
										>
											<RadioGroupItem
												value="試験官"
												id={examId}
												className={styles.adjustmentFrequencyRadio}
												disabled={!isEditMode}
											/>
											<label
												htmlFor={examId}
												className={`${styles.adjustmentFrequencyLabel} ${isMobile ? styles.adjustmentFrequencyLabelMobile : styles.adjustmentFrequencyLabelDesktop} ${isEditMode ? styles.adjustmentFrequencyLabelClickable : styles.adjustmentFrequencyLabelReadonly}`}
											>
												試験官
											</label>
										</div>
									</RadioGroup>
								</CardContent>
							</Card>
						)}

						{/* ボタン */}
						<div className={styles.adjustmentActionRow}>
							{!isEditMode ? (
								<Button
									className={`${styles.adjustmentEditButton} ${
										isMobile ? styles.adjustmentActionButtonMobile : styles.adjustmentActionButtonDesktop
									}`}
									onClick={() => setIsEditMode(true)}
								>
									<span
										className={`${styles.adjustmentActionButtonInner} ${isMobile ? styles.adjustmentActionButtonTextMobile : styles.adjustmentActionButtonTextDesktop}`}
									>
										📝 編集する
									</span>
								</Button>
							) : (
								<Button
									className={`${styles.adjustmentSaveButton} ${
										isMobile ? styles.adjustmentActionButtonMobile : styles.adjustmentActionButtonDesktop
									}`}
									onClick={handleSave}
									disabled={isSaving}
								>
									{isSaving ? (
										<span
											className={`${styles.adjustmentActionButtonInner} ${isMobile ? styles.adjustmentActionButtonTextMobile : styles.adjustmentActionButtonTextDesktop}`}
										>
											<div
												className={isMobile ? styles.adjustmentSaveSpinnerMobile : styles.adjustmentSaveSpinnerDesktop}
											/>
											保存中...
										</span>
									) : (
										<span
											className={`${styles.adjustmentActionButtonInner} ${isMobile ? styles.adjustmentActionButtonTextMobile : styles.adjustmentActionButtonTextDesktop}`}
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
