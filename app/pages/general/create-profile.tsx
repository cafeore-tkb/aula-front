import { useEffect, useId, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useNavigate } from 'react-router';
import { Input } from '~/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select';
import { useAuth } from '../../lib/auth-context';
import { createUserProfileWithData } from '../../lib/firebase';
export function meta() {
	return [
		{ title: 'プロフィール作成 - Aula' },
		{ name: 'description', content: 'プロフィール情報を設定してください' },
	];
}

export default function CreateProfile() {
	const { user, userProfile, loading, refreshProfile } = useAuth();
	const navigate = useNavigate();
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const displayNameId = useId();
	const yearId = useId();
	const statusId = useId();

	// フォームの状態管理
	const [displayName, setDisplayName] = useState('');
	const [year, setYear] = useState('');
	const [status, setStatus] = useState('');

	// レスポンシブ対応: ブレークポイントの定義
	const isMobile = useMediaQuery({ maxWidth: 767 });
	const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
	const isDesktop = useMediaQuery({ minWidth: 1024 });

	// 認証状態をチェック
	useEffect(() => {
		if (!loading) {
			// 未ログインの場合はログインページにリダイレクト
			if (!user) {
				navigate('/login');
				return;
			}

			// すでにプロフィールが存在する場合はホームにリダイレクト
			if (userProfile) {
				navigate('/dashboard');
				return;
			}
		}
	}, [user, userProfile, loading, navigate]);

	const handleCreateProfile = async () => {
		if (!user) return;

		// バリデーション
		if (!displayName.trim()) {
			setError('表示名を入力してください');
			return;
		}
		if (!year || Number.parseInt(year, 10) < 2000) {
			setError('入学年度を正しく入力してください');
			return;
		}
		if (!status) {
			setError('珈琲・俺ステータスを選択してください');
			return;
		}

		try {
			setIsCreating(true);
			setError(null);

			// Firebase関数を使用してプロフィールを作成
			await createUserProfileWithData(user, {
				displayName: displayName.trim(),
				year: Number.parseInt(year, 10),
				status: status,
			});

			// プロフィールを再読み込み
			await refreshProfile();

			// ホームページにリダイレクト
			navigate('/dashboard');
		} catch (error) {
			console.error('Error creating profile:', error);
			setError('プロフィールの作成に失敗しました。もう一度お試しください。');
		} finally {
			setIsCreating(false);
		}
	};

	// ローディング中の表示
	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-100">
				<div className="text-center">
					<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
					<p className="text-gray-600">プロフィール情報を確認中...</p>
				</div>
			</div>
		);
	}

	// 未認証の場合（リダイレクト処理中）
	if (!user) {
		return null;
	}

	// すでにプロフィールが存在する場合（リダイレクト処理中）
	if (userProfile) {
		navigate('/dashboard');
	}

	return (
		<div className="min-h-screen bg-gray-100 py-8">
			<div
				className={`mx-auto px-4 ${
					isMobile ? 'max-w-full' : isTablet ? 'max-w-2xl' : 'max-w-4xl'
				}`}
			>
				<div className="rounded-lg bg-white p-8 shadow-md">
					<div className="mb-6 text-center">
						<h1
							className={`mb-2 font-bold text-gray-900 ${
								isMobile ? 'text-xl' : isTablet ? 'text-2xl' : 'text-3xl'
							}`}
							style={{ fontFamily: 'var(--font-rounded)' }}
						>
							プロフィール作成
						</h1>
						<div
							className={`pt-3 text-gray-700 ${isMobile ? 'text-sm' : 'text-lg'}`}
							style={{ fontFamily: 'var(--font-rounded)' }}
						>
							<p>Aulaサービスを利用するには、プロフィール情報の登録が必要です。</p>
							<p>
								下のボタンをクリックして、アカウントのセットアップを完了してください。
							</p>
						</div>
					</div>{' '}
					{/* ユーザー情報の表示 */}
					<div className="mb-6">
						<div
							className={`mb-6 flex items-center rounded-lg bg-gray-50 p-4 ${
								isMobile ? 'flex-col space-y-3 text-center' : 'space-x-4'
							}`}
						>
							{user.photoURL && (
								<img
									src={user.photoURL}
									alt={user.displayName || 'ユーザー'}
									className={` ${isMobile ? 'h-20 w-20' : 'h-16 w-16'}`}
								/>
							)}
							<div className="flex-1">
								<h3
									className={`font-semibold text-gray-900 ${
										isMobile ? 'text-base' : 'text-lg'
									}`}
								>
									{user.displayName || 'ユーザー'}
								</h3>
								<p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
									{user.email}
								</p>
							</div>
						</div>

						{/* プロフィール入力フォーム */}
						<div className={`${isDesktop ? 'grid grid-cols-2 gap-6' : 'space-y-5'}`}>
							<div>
								<label
									htmlFor={displayNameId}
									className="mb-2 block font-medium text-gray-700 text-sm"
								>
									表示名 <span className="text-red-500">*</span>
								</label>
								<Input
									id={displayNameId}
									type="text"
									placeholder="例: 山田 太郎"
									className="w-full"
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
								/>
								<p className="mt-1 text-gray-500 text-xs">
									他のメンバーに表示される名前です
								</p>
							</div>

							<div>
								<label
									htmlFor={yearId}
									className="mb-2 block font-medium text-gray-700 text-sm"
								>
									筑波大学入学年度 <span className="text-red-500">*</span>
								</label>
								<Input
									id={yearId}
									type="number"
									placeholder="例: 2025"
									min="2000"
									className="w-full"
									value={year}
									onChange={(e) => setYear(e.target.value)}
								/>
								<p className="mt-1 text-gray-500 text-xs">
									あなたが筑波大学に入学した年度を入力してください
								</p>
							</div>

							<div>
								<label
									htmlFor={statusId}
									className="mb-2 block font-medium text-gray-700 text-sm"
								>
									珈琲・俺ステータス <span className="text-red-500">*</span>
								</label>
								<Select value={status} onValueChange={setStatus}>
									<SelectTrigger id={statusId} className="w-full">
										<SelectValue placeholder="ステータスを選択してください" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="first-trainee">
											<div className="flex flex-col items-start">
												<span className="font-medium">1年目練習生</span>
											</div>
										</SelectItem>
										<SelectItem value="second-trainee">
											<div className="flex flex-col items-start">
												<span className="font-medium">2年目練習生</span>
											</div>
										</SelectItem>
										<SelectItem value="first-examiner">
											<div className="flex flex-col items-start">
												<span className="font-medium">1年目試験官</span>
											</div>
										</SelectItem>
										<SelectItem value="second-examiner">
											<div className="flex flex-col items-start">
												<span className="font-medium">2年目試験官</span>
											</div>
										</SelectItem>
									</SelectContent>
								</Select>
								<p className="mt-1 text-gray-500 text-xs">
									現在の珈琲・俺での役割を選択してください
								</p>
							</div>
						</div>
					</div>
					{/* エラーメッセージ */}
					{error && (
						<div className="mb-4 rounded-lg bg-red-50 p-3">
							<p className={`text-red-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
								{error}
							</p>
						</div>
					)}
					{/* プロフィール作成ボタン */}
					<button
						type="button"
						onClick={handleCreateProfile}
						disabled={isCreating}
						className={`w-full rounded-lg bg-blue-600 px-4 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${
							isMobile ? 'py-2.5 text-sm' : 'py-3 text-base'
						}`}
					>
						{isCreating ? (
							<span className="flex items-center justify-center">
								<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
								プロフィール作成中...
							</span>
						) : (
							'プロフィールを作成'
						)}
					</button>
					{/* ログアウトボタン */}
					<div className="mt-4 text-center">
						<button
							type="button"
							onClick={() => {
								// ログアウト処理（Firebase Auth）
								import('../../lib/firebase').then(({ logOut }) => logOut());
							}}
							className="text-gray-500 text-sm hover:text-gray-700"
						>
							別のアカウントでログイン
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
