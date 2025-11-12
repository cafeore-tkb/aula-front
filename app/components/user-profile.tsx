import { useId, useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile as UserProfileType } from '../lib/firebase';
import { updateUserProfile } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import { LogoutButton } from './logout-button';

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
		<div className="rounded-lg bg-white p-6 shadow-md">
			<div className="mb-6 flex items-center space-x-4">
				{user.photoURL && (
					<img
						src={user.photoURL}
						alt={user.displayName || 'ユーザー'}
						className="h-16 w-16 rounded-full"
					/>
				)}
				<div className="flex-1">
					<h3 className="font-semibold text-gray-900 text-xl">
						{user.displayName || 'ユーザー'}
					</h3>
				</div>
			</div>

			{isEditing ? (
				<div className="mb-6 space-y-4">
					<h4 className="border-b pb-1 font-medium text-gray-700 text-sm">
						プロフィール編集
					</h4>

					<div>
						<label
							htmlFor={nameId}
							className="mb-1 block font-medium text-gray-700 text-sm"
						>
							表示名
						</label>
						<input
							type="text"
							id={nameId}
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="名前を入力"
						/>
					</div>

					<div>
						<label
							htmlFor={yearId}
							className="mb-1 block font-medium text-gray-700 text-sm"
						>
							入学年度
						</label>
						<input
							type="number"
							id={yearId}
							value={year}
							onChange={(e) => setYear(Number(e.target.value))}
							className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							min="2000"
							max="3000"
						/>
					</div>

					<div className="flex space-x-3">
						<button
							type="button"
							onClick={handleSave}
							disabled={loading || !name.trim()}
							className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? '保存中...' : '保存'}
						</button>
						<button
							type="button"
							onClick={handleCancel}
							disabled={loading}
							className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
						>
							キャンセル
						</button>
					</div>
				</div>
			) : (
				<div className="mb-6 space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="border-b pb-1 font-medium text-gray-700 text-sm">
							アカウント情報
						</h4>
						<button
							type="button"
							onClick={() => setIsEditing(true)}
							className="rounded-md bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							編集
						</button>
					</div>

					<div className="space-y-2 text-gray-600 text-sm">
						<div className="flex justify-between">
							<span>表示名:</span>
							<span>{userProfile.name || '未設定'}</span>
						</div>
						<div>
							<span className="block">Gmail:</span>
							<span className="block break-all text-right text-gray-900">
								{userProfile.gmail}
							</span>
						</div>
						<div className="flex justify-between">
							<span>入学年度:</span>
							<span>{`${userProfile.year.toString().slice(2)}生`}</span>
						</div>
						<div className="flex justify-between">
							<span>管理者:</span>
							<span>{userProfile.isAdmin ? '管理者' : '一般構成員'}</span>
						</div>
						<div className="flex justify-between">
							<span>珈琲・俺 ステータス:</span>
							<span>{cafeoreStatus}</span>
						</div>
					</div>
				</div>
			)}

			<LogoutButton />
		</div>
	);
}
