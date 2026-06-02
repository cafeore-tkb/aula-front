import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { Button } from './button';
import styles from './confirm-modal.module.scss';

interface ConfirmModalProps {
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
}

const ConfirmModalContent: React.FC<ConfirmModalProps> = ({
	message,
	onConfirm,
	onCancel,
}) => {
	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<div className={styles.modalMessage}>{message}</div>
				<div className={styles.modalActions}>
					<Button variant="outline" onClick={onCancel}>
						キャンセル
					</Button>
					<Button onClick={onConfirm}>確認</Button>
				</div>
			</div>
		</div>
	);
};

/**
 * コンファームモーダルを表示し、ユーザーの操作結果をPromiseで返します
 * @param message - 表示するメッセージ
 * @returns ユーザーが「確認」を選択するとtrue、「キャンセル」を選択するとfalseを返すPromise
 */
export const showConfirmModal = (message: string): Promise<boolean> => {
	return new Promise((resolve) => {
		const container = document.createElement('div');
		document.body.appendChild(container);

		const handleConfirm = () => {
			root.unmount();
			document.body.removeChild(container);
			resolve(true);
		};

		const handleCancel = () => {
			root.unmount();
			document.body.removeChild(container);
			resolve(false);
		};

		const root = createRoot(container);
		root.render(
			<ConfirmModalContent
				message={message}
				onConfirm={handleConfirm}
				onCancel={handleCancel}
			/>,
		);
	});
};
