import { useNavigate } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { useEffect } from 'react';

export function meta() {
	return [
		{ title: 'Aula - ホーム' },
		{ name: 'description', content: 'Aulaのホームページ' },
	];
}

export async function loader() {
	return null;
}

export default function Home() {
	const { user, loading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!loading) {
			if (user) {
				// ログイン済みの場合はダッシュボードへ
				navigate('/dashboard');
			} else {
				// 未ログインの場合はログインページへ
				navigate('/login');
			}
		}
	}, [user, loading, navigate]);

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
