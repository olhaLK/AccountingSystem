import { NavLink, Outlet } from "react-router-dom";

export function Layout() {
    return (
        <div className="shell">
            <header className="topbar">
                <div className="topbar__inner">
                    <div className="brand">
                        <div className="brand__mark" />
                        <div className="brand__text">
                            <div className="brand__title">Med UI</div>
                            <div className="brand__subtitle">Appointments & Directories</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="body">
                <aside className="side card">
                    <nav className="menu">
                        <NavLink to="/" end className={({ isActive }) => (isActive ? "menu__item isActive" : "menu__item")}>
                            Appointments
                        </NavLink>
                        <NavLink to="/create" className={({ isActive }) => (isActive ? "menu__item isActive" : "menu__item")}>
                            Create
                        </NavLink>
                        <NavLink to="/dictionaries" className={({ isActive }) => (isActive ? "menu__item isActive" : "menu__item")}>
                            Dictionaries
                        </NavLink>
                    </nav>

                    <div className="side__hint">
                        <div className="side__hintTitle">Tip</div>
                        <div className="side__hintText">Start with Create → the record will appear in Appointments.</div>
                    </div>
                </aside>

                <main className="main">
                    <div className="container">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}