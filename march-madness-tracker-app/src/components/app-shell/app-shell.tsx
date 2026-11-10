import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import './app-shell.scss';

/** Page frame: the name, links to the pages, and room for the content. */
export default function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="shell">
            <header className="shell__header">
                <Link to="/welcome" className="shell__brand">
                    March Madness Tracker
                </Link>
                <nav aria-label="Pages" className="shell__nav">
                    <NavLink to="/welcome">Compare teams</NavLink>
                    <NavLink to="/bracket">Bracket</NavLink>
                    <NavLink to="/backtest">Backtest</NavLink>
                </nav>
            </header>
            <main className="shell__main">{children}</main>
        </div>
    );
}
