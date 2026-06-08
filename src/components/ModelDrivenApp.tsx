import { useMemo, useState } from "react";

import {
    appNavigationItems,
    type AppModuleId,
    type AppNavigationItem
} from "../config/appNavigation";
import { sheetModuleConfigs } from "../config/sheetModules";
import { useAuth } from "../context/useAuth";
import DashboardPage from "../pages/DashboardPage";
import SheetModulePage from "../pages/SheetModulePage";

type NavigationGroup = {
    name: string;
    items: AppNavigationItem[];
}

const groupNavigationItems = (
    items: AppNavigationItem[]
): NavigationGroup[] => {
    const groups: NavigationGroup[] = [];

    items.forEach((item) => {
        const existingGroup = groups.find((group) => {
            return group.name === item.group;
        });

        if (existingGroup !== undefined) {
            existingGroup.items.push(item);
            return;
        }

        groups.push({
            name: item.group,
            items: [item]
        });
    });

    return groups;
};

const renderModulePage = (activeModuleId: AppModuleId) => {
    if (activeModuleId === "dashboard") {
        return <DashboardPage />;
    }

    const config = sheetModuleConfigs[activeModuleId];

    return (
        <SheetModulePage
            config={config}
            key={config.id}
        />
    );
};

export default function ModelDrivenApp() {
    const [activeModuleId, setActiveModuleId] =
        useState<AppModuleId>("dashboard");

    const { user, setUser } = useAuth();

    const navigationGroups = useMemo(() => {
        return groupNavigationItems(appNavigationItems);
    }, []);

    const activeNavigationItem = appNavigationItems.find((item) => {
        return item.id === activeModuleId;
    });

    const handleLogout = () => {
        setUser(null);
    };

    return (
        <div className="model-app-shell">
            <aside className="site-map-pane">
                <div className="app-logo-block">
                    <div className="app-logo-mark">PM</div>
                    <div>
                        <strong>Quản lý công nợ</strong>
                    </div>
                </div>

                <nav className="site-map-nav" aria-label="Điều hướng chính">
                    {navigationGroups.map((group) => (
                        <section className="site-map-group" key={group.name}>
                            <h2>{group.name}</h2>

                            {group.items.map((item) => {
                                const isActive = item.id === activeModuleId;

                                return (
                                    <button
                                        className={isActive ? "nav-row active" : "nav-row"}
                                        type="button"
                                        key={item.id}
                                        onClick={() => setActiveModuleId(item.id)}
                                    >
                                        <span>{item.label}</span>

                                        {item.isReady ? null : (
                                            <small>Sắp có</small>
                                        )}
                                    </button>
                                );
                            })}
                        </section>
                    ))}
                </nav>
            </aside>

            <section className="workspace-pane">
                <header className="workspace-header">
                    <div>
                        <span className="workspace-breadcrumb">
                            {activeNavigationItem?.group ?? "Ứng dụng"}
                        </span>
                        <strong>{activeNavigationItem?.label ?? "Trang chính"}</strong>
                        <p>{activeNavigationItem?.description}</p>
                    </div>

                    <div className="user-box">
                        <span>{user?.username}</span>
                        <button
                            className="plain-button"
                            type="button"
                            onClick={handleLogout}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </header>

                <main className="workspace-content">
                    {renderModulePage(activeModuleId)}
                </main>
            </section>
        </div>
    );
}
