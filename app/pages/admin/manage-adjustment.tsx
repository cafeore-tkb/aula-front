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
import styles from './manage-adjustment.module.scss';

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
	const [exportingShiftUid, setExportingShiftUid] = useState<string | null>(null);

	// CSVエクスポート関数（シフト回答内容を出力）
	const exportToCSV = async (shift: ShiftUsual) => {
		try {
			setExportingShiftUid(shift.uid);
			const db = getFirestore();

			// schedules コレクション名を構築
			const collectionName = `schedules_${shift.year}_${shift.semester}_${shift.module}`;

			// スケジュールデータを取得
			const schedulesRef = collection(db, collectionName);
			const schedulesSnapshot = await getDocs(schedulesRef);

			// ユーザー情報を取得
			const usersRef = collection(db, 'users');
			const usersSnapshot = await getDocs(usersRef);
			const usersDict: Record<string, { name: string; isExaminer: boolean }> = {};

			for (const userDoc of usersSnapshot.docs) {
				const userData = userDoc.data();
				usersDict[userDoc.id] = {
					name: userData.name || '名前未設定',
					isExaminer: userData.isExaminer || false,
				};
			}

			// ユーザーごとのシフト回答を整理
			const userResponses: Array<{
				userId: string;
				name: string;
				isExaminer: boolean;
				responses: Record<string, boolean>; // "period-day" => canBeAssigned
			}> = [];

			// スケジュールデータを処理
			for (const scheduleDoc of schedulesSnapshot.docs) {
				const scheduleData = scheduleDoc.data();
				const userId = scheduleData.userId;
				const scheduleItems = scheduleData.scheduleData || [];

				if (!userId || !usersDict[userId]) continue;

				const userInfo = usersDict[userId];
				const responses: Record<string, boolean> = {};

				// 各時間帯の回答を記録
				for (const item of scheduleItems) {
					// periodは文字列'1'~'8'で保存されているので、数値に変換して0-7にする
					const period = typeof item.period === 'string' ? parseInt(item.period, 10) - 1 : item.period;
					const dayName = item.day;
					// isSelectedとcanBeAssignedの両方に対応
					const canBeAssigned = item.canBeAssigned === true || item.isSelected === true;

					if (period !== undefined && dayName !== undefined) {
						const key = `${period}-${dayName}`;
						responses[key] = canBeAssigned;
					}
				}

				userResponses.push({
					userId,
					name: userInfo.name,
					isExaminer: userInfo.isExaminer,
					responses,
				});
			}

			// ユーザーを名前でソート
			userResponses.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

			// CSVデータを構築
			const dayNames = ['月', '火', '水', '木', '金', '土', '日'];
			let csvContent = '\uFEFF'; // BOM for UTF-8

			// ヘッダー情報
			csvContent += `${shift.year}年度 ${shift.semester} モジュール${shift.module} シフト回答一覧\n`;
			csvContent += `出力日時: ${new Date().toLocaleString('ja-JP')}\n\n`;

			// テーブルヘッダー（名前、役割、各時限×曜日）
			const header = ['名前', '役割'];
			for (let period = 0; period < 8; period++) {
				for (const dayName of dayNames) {
					header.push(`${period + 1}限${dayName}`);
				}
			}
			csvContent += header.join(',') + '\n';

			// 各ユーザーの回答データ
			for (const user of userResponses) {
				const row = [
					`"${user.name}"`,
					user.isExaminer ? '試験官' : '練習生',
				];

				// 各時限×曜日の回答
				for (let period = 0; period < 8; period++) {
					for (const dayName of dayNames) {
						const key = `${period}-${dayName}`;
						const canBeAssigned = user.responses[key];
						row.push(canBeAssigned ? '○' : '×');
					}
				}

				csvContent += row.join(',') + '\n';
			}

			// 集計情報
			csvContent += '\n集計情報\n';
			csvContent += `回答者数,${userResponses.length}\n`;
			csvContent += `練習生,${userResponses.filter(u => !u.isExaminer).length}\n`;
			csvContent += `試験官,${userResponses.filter(u => u.isExaminer).length}\n`;

			// ダウンロード
			const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');
			const url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', `shift_responses_${shift.year}_${shift.semester}_${shift.module}.csv`);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

		} catch (error) {
			console.error('CSV export error:', error);
			alert('CSVのエクスポートに失敗しました');
		} finally {
			setExportingShiftUid(null);
		}
	};

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

			// シフト専用のコレクション名を生成
			const scheduleCollectionId = `schedules_${newYear}_${newSemester}_${newModule}`;

			// 新しいシフトを追加
			const docRef = await addDoc(shiftUsualCollection, {
				year: Number.parseInt(newYear, 10),
				semester: newSemester,
				module: newModule,
				isTwice: newIsTwice === 'true',
				isOpen: false,
				isScheduled: false,
				scheduleCollectionId, // コレクション名を保存
			});		// ローカルの状態を更新
			setShiftUsual((prev) => [
				...prev,
				{
					uid: docRef.id,
					year: Number.parseInt(newYear, 10),
					semester: newSemester as 'spring' | 'autumn',
					module: newModule as 'A' | 'B' | 'C',
					isOpen: false,
					isTwice: newIsTwice === 'true',
					isScheduled: false,
					scheduleCollectionId,
				},
			]);			// フォームをリセット
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
		<div className={styles.page}>
			<div className={styles.container}>
				<div className={styles.header}>
					<h1 className={styles.title}>管理者ページ</h1>
					<div className={styles.userInfo}>
						<span className={styles.adminBadge}>
							管理者
						</span>
						<span className={styles.userName}>
							{userProfile.name || user?.displayName || 'ユーザー'}
						</span>
					</div>
				</div>
				<div>
					<div className={styles.sectionHeading}>
						シフト通常設定一覧
					</div>

					{/* 新規追加フォーム */}
					<div className={styles.formCard}>
						<h2 className={styles.formTitle}>
							新規シフト追加
						</h2>
						<div className={styles.formGrid}>
							<div>
								<label
									htmlFor={yearInputId}
									className={styles.label}
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
									className={styles.label}
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
									className={styles.label}
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
									className={styles.label}
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
							<div className={styles.addButtonWrap}>
								<Button
									onClick={handleAddShift}
									disabled={isAdding}
									className={styles.addButton}
								>
									{isAdding ? '追加中...' : '✓ 追加'}
								</Button>
							</div>
						</div>
					</div>

					{loadingShiftUsual ? (
						<div className={styles.loadingWrap}>
							<p className={styles.loadingText}>シフト通常設定を読み込み中...</p>
						</div>
					) : (
						<div className={styles.tableCard}>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className={styles.tableText}>年度</TableHead>
										<TableHead className={styles.tableText}>学期</TableHead>
										<TableHead className={styles.tableText}>モジュール</TableHead>
										<TableHead className={styles.tableText}>頻度</TableHead>
										<TableHead className={styles.tableText}>公開設定</TableHead>
										<TableHead className={styles.tableText}>シフト作成</TableHead>
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
												className={su.isOpen ? styles.rowOpen : styles.rowClosed}
											>
												<TableCell className={styles.tableText}>{su.year}</TableCell>
												<TableCell className={styles.tableText}>{semesterJa}</TableCell>
												<TableCell className={styles.tableText}>{su.module}</TableCell>
												<TableCell>
													<Select
														value={su.isTwice ? 'true' : 'false'}
														onValueChange={(value) => handleFrequencyChange(su.uid, value)}
													>
														<SelectTrigger
															className={`${styles.selectTriggerBase} ${su.isTwice ? styles.selectPositive : styles.selectNeutral}`}
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
															className={`${styles.selectTriggerBase} ${su.isOpen ? styles.selectPositive : styles.selectNeutral}`}
														>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="isOpen">公開</SelectItem>
															<SelectItem value="isClosed">非公開</SelectItem>
														</SelectContent>
													</Select>
												</TableCell>
												<TableCell>
													<div className={styles.actionButtons}>
														<Button
															onClick={() => navigate('/admin/scheduleShift', { state: { shiftUid: su.uid } })}
															className={styles.primaryActionButton}
														>
															シフトを組む
														</Button>
														<Button
															onClick={() => exportToCSV(su)}
															disabled={exportingShiftUid === su.uid}
															variant="outline"
															className={styles.csvButton}
														>
															{exportingShiftUid === su.uid ? '出力中...' : 'CSV出力'}
														</Button>
													</div>
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
				<div className={styles.homeButtonWrap}>
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
