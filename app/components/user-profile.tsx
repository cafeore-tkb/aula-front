import { useId, useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile as UserProfileType } from '../lib/firebase';
import { updateUserProfile } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import { LogoutButton } from './logout-button';
import styles from './user-profile.module.scss';

interface UserProfileProps {
	user: User;
	userProfile?: UserProfileType | null;
}

export function UserProfile({ user, userProfile }: UserProfileProps) {
	const { refreshProfile } = useAuth();
	const [isEditing, setIsEditing] = useState(false);
	const [loading, setLoading] = useState(false);
	const [name, setName] = useState(userProfile?.name || '');
	const [year, setYear] = useState(
		userProfile?.year || new Date().getFullYear(),
	);
	const nameId = useId();
	const yearId = useId();
	let cafeoreStatus = '';
	if (userProfile?.isFirstYear) {
		cafeoreStatus += '1年目';
	} else {
		cafeoreStatus += '2年目';
	}
	if (userProfile?.isExaminer) {
		cafeoreStatus += '試験官';
	} else {
		cafeoreStatus += '練習生';
	}

	const handleSave = async () => {
		if (!user || !name.trim()) return;

		try {
			setLoading(true);
			await updateUserProfile(user.uid, {
				name: name.trim(),
				year: year,
			});
			await refreshProfile();
			setIsEditing(false);
		} catch (error) {
			console.error('Error updating profile:', error);
			alert('プロフィールの更新に失敗しました');
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		setName(userProfile?.name || '');
		setYear(userProfile?.year || new Date().getFullYear());
		setIsEditing(false);
	};
	if (!user || !userProfile) return null;

	return (
		<div className={styles.profileCard}>
			<div className={styles.profileHeader}>
				{user.photoURL && (
					<img
						src={user.photoURL}
						alt={user.displayName || 'ユーザー'}
						className={styles.avatar}
					/>
				)}
				<div className={styles.profileMeta}>
					<h3 className={styles.userName}>
						{user.displayName || 'ユーザー'}
					</h3>
				</div>
			</div>

			{isEditing ? (
				<div className={styles.editSection}>
					<h4 className={styles.sectionTitle}>
						プロフィール編集
					</h4>

					<div>
						<label
							htmlFor={nameId}
							className={styles.inputLabel}
						>
							表示名
						</label>
						<input
							type="text"
							id={nameId}
							value={name}
							onChange={(e) => setName(e.target.value)}
							className={styles.inputField}
							placeholder="名前を入力"
						/>
					</div>

					<div>
						<label
							htmlFor={yearId}
							className={styles.inputLabel}
						>
							入学年度
						</label>
						<input
							type="number"
							id={yearId}
							value={year}
							onChange={(e) => setYear(Number(e.target.value))}
							className={styles.inputField}
							min="2000"
							max="3000"
						/>
					</div>

					<div className={styles.buttonRow}>
						<button
							type="button"
							onClick={handleSave}
							disabled={loading || !name.trim()}
							className={styles.saveButton}
						>
							{loading ? '保存中...' : '保存'}
						</button>
						<button
							type="button"
							onClick={handleCancel}
							disabled={loading}
							className={styles.cancelButton}
						>
							キャンセル
						</button>
					</div>
				</div>
			) : (
				<div className={styles.infoSection}>
					<div className={styles.infoHeader}>
						<h4 className={styles.sectionTitle}>
							アカウント情報
						</h4>
						<button
							type="button"
							onClick={() => setIsEditing(true)}
							className={styles.editButton}
						>
							編集
						</button>
					</div>

					<div className={styles.infoList}>
						<div className={styles.infoRow}>
							<span>表示名:</span>
							<span>{userProfile.name || '未設定'}</span>
						</div>
						<div>
							<span className={styles.gmailLabel}>Gmail:</span>
							<span className={styles.gmailValue}>
								{userProfile.gmail}
							</span>
						</div>
						<div className={styles.infoRow}>
							<span>入学年度:</span>
							<span>{`${userProfile.year.toString().slice(2)}生`}</span>
						</div>
						<div className={styles.infoRow}>
							<span>管理者:</span>
							<span>{userProfile.isAdmin ? '管理者' : '一般構成員'}</span>
						</div>
						<div className={styles.infoRow}>
							<span>ステータス:</span>
							<span>{cafeoreStatus}</span>
						</div>
					</div>
				</div>
			)}

			<LogoutButton />
		</div>
	);
}
