import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { UserProfile } from '../../components/user-profile';
import { useAuth } from '../../lib/auth-context';

export function meta() {
	return [
		{ title: 'Aula - ホーム' },
		{ name: 'description', content: 'Aulaアプリケーションのホームページ' },
	];
}

export default function Home() {
	const { user, userProfile, loading } = useAuth();
	const navigate = useNavigate();

	// 認証状態の読み込みが完了し、未ログインの場合はログインページにリダイレクト
	useEffect(() => {
		if (!loading && !user) {
			navigate('/login');
		}
	}, [user, loading, navigate]);

	// ローディング中は何も表示しない
	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-100">
				<div className="text-center">
					<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
					<p className="text-gray-600">読み込み中...</p>
				</div>
			</div>
		);
	}

	// 未認証の場合は何も表示しない（リダイレクト処理中）
	if (!user) {
		return null;
	}

	// ログイン済みユーザーのダッシュボード
	return (
		<div className="min-h-screen bg-gray-100 py-8">
			<div className="mx-auto max-w-4xl px-4">
				<h1 className="mb-8 font-bold text-3xl text-gray-900">ダッシュボード</h1>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{/* ユーザープロフィールカード */}
					<div className="space-y-6 md:col-span-1">
						<UserProfile user={user} userProfile={userProfile} />
					</div>

					{/* メインコンテンツ */}
					<div className="space-y-6 md:col-span-2">
						<div className="rounded-lg bg-white p-6 shadow-md">
							<h2 className="mb-4 font-semibold text-gray-900 text-xl">
								ようこそ、{userProfile?.name || user?.displayName || 'ユーザー'}
								さん！
							</h2>
							<p className="text-gray-600">
								ここからサービスをご利用いただけます。プロフィールの編集や各種設定を行ってください。
							</p>
						</div>

						<div className="rounded-lg bg-white p-6 shadow-md">
							<h3 className="mb-3 font-semibold text-gray-900 text-lg">
								クイックアクション
							</h3>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<Link
									to="/adjustment"
									className="flex items-center gap-3 rounded-lg bg-blue-50 p-3 text-blue-600 transition-colors hover:bg-blue-100"
								>
									<svg
										className="h-5 w-5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>調整</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
										/>
									</svg>
									調整画面
								</Link>
								{userProfile?.isAdmin && (
									<Link
										to="/admin"
										className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-red-600 transition-colors hover:bg-red-100"
									>
										<svg
											className="h-5 w-5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<title>管理</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
											/>
										</svg>
										管理画面
									</Link>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
