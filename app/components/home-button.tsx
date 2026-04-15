import { useNavigate } from 'react-router';
import styles from './home-button.module.scss';

export function HomeButton() {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => navigate('/dashboard')}
			className={styles.button}
		>
			<svg
				className={styles.icon}
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<title>戻る</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			<span>ホームに戻る</span>
		</button>
	);
}
