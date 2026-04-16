import { useState } from 'react';
import { logOut } from '../lib/firebase';
import styles from './logout-button.module.scss';

interface LogoutButtonProps {
	className?: string;
	size?: 'sm' | 'md' | 'lg';
	variant?: 'danger' | 'outline';
}

export function LogoutButton({
	className = '',
	size = 'md',
	variant = 'danger',
}: LogoutButtonProps) {
	const [loading, setLoading] = useState(false);

	const handleLogout = async () => {
		try {
			setLoading(true);
			await logOut();
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			setLoading(false);
		}
	};

	// サイズに応じたクラス
	const sizeClasses = {
		sm: styles.sizeSm,
		md: styles.sizeMd,
		lg: styles.sizeLg,
	};

	// バリアントに応じたクラス
	const variantClasses = {
		danger: styles.variantDanger,
		outline: styles.variantOutline,
	};

	return (
		<button
			type="button"
			onClick={handleLogout}
			disabled={loading}
			className={`${styles.buttonBase} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
		>
			{loading ? 'ログアウト中...' : 'ログアウト'}
		</button>
	);
}
