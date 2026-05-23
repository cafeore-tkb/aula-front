import { useState, useId } from 'react';
import {
	loginExistingUser,
	registerWithGoogle,
	signInWithGoogle,
} from '../lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import styles from './login-page.module.scss';

const GoogleIcon = () => (
	<svg className={styles.googleIcon} viewBox="0 0 48 48">
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
	const [registrationPassword, setRegistrationPassword] = useState('');
	const passwordInputId = useId();

	const handleGoogleAuth = async (isRegistration = false) => {
		try {
			setLoading(true);
			setError(null);

			if (isRegistration) {
				// 新規登録時は秘密のパスワードを確認
				const envPassword = import.meta.env.VITE_REGISTRATION_PASSWORD;

				if (!envPassword) {
					setError('新規登録は現在無効になっています。管理者にお問い合わせください。');
					setLoading(false);
					return;
				}

				if (registrationPassword !== envPassword) {
					setError('秘密のパスワードが正しくありません。');
					setLoading(false);
					return;
				}

				// 新規登録処理（Google認証のみ、Firestoreへの書き込みはcreate-profileページで行う）
				const result = await registerWithGoogle();
				if (result?.user) {
					console.log('Google認証完了、プロフィール作成画面へリダイレクト');
					// auth-contextが自動的にcreate-profileにリダイレクトする
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
		<div className={styles.wrapper}>
			<div className={styles.container}>
				<Tabs defaultValue="login" className={styles.tabs}>
					<div className={styles.header}>
						<h2 className={styles.title}>アカウント認証</h2>
						<p className={styles.subtitle}>
							Googleアカウントで認証してください
						</p>
					</div>

					<TabsList className={styles.tabsList}>
						<TabsTrigger value="login">ログイン</TabsTrigger>
						<TabsTrigger value="register">新規登録</TabsTrigger>
					</TabsList>

					<TabsContent value="login" className={styles.tabsContent}>
						{error && (
							<div className={styles.errorBox}>
								{error}
							</div>
						)}

						<button
							type="button"
							onClick={() => handleGoogleAuth(false)}
							disabled={loading}
							className={styles.loginButton}
						>
							{loading ? (
								<div className={styles.buttonContent}>
									<div className={styles.spinner} />
									ログイン中...
								</div>
							) : (
								<div className={styles.buttonContent}>
									<GoogleIcon />
									Googleでログイン
								</div>
							)}
						</button>

						<div className={styles.guideText}>
							<p>
								まだアカウントをお持ちでない方は、
								<br />
								上の「新規登録」タブをクリックしてください
							</p>
						</div>
					</TabsContent>

					<TabsContent value="register" className={styles.tabsContent}>
						{error && (
							<div className={styles.errorBox}>
								{error}
							</div>
						)}

						<div className={styles.formArea}>
							<div>
								<label
									htmlFor={passwordInputId}
									className={styles.label}
								>
									秘密のパスワード
								</label>
								<input
									id={passwordInputId}
									type="password"
									value={registrationPassword}
									onChange={(e) => setRegistrationPassword(e.target.value)}
									placeholder="新規登録用の秘密のパスワードを入力"
									className={styles.passwordInput}
									disabled={loading}
								/>
								<p className={styles.passwordHelp}>
									新規登録には管理者から提供された秘密のパスワードが必要です
								</p>
							</div>

							<button
								type="button"
								onClick={() => handleGoogleAuth(true)}
								disabled={loading || !registrationPassword.trim()}
								className={styles.registerButton}
							>
								{loading ? (
									<div className={styles.buttonContent}>
										<div className={styles.spinner} />
										登録中...
									</div>
								) : (
									<div className={styles.buttonContent}>
										<GoogleIcon />
										Googleで新規登録
									</div>
								)}
							</button>
						</div>

						<div className={styles.guideText}>
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
