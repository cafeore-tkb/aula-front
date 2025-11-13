import { initializeApp } from 'firebase/app';
import {
	GoogleAuthProvider,
	getAuth,
	onAuthStateChanged,
	signInWithPopup,
	signOut,
	type User,
} from 'firebase/auth';
import {
	doc,
	getDoc,
	getFirestore,
	serverTimestamp,
	setDoc,
	type Timestamp,
	updateDoc,
} from 'firebase/firestore';
import { clearAuthSession } from './cookie-utils';

// User profile interface
export interface UserProfile {
	uid: string;
	gmail: string;
	name: string;
	isAdmin: boolean;
	isExaminer: boolean;
	isFirstYear: boolean;
	isGraduated: boolean;
	year: number;
	photoURL?: string;
	createdAt: Timestamp;
	updatedAt: Timestamp;
	lastLoginAt: Timestamp;
}

// Firebase configuration
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'your-api-key',
	authDomain:
		import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
	storageBucket:
		import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
	messagingSenderId:
		import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
	appId: import.meta.env.VITE_FIREBASE_APP_ID || 'your-app-id',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithGoogle = async () => {
	if (typeof window === 'undefined') {
		throw new Error('This function can only be called on the client side');
	}

	try {
		console.log('Google Sign In 開始...');
		const result = await signInWithPopup(auth, googleProvider);

		console.log('Google認証完了:', result.user?.email);
		console.log(
			'認証後のAuth State:',
			auth.currentUser ? 'Authenticated' : 'Not Authenticated',
		);

		// Firebase認証が完了するまで少し待つ
		await new Promise((resolve) => setTimeout(resolve, 100));

		// ユーザーが存在しない場合はエラー
		if (result.user) {
			try {
				const exists = await checkUserExists(result.user.uid);
				if (!exists) {
					console.log('ユーザーが存在しません。ログアウトします。');
					await auth.signOut();
					throw new Error(
						'このユーザーは登録されていません。新規登録を行ってください。',
					);
				}
			} catch (error) {
				console.error('User existence check error:', error);
				await auth.signOut();
				throw error;
			}
		}

		return result;
	} catch (error) {
		console.error('Google Sign In error:', error);

		// 特定のエラーハンドリング
		if (error instanceof Error) {
			if (error.message.includes('auth/unauthorized-domain')) {
				throw new Error(
					'認証ドメインが許可されていません。Firebase Console で localhost:5175 を認証済みドメインに追加してください。',
				);
			}
		}

		throw error;
	}
};

export const registerWithGoogle = async () => {
	if (typeof window === 'undefined') {
		throw new Error('This function can only be called on the client side');
	}

	try {
		console.log('Google Register 開始...');
		const result = await signInWithPopup(auth, googleProvider);

		console.log('Google認証完了:', result.user?.email);
		console.log(
			'認証後のAuth State:',
			auth.currentUser ? 'Authenticated' : 'Not Authenticated',
		);

		await new Promise((resolve) => setTimeout(resolve, 100));

		if (result.user) {
			try {
				const exists = await checkUserExists(result.user.uid);
				if (exists) {
					console.log('ユーザーが既に存在します。ログアウトします。');
					await auth.signOut();
					throw new Error(
						'このユーザーは既に登録されています。ログインを行ってください。',
					);
				}
			} catch (error) {
				console.error('User existence check error:', error);
				console.log('存在チェックエラーのため新規登録として続行');
			}
		}

		return result;
	} catch (error) {
		console.error('Google Register error:', error);

		// 特定のエラーハンドリング
		if (error instanceof Error) {
			if (error.message.includes('auth/unauthorized-domain')) {
				throw new Error(
					'認証ドメインが許可されていません。Firebase Console で localhost:5175 を認証済みドメインに追加してください。',
				);
			}
		}

		throw error;
	}
};

export const logOut = async () => {
	await signOut(auth);
	clearAuthSession();
};

export const onAuthStateChange = (callback: (user: User | null) => void) =>
	onAuthStateChanged(auth, callback);

// Firestore functions
export const checkUserExists = async (uid: string): Promise<boolean> => {
	console.log('ユーザー存在チェック:', uid);
	console.log(
		'Current Auth State:',
		auth.currentUser ? 'Authenticated' : 'Not Authenticated',
	);

	try {
		const userDocRef = doc(db, 'users', uid);
		const userDoc = await getDoc(userDocRef);
		const exists = userDoc.exists();

		console.log('ユーザー存在結果:', exists);
		return exists;
	} catch (error) {
		console.error('checkUserExists error:', error);
		throw error;
	}
};

export const registerNewUser = async (user: User): Promise<void> => {
	if (!user.email) {
		throw new Error('ユーザーのメールアドレスが取得できませんでした');
	}

	console.log(`新規ユーザー登録中: ${user.email} (UID: ${user.uid})`);
	console.log(
		'Firebase Auth State:',
		auth.currentUser ? 'Authenticated' : 'Not Authenticated',
	);
	console.log('User UID:', user.uid);

	const userDocRef = doc(db, 'users', user.uid);

	try {
		const userDoc = await getDoc(userDocRef);

		if (userDoc.exists()) {
			throw new Error('このユーザーは既に登録されています');
		}
	} catch (error) {
		console.error('Error checking user existence:', error);
	}

	const userData: Omit<UserProfile, 'uid'> = {
		gmail: user.email,
		name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
		isAdmin: false,
		isExaminer: false,
		isFirstYear: true,
		isGraduated: false,
		year: new Date().getFullYear(),
		photoURL: user.photoURL || '',
		createdAt: serverTimestamp() as Timestamp,
		updatedAt: serverTimestamp() as Timestamp,
		lastLoginAt: serverTimestamp() as Timestamp,
	};

	try {
		await setDoc(userDocRef, userData);
		console.log(`新規ユーザー登録完了: ${user.email}`);
	} catch (error) {
		console.error('Firestore write error:', error);
		throw new Error(
			`Firestoreへの書き込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
};

export const loginExistingUser = async (user: User): Promise<void> => {
	if (!user.email) {
		throw new Error('ユーザーのメールアドレスが取得できませんでした');
	}

	console.log(`既存ユーザーログイン: ${user.email} (UID: ${user.uid})`);
	console.log(
		'Firebase Auth State:',
		auth.currentUser ? 'Authenticated' : 'Not Authenticated',
	);
	console.log('User UID:', user.uid);

	const userDocRef = doc(db, 'users', user.uid);

	try {
		const userDoc = await getDoc(userDocRef);

		if (!userDoc.exists()) {
			throw new Error(
				'このユーザーは登録されていません。新規登録を行ってください。',
			);
		}

		await updateDoc(userDocRef, {
			lastLoginAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});

		console.log(`ログイン時刻更新完了: ${user.email}`);
	} catch (error) {
		console.error('Firestore operation error:', error);
		throw new Error(
			`Firestoreの操作に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
};

export const createUserProfile = async (user: User): Promise<void> => {
	if (!user.email) return;

	const userExists = await checkUserExists(user.uid);

	if (!userExists) {
		await registerNewUser(user);
	} else {
		await loginExistingUser(user);
	}
};

export const createUserProfileWithData = async (
	user: User,
	profileData: {
		displayName: string;
		year: number;
		status: string;
	},
): Promise<void> => {
	if (!user.email) {
		throw new Error('ユーザーのメールアドレスが取得できませんでした');
	}

	console.log(`新規ユーザー登録中: ${user.email} (UID: ${user.uid})`);

	const userDocRef = doc(db, 'users', user.uid);

	// ステータスから各フラグを判定
	const isFirstYear = profileData.status.includes('first');
	const isExaminer = profileData.status.includes('examiner');

	const userData: Omit<UserProfile, 'uid'> = {
		gmail: user.email,
		name: profileData.displayName,
		isAdmin: false,
		isExaminer: isExaminer,
		isFirstYear: isFirstYear,
		isGraduated: false,
		year: profileData.year,
		photoURL: user.photoURL || '',
		createdAt: serverTimestamp() as Timestamp,
		updatedAt: serverTimestamp() as Timestamp,
		lastLoginAt: serverTimestamp() as Timestamp,
	};

	try {
		await setDoc(userDocRef, userData);
		console.log('ユーザープロフィールが正常に作成されました');
	} catch (error) {
		console.error('Error creating user profile:', error);
		throw new Error('プロフィールの作成に失敗しました');
	}
};

export const getUserProfile = async (
	uid: string,
): Promise<UserProfile | null> => {
	const userDocRef = doc(db, 'users', uid);
	const userDoc = await getDoc(userDocRef);

	if (userDoc.exists()) {
		return { uid, ...userDoc.data() } as UserProfile;
	}
	return null;
};

export const updateUserProfile = async (
	uid: string,
	updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>,
): Promise<void> => {
	const userDocRef = doc(db, 'users', uid);
	await updateDoc(userDocRef, {
		...updates,
		updatedAt: serverTimestamp(),
	});
};
