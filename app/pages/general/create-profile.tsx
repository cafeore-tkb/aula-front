import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth-context';
import { createUserProfile } from '../../lib/firebase';

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
				navigate('/');
				return;
			}
		}
	}, [user, userProfile, loading, navigate]);

	const handleCreateProfile = async () => {
		if (!user) return;

		try {
			setIsCreating(true);
			setError(null);

			// Firebase関数を使用してプロフィールを作成
			await createUserProfile(user);

			// プロフィールを再読み込み
			await refreshProfile();

			// ホームページにリダイレクト
			navigate('/');
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
		return null;
	}

	return (
		<div className="min-h-screen bg-gray-100 py-8">
			<div className="mx-auto max-w-md px-4">
				<div className="rounded-lg bg-white p-8 shadow-md">
					<div className="mb-6 text-center">
						<h1 className="mb-2 font-bold text-2xl text-gray-900">
							プロフィール作成
						</h1>
						<p className="text-gray-600 text-sm">
							アカウントのセットアップを完了してください
						</p>
					</div>

					{/* ユーザー情報の表示 */}
					<div className="mb-6">
						<div className="flex items-center space-x-4">
							{user.photoURL && (
								<img
									src={user.photoURL}
									alt={user.displayName || 'ユーザー'}
									className="h-12 w-12 rounded-full"
								/>
							)}
							<div className="flex-1">
								<h3 className="font-semibold text-gray-900">
									{user.displayName || 'ユーザー'}
								</h3>
								<p className="text-gray-600 text-sm">{user.email}</p>
							</div>
						</div>
					</div>

					{/* エラーメッセージ */}
					{error && (
						<div className="mb-4 rounded-lg bg-red-50 p-3">
							<p className="text-red-600 text-sm">{error}</p>
						</div>
					)}

					{/* 説明文 */}
					<div className="mb-6">
						<p className="text-gray-700 text-sm">
							Aulaサービスを利用するには、プロフィール情報の登録が必要です。
							下のボタンをクリックして、アカウントのセットアップを完了してください。
						</p>
					</div>

					{/* プロフィール作成ボタン */}
					<button
						type="button"
						onClick={handleCreateProfile}
						disabled={isCreating}
						className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
