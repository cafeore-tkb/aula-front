import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth-context';

export function meta() {
	return [
		{ title: 'Aula - 管理画面' },
		{ name: 'description', content: '管理者向けの設定画面' },
	];
}

export default function Admin() {
	const { user, userProfile, loading } = useAuth();
	const navigate = useNavigate();

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
				navigate('/');
				return;
			}
		}
	}, [user, userProfile, loading, navigate]);

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
					<h1 className="font-bold text-3xl text-gray-900">管理者ページ</h1>
					<div className="flex items-center space-x-2">
						<span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-600 text-sm">
							管理者
						</span>
						<span className="text-gray-600 text-sm">
							{userProfile.name || user.displayName || 'ユーザー'}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
