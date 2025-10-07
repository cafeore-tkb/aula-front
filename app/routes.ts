import type { RouteConfig } from '@react-router/dev/routes';
import { route, index } from '@react-router/dev/routes';

export default [
	// ホームページ
	index('pages/general/home.tsx'),
	
	// 認証関連
	route('login', 'pages/general/login.tsx'),
	route('create-profile', 'pages/general/create-profile.tsx'),
	
	// 一般機能
	route('adjustment', 'pages/general/adjustment.tsx'),
	
	// 管理機能
	route('admin', 'pages/admin/admin.tsx'),
] satisfies RouteConfig;
