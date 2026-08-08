import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import {
	ApiError,
	type AuthUser,
	getAuthSession,
	getMyProfile,
	redirectToAccessLogout,
	type UserProfile,
} from './api';

interface AuthContextType {
	user: AuthUser | null;
	userProfile: UserProfile | null;
	loading: boolean;
	sessionExpired: boolean;
	needsProfile: boolean;
	refreshProfile: () => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [sessionExpired, setSessionExpired] = useState(false);
	const [needsProfile, setNeedsProfile] = useState(false);

	const refreshProfile = useCallback(async () => {
		try {
			const profile = await getMyProfile();
			setUserProfile(profile);
			setUser((current) =>
				current
					? {
							...current,
							uid: profile.userId,
							displayName: profile.displayName,
							photoURL: profile.photoUrl,
						}
					: current,
			);
			setNeedsProfile(false);
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) {
				setUserProfile(null);
				setNeedsProfile(true);
				return;
			}
			throw error;
		}
	}, []);

	useEffect(() => {
		let active = true;
		const initialize = async () => {
			try {
				const result = await getAuthSession();
				if (!active) return;
				setUser(result.user);
				setUserProfile(result.profile);
				setNeedsProfile(result.session.authenticated && !result.session.hasProfile);
				setSessionExpired(false);
			} catch (error) {
				if (!active) return;
				if (error instanceof ApiError && error.status === 401) {
					setUser(null);
					setUserProfile(null);
					setNeedsProfile(false);
					setSessionExpired(true);
				} else {
					console.error('Failed to initialize Access session:', error);
					setUser(null);
					setUserProfile(null);
				}
			} finally {
				if (active) setLoading(false);
			}
		};
		void initialize();
		return () => {
			active = false;
		};
	}, []);

	const signOut = async () => {
		setUser(null);
		setUserProfile(null);
		redirectToAccessLogout();
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				userProfile,
				loading,
				sessionExpired,
				needsProfile,
				refreshProfile,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}
