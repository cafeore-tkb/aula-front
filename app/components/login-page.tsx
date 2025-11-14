import { useState } from 'react';
import {
	loginExistingUser,
	registerNewUser,
	registerWithGoogle,
	signInWithGoogle,
} from '../lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const GoogleIcon = () => (
	<svg className="mr-2 h-5 w-5" viewBox="0 0 48 48">
		<title>Google</title>
		<path
			fill="#4285F4"
			d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
		/>
		<path
			fill="#34A853"
			d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
		/>
		<path
			fill="#FBBC05"
			d="M11.69 28.18c-.43-1.32-.68-2.72-.68-4.18s.25-2.86.68-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l5.35-5.7z"
		/>
		<path
			fill="#EA4335"
			d="M24 9.5c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.89 29.93 1 24 1 15.4 1 7.96 5.93 4.34 14.12l7.35 5.7C13.42 13.37 18.27 9.5 24 9.5z"
		/>
	</svg>
);

export function LoginPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
				<Tabs defaultValue="login" className="w-full">
					<div className="mb-6 text-center">
						<h2 className="mt-6 font-bold text-3xl text-gray-900">アカウント認証</h2>
						<p className="mt-2 text-gray-600 text-sm">
							Googleアカウントで認証してください
						</p>
					</div>

					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="login">ログイン</TabsTrigger>
						<TabsTrigger value="register">新規登録</TabsTrigger>
					</TabsList>

					<TabsContent value="login" className="mt-6 space-y-4">
						{error && (
							<div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
								{error}
							</div>
						)}

						<button
							type="button"
							onClick={() => handleGoogleAuth(false)}
							disabled={loading}
							className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-3 font-medium text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? (
								<div className="flex items-center">
									<div className="-ml-1 mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
									ログイン中...
								</div>
							) : (
								<div className="flex items-center">
									<GoogleIcon />
									Googleでログイン
								</div>
							)}
						</button>

						<div className="text-center text-gray-500 text-xs">
							<p>
								まだアカウントをお持ちでない方は、
								<br />
								上の「新規登録」タブをクリックしてください
							</p>
						</div>
					</TabsContent>

					<TabsContent value="register" className="mt-6 space-y-4">
						{error && (
							<div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
								{error}
							</div>
						)}

						<button
							type="button"
							onClick={() => handleGoogleAuth(true)}
							disabled={loading}
							className="group relative flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-3 font-medium text-sm text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? (
								<div className="flex items-center">
									<div className="-ml-1 mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
									登録中...
								</div>
							) : (
								<div className="flex items-center">
									<GoogleIcon />
									Googleで新規登録
								</div>
							)}
						</button>

						<div className="text-center text-gray-500 text-xs">
							<p>
								既にアカウントをお持ちの方は、
								<br />
								上の「ログイン」タブをクリックしてください
							</p>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
