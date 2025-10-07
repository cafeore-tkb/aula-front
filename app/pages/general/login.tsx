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

	// ログイン後に戻るための遷移元 (location.state の型が不明なため型ガード)
	let from = '/adjustment';
	const state = location.state as unknown;
	if (state && typeof state === 'object') {
		if ('from' in state) {
			const maybeFrom = (state as { from?: { pathname?: string } }).from;
			if (maybeFrom?.pathname) {
				from = maybeFrom.pathname;
			}
		}
		// reason は今後の UI 表示用だが現時点では未使用のため無視
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
