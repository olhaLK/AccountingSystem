import { NavLink, Outlet } from "react-router-dom";
import "./layout.css";

export function Layout() {
    return (
        <div className="app">
            <aside className="sidebar">
                <div className="brand">Med UI</div>

                <nav className="nav">
                    <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
                        Posts
                    </NavLink>
                    <NavLink to="/create" className={({ isActive }) => (isActive ? "active" : "")}>
                        Create
                    </NavLink>
                    <NavLink to="/dictionaries" className={({ isActive }) => (isActive ? "active" : "")}>
                        Directories
                    </NavLink>
                </nav>
            </aside>

            <main className="content">
                <Outlet />
            </main>
        </div>
    );
}