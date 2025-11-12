import { route, index } from '@react-router/dev/routes';
import type { RouteConfig } from '@react-router/dev/routes';

export default [
	// ホームページ
	index('pages/home.tsx'),

	// 認証関連
	route('login', 'pages/general/login.tsx'),
	route('createProfile', 'pages/general/create-profile.tsx'),

	// 一般機能
	route('dashboard', 'pages/general/dashboard.tsx'),
	route('adjustment', 'pages/general/adjustment.tsx'),
	route('shiftList', 'pages/general/shift-list.tsx'),

	// 管理機能
	route('admin', 'pages/admin/admin.tsx'),
	route('admin/users', 'pages/admin/member.tsx'),
	route('admin/settings', 'pages/admin/settings.tsx'),
	route('admin/manageAdjustment', 'pages/admin/manage-adjustment.tsx'),
] satisfies RouteConfig;
