import { useCallback, useEffect, useMemo, useState } from 'react';
import Logo from '../components/Logo.jsx';
import Icon from './Icon.jsx';
import ClientList from './ClientList.jsx';
import ClientPanel from './ClientPanel.jsx';
import ClientForm from './ClientForm.jsx';
import LeadList, { inFilter } from './LeadList.jsx';
import LeadPanel from './LeadPanel.jsx';
import { authConnected } from './auth.js';
import {
  listClients,
  createClient,
  updateClient,
  deleteClients,
  addComment,
  deleteComment,
  loadSampleClients,
} from './clientsStore.js';
import {
  listLeads,
  updateLead,
  markAllLeadsRead,
  deleteLeads,
  addLeadNote,
  deleteLeadNote,
  loadSampleLeads,
  convertLead,
} from './leadsStore.js';

const sorters = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  business: (a, b) => (a.business || '~').localeCompare(b.business || '~'),
};

function matchesClient(client, q) {
  if (!q) return true;
  const hay = [client.name, client.business, client.email, client.phone, client.website]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function matchesLead(lead, q) {
  if (!q) return true;
  return [lead.name, lead.email, lead.phone, lead.business, lead.message].join(' ').toLowerCase().includes(q);
}

// /admin/leads shows leads; anything else under /admin shows clients.
function sectionFromPath() {
  return window.location.pathname.replace(/\/+$/, '') === '/admin/leads' ? 'leads' : 'clients';
}

export default function Dashboard({ session, onSignOut }) {
  const [section, setSection] = useState(sectionFromPath);
  const [query, setQuery] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');

  // Clients
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recent');
  const [checked, setChecked] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [panel, setPanel] = useState(null); // 'view' | 'edit' | 'new' | null

  // Leads
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadFilter, setLeadFilter] = useState('inbox');
  const [leadId, setLeadId] = useState(null);

  // Runs a database action and shows a message instead of failing silently.
  const attempt = useCallback(async (fn) => {
    try {
      setError('');
      await fn();
      return true;
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
      return false;
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await attempt(async () => setClients(await listClients()));
    setLoading(false);
  }, [attempt]);

  const refreshLeads = useCallback(async () => {
    setLeadsLoading(true);
    await attempt(async () => setLeads(await listLeads()));
    setLeadsLoading(false);
  }, [attempt]);

  useEffect(() => {
    refresh();
    refreshLeads();
  }, [refresh, refreshLeads]);

  // Back/forward buttons switch sections too.
  useEffect(() => {
    const onPop = () => setSection(sectionFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      setNavOpen(false);
      setPanel((p) => (p === 'view' ? null : p));
      setLeadId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function goTo(next, e) {
    e?.preventDefault();
    if (next !== section) {
      window.history.pushState(null, '', next === 'leads' ? '/admin/leads' : '/admin');
      setSection(next);
      setQuery('');
    }
    setNavOpen(false);
  }

  // ---------- Clients ----------

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => matchesClient(c, q)).sort(sorters[sort]);
  }, [clients, query, sort]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;

  const replaceClient = (updated) =>
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

  function openClient(id) {
    setSelectedId(id);
    setPanel('view');
    setNavOpen(false);
  }

  function startNew() {
    goTo('clients');
    setSelectedId(null);
    setPanel('new');
    setNavOpen(false);
  }

  async function save(fields) {
    const ok = await attempt(async () => {
      if (panel === 'new') {
        const created = await createClient(fields);
        setClients((prev) => [created, ...prev]);
        setSelectedId(created.id);
      } else {
        replaceClient(await updateClient(selectedId, fields));
      }
    });
    if (ok) setPanel('view');
  }

  async function remove(ids) {
    const list = clients.filter((c) => ids.includes(c.id));
    const label = list.length === 1 ? list[0].name : `${list.length} clients`;
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;
    if (!(await attempt(() => deleteClients(ids)))) return;
    setClients((prev) => prev.filter((c) => !ids.includes(c.id)));
    setChecked((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    if (ids.includes(selectedId)) {
      setSelectedId(null);
      setPanel(null);
    }
  }

  function toggle(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setChecked((prev) =>
      visible.length > 0 && visible.every((c) => prev.has(c.id))
        ? new Set()
        : new Set(visible.map((c) => c.id))
    );
  }

  // ---------- Leads ----------

  const visibleLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((l) => inFilter(l, leadFilter) && matchesLead(l, q))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [leads, query, leadFilter]);

  const unread = leads.filter((l) => !l.isRead).length;
  const lead = leads.find((l) => l.id === leadId) ?? null;

  const replaceLead = (updated) => {
    if (updated) setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  function changeLead(id, fields) {
    return attempt(async () => replaceLead(await updateLead(id, fields)));
  }

  function openLead(id) {
    setLeadId(id);
    setNavOpen(false);
    const l = leads.find((x) => x.id === id);
    if (l && !l.isRead) changeLead(id, { isRead: true });
  }

  async function removeLead(id) {
    const l = leads.find((x) => x.id === id);
    if (!window.confirm(`Delete the message from ${l?.name ?? 'this lead'}? This can't be undone.`)) return;
    if (!(await attempt(() => deleteLeads([id])))) return;
    setLeads((prev) => prev.filter((x) => x.id !== id));
    setLeadId(null);
  }

  async function convert(l) {
    await attempt(async () => {
      const { lead: updated, client } = await convertLead(l);
      replaceLead(updated);
      setClients((prev) => [client, ...prev.filter((c) => c.id !== client.id)]);
    });
  }

  function openConvertedClient(l) {
    goTo('clients');
    setLeadId(null);
    openClient(l.clientId);
  }

  // ---------- Layout ----------

  const isLeads = section === 'leads';
  const hasPanel = isLeads ? !!lead : !!panel;
  const userInitial = (session.email || 'K')[0].toUpperCase();

  return (
    <div className="adm">
      <header className="adm-top">
        <button
          type="button"
          className="aicon adm-top__menu"
          aria-label="Open navigation"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((o) => !o)}
        >
          <Icon name="menu" />
        </button>

        <a href="/admin" className="adm-brand" aria-label="builtbykayde admin" onClick={(e) => goTo('clients', e)}>
          <Logo tagline={false} />
          <span className="adm-brand__badge">admin</span>
        </a>

        <div className="adm-search" role="search">
          <Icon name="search" />
          <label htmlFor="admin-search" className="visually-hidden">
            {isLeads ? 'Search leads' : 'Search clients'}
          </label>
          <input
            id="admin-search"
            type="search"
            placeholder={isLeads ? 'Search leads' : 'Search clients'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="aicon" aria-label="Clear search" onClick={() => setQuery('')}>
              <Icon name="close" size={18} />
            </button>
          )}
        </div>

        <div className="adm-user">
          <button
            type="button"
            className="adm-avatar"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {userInitial}
          </button>
          {menuOpen && (
            <div className="adm-menu" role="menu">
              <p className="adm-menu__email">{session.email}</p>
              <a href="/" role="menuitem" className="adm-menu__item">
                <Icon name="globe" size={18} /> View site
              </a>
              <button type="button" role="menuitem" className="adm-menu__item" onClick={onSignOut}>
                <Icon name="logout" size={18} /> Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={`adm-body${hasPanel ? ' has-panel' : ''}`}>
        <aside className={`adm-nav${navOpen ? ' is-open' : ''}`} aria-label="Admin sections">
          <button type="button" className="adm-new" onClick={startNew}>
            <Icon name="plus" size={22} /> New client
          </button>
          <nav>
            <a
              href="/admin/leads"
              className={`adm-navitem${isLeads ? ' is-active' : ''}`}
              aria-current={isLeads ? 'page' : undefined}
              onClick={(e) => goTo('leads', e)}
            >
              <Icon name="inbox" />
              <span>Leads</span>
              {unread > 0 ? (
                <span className="adm-navitem__new" aria-label={`${unread} unread`}>
                  {unread}
                </span>
              ) : (
                <span className="adm-navitem__count">{leads.filter((l) => inFilter(l, 'inbox')).length}</span>
              )}
            </a>
            <a
              href="/admin"
              className={`adm-navitem${isLeads ? '' : ' is-active'}`}
              aria-current={isLeads ? undefined : 'page'}
              onClick={(e) => goTo('clients', e)}
            >
              <Icon name="users" />
              <span>Clients</span>
              <span className="adm-navitem__count">{clients.length}</span>
            </a>
          </nav>
          {authConnected ? (
            <p className="adm-nav__note">Messages from your website’s contact form land in Leads.</p>
          ) : (
            <p className="adm-nav__note">
              Test mode: clients and leads are saved in this browser only until Supabase is connected.
            </p>
          )}
        </aside>
        {navOpen && <div className="adm-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}

        <main className="adm-main">
          {error && (
            <div className="adm-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}
          {isLeads ? (
            <LeadList
              leads={visibleLeads}
              allLeads={leads}
              loading={leadsLoading}
              query={query.trim()}
              filter={leadFilter}
              onFilter={setLeadFilter}
              selectedId={leadId}
              onOpen={openLead}
              onRefresh={refreshLeads}
              onMarkAllRead={() => attempt(async () => setLeads(await markAllLeadsRead()))}
              canLoadSamples={!authConnected}
              onLoadSamples={() => attempt(async () => setLeads(await loadSampleLeads()))}
            />
          ) : (
            <ClientList
              clients={visible}
              total={clients.length}
              loading={loading}
              query={query.trim()}
              sort={sort}
              onSort={setSort}
              checked={checked}
              onToggle={toggle}
              onToggleAll={toggleAll}
              selectedId={panel ? selectedId : null}
              onOpen={openClient}
              onDelete={remove}
              onRefresh={refresh}
              onNew={startNew}
              onLoadSamples={() => attempt(async () => setClients(await loadSampleClients()))}
            />
          )}
        </main>

        {isLeads && lead && (
          <aside className="adm-panel" aria-label="Lead details">
            <LeadPanel
              key={lead.id}
              lead={lead}
              onClose={() => setLeadId(null)}
              onStatus={(status) =>
                // Picking "Converted" does the same as the button: creates the client too.
                status === 'converted' && !lead.clientId ? convert(lead) : changeLead(lead.id, { status })
              }
              onMarkUnread={async () => {
                await changeLead(lead.id, { isRead: false });
                setLeadId(null);
              }}
              onDelete={() => removeLead(lead.id)}
              onReplied={() => {
                if (lead.status === 'new') changeLead(lead.id, { status: 'replied' });
              }}
              onConvert={() => convert(lead)}
              onOpenClient={() => openConvertedClient(lead)}
              onAddNote={(text) => attempt(async () => replaceLead(await addLeadNote(lead.id, text)))}
              onDeleteNote={(noteId) => attempt(async () => replaceLead(await deleteLeadNote(lead.id, noteId)))}
            />
          </aside>
        )}

        {!isLeads && panel && (
          <aside className="adm-panel" aria-label="Client details">
            {panel === 'view' && selected && (
              <ClientPanel
                key={selected.id}
                client={selected}
                onClose={() => setPanel(null)}
                onEdit={() => setPanel('edit')}
                onDelete={() => remove([selected.id])}
                onAddComment={(text) =>
                  attempt(async () => replaceClient(await addComment(selected.id, text)))
                }
                onDeleteComment={(commentId) =>
                  attempt(async () => replaceClient(await deleteComment(selected.id, commentId)))
                }
              />
            )}
            {(panel === 'new' || (panel === 'edit' && selected)) && (
              <ClientForm
                key={panel === 'new' ? 'new' : selected.id}
                mode={panel}
                initial={panel === 'edit' ? selected : null}
                onSave={save}
                onCancel={() => setPanel(panel === 'edit' ? 'view' : null)}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
