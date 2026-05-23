import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select';
import styles from './status-selecter.module.scss';

interface StatusSelecterProps {
	status: string;
	setStatus: (value: string) => void;
	statusId: string;
}

export function StatusSelecter({
	status,
	setStatus,
	statusId,
}: StatusSelecterProps) {
	return (
		<Select value={status} onValueChange={setStatus}>
			<SelectTrigger id={statusId} className={styles.trigger}>
				<SelectValue placeholder="ステータスを選択してください" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="first-trainee">
					<div className={styles.optionWrap}>
						<span className={styles.optionLabel}>1年目練習生</span>
					</div>
				</SelectItem>
				<SelectItem value="second-trainee">
					<div className={styles.optionWrap}>
						<span className={styles.optionLabel}>2年目練習生</span>
					</div>
				</SelectItem>
				<SelectItem value="first-examiner">
					<div className={styles.optionWrap}>
						<span className={styles.optionLabel}>1年目試験官</span>
					</div>
				</SelectItem>
				<SelectItem value="second-examiner">
					<div className={styles.optionWrap}>
						<span className={styles.optionLabel}>2年目試験官</span>
					</div>
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
