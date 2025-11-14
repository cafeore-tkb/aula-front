import {
	collection,
	doc,
	getDocs,
	getFirestore,
	updateDoc,
} from 'firebase/firestore';
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
			<div className="flex min-h-screen items-center justify-center bg-gray-100">
				<div className="text-center">
					<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
					<p className="text-gray-600">権限を確認中...</p>
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
			<div className="flex min-h-screen items-center justify-center bg-gray-100">
				<div className="text-center">
					<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
					<p className="text-gray-600">プロフィール情報を読み込み中...</p>
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
		<div className="min-h-screen bg-gray-100 py-8">
			<div className="mx-auto max-w-6xl px-4">
				<div className="mb-8 flex items-center justify-between">
					<h1 className="font-bold text-3xl text-gray-900">
						管理者ページ-メンバー管理
					</h1>
					<div className="flex items-center space-x-2">
						<span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-600 text-sm">
							管理者
						</span>
						<span className="text-gray-600 text-sm">
							{userProfile.name || user.displayName || 'ユーザー'}
						</span>
					</div>
				</div>

				{loadingUsers ? (
					<div className="py-8 text-center">
						<p className="text-gray-500 text-sm">読み込み中...</p>
					</div>
				) : (
					<Tabs defaultValue="view" className="w-full">
						<TabsList className="grid w-full max-w-md grid-cols-2">
							<TabsTrigger value="view">閲覧モード</TabsTrigger>
							<TabsTrigger value="edit">編集モード</TabsTrigger>
						</TabsList>

						<TabsContent value="view" className="mt-6">
							<div className="rounded-lg bg-white shadow-md">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>表示名</TableHead>
											<TableHead>入学年度</TableHead>
											<TableHead>珈琲・俺ステータス</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{users.map((u) => {
											// ステータスの判定
											let status = '';
											if (u.isExaminer) {
												status = u.isFirstYear ? '1年目試験官' : '2年目試験官';
											} else {
												status = u.isFirstYear ? '1年目練習生' : '2年目練習生';
											}

											return (
												<TableRow key={u.uid}>
													<TableCell className="font-medium">{u.name}</TableCell>
													<TableCell>{`${u.year.toString().slice(2)}生`}</TableCell>
													<TableCell>{status}</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						</TabsContent>

						<TabsContent value="edit" className="mt-6">
							<div className="rounded-lg bg-white shadow-md">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>表示名</TableHead>
											<TableHead>入学年度</TableHead>
											<TableHead>珈琲・俺ステータス</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{users.map((u) => {
											// ステータスの判定
											let statusValue = '';
											if (u.isExaminer) {
												statusValue = u.isFirstYear ? 'first-examiner' : 'second-examiner';
											} else {
												statusValue = u.isFirstYear ? 'first-trainee' : 'second-trainee';
											}

											return (
												<TableRow key={u.uid}>
													<TableCell className="font-medium">{u.name}</TableCell>
													<TableCell>{`${u.year.toString().slice(2)}生`}</TableCell>
													<TableCell>
														<Select
															value={statusValue}
															onValueChange={(value) => handleStatusChange(u.uid, value)}
														>
															<SelectTrigger className="w-[180px]">
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
						</TabsContent>
					</Tabs>
				)}

				{/* ホームに戻るボタン */}
				<div className="mt-8">
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
