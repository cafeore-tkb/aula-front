import { useEffect } from 'react';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router';
import { HomeButton } from '../../components/home-button';
import { useAuth } from '../../lib/auth-context';
import styles from './admin.module.scss';

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
				navigate('/dashboard');
				return;
			}
		}
	}, [user, userProfile, loading, navigate]);

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
					<h1 className={styles.title}>管理者ページ</h1>
					<div className={styles.userMeta}>
						<span className={styles.badge}>
							管理者
						</span>
						<span className={styles.userName}>
							{userProfile.name || user.displayName || 'ユーザー'}
						</span>
					</div>
				</div>

				<div className={styles.cardsGrid}>
					{/* ユーザー管理 */}
					<div className={styles.card}>
						<div className={styles.cardHeader}>
							<Users className={`${styles.cardIcon} ${styles.iconBlue}`} aria-label="ユーザー管理" />
							<h2 className={styles.cardTitle}>ユーザー管理</h2>
						</div>
						<p className={styles.cardText}>
							ユーザーの権限管理やメンバーの編集を行います。
						</p>
						<button
							type="button"
							onClick={() => navigate('/admin/member')}
							className={`${styles.actionButton} ${styles.actionButtonBlue}`}
						>
							ユーザー一覧
						</button>
					</div>

					{/* データ管理 */}
					<div className={styles.card}>
						<div className={styles.cardHeader}>
							<svg
								className={`${styles.cardIcon} ${styles.iconPurple}`}
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>シフト管理</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
								/>
							</svg>
							<h2 className={styles.cardTitle}>シフト管理</h2>
						</div>
						<p className={styles.cardText}>
							シフトの確認・管理を行います。
						</p>
						<button
							type="button"
							onClick={() => navigate('/admin/manageAdjustment')}
							className={`${styles.actionButton} ${styles.actionButtonPurple}`}
						>
							シフト一覧
						</button>
					</div>

					{/* システム設定 */}
					<div className={styles.card}>
						<div className={styles.cardHeader}>
							<svg
								className={`${styles.cardIcon} ${styles.iconGreen}`}
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
							<h2 className={styles.cardTitle}>システム設定</h2>
						</div>
						<p className={styles.cardText}>
							アプリケーションの設定や環境の管理を行います。
						</p>
						<button
							type="button"
							onClick={() => navigate('/admin/settings')}
							className={`${styles.actionButton} ${styles.actionButtonGreen}`}
						>
							設定管理
						</button>
					</div>
				</div>

				{/* ホームに戻るボタン */}
				<div className={styles.homeButtonWrap}>
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
