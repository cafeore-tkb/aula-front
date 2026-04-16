import { useEffect, useId, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { useNavigate } from 'react-router';
import { Input } from '~/components/ui/input';
import { StatusSelecter } from '../../components/status-selecter';
import { useAuth } from '../../lib/auth-context';
import { createUserProfileWithData } from '../../lib/firebase';
import styles from './general-pages.module.scss';
export function meta() {
	return [
		{ title: 'プロフィール作成 - Aula' },
		{ name: 'description', content: 'プロフィール情報を設定してください' },
	];
}

export default function CreateProfile() {
	const { user, userProfile, loading, refreshProfile } = useAuth();
	const navigate = useNavigate();
	const [isCreating, setIsCreating] = useState(false);
	const [profileCreated, setProfileCreated] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const displayNameId = useId();
	const yearId = useId();
	const statusId = useId();

	// フォームの状態管理
	const [displayName, setDisplayName] = useState('');
	const [year, setYear] = useState('');
	const [status, setStatus] = useState('');

	// レスポンシブ対応: ブレークポイントの定義
	const isMobile = useMediaQuery({ maxWidth: 767 });
	const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
	const isDesktop = useMediaQuery({ minWidth: 1024 });

	// 認証状態をチェック
	useEffect(() => {
		if (!loading) {
			console.log('CreateProfile: user=', !!user, 'userProfile=', !!userProfile, 'profileCreated=', profileCreated);
			
			// 未ログインの場合はログインページにリダイレクト
			if (!user) {
				console.log('CreateProfile: リダイレクト -> /login (未認証)');
				navigate('/login');
				return;
			}

			// すでにプロフィールが存在する場合、またはプロフィールを作成した場合はホームにリダイレクト
			if (userProfile) {
				console.log('CreateProfile: リダイレクト -> /dashboard (プロフィール作成済み)');
				navigate('/dashboard');
				return;
			}
			
			console.log('CreateProfile: 表示OK');
		}
	}, [user, userProfile, loading, profileCreated, navigate]);

	const handleCreateProfile = async () => {
		if (!user) return;

		// バリデーション
		if (!displayName.trim()) {
			setError('表示名を入力してください');
			return;
		}
		if (!year || Number.parseInt(year, 10) < 2000) {
			setError('入学年度を正しく入力してください');
			return;
		}
		if (!status) {
			setError('珈琲・俺ステータスを選択してください');
			return;
		}

		try {
			setIsCreating(true);
			setError(null);

			console.log('CreateProfile: プロフィール作成開始');
			
			// Firebase関数を使用してプロフィールを作成
			await createUserProfileWithData(user, {
				displayName: displayName.trim(),
				year: Number.parseInt(year, 10),
				status: status,
			});

			console.log('CreateProfile: Firestoreへの書き込み完了');

			// プロフィールを再読み込み
			await refreshProfile();
			
			console.log('CreateProfile: プロフィール再読み込み完了');

			// プロフィール作成完了フラグを立てる
			setProfileCreated(true);
			
			console.log('CreateProfile: プロフィール作成完了、useEffectがリダイレクトを実行します');
			
			// useEffectでuserProfileが更新されたことを検知してリダイレクト
		} catch (error) {
			console.error('Error creating profile:', error);
			setError('プロフィールの作成に失敗しました。もう一度お試しください。');
		} finally {
			setIsCreating(false);
		}
	};

	// ローディング中の表示
	if (loading) {
		return (
			<div className={styles.loadingWrap}>
				<div className={styles.loadingInner}>
					<div className={styles.profileSpinner}></div>
					<p className={styles.loadingText}>プロフィール情報を確認中...</p>
				</div>
			</div>
		);
	}

	// 未認証の場合（リダイレクト処理中）
	if (!user) {
		return null;
	}

	// すでにプロフィールが存在する場合（リダイレクト処理中）
	if (userProfile) {
		return null;
	}

	return (
		<div className={styles.profilePage}>
			<div
				className={`${styles.profileContainer} ${
					isMobile ? styles.profileContainerMobile : isTablet ? styles.profileContainerTablet : styles.profileContainerDesktop
				}`}
			>
				<div className={styles.profileCard}>
					<div className={styles.profileHeader}>
						<h1
							className={`${styles.profileTitle} ${
								isMobile ? styles.profileTitleMobile : isTablet ? styles.profileTitleTablet : styles.profileTitleDesktop
							}`}
							style={{ fontFamily: 'var(--font-rounded)' }}
						>
							プロフィール作成
						</h1>
						<div
							className={`${styles.profileDescription} ${isMobile ? styles.profileDescriptionMobile : styles.profileDescriptionDesktop}`}
							style={{ fontFamily: 'var(--font-rounded)' }}
						>
							<p>Aulaサービスを利用するには、プロフィール情報の登録が必要です。</p>
							<p>
								下のボタンをクリックして、アカウントのセットアップを完了してください。
							</p>
						</div>
					</div>{' '}
					{/* ユーザー情報の表示 */}
					<div className={styles.profileUserSection}>
						<div
							className={`${styles.profileUserCard} ${
								isMobile ? styles.profileUserCardMobile : styles.profileUserCardDesktop
							}`}
						>
							{user.photoURL && (
								<img
									src={user.photoURL}
									alt={user.displayName || 'ユーザー'}
									className={isMobile ? styles.profileAvatarMobile : styles.profileAvatarDesktop}
								/>
							)}
							<div className={styles.profileUserInfo}>
								<h3
									className={`${styles.profileUserName} ${
										isMobile ? styles.profileUserNameMobile : styles.profileUserNameDesktop
									}`}
								>
									{user.displayName || 'ユーザー'}
								</h3>
								<p className={`${styles.profileUserEmail} ${isMobile ? styles.profileUserEmailMobile : styles.profileUserEmailDesktop}`}>
									{user.email}
								</p>
							</div>
						</div>

						{/* プロフィール入力フォーム */}
						<div className={isDesktop ? styles.profileFormGridDesktop : styles.profileFormStack}>
							<div>
								<label
									htmlFor={displayNameId}
									className={styles.profileLabel}
								>
									表示名 <span className={styles.profileRequired}>*</span>
								</label>
								<Input
									id={displayNameId}
									type="text"
									placeholder="例: 山田 太郎"
									className={styles.profileInputFull}
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
								/>
								<p className={styles.profileHelperText}>
									他のメンバーに表示される名前です
								</p>
							</div>

							<div>
								<label
									htmlFor={yearId}
									className={styles.profileLabel}
								>
									筑波大学入学年度 <span className={styles.profileRequired}>*</span>
								</label>
								<Input
									id={yearId}
									type="number"
									placeholder="例: 2025"
									min="2000"
									className={styles.profileInputFull}
									value={year}
									onChange={(e) => setYear(e.target.value)}
								/>
								<p className={styles.profileHelperText}>
									あなたが筑波大学に入学した年度を入力してください
								</p>
							</div>

							<div>
								<label
									htmlFor={statusId}
									className={styles.profileLabel}
								>
									珈琲・俺ステータス <span className={styles.profileRequired}>*</span>
								</label>
								<StatusSelecter
									status={status}
									setStatus={setStatus}
									statusId={statusId}
								/>
								<p className={styles.profileHelperText}>
									現在の珈琲・俺での役割を選択してください
								</p>
							</div>
						</div>
					</div>
					{/* エラーメッセージ */}
					{error && (
						<div className={styles.profileErrorBox}>
							<p className={`${styles.profileErrorText} ${isMobile ? styles.profileErrorTextMobile : styles.profileErrorTextDesktop}`}>
								{error}
							</p>
						</div>
					)}
					{/* プロフィール作成ボタン */}
					<button
						type="button"
						onClick={handleCreateProfile}
						disabled={isCreating}
						className={`${styles.profileSubmitButton} ${
							isMobile ? styles.profileSubmitButtonMobile : styles.profileSubmitButtonDesktop
						}`}
					>
						{isCreating ? (
							<span className={styles.profileSubmitButtonInner}>
								<div className={styles.profileSubmitSpinner}></div>
								プロフィール作成中...
							</span>
						) : (
							'プロフィールを作成'
						)}
					</button>
					{/* ログアウトボタン */}
					<div className={styles.profileSignOutWrap}>
						<button
							type="button"
							onClick={async () => {
								try {
									// Cookieセッションの削除
									const { clearAuthSession } = await import('../../lib/cookie-utils');
									clearAuthSession();

									// ログアウト処理（Firebase Auth）
									const { logOut } = await import('../../lib/firebase');
									await logOut();

									navigate('/login');
								} catch (error) {
									console.error('ログアウトエラー:', error);
									navigate('/login');
								}
							}}
							className={styles.profileSignOutButton}
						>
							別のアカウントでログイン
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
