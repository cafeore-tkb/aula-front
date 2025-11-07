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

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{/* ユーザー管理 */}
					<div className="rounded-lg bg-white p-6 shadow-md">
						<div className="mb-4 flex items-center">
							<svg
								className="mr-3 h-8 w-8 text-blue-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>ユーザー管理</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
								/>
							</svg>
							<h2 className="font-semibold text-gray-900 text-xl">ユーザー管理</h2>
						</div>
						<p className="mb-4 text-gray-600 text-sm">
							ユーザーの権限管理や情報の編集を行います。
						</p>
						<button
							type="button"
							className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
						>
							ユーザー一覧
						</button>
					</div>

					{/* システム設定 */}
					<div className="rounded-lg bg-white p-6 shadow-md">
						<div className="mb-4 flex items-center">
							<svg
								className="mr-3 h-8 w-8 text-green-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>システム設定</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							<h2 className="font-semibold text-gray-900 text-xl">システム設定</h2>
						</div>
						<p className="mb-4 text-gray-600 text-sm">
							アプリケーションの設定や環境の管理を行います。
						</p>
						<button
							type="button"
							className="w-full rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
						>
							設定管理
						</button>
					</div>

					{/* データ管理 */}
					<div className="rounded-lg bg-white p-6 shadow-md">
						<div className="mb-4 flex items-center">
							<svg
								className="mr-3 h-8 w-8 text-purple-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>データ管理</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
								/>
							</svg>
							<h2 className="font-semibold text-gray-900 text-xl">データ管理</h2>
						</div>
						<p className="mb-4 text-gray-600 text-sm">
							スケジュールデータやログの確認・管理を行います。
						</p>
						<button
							type="button"
							className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
						>
							データ一覧
						</button>
					</div>
				</div>

				{/* ホームに戻るボタン */}
				<div className="mt-8">
					<button
						type="button"
						onClick={() => navigate('/')}
						className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
					>
						<svg
							className="h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>戻る</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						<span>ホームに戻る</span>
					</button>
				</div>
			</div>
		</div>
	);
}
