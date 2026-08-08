import { redirectToAccessLogin } from '../lib/api';
import styles from './login-page.module.scss';

const GoogleIcon = () => (
	<svg className={styles.googleIcon} viewBox="0 0 48 48" aria-hidden="true">
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
			d="M11.69 28.18c-.43-1.32-.68-2.72-.68-4.18s.25-2.86.68-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
		/>
		<path
			fill="#EA4335"
			d="M24 9.5c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.89 29.93 1 24 1 15.4 1 7.96 5.93 4.34 14.12l7.35 5.7C13.42 13.37 18.27 9.5 24 9.5z"
		/>
	</svg>
);

export function LoginPage() {
	return (
		<div className={styles.wrapper}>
			<div className={styles.container}>
				<div className={styles.header}>
					<h2 className={styles.title}>ログインが必要です</h2>
					<p className={styles.subtitle}>
						Cloudflare Accessで許可されたGoogleアカウントを使用してください
					</p>
				</div>
				<div className={styles.tabsContent}>
					<button
						type="button"
						onClick={() => redirectToAccessLogin('/dashboard')}
						className={styles.loginButton}
					>
						<span className={styles.buttonContent}>
							<GoogleIcon />
							Googleでログイン
						</span>
					</button>
					<p className={styles.guideText}>
						初回ログイン後にプロフィール作成画面が表示されます。
					</p>
				</div>
			</div>
		</div>
	);
}
