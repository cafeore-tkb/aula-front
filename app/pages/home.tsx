import { useNavigate } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { useEffect } from 'react';
import styles from './general/general-pages.module.scss';

export function meta() {
	return [
		{ title: 'Aula - ホーム' },
		{ name: 'description', content: 'Aulaのホームページ' },
	];
}

export default function Home() {
	const { user, loading, needsProfile } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!loading) {
			console.log('Home: user=', !!user, 'needsProfile=', needsProfile);
			
			if (user) {
				// プロフィールが必要な場合はプロフィール作成ページへ
				if (needsProfile) {
					console.log('Home: リダイレクト -> /create-profile');
					navigate('/create-profile');
				} else {
					// ログイン済みの場合はダッシュボードへ
					console.log('Home: リダイレクト -> /dashboard');
					navigate('/dashboard');
				}
			} else {
				// 未ログインの場合はログインページへ
				console.log('Home: リダイレクト -> /login');
				navigate('/login');
			}
		}
	}, [user, loading, needsProfile, navigate]);

	// リダイレクト中の表示
	return (
		<div className={styles.loadingWrap}>
			<div className={styles.loadingInner}>
				<div className={styles.profileSpinner}></div>
				<p className={styles.loadingText}>読み込み中...</p>
			</div>
		</div>
	);
}
