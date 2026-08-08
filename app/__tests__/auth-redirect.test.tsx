/**
 * 認証リダイレクト挙動の単体テスト
 *
 * このテストでは以下を検証する:
 * 1. 未ログイン状態で保護ページ (/dashboard) にアクセスした場合 /login にリダイレクトされる
 * 2. 未ログイン状態で /login に直接アクセスした場合 そのまま表示される
 *
 * セッションAPIをモックし、常に未ログインを返すことで
 * 認証フレームワークに依存しない純粋なルーティング挙動のみを確認する。
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthProvider } from '../lib/auth-context';
import Login from '../pages/auth/login';
import Dashboard from '../pages/general/dashboard';
import Home from '../pages/home';

// Cloudflare AccessセッションAPIを「未認証」としてモックする。
vi.mock('../lib/api', () => {
	return {
		getAuthSession: vi.fn().mockResolvedValue({
			session: {
				authenticated: false,
				identity: { email: '' },
				hasProfile: false,
				user: null,
			},
			user: null,
			profile: null,
		}),
		getMyProfile: vi.fn(),
		redirectToAccessLogin: vi.fn(),
		redirectToAccessLogout: vi.fn(),
	};
});

// AuthContext 内のデバッグログを抑制（テスト出力ノイズ低減）
vi.spyOn(console, 'log').mockImplementation(() => {});

function setup(initialPath: string) {
	// 初期 URL (initialEntries) を指定してメモリ上のルーターを構築
	// 実際のアプリ構成に近い最小限のルートのみを用意
	return render(
		<AuthProvider>
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/login" element={<Login />} />
					<Route path="/dashboard" element={<Dashboard />} />
				</Routes>
			</MemoryRouter>
		</AuthProvider>,
	);
}

describe('Auth redirect behavior', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('未認証で /dashboard にアクセスすると /login が表示される', async () => {
		const utils = setup('/dashboard');
		// LoginPage の見出しテキスト出現をもってリダイレクト完了とみなす
		const loginHeading = await utils.findByText('ログインが必要です');
		expect(loginHeading).toBeInTheDocument();
	});

	it('/login へ未認証でアクセスした場合そのまま表示される', async () => {
		const utils = setup('/login');
		const loginHeading = await utils.findByText('ログインが必要です');
		expect(loginHeading).toBeInTheDocument();
	});
});
