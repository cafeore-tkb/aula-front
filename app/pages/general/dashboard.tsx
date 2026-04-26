import { useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import { Link, useNavigate } from 'react-router';
import { UserProfile } from '../../components/user-profile';
import { useAuth } from '../../lib/auth-context';
import styles from './dashboard.module.scss';

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
			<div className={"common-loading-wrap"}>
				<div className={"common-loading-inner"}>
					<div className={"common-loading-spinner-blue"}></div>
					<p className={"common-loading-text"}>読み込み中...</p>
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
		<div className={styles.dashboardPage}>
			<div className={styles.dashboardContainer}>
				<h1 className={`${styles.dashboardTitle} ${isMobile ? styles.dashboardTitleMobile : styles.dashboardTitleDesktop}`}>
					ホーム
				</h1>

				<div className={`${styles.dashboardGrid} ${isMobile ? styles.dashboardGridMobile : styles.dashboardGridDesktop}`}>
					{/* ユーザープロフィールカード */}
					<div className={`${styles.profileColumn} ${isMobile ? styles.profileColumnMobile : styles.profileColumnDesktop}`}>
						<UserProfile user={user} userProfile={userProfile} />
					</div>

					{/* メインコンテンツ */}
					<div className={`${styles.mainColumn} ${isMobile ? styles.mainColumnMobile : styles.mainColumnDesktop}`}>
						<div
							className={`${styles.quickActionCard} ${isMobile ? styles.quickActionCardMobile : styles.quickActionCardDesktop}`}
						>
							<h3
								className={`${styles.quickActionTitle} ${isMobile ? styles.quickActionTitleMobile : styles.quickActionTitleDesktop}`}
							>
								クイックアクション
							</h3>
							<div
								className={`${styles.quickActionGrid} ${isMobile ? styles.quickActionGridMobile : styles.quickActionGridDesktop}`}
							>
								<Link
									to="/shiftList"
									className={`${styles.actionLink} ${styles.actionLinkBlue} ${isMobile ? styles.actionLinkMobile : styles.actionLinkDesktop}`}
								>
									<svg
										className={styles.actionIcon}
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
										className={`${styles.actionLink} ${styles.actionLinkRed} ${isMobile ? styles.actionLinkMobile : styles.actionLinkDesktop}`}
									>
										<svg
											className={styles.actionIcon}
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
