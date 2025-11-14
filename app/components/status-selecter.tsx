import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '~/components/ui/select';

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
			<SelectTrigger id={statusId} className="w-full">
				<SelectValue placeholder="ステータスを選択してください" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="first-trainee">
					<div className="flex flex-col items-start">
						<span className="font-medium">1年目練習生</span>
					</div>
				</SelectItem>
				<SelectItem value="second-trainee">
					<div className="flex flex-col items-start">
						<span className="font-medium">2年目練習生</span>
					</div>
				</SelectItem>
				<SelectItem value="first-examiner">
					<div className="flex flex-col items-start">
						<span className="font-medium">1年目試験官</span>
					</div>
				</SelectItem>
				<SelectItem value="second-examiner">
					<div className="flex flex-col items-start">
						<span className="font-medium">2年目試験官</span>
					</div>
				</SelectItem>
			</SelectContent>
		</Select>
	);
}
