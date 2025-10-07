import { useState } from 'react';
import { logOut } from '../lib/firebase';

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
		sm: 'px-3 py-1.5 text-xs',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base',
	};

	// バリアントに応じたクラス
	const variantClasses = {
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
		outline:
			'border border-red-600 text-red-600 bg-white hover:bg-red-50 focus:ring-red-500',
	};

	const baseClasses =
		'w-full rounded-md font-medium focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors';

	return (
		<button
			type="button"
			onClick={handleLogout}
			disabled={loading}
			className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
		>
			{loading ? 'ログアウト中...' : 'ログアウト'}
		</button>
	);
}
