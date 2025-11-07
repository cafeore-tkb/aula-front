import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import {
	clearAuthSession,
	getAuthSession,
	isSessionValid,
	saveAuthSession,
} from './cookie-utils';
import {
	getUserProfile,
	onAuthStateChange,
	type UserProfile,
} from './firebase';

interface AuthContextType {
	user: User | null;
	userProfile: UserProfile | null;
	loading: boolean;
	sessionExpired: boolean; // ★追加
	needsProfile: boolean;
	refreshProfile: () => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	userProfile: null,
	loading: true,
	sessionExpired: false,
	needsProfile: false,
	refreshProfile: async () => {},
	signOut: async () => {},
});

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

interface AuthProviderProps {
	children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useState<User | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [sessionExpired, setSessionExpired] = useState(false); // ★追加
	const [needsProfile, setNeedsProfile] = useState(false);

	const refreshProfile = async () => {
		if (user) {
			try {
				const profile = await getUserProfile(user.uid);
				setUserProfile(profile);
			} catch (error) {
				console.error('Error fetching user profile:', error);
			}
		}
	};

	const signOut = async () => {
		await clearAuthSession();
		setUser(null);
		setUserProfile(null);
	};

	// 初期化時にCookieからセッション復元を試行
	useEffect(() => {
		const initializeAuth = async () => {
			// まずCookieからセッション情報を確認
			const sessionData = getAuthSession();

			if (sessionData && isSessionValid()) {
				// Cookieが有効な場合、Firebase Authの状態変化を待つ
				console.log(
					'Valid session found in cookie, waiting for Firebase auth state...',
				);
			} else {
				// 無効なセッションの場合はCookieをクリアし、セッション期限切れフラグを立てる
				if (sessionData) {
					setSessionExpired(true);
				}
				clearAuthSession();
			}
		};

		initializeAuth();
	}, []);

	useEffect(() => {
		const unsubscribe = onAuthStateChange(async (user) => {
			setUser(user);

			if (user) {
				try {
					// ログイン成功時に期限切れフラグをリセット
					setSessionExpired(false);
					// ユーザーがログインした場合、Cookieにセッション情報を保存
					saveAuthSession({
						uid: user.uid,
						email: user.email,
						displayName: user.displayName,
						photoURL: user.photoURL,
					});

					// ユーザープロファイルを取得（存在しない場合は後で処理）
					const profile = await getUserProfile(user.uid);
					setUserProfile(profile);
					setNeedsProfile(false);
				} catch (error) {
					console.error('Error handling user profile:', error);
					// プロファイルが見つからない場合はnullのままにする
					setUserProfile(null);
					setNeedsProfile(true);
				}
			} else {
				// ユーザーがログアウトまたはセッション期限切れ場合
				clearAuthSession();
				setUserProfile(null);
			}

			setLoading(false);
		});

		return unsubscribe;
	}, []);

	const value = {
		user,
		userProfile,
		loading,
		sessionExpired, // ★追加
		needsProfile,
		refreshProfile,
		signOut,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
