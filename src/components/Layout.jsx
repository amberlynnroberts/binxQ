import React from 'react';
import { Home, Grid3X3, Pill, ClipboardCheck, MoreHorizontal, Menu, RefreshCw, Sun, Moon, MessageSquare } from 'lucide-react';

export function Layout({ children, page, setPage, reload, theme, toggleTheme, dbStatus, loading }) {
  return (
    <div className="app">
      <header>
        <button
          className="icon"
          onClick={() => setPage('text-alert')}>
          <MessageSquare size={22}/>
          <span>Low Stock Text</span>
        </button>
        <b>BINX<span> Q</span></b>
        <div className="headerActions">
          <button className="icon" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button>
          <button className="icon" onClick={reload}><RefreshCw size={19}/></button>
        </div>
      </header>

      <div className="statusbar">
        <span>{dbStatus}</span>
        {loading && <b>Loading...</b>}
      </div>

      {children}

      <nav>
        <button className={page === 'dashboard' ? 'on' : ''} onClick={() => setPage('dashboard')}><Home size={18}/>Dashboard</button>
        <button className={['kennels','card','add','edit'].includes(page) ? 'on' : ''} onClick={() => setPage('kennels')}><Grid3X3 size={18}/>Kennels</button>
        <button className={page === 'meds' ? 'on' : ''} onClick={() => setPage('meds')}><Pill size={18}/>Meds</button>
        <button className={page === 'shift' ? 'on' : ''} onClick={() => setPage('shift')}><ClipboardCheck size={18}/>Shift</button>
        <button className={page === 'more' ? 'on' : ''} onClick={() => setPage('more')}><MoreHorizontal size={18}/>More</button>
      </nav>
    </div>
  );
}
