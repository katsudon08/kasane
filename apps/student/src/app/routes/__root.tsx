import { Outlet, createRootRoute, redirect } from "@tanstack/react-router";

import { isDesktop, outsideFreeMode } from "../../shared/lib/desktop";

const RootLayout = () => (
	<>
		<Outlet />
	</>
);

export const Route = createRootRoute({
	// デスクトップアプリでは、/freeの外のルートを開こうとしたら/freeへ移る（仕様書free-mode.mdの「デスクトップアプリ」）
	beforeLoad: ({ location }) => {
		if (isDesktop() && outsideFreeMode(location.pathname)) {
			throw redirect({ to: "/free", replace: true });
		}
	},
	component: RootLayout,
});
