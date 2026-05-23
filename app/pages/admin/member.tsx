import {
	collection,
	doc,
	getDocs,
	getFirestore,
	updateDoc,
} from 'firebase/firestore';
import { Eye, Edit2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '~/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { HomeButton } from '../../components/home-button';
import { useAuth } from '../../lib/auth-context';
import type { UserProfile } from '../../lib/firebase';
import styles from './member.module.scss';

export function meta() {
	return [
		{ title: 'Aula - 管理画面' },
		{ name: 'description', content: '管理者向けの設定画面' },
	];
}

export default function Admin() {
	const { user, userProfile, loading } = useAuth();
	const navigate = useNavigate();
	const [users, setUsers] = useState<UserProfile[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(true);

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

	// ユーザー一覧を取得
	useEffect(() => {
		const fetchUsers = async () => {
			if (!userProfile?.isAdmin) return;

			try {
				setLoadingUsers(true);
				const db = getFirestore();
				const usersCollection = collection(db, 'users');
				const usersSnapshot = await getDocs(usersCollection);
				const usersList = usersSnapshot.docs.map(
					(doc) =>
						({
							uid: doc.id,
							...doc.data(),
						}) as UserProfile,
				);
				setUsers(usersList);
			} catch (error) {
				console.error('Error fetching users:', error);
			} finally {
				setLoadingUsers(false);
			}
		};

		fetchUsers();
	}, [userProfile]);

	// ステータス更新関数
	const handleStatusChange = async (uid: string, statusValue: string) => {
		try {
			const db = getFirestore();
			const userDocRef = doc(db, 'users', uid);

			// ステータスから各フラグを判定
			const isFirstYear = statusValue.includes('first');
			const isExaminer = statusValue.includes('examiner');

			await updateDoc(userDocRef, {
				isFirstYear,
				isExaminer,
			});

			// ローカルの状態を更新
			setUsers((prevUsers) =>
				prevUsers.map((u) =>
					u.uid === uid ? { ...u, isFirstYear, isExaminer } : u,
				),
			);
		} catch (error) {
			console.error('Error updating user status:', error);
			alert('ステータスの更新に失敗しました');
		}
	};

	// ローディング中の表示
	if (loading) {
		return (
			<div className={"common-loading-wrap"}>
				<div className={"common-loading-inner"}>
					<div className={"common-loading-spinner-red"}></div>
					<p className={"common-loading-text"}>権限を確認中...</p>
				</div>
			</div>
		);
	}

	// 未認証の場合（リダイレクト処理中）
	if (!user) {
		return null;
	}

	// ユーザープロフィールが未読み込みの場合
	if (!userProfile) {
		return (
			<div className={"common-loading-wrap"}>
				<div className={"common-loading-inner"}>
					<div className={"common-loading-spinner-red"}></div>
					<p className={"common-loading-text"}>プロフィール情報を読み込み中...</p>
				</div>
			</div>
		);
	}

	// 管理者権限がない場合（リダイレクト処理中）
	if (!userProfile.isAdmin) {
		return null;
	}

	// 管理者ページのメインコンテンツ
	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<div className={styles.header}>
					<h1 className={styles.title}>
						管理者ページ-メンバー管理
					</h1>
					<div className={styles.userMeta}>
						<span className={styles.badge}>
							管理者
						</span>
						<span className={styles.userName}>
							{userProfile.name || user.displayName || 'ユーザー'}
						</span>
					</div>
				</div>

				{loadingUsers ? (
					<div className={styles.loadingUsersWrap}>
						<p className={styles.loadingUsersText}>読み込み中...</p>
					</div>
				) : (
					<Tabs defaultValue="view" className={styles.tabsRoot}>
						<TabsList className={styles.tabsList}>
							<TabsTrigger
								value="view"
								className={styles.tabsTrigger}
							>
								<Eye className={styles.tabsIcon} />
								<span>閲覧モード</span>
							</TabsTrigger>
							<TabsTrigger
								value="edit"
								className={styles.tabsTrigger}
							>
								<Edit2 className={styles.tabsIcon} />
								<span>編集モード</span>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="view" className={styles.tabsContent}>
							<div className={styles.tableShell}>
								<div className={styles.tableScrollView}>
									<Table className={styles.tableCollapsed}>
										<TableHeader className={styles.tableHeaderSticky}>
											<TableRow className={styles.tableHeaderRow}>
												<TableHead className={styles.tableHead}>
													表示名
												</TableHead>
												<TableHead className={styles.tableHead}>
													入学年度
												</TableHead>
												<TableHead className={styles.tableHead}>
													珈琲・俺ステータス
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{users.map((u, index) => {
												// ステータスの判定
												let status = '';
												if (u.isExaminer) {
													status = u.isFirstYear ? '1年目試験官' : '2年目試験官';
												} else {
													status = u.isFirstYear ? '1年目練習生' : '2年目練習生';
												}

												return (
													<TableRow
														key={u.uid}
														className={`${styles.tableRowBase} ${index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}`}
													>
														<TableCell className={styles.tableCellStrong}>
															{u.name}
														</TableCell>
														<TableCell className={styles.tableCell}>{`${u.year.toString().slice(2)}生`}</TableCell>
														<TableCell className={styles.tableCell}>
															{status}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="edit" className={styles.tabsContent}>
							<div className={styles.tableShell}>
								<div className={styles.tableScrollEdit}>
									<Table className={styles.tableCollapsed}>
										<TableHeader className={styles.tableHeaderSticky}>
											<TableRow className={styles.tableHeaderRow}>
												<TableHead className={styles.tableHead}>
													表示名
												</TableHead>
												<TableHead className={styles.tableHead}>
													入学年度
												</TableHead>
												<TableHead className={styles.tableHead}>
													珈琲・俺ステータス
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{users.map((u, index) => {
												// ステータスの判定
												let statusValue = '';
												if (u.isExaminer) {
													statusValue = u.isFirstYear ? 'first-examiner' : 'second-examiner';
												} else {
													statusValue = u.isFirstYear ? 'first-trainee' : 'second-trainee';
												}

												return (
													<TableRow
														key={u.uid}
														className={`${styles.tableRowBase} ${index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}`}
													>
														<TableCell className={styles.tableCellStrong}>
															{u.name}
														</TableCell>
														<TableCell className={styles.tableCell}>{`${u.year.toString().slice(2)}生`}</TableCell>
														<TableCell className={styles.tableCell}>
															<Select
																value={statusValue}
																onValueChange={(value) => handleStatusChange(u.uid, value)}
															>
																<SelectTrigger className={styles.selectTrigger}>
																	<SelectValue />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="first-trainee">1年目練習生</SelectItem>
																	<SelectItem value="second-trainee">2年目練習生</SelectItem>
																	<SelectItem value="first-examiner">1年目試験官</SelectItem>
																	<SelectItem value="second-examiner">2年目試験官</SelectItem>
																</SelectContent>
															</Select>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>
							</div>
						</TabsContent>
					</Tabs>
				)}

				{/* ホームに戻るボタン */}
				<div className={styles.homeButtonWrap}>
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
