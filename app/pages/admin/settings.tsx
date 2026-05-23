import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { HomeButton } from '../../components/home-button';
import { useAuth } from '../../lib/auth-context';
import styles from './settings.module.scss';

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

				{/* ホームに戻るボタン */}
				<div className={styles.homeButtonWrap}>
					<HomeButton />
				</div>
			</div>
		</div>
	);
}
