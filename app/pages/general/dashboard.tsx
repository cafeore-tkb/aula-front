import { useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
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
	const { user, userProfile, loading, needsProfile } = useAuth();
	const navigate = useNavigate();

	// レスポンシブ対応
	const _isDesktop = useMediaQuery({ minWidth: 1024 }); // lg以上
	const _isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 }); // md-lg
	const isMobile = useMediaQuery({ maxWidth: 767 }); // md未満

	// 認証状態の読み込みが完了し、未ログインの場合はログインページにリダイレクト
	useEffect(() => {
		if (!loading) {
			console.log('Dashboard: user=', !!user, 'userProfile=', !!userProfile, 'needsProfile=', needsProfile);
			
			if (!user) {
				console.log('Dashboard: リダイレクト -> /login (未認証)');
				navigate('/login');
			} else if (needsProfile && !userProfile) {
				// プロフィールが必要な場合はプロフィール作成ページにリダイレクト
				console.log('Dashboard: リダイレクト -> /create-profile (プロフィール未作成)');
				navigate('/create-profile');
			} else {
				console.log('Dashboard: 表示OK');
			}
		}
	}, [user, loading, needsProfile, userProfile, navigate]);

	// ローディング中またはプロファイル読み込み中
	if (loading || (user && !userProfile)) {
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
			<div className="mx-auto max-w-6xl px-4">
				<h1 className={`mb-6 font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
					ホーム
				</h1>

				<div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-1 gap-6 md:grid-cols-3'}`}>
					{/* ユーザープロフィールカード */}
					<div className={`${isMobile ? 'space-y-6' : 'space-y-6 md:col-span-1'}`}>
						<UserProfile user={user} userProfile={userProfile} />
					</div>

					{/* メインコンテンツ */}
					<div className={`${isMobile ? 'space-y-4' : 'space-y-6 md:col-span-2'}`}>
						<div
							className={`rounded-lg bg-white shadow-md ${isMobile ? 'p-4' : 'p-6'}`}
						>
							<h3
								className={`mb-3 font-semibold text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}
							>
								クイックアクション
							</h3>
							<div
								className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 gap-3 sm:grid-cols-2'}`}
							>
								<Link
									to="/shiftList"
									className={`flex items-center gap-3 rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 ${isMobile ? 'p-3 text-sm' : 'p-3'}`}
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
									<span>調整画面</span>
								</Link>
								{userProfile?.isAdmin && (
									<Link
										to="/admin"
										className={`flex items-center gap-3 rounded-lg bg-red-50 text-red-600 transition-colors hover:bg-red-100 ${isMobile ? 'p-3 text-sm' : 'p-3'}`}
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
										<span>管理画面</span>
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
