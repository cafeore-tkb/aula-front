import { useNavigate } from 'react-router';

export function HomeButton() {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => navigate('/dashboard')}
			className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
		>
			<svg
				className="h-5 w-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<title>戻る</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			<span>ホームに戻る</span>
		</button>
	);
}
