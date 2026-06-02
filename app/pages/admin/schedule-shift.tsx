import { collection, getDocs, getFirestore } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { showConfirmModal } from '../../components/ui/confirm-modal';
import { Card, CardContent } from '../../components/ui/card';
import { useAuth } from '../../lib/auth-context';
import type { ShiftListItem, UserProfile } from '../../lib/firebase';
import styles from './schedule-shift.module.scss';

/**
 * スタッフメンバーの情報を表すインターフェース
 */
interface StaffMember {
	userId: string;
	name: string;
	isExaminer: boolean;
	scheduleData: { period: string; day: string; canBeAssigned: boolean }[];
	comment: string;
	isTwice?: boolean; // 週2回シフトを希望するかどうか
	isAssigned?: boolean; // 割り当て済みフラグ
	isAvailable?: boolean; // 選択されたスロットに割り当て可能か
}

/**
 * 時間割の各セルを表すインターフェース
 */
interface TimeSlot {
	assignedTrainees: StaffMember[];
	assignedExaminers: StaffMember[];
	slotStatus: 'unable' | 'idle' | 'incomplete' | 'complete'; // 割当不可/割当可能（未割当）/割当可能（途中）/割当確定
	isVacant: boolean;
}

const dedupeStaffMembers = (members: StaffMember[]) =>
	Array.from(new Map(members.map((member) => [member.userId, member])).values());

/**
 * ページメタデータを定義する関数
 */
export function meta() {
	return [
		{ title: 'シフト作成 - Aula' },
		{ name: 'description', content: 'シフトを組むページ' },
	];
}

/**
 * シフト作成ページのメインコンポーネント
 * HTMLテンプレート版（ロジック削除）
 */
export default function ScheduleShift() {
	const { user, userProfile, loading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	// Firebase データフェッチ用の状態
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [shiftData, setShiftData] = useState<ShiftListItem | null>(null);

	// レスポンシブ判定
	const isDesktop = useMediaQuery({ minWidth: 1024 });
	const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
	const isMobile = useMediaQuery({ maxWidth: 767 });

	// 定数
	const day = ['月', '火', '水', '木', '金', '土', '日'];
	const periods = ['1限', '2限', '3限', '4限', '5限', '6限', '7限', '8限'];
	const dayEmojiByName: Record<string, string> = {
		月: ':d_monday:',
		火: ':d_tuesday:',
		水: ':d_wednesday:',
		木: ':d_thursday:',
		金: ':d_friday:',
		土: ':d_saturday:',
		日: ':d_sunday:',
	};

	// スタッフリスト状態管理
	const [trainees, setTrainees] = useState<StaffMember[]>([]);
	const [examiners, setExaminers] = useState<StaffMember[]>([]);

	// 右カラムで表示するリストの切替（'trainees' | 'examiners'）
	const [activeList, setActiveList] = useState<'trainees' | 'examiners'>('trainees');
	const [selectedStaffUserId, setSelectedStaffUserId] = useState<string | null>(null);
	const [isScheduleLoaded, setIsScheduleLoaded] = useState(false);
	const [showOutputPopup, setShowOutputPopup] = useState(false);
	const [copyResultMessage, setCopyResultMessage] = useState('');
	const [schedule, setSchedule] = useState<TimeSlot[][]>(
		Array(8)
			.fill(null)
			.map(() =>
				Array(7)
					.fill(null)
					.map(() => ({
						assignedTrainees: [],
						assignedExaminers: [],
						slotStatus: 'idle',
						isVacant: false,
					})),
			),
	);

	const getStorageKey = useCallback((shiftUid: string) => `schedule_shift_${shiftUid}`, []);

	const outputText = (() => {
		const lines: string[] = [];

		for (let dayIndex = 0; dayIndex < day.length; dayIndex += 1) {
			for (let periodIndex = 0; periodIndex < periods.length; periodIndex += 1) {
				const slot = schedule[periodIndex][dayIndex];

				if (slot.slotStatus !== 'complete') {
					continue;
				}

				const dayName = day[dayIndex];
				const dayEmoji = dayEmojiByName[dayName] ?? `:${dayName}:`;
				const periodEmoji = `:${periodIndex + 1}:`;
				const traineesText =
					slot.assignedTrainees.length > 0
						? slot.assignedTrainees.map((trainee) => `@${trainee.name}`).join(' ')
						: '-';
				const examinersText =
					slot.assignedExaminers.length > 0
						? slot.assignedExaminers.map((examiner) => `@${examiner.name}`).join(' ')
						: '-';

				lines.push(`${dayEmoji} ${periodEmoji} : ${traineesText} / ${examinersText}`);
			}
		}

		return lines.join('\n');
	})();

	const openOutputPopup = () => {
		setCopyResultMessage('');
		setShowOutputPopup(true);
	};

	const closeOutputPopup = () => {
		setShowOutputPopup(false);
		setCopyResultMessage('');
	};

	const handleCopyOutputText = async () => {
		if (!outputText) {
			setCopyResultMessage('コピーする内容がありません');
			return;
		}

		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(outputText);
			} else {
				const textArea = document.createElement('textarea');
				textArea.value = outputText;
				textArea.style.position = 'fixed';
				textArea.style.opacity = '0';
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				document.execCommand('copy');
				document.body.removeChild(textArea);
			}

			setCopyResultMessage('コピーしました');
		} catch (error) {
			console.error('Failed to copy output text:', error);
			setCopyResultMessage('コピーに失敗しました');
		}
	};

	const getPeriodIndexFromValue = (periodValue: string) => {
		const normalized = periodValue.replace('限', '');
		const numericIndex = Number(normalized) - 1;

		if (Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < periods.length) {
			return numericIndex;
		}

		return periods.findIndex((periodLabel) => periodLabel === periodValue);
	};

	const getDayIndexFromValue = (dayValue: string) => {
		const labelIndex = day.findIndex((dayLabel) => dayLabel === dayValue);
		if (labelIndex >= 0) {
			return labelIndex;
		}

		const numericIndex = Number(dayValue);
		return Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < day.length
			? numericIndex
			: -1;
	};

	const updateVacancyBySelectedStaff = (staff: StaffMember | null) => {
		setSchedule((prevSchedule) =>
			prevSchedule.map((row, periodIndex) =>
				row.map((slot, dayIndex) => {
					if (!staff) {
						return { ...slot, isVacant: false };
					}

					const isVacant = staff.scheduleData.some((scheduleItem) => {
						const staffPeriodIndex = getPeriodIndexFromValue(scheduleItem.period);
						const staffDayIndex = getDayIndexFromValue(scheduleItem.day);

						return (
							staffPeriodIndex === periodIndex &&
							staffDayIndex === dayIndex &&
							scheduleItem.canBeAssigned
						);
					});

					return { ...slot, isVacant };
				}),
			),
		);
	};

	const updateAvailabilityForSlot = (periodIndex: number, dayIndex: number) => {
		const targetPeriod = String(periodIndex + 1);
		const targetDay = day[dayIndex];

		const applyAvailability = (staff: StaffMember[]) =>
			staff.map((member) => ({
				...member,
				isAbailable: member.scheduleData.some(
					(scheduleItem) =>
						scheduleItem.period === targetPeriod &&
						scheduleItem.day === targetDay &&
						scheduleItem.canBeAssigned,
				),
			}));

		setTrainees((prevTrainees) => applyAvailability(prevTrainees));
		setExaminers((prevExaminers) => applyAvailability(prevExaminers));
	};

	const handleStaffSelect = (staff: StaffMember) => {
		const isDeselecting = selectedStaffUserId === staff.userId;
		setSelectedStaffUserId(isDeselecting ? null : staff.userId);
		updateVacancyBySelectedStaff(isDeselecting ? null : staff);
	};

	const handleSlotClick = async (periodIndex: number, dayIndex: number) => {
		if (!selectedStaffUserId) {
			return;
		}

		const selectedStaff = [...trainees, ...examiners].find(
			(staff) => staff.userId === selectedStaffUserId,
		);

		if (!selectedStaff) {
			return;
		}

		// 与えられた時間枠がスタッフのスケジュールデータで割り当て可能とされているかをチェック
		const canBeAssigned = selectedStaff.scheduleData.some((scheduleItem) => {
			const staffPeriodIndex = getPeriodIndexFromValue(scheduleItem.period);
			const staffDayIndex = getDayIndexFromValue(scheduleItem.day);
			return (
				staffPeriodIndex === periodIndex &&
				staffDayIndex === dayIndex &&
				scheduleItem.canBeAssigned
			);
		});

		if (!canBeAssigned) {
			const result = await showConfirmModal('このスタッフはこの時間枠に割り当てできない可能性があります。割り当てますか？');
			if (!result) {
				return;
			}
		}
		assignStaffToSlot(periodIndex, dayIndex, selectedStaff, selectedStaff.isExaminer);
	};

	const getSlotButtonClassName = (slot: TimeSlot) => {
		if (slot.slotStatus === 'complete') {
			return styles.slotButtonComplete;
		}

		if (slot.slotStatus === 'incomplete') {
			return slot.isVacant
				? styles.slotButtonAvailableForSelectedStaff
				: styles.slotButtonPartial;
		}

		if (slot.isVacant) {
			return styles.slotButtonAssignable;
		}

		return styles.slotButtonIdle;
	};

	/**
	 * 認証状態とadmin権限をチェック
	 */
	useEffect(() => {
		if (!loading) {
			if (!user) {
				navigate('/login');
				return;
			}

			if (userProfile && !userProfile.isAdmin) {
				navigate('/dashboard');
				return;
			}
		}
	}, [user, userProfile, loading, navigate]);

	/**
	 * Firebase からのデータフェッチ
	 * 旧実装を参考に、shiftUid 起点でシフトと回答を取得する
	 */
	useEffect(() => {
		const fetchShiftData = async () => {
			const state = location.state as { shiftUid?: string } | null;
			if (!state?.shiftUid || !userProfile?.isAdmin) {
				navigate('/admin/manageAdjustment');
				return;
			}

			try {
				setLoadingUsers(true);
				setIsScheduleLoaded(false);
				const db = getFirestore();

				const usualShiftsCollection = collection(db, 'shiftUsual');
				const usualShiftsSnapshot = await getDocs(usualShiftsCollection);
				let foundShift = usualShiftsSnapshot.docs
					.map((doc) => ({
						uid: doc.id,
						year: doc.data().year || 2024,
						semester: doc.data().semester || 'spring',
						module: doc.data().module || 'A',
						isScheduled: doc.data().isScheduled || false,
						comment: doc.data().comment || '',
					}) as ShiftListItem)
					.find((shift) => shift.uid === state.shiftUid);

				if (!foundShift) {
					const unusualShiftsCollection = collection(db, 'shiftUnusual');
					const unusualShiftsSnapshot = await getDocs(unusualShiftsCollection);
					foundShift = unusualShiftsSnapshot.docs
						.map((doc) => ({
							uid: doc.id,
							year: doc.data().year || 9999,
							semester: doc.data().semester || 'spring',
							module: doc.data().module || 'A',
							isScheduled: doc.data().isScheduled || false,
							comment: doc.data().comment || '',
						}) as ShiftListItem)
						.find((shift) => shift.uid === state.shiftUid);
				}

				if (!foundShift) {
					console.error('Shift not found');
					navigate('/admin/manageAdjustment');
					return;
				}

				setShiftData(foundShift);
				console.log('Loaded shift:', foundShift);

				const scheduleCollectionName = `schedules_${foundShift.year}_${foundShift.semester}_${foundShift.module}`;
				console.log('📂 Schedule collection name:', scheduleCollectionName);

				const usersCollection = collection(db, 'users');
				const usersSnapshot = await getDocs(usersCollection);
				console.log('👥 Users found:', usersSnapshot.docs.length);

				const shiftResponsesCollection = collection(db, scheduleCollectionName);
				const shiftResponsesSnapshot = await getDocs(shiftResponsesCollection);
				console.log('📝 Schedule responses found:', shiftResponsesSnapshot.docs.length);
				console.log('📋 Schedule response docs:', shiftResponsesSnapshot.docs.map((d) => d.data()));

				const traineeList: StaffMember[] = [];
				const examinerList: StaffMember[] = [];

				for (const shiftDoc of shiftResponsesSnapshot.docs) {
					const shiftResponseData = shiftDoc.data() as {
						userId?: string;
						scheduleData?: Array<{ period?: number; day?: string; isSelected?: boolean; canBeAssigned?: boolean }>;
						comment?: string;
						isTwice?: boolean;
					};

					const userId = shiftResponseData.userId;
					if (!userId) {
						console.log('No userId in shift response:', shiftDoc.id);
						continue;
					}

					const userDoc = usersSnapshot.docs.find((doc) => doc.id === userId);
					if (!userDoc) {
						console.log('User not found:', userId);
						continue;
					}

					const userData = userDoc.data() as UserProfile;
					const userDataWithFlags = userDoc.data() as UserProfile & {
						isTwice?: boolean;
						isAssigned?: boolean;
					};
					console.log('User data:', {
						userId,
						name: userData.name,
						isExaminer: userData.isExaminer,
					});

					console.log('Schedule data for user:', userId, shiftResponseData.scheduleData);

					const staffMember: StaffMember = {
						userId,
						name: userData.name || '名前未設定',
						isExaminer: userData.isExaminer || false,
						scheduleData: (shiftResponseData.scheduleData || []).map((slot) => ({
							period: String(slot.period ?? ''),
							day: String(slot.day ?? ''),
							canBeAssigned: Boolean(slot.canBeAssigned ?? slot.isSelected),
						})),
						comment: shiftResponseData.comment || '',
						isTwice: userDataWithFlags.isTwice ?? shiftResponseData.isTwice ?? false,
					};

					if (userData.isExaminer === true) {
						examinerList.push(staffMember);
					} else {
						traineeList.push(staffMember);
					}
				}

				setTrainees(traineeList);
				setExaminers(examinerList);

				const storageKey = getStorageKey(foundShift.uid);
				const savedScheduleJson = localStorage.getItem(storageKey);

				if (savedScheduleJson) {
					try {
						const savedSchedule = JSON.parse(savedScheduleJson) as Array<
							Array<{ traineeUserIds?: string[]; examinerUserIds?: string[] } | undefined>
						>;
						const restoredSchedule: TimeSlot[][] = Array(8)
							.fill(null)
							.map((_, periodIndex) =>
								Array(7)
									.fill(null)
									.map((_, dayIndex) => {
										const saved = savedSchedule[periodIndex]?.[dayIndex];

										if (!saved) {
											return {
												assignedTrainees: [],
												assignedExaminers: [],
												slotStatus: 'idle',
												isVacant: false,
											};
										}

										const restoredTrainees = (saved.traineeUserIds || [])
											.map((userId) => traineeList.find((trainee) => trainee.userId === userId))
											.filter(Boolean) as StaffMember[];

										const restoredExaminers = (saved.examinerUserIds || [])
											.map((userId) => examinerList.find((examiner) => examiner.userId === userId))
											.filter(Boolean) as StaffMember[];

										const uniqueRestoredTrainees = dedupeStaffMembers(restoredTrainees);
										const uniqueRestoredExaminers = dedupeStaffMembers(restoredExaminers);

										return {
											assignedTrainees: uniqueRestoredTrainees,
											assignedExaminers: uniqueRestoredExaminers,
											slotStatus:
												uniqueRestoredTrainees.length > 0 && uniqueRestoredExaminers.length >= 2
													? 'complete'
													: uniqueRestoredTrainees.length > 0 || uniqueRestoredExaminers.length > 0
														? 'incomplete'
														: 'idle',
											isVacant: false,
										};
									}),
							);

						setSchedule(restoredSchedule);
						console.log('Restored schedule from localStorage');
					} catch (error) {
						console.error('Failed to restore schedule from localStorage:', error);
						setSchedule(
							Array(8)
								.fill(null)
								.map(() =>
									Array(7)
										.fill(null)
										.map(() => ({
											assignedTrainees: [],
											assignedExaminers: [],
											slotStatus: 'idle',
											isVacant: false,
										})),
								),
						);
					}
				} else {
					setSchedule(
						Array(8)
							.fill(null)
							.map(() =>
								Array(7)
									.fill(null)
									.map(() => ({
										assignedTrainees: [],
										assignedExaminers: [],
										slotStatus: 'idle',
										isVacant: false,
									})),
							),
					);
				}

				setIsScheduleLoaded(true);

				console.log('Trainees:', traineeList);
				console.log('Examiners:', examinerList);
				console.log(
					'Trainee schedule counts:',
					traineeList.map((staff) => ({ userId: staff.userId, count: staff.scheduleData.length })),
				);
				console.log(
					'Examiner schedule counts:',
					examinerList.map((staff) => ({ userId: staff.userId, count: staff.scheduleData.length })),
				);
				console.log('✅ Firebase data loaded successfully');
			} catch (error) {
				console.error('Error fetching shift data:', error);
			} finally {
				setLoadingUsers(false);
			}
		};

		fetchShiftData();
	}, [getStorageKey, location.state, navigate, userProfile]);

	/**
	 * schedule が更新されたら localStorage に保存する
	 */
	useEffect(() => {
		if (!isScheduleLoaded || !shiftData || trainees.length === 0 || examiners.length === 0) {
			return;
		}

		const storageKey = getStorageKey(shiftData.uid);
		const serializable = schedule.map((row) =>
			row.map((slot) => ({
				traineeUserIds: slot.assignedTrainees.map((trainee) => trainee.userId),
				examinerUserIds: slot.assignedExaminers.map((examiner) => examiner.userId),
			})),
		);
		localStorage.setItem(storageKey, JSON.stringify(serializable));
		console.log('Saved schedule to localStorage');
	}, [schedule, shiftData, trainees, examiners, isScheduleLoaded, getStorageKey]);

	/**
	 * 選択中のユーザーのスケジュールデータをコンソールに出力
	 */
	useEffect(() => {
		if (selectedStaffUserId) {
			const selectedUser = [...trainees, ...examiners].find(
				(staff) => staff.userId === selectedStaffUserId
			);

			if (selectedUser) {
				console.log('Selected User:', selectedUser);
				console.log('User Schedule Data:', selectedUser.scheduleData);
				console.log('User Schedule Data Count:', selectedUser.scheduleData.length);
			} else {
				console.log('Selected user not found for userId:', selectedStaffUserId);
			}
		}
	}, [selectedStaffUserId, trainees, examiners]);

	/**
	 * スタッフの割り当て・削除処理
	 * @param periodIndex - 時限のインデックス
	 * @param dayIndex - 曜日のインデックス
	 */
	const updateSlotStatus = (
		periodIndex: number,
		dayIndex: number,
	) => {
		// TODO: 中身を実装
		setSchedule((prevSchedule) => {
			const newSchedule = [...prevSchedule];
			const slot = newSchedule[periodIndex][dayIndex];

			if (slot.assignedTrainees.length === 0) {
				slot.slotStatus = 'idle';
			} else if (slot.assignedTrainees.length > 0 && slot.assignedExaminers.length < 2) {
				slot.slotStatus = 'incomplete';
			} else if (slot.assignedTrainees.length > 0 && slot.assignedExaminers.length >= 2) {
				slot.slotStatus = 'complete';
			}

			return newSchedule;

		});
	};

	const getSlotStatus = (slot: TimeSlot): TimeSlot['slotStatus'] => {
		if (slot.assignedTrainees.length === 0) {
			return 'idle';
		}

		if (slot.assignedExaminers.length < 2) {
			return 'incomplete';
		}

		return 'complete';
	};

	const assignStaffToSlot = (
		periodIndex: number,
		dayIndex: number,
		staffMember: StaffMember,
		isExaminer: boolean,
	) => {
		setSchedule((prevSchedule) => {
			const newSchedule = [...prevSchedule];
			const slot = newSchedule[periodIndex][dayIndex];
			const alreadyAssigned = isExaminer
				? slot.assignedExaminers.some((examiner) => examiner.userId === staffMember.userId)
				: slot.assignedTrainees.some((trainee) => trainee.userId === staffMember.userId);

			if (alreadyAssigned) {
				return prevSchedule;
			}

			if (isExaminer) {
				slot.assignedExaminers.push(staffMember);
			} else {
				slot.assignedTrainees.push(staffMember);
			}

			// ステータス更新
			updateSlotStatus(periodIndex, dayIndex);

			return newSchedule;
		});
	};

	const deleteStaffFromSlot = (
		periodIndex: number,
		dayIndex: number,
		staffMember: StaffMember,
		isExaminer: boolean,
	) => {
		setSchedule((prevSchedule) => {
			const newSchedule = [...prevSchedule];
			const slot = newSchedule[periodIndex][dayIndex];

			if (isExaminer) {
				slot.assignedExaminers = slot.assignedExaminers.filter((examiner) => examiner.userId !== staffMember.userId);
			} else {
				slot.assignedTrainees = slot.assignedTrainees.filter((trainee) => trainee.userId !== staffMember.userId);
			}

			slot.slotStatus = getSlotStatus(slot);

			return newSchedule;
		});
	}

	// prevent unused-variable compile errors
	void assignStaffToSlot;
	void deleteStaffFromSlot;;

	// prevent unused-variable compile errors in template
	void assignStaffToSlot;
	void deleteStaffFromSlot;

	// ===== JSXテンプレート =====

	return (
		<div
			className={`${styles.schedulePage} ${isMobile
					? styles.schedulePageMobile
					: isTablet
						? styles.schedulePageTablet
						: styles.schedulePageDesktop
				}`}
		>
			<div
				className={`${styles.scheduleContainer} ${isMobile
						? styles.scheduleContainerMobile
						: isTablet
							? styles.scheduleContainerTablet
							: styles.scheduleContainerDesktop
					}`}
			>
				{/* ヘッダー */}
				<div className={styles.scheduleHeader}>
					<div className={styles.scheduleHeaderRow}>
						<h1
							className={`${styles.scheduleTitle} ${isMobile ? styles.scheduleTitleMobile : styles.scheduleTitleDesktop
								}`}
						>
							シフト作成
						</h1>
						{loadingUsers ? (
							<div className={styles.scheduleLoadingUsers}>
								<div className={styles.scheduleLoadingUsersSpinner} />
								<span className={styles.scheduleLoadingUsersText}>読み込み中...</span>
							</div>
						) : shiftData ? (
							<div className={styles.shiftMeta}>
								{shiftData.year}年度{' '}
								{shiftData.semester === 'spring' ? '春学期 ' : '秋学期 '}
								{shiftData.module}モジュール
							</div>
						) : null}
					</div>
				</div>

				{/* メインコンテンツ */}
				<div className={isDesktop ? styles.mainContentDesktop : styles.mainContentMobile}>
					{/* 左側：時間割表 */}
					<div className={isDesktop ? styles.leftPaneDesktop : styles.leftPaneMobile}>
						<div className={isMobile ? styles.leftInnerMobile : styles.leftInnerDesktop}>
							<div
								className={`${styles.scheduleGrid} ${isMobile ? styles.scheduleGridMobile : styles.scheduleGridDesktop
									} ${isMobile
										? styles.scheduleGridGapMobile
										: isTablet
											? styles.scheduleGridGapTablet
											: styles.scheduleGridGapDesktop
									}`}
							>
								{/* ヘッダー行 */}
								<Card className={styles.dayHeadCard}>
									<CardContent
										className={`${styles.dayHeadText} ${isMobile
												? styles.dayHeadTextMobile
												: isTablet
													? styles.dayHeadTextTablet
													: styles.dayHeadTextDesktop
											}`}
									>
										時限
									</CardContent>
								</Card>
								{day.map((dayName) => (
									<Card key={dayName} className={styles.dayHeadCard}>
										<CardContent
											className={`${styles.dayHeadText} ${isMobile
													? styles.dayHeadTextMobile
													: isTablet
														? styles.dayHeadTextTablet
														: styles.dayHeadTextDesktop
												}`}
										>
											{isMobile ? dayName : `${dayName}曜日`}
										</CardContent>
									</Card>
								))}

								{/* 時間割セル */}
								{periods.map((period, periodIndex) => (
									<React.Fragment key={period}>
										{/* 時限表示 */}
										<Card className={styles.periodHeadCard}>
											<CardContent
												className={`${styles.periodHeadContent} ${isMobile
														? styles.periodHeadContentMobile
														: isTablet
															? styles.periodHeadContentTablet
															: styles.periodHeadContentDesktop
													}`}
											>
												<div
													className={
														isMobile ? styles.periodTextMobile : styles.periodTextDesktop
													}
												>
													<div className={styles.periodMain}>{period}</div>
												</div>
											</CardContent>
										</Card>

										{/* 各曜日のセル */}
										{day.map((dayName, dayIndex) => {
											const slot = schedule[periodIndex][dayIndex];
											const slotStateClassName = getSlotButtonClassName(slot);

											return (
												<Button
													key={`${period}-${dayName}`}
													variant={slot.slotStatus === 'complete' ? 'default' : 'outline'}
													//disabled={!slot.isVacant && slot.assignedTrainees.length === 0 && slot.assignedExaminers.length === 0}
													onClick={() => handleSlotClick(periodIndex, dayIndex)}
													onMouseEnter={() => updateAvailabilityForSlot(periodIndex, dayIndex)}
													className={`${styles.slotButton} ${isMobile
															? styles.slotButtonMobile
															: isTablet
																? styles.slotButtonTablet
																: styles.slotButtonDesktop
														} ${slotStateClassName}`}
												>
													<div className={styles.slotContentWrap}>
														<div className={styles.slotTextCol}>
															{slot.assignedTrainees.length > 0 ? (
																<div className={styles.slotAssigneeStack}>
																	{slot.assignedTrainees.map((trainee, idx) => (
																		<div
																			key={`${trainee.userId}-${idx}`}
																			className={`${styles.slotAssigneeBox} ${styles.slotAssigneeBoxTrainee}`}
																		>
																			<button
																				type="button"
																				className={styles.slotRemoveButton}
																				onClick={(event) => {
																					event.stopPropagation();
																					deleteStaffFromSlot(periodIndex, dayIndex, trainee, false);
																				}}
																				aria-label={`${trainee.name} の割り当てを解除`}
																			>
																				×
																			</button>
																			<div className={styles.slotAssigneeLabel}>練:{trainee.name}</div>
																		</div>
																	))}
																</div>
															) : (
																<div />
															)}
														</div>
														<div className={styles.slotTextCol}>
															{slot.assignedExaminers.length > 0 ? (
																<div className={styles.slotAssigneeStack}>
																	{slot.assignedExaminers.map((examiner, idx) => (
																		<div
																			key={`${examiner.userId}-${idx}`}
																			className={`${styles.slotAssigneeBox} ${styles.slotAssigneeBoxExaminer}`}
																		>
																			<button
																				type="button"
																				className={styles.slotRemoveButton}
																				onClick={(event) => {
																					event.stopPropagation();
																					deleteStaffFromSlot(periodIndex, dayIndex, examiner, true);
																				}}
																				aria-label={`${examiner.name} の割り当てを解除`}
																			>
																				×
																			</button>
																			<div className={styles.slotAssigneeLabel}>試:{examiner.name}</div>
																		</div>
																	))}
																</div>
															) : (
																<div />
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
					</div>

					{/* 右側：スタッフリスト */}
					<div
						className={isDesktop ? styles.rightPaneDesktop : styles.rightPaneMobile}
					>
						<Card className={styles.staffCard}>
							<CardContent
								className={
									isMobile
										? styles.staffCardContentMobile
										: styles.staffCardContentDesktop
								}
							>
								{/* トグルボタン */}
								<div className={styles.staffToggleRow}>
									<Button
										variant={activeList === 'trainees' ? 'default' : 'outline'}
										className={`${styles.staffToggleButton} ${activeList === 'trainees' ? styles.staffToggleActive : styles.staffToggleInactive
											}`}
										onClick={() => setActiveList('trainees')}
									>
										練習生 ({trainees.length})
									</Button>
									<Button
										variant={activeList === 'examiners' ? 'default' : 'outline'}
										className={`${styles.staffToggleButton} ${activeList === 'examiners' ? styles.staffToggleActive : styles.staffToggleInactive
											}`}
										onClick={() => setActiveList('examiners')}
									>
										試験官 ({examiners.length})
									</Button>
								</div>

								{/* スタッフリスト */}
								<div className={styles.staffList}>
									{activeList === 'trainees' ? (
										trainees.length > 0 ? (
											trainees.map((trainee) => (
												<Button
													key={trainee.userId}
													variant="outline"
													className={`${styles.staffItemButton} 
																${selectedStaffUserId === trainee.userId
																	? styles.staffItemSelected
																	: styles.staffItemDefault
																} 
																${trainee.isAvailable ? styles.staffItemAvailable : null}
														`}
													onClick={() => handleStaffSelect(trainee)}
												>
													<div className={styles.staffItemHeader}>
														<span
															className={`${styles.staffItemName} ${selectedStaffUserId === trainee.userId
																	? styles.staffItemNameSelected
																	: ''
																}`}
														>
															{trainee.name}
														</span>
													</div>
													<p
														className={`${styles.staffItemComment} ${selectedStaffUserId === trainee.userId
																? styles.staffItemCommentSelected
																: styles.staffItemCommentDefault
															}`}
													>
														{trainee.comment}
													</p>
												</Button>
											))
										) : (
											<p className={styles.emptyStaffText}>練習生がいません</p>
										)
									) : (
										examiners.length > 0 ? (
											examiners.map((examiner) => (
												<Button
													key={examiner.userId}
													variant="outline"
													className={`${styles.staffItemButton} ${selectedStaffUserId === examiner.userId
															? styles.staffItemSelected
															: styles.staffItemDefault
														}
														${examiner.isAvailable ? styles.staffItemAvailable : null}
														`}
													onClick={() => handleStaffSelect(examiner)}
												>
													<div className={styles.staffItemHeader}>
														<span
															className={`${styles.staffItemName} ${selectedStaffUserId === examiner.userId
																	? styles.staffItemNameSelected
																	: ''
																}`}
														>
															{examiner.name}
														</span>
													</div>
													<p
														className={`${styles.staffItemComment} ${selectedStaffUserId === examiner.userId
																? styles.staffItemCommentSelected
																: styles.staffItemCommentDefault
															}`}
													>
														{examiner.comment}
													</p>
												</Button>
											))
										) : (
											<p className={styles.emptyStaffText}>試験官がいません</p>
										)
									)}
								</div>
							</CardContent>
						</Card>

						{/* 保存ボタン */}
						{/* <div className={styles.saveButtonMockWrap}>
							<Button
								variant="default"
								className={styles.saveButtonMock}
								disabled
							>
								シフトを保存
							</Button>
						</div> */}

						{/* 出力ボタン */}
						<div className={styles.outputButtonMockWrap}>
							<Button
								variant="default"
								className={styles.outputButtonMock}
								onClick={openOutputPopup}
							>
								シフトを出力
							</Button>
						</div>

					</div>
				</div>
			</div>

			{/* モーダルポップアップ */}
			{/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, react/no-array-index-key */}
			{showOutputPopup && (
				<dialog
					className={styles.modalOverlay}
					open
					onClick={closeOutputPopup}
					onKeyDown={(e: React.KeyboardEvent) => {
						if (e.key === 'Escape') {
							closeOutputPopup();
						}
					}}
				>
					<div
						className={styles.modalContent}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
						role="dialog"
						aria-modal="true"
						tabIndex={-1}
					>
						<div className={styles.modalHeader}>
							<h2 className={styles.modalTitle}>シフト出力</h2>
							<button
								type="button"
								className={styles.modalCloseButton}
								onClick={closeOutputPopup}
								aria-label="閉じる"
							>
								×
							</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.outputTextWrapper}>
								<pre className={styles.outputText}>{outputText}</pre>
							</div>
						</div>
						<div className={styles.modalFooter}>
							{copyResultMessage ? <p className={styles.copyResultMessage}>{copyResultMessage}</p> : null}
							<Button
								variant="default"
								onClick={handleCopyOutputText}
							>
								コピー
							</Button>
							<Button
								variant="outline"
								onClick={closeOutputPopup}
							>
								閉じる
							</Button>
						</div>
					</div>
				</dialog>
			)}
		</div>
	);
}
