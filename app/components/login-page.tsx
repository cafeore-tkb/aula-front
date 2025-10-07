import { useState } from 'react';
import {
	loginExistingUser,
	registerNewUser,
	registerWithGoogle,
	signInWithGoogle,
} from '../lib/firebase';

const GoogleIcon = () => (
	<svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
		<title>Google logo</title>
		<path
			fill="currentColor"
			d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
		/>
		<path
			fill="currentColor"
			d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
		/>
		<path
			fill="currentColor"
			d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
		/>
		<path
			fill="currentColor"
			d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
		/>
	</svg>
);

export function LoginPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<'login' | 'register'>('login');

	const handleGoogleAuth = async (isRegistration = false) => {
		try {
			setLoading(true);
			setError(null);

			if (isRegistration) {
				// 新規登録処理
				const result = await registerWithGoogle();
				if (result?.user) {
					// Firestoreにユーザーを登録
					await registerNewUser(result.user);
				}
			} else {
				// ログイン処理
				const result = await signInWithGoogle();
				if (result?.user) {
					// 最終ログイン時刻を更新
					await loginExistingUser(result.user);
				}
			}
		} catch (error) {
			console.error('Authentication error:', error);

			// エラーメッセージをより詳細に
			if (error instanceof Error) {
				if (error.message.includes('既に登録されています')) {
					setError(
						'このGoogleアカウントは既に登録されています。ログインタブをお使いください。',
					);
				} else if (error.message.includes('登録されていません')) {
					setError(
						'このGoogleアカウントは登録されていません。新規登録タブをお使いください。',
					);
				} else {
					setError(
						isRegistration
							? '新規登録に失敗しました。もう一度お試しください。'
							: 'ログインに失敗しました。もう一度お試しください。',
					);
				}
			} else {
				setError(
					isRegistration
						? '新規登録に失敗しました。もう一度お試しください。'
						: 'ログインに失敗しました。もう一度お試しください。',
				);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-md space-y-8 p-8">
				<div className="text-center">
					<h2 className="mt-6 font-bold text-3xl text-gray-900">
						{mode === 'login' ? 'ログイン' : '新規登録'}
					</h2>
					<p className="mt-2 text-gray-600 text-sm">
						{mode === 'login'
							? 'Googleアカウントでログインしてください'
							: '新しいアカウントを作成してください'}
					</p>
				</div>

				{/* タブ切り替え */}
				<div className="flex rounded-lg border border-gray-200 bg-gray-100 p-1">
					<button
						type="button"
						onClick={() => setMode('login')}
						className={`w-1/2 rounded-md py-2 font-medium text-sm transition-all ${
							mode === 'login'
								? 'bg-white text-gray-900 shadow-sm'
								: 'text-gray-500 hover:text-gray-700'
						}`}
					>
						ログイン
					</button>
					<button
						type="button"
						onClick={() => setMode('register')}
						className={`w-1/2 rounded-md py-2 font-medium text-sm transition-all ${
							mode === 'register'
								? 'bg-white text-gray-900 shadow-sm'
								: 'text-gray-500 hover:text-gray-700'
						}`}
					>
						新規登録
					</button>
				</div>

				<div className="space-y-4">
					{error && (
						<div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
							{error}
						</div>
					)}

					<button
						type="button"
						onClick={() => handleGoogleAuth(mode === 'register')}
						disabled={loading}
						className={`group relative flex w-full justify-center rounded-md border border-transparent px-4 py-3 font-medium text-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
							mode === 'login'
								? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
								: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
						}`}
					>
						{loading ? (
							<div className="flex items-center">
								<div className="-ml-1 mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
								{mode === 'login' ? 'ログイン中...' : '登録中...'}
							</div>
						) : (
							<div className="flex items-center">
								<GoogleIcon />
								{mode === 'login' ? 'Googleでログイン' : 'Googleで新規登録'}
							</div>
						)}
					</button>

					{/* 説明文 */}
					<div className="text-center text-gray-500 text-xs">
						{mode === 'login' ? (
							<p>
								まだアカウントをお持ちでない方は、
								<br />
								上の「新規登録」タブをクリックしてください
							</p>
						) : (
							<p>
								既にアカウントをお持ちの方は、
								<br />
								上の「ログイン」タブをクリックしてください
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
