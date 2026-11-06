import React from 'react';
import {
  ChevronRight,
  ClipboardList,
  Database,
  ExternalLink,
  FileText,
  MessageSquare,
  PackageOpen,
  BarChart3,
  Users,
} from 'lucide-react';
import { ShelterluvLiveSyncPanel } from '../components/ShelterluvLiveSyncPanel';

function MenuItem({ icon: Icon, title, detail, onClick, trailing }) {
  return (
    <button type="button" className="menuItem" onClick={onClick}>
      <span className="menuItemIcon"><Icon size={19} /></span>
      <span>
        <b>{title}</b>
        {detail && <small>{detail}</small>}
      </span>
      {trailing || <ChevronRight size={18} />}
    </button>
  );
}

export function More({ reload, dbStatus, setPage, onFeedback }) {
  return (
    <main>
      <div className="screenTitle">
        <h1>More</h1>
      </div>

      <h2 className="sectionLabel">Tools</h2>
      <div className="menuGroup">
        <MenuItem icon={ClipboardList} title="Vet day list" detail="Who's going to the vet, from the sheet" onClick={() => setPage('vet-day-list')} />
        <MenuItem icon={PackageOpen} title="Low stock alert" detail="Text a supply request" onClick={() => setPage('text-alert')} />
        <MenuItem icon={BarChart3} title="Reports" detail="Sign-offs by date, export CSV" onClick={() => setPage('reports')} />
        <MenuItem icon={FileText} title="Adoption records" detail="Download a cat's vet history PDF" onClick={() => setPage('adoption-records')} />
      </div>

      <h2 className="sectionLabel">Team</h2>
      <div className="menuGroup">
        <MenuItem icon={Users} title="Manage employees" detail="Names on the sign-off pills" onClick={() => setPage('manage-employees')} />
        <MenuItem icon={MessageSquare} title="Send feedback" detail="Report a bug or ask for a feature" onClick={onFeedback} />
        <MenuItem
          icon={ExternalLink}
          title="Open ShelterIQ"
          detail="rescue-io.vercel.app"
          onClick={() => window.open('https://rescue-io.vercel.app', '_blank', 'noopener')}
          trailing={<ExternalLink size={16} />}
        />
      </div>

      <h2 className="sectionLabel">Data</h2>
      <ShelterluvLiveSyncPanel reload={reload} />
      <section className="panel">
        <h2><Database size={18} /> Database</h2>
        <p>{dbStatus}</p>
      </section>
    </main>
  );
}
