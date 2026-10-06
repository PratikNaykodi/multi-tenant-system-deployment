
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

function DashboardLayout() {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-area">
                <Header />
                <main className="content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default DashboardLayout;