import { useNavigate } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { useEffect } from 'react';

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
		<div className="flex min-h-screen items-center justify-center bg-gray-100">
			<div className="text-center">
				<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
				<p className="text-gray-600">読み込み中...</p>
			</div>
		</div>
	);
}
