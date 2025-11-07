import { Navigate, useLocation } from 'react-router';
import { LoginPage } from '../../components/login-page';
import { useAuth } from '../../lib/auth-context';

export function meta() {
	return [
		{ title: 'ログイン - React Router App' },
		{ name: 'description', content: 'ログインページ' },
	];
}

export default function Login() {
	const { user, loading } = useAuth();
	const location = useLocation();

	let from = '/adjustment';
	const state = location.state;
	if (state && typeof state === 'object') {
		if ('from' in state) {
			const maybeFrom = state.from;
			if (maybeFrom?.pathname) {
				from = maybeFrom.pathname;
			}
		}
	}

	// ローディング中
	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
					<p className="text-gray-600">読み込み中...</p>
				</div>
			</div>
		);
	}

	// すでにログイン済みの場合は元の場所へリダイレクト
	if (user) {
		return <Navigate to={from} replace />;
	}

	// 未認証の場合はログインページを表示（セッション期限切れ理由を表示可能に）
	return <LoginPage />;
}
