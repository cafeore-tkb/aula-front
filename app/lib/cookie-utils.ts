/**
 * Cookie操作のユーティリティ関数
 */

// Cookie設定のオプション
interface CookieOptions {
	expires?: Date;
	maxAge?: number;
	path?: string;
	domain?: string;
	secure?: boolean;
	httpOnly?: boolean;
	sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Cookieを設定する
 */
export function setCookie(
	name: string,
	value: string,
	options: CookieOptions = {},
) {
	let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

	if (options.expires) {
		cookieString += `; expires=${options.expires.toUTCString()}`;
	}

	if (options.maxAge) {
		cookieString += `; max-age=${options.maxAge}`;
	}

	if (options.path) {
		cookieString += `; path=${options.path}`;
	}

	if (options.domain) {
		cookieString += `; domain=${options.domain}`;
	}

	if (options.secure) {
		cookieString += '; secure';
	}

	if (options.httpOnly) {
		cookieString += '; httponly';
	}

	if (options.sameSite) {
		cookieString += `; samesite=${options.sameSite}`;
	}

	// biome-ignore lint: Cookie設定のための標準的なブラウザAPI
	document.cookie = cookieString;
}

/**
 * Cookieを取得する
 */
export function getCookie(name: string): string | null {
	const nameEQ = `${encodeURIComponent(name)}=`;
	const cookies = document.cookie.split(';');

	for (let cookie of cookies) {
		cookie = cookie.trim();
		if (cookie.indexOf(nameEQ) === 0) {
			return decodeURIComponent(cookie.substring(nameEQ.length));
		}
	}

	return null;
}

/**
 * Cookieを削除する
 */
export function deleteCookie(name: string, path: string = '/') {
	setCookie(name, '', {
		expires: new Date(0),
		path: path,
	});
}

/**
 * 認証セッションをCookieに保存する（30分有効）
 */
export function saveAuthSession(user: {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
}) {
	const sessionData = {
		uid: user.uid,
		email: user.email,
		displayName: user.displayName,
		photoURL: user.photoURL,
		timestamp: Date.now(),
	};

	// 30分 = 30 * 60 秒
	const thirtyMinutes = 30 * 60;

	setCookie('auth_session', JSON.stringify(sessionData), {
		maxAge: thirtyMinutes,
		path: '/',
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
	});
}

/**
 * CookieからAuthセッション情報を取得する
 */
export function getAuthSession(): {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
	timestamp: number;
} | null {
	const sessionCookie = getCookie('auth_session');

	if (!sessionCookie) {
		return null;
	}

	try {
		const sessionData = JSON.parse(sessionCookie);

		// セッションが30分以内かチェック
		const thirtyMinutes = 30 * 60 * 1000; // ミリ秒
		const now = Date.now();

		if (now - sessionData.timestamp > thirtyMinutes) {
			// セッション期限切れの場合、Cookieを削除
			deleteCookie('auth_session');
			return null;
		}

		return sessionData;
	} catch (error) {
		console.error('Auth session cookie parsing error:', error);
		deleteCookie('auth_session');
		return null;
	}
}

/**
 * Authセッションを削除する
 */
export function clearAuthSession() {
	deleteCookie('auth_session');
}

/**
 * セッションが有効かチェックする
 */
export function isSessionValid(): boolean {
	return getAuthSession() !== null;
}
