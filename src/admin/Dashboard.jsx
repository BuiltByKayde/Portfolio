import { useCallback, useEffect, useMemo, useState } from 'react';
import Logo from '../components/Logo.jsx';
import Icon from './Icon.jsx';
import ClientList from './ClientList.jsx';
import ClientPanel from './ClientPanel.jsx';
import ClientForm from './ClientForm.jsx';
import LeadList, { inFilter } from './LeadList.jsx';
import LeadPanel from './LeadPanel.jsx';
import InvoiceList from './InvoiceList.jsx';
import InvoicePanel from './InvoicePanel.jsx';
import InvoiceEditor from './InvoiceEditor.jsx';
import InvoicePrint from './InvoicePrint.jsx';
import InvoiceSettings from './InvoiceSettings.jsx';
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
import {
  DEFAULT_SETTINGS,
  listInvoices,
  saveInvoice,
  setInvoiceStatus,
  deleteInvoice,
  addPayment,
  deletePayment,
  getInvoiceSettings,
  saveInvoiceSettings,
  listPresets,
  addPreset,
  deletePreset,
} from './invoicesStore.js';
import { calc, dueFromTerms, nextNumber, todayISO } from './invoiceMath.js';
import './invoices.css';

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

// Addresses inside /admin:
//   /admin                     clients
//   /admin/leads               leads
//   /admin/invoices            invoices
//   /admin/invoices/new        new invoice
//   /admin/invoices/:id/edit   edit invoice
//   /admin/invoices/:id/print  printable invoice
//   /admin/settings            invoice settings
function parseRoute() {
  const p = window.location.pathname.replace(/\/+$/, '');
  if (p === '/admin/leads') return { section: 'leads' };
  if (p === '/admin/settings') return { section: 'settings' };
  if (p === '/admin/invoices') return { section: 'invoices' };
  if (p === '/admin/invoices/new') return { section: 'invoices', view: 'new' };
  const m = p.match(/^\/admin\/invoices\/([^/]+)\/(edit|print)$/);
  if (m) return { section: 'invoices', view: m[2], id: m[1] };
  return { section: 'clients' };
}

function routePath(r) {
  if (r.section === 'leads') return '/admin/leads';
  if (r.section === 'settings') return '/admin/settings';
  if (r.section === 'invoices') {
    if (r.view === 'new') return '/admin/invoices/new';
    if (r.view && r.id) return `/admin/invoices/${r.id}/${r.view}`;
    return '/admin/invoices';
  }
  return '/admin';
}

export default function Dashboard({ session, onSignOut }) {
  const [route, setRoute] = useState(parseRoute);
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

  // Invoices
  const [invoices, setInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [presets, setPresets] = useState([]);
  const [invFilter, setInvFilter] = useState('all');
  const [invId, setInvId] = useState(null);
  const [newDraft, setNewDraft] = useState(null); // prefill for /admin/invoices/new
  const [justSent, setJustSent] = useState(false);

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

  const refreshInvoices = useCallback(async () => {
    setInvLoading(true);
    await attempt(async () => {
      const [list, s, p] = await Promise.all([listInvoices(), getInvoiceSettings(), listPresets()]);
      setInvoices(list);
      setSettings(s);
      setPresets(p);
    });
    setInvLoading(false);
  }, [attempt]);

  useEffect(() => {
    refresh();
    refreshLeads();
    refreshInvoices();
  }, [refresh, refreshLeads, refreshInvoices]);

  // Back/forward buttons move between pages too.
  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
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
      setInvId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function go(next, e) {
    e?.preventDefault();
    const path = routePath(next);
    if (path !== window.location.pathname) window.history.pushState(null, '', path);
    if (next.section !== route.section) setQuery('');
    setRoute(next);
    setNavOpen(false);
    window.scrollTo(0, 0);
  }

  const clientsById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

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

  function startNewClient() {
    go({ section: 'clients' });
    setSelectedId(null);
    setPanel('new');
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
    setInvoices((prev) => prev.map((inv) => (ids.includes(inv.clientId) ? { ...inv, clientId: null } : inv)));
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
    go({ section: 'clients' });
    setLeadId(null);
    openClient(l.clientId);
  }

  // ---------- Invoices ----------

  const invoice = invoices.find((i) => i.id === (route.id || invId)) ?? null;
  const overdueCount = invoices.filter((i) => calc(i).state === 'overdue').length;

  const replaceInvoice = (updated) => {
    if (!updated) return;
    setInvoices((prev) =>
      prev.some((i) => i.id === updated.id) ? prev.map((i) => (i.id === updated.id ? updated : i)) : [updated, ...prev]
    );
  };

  function blankInvoice(prefill = {}) {
    const today = todayISO();
    return {
      id: null,
      number: nextNumber(invoices),
      clientId: null,
      title: '',
      kind: 'full',
      depositPct: 50,
      lessAmount: 0,
      gstRate: settings.gstRegistered ? 15 : 0,
      issuedOn: today,
      dueOn: dueFromTerms(today, settings.defaultTerms),
      status: 'draft',
      note: settings.defaultNote,
      lines: [],
      payments: [],
      ...prefill,
    };
  }

  function newInvoice(prefill) {
    setNewDraft(blankInvoice(prefill));
    setInvId(null);
    go({ section: 'invoices', view: 'new' });
  }

  function duplicateInvoice(inv) {
    const today = todayISO();
    newInvoice({
      clientId: inv.clientId,
      title: inv.title,
      kind: inv.kind,
      depositPct: inv.depositPct,
      lessAmount: inv.lessAmount,
      gstRate: settings.gstRegistered ? inv.gstRate : 0,
      note: inv.note,
      lines: inv.lines.map((l) => ({ ...l, id: undefined })),
      issuedOn: today,
      dueOn: dueFromTerms(today, settings.defaultTerms),
    });
  }

  async function saveInv(inv, then) {
    let saved = null;
    const ok = await attempt(async () => {
      saved = await saveInvoice(inv);
      replaceInvoice(saved);
    });
    if (!ok || !saved) return;
    setNewDraft(null);
    setInvId(saved.id);
    if (then === 'print' || then === 'send') {
      setJustSent(then === 'send');
      go({ section: 'invoices', view: 'print', id: saved.id });
    } else {
      go({ section: 'invoices' });
    }
  }

  async function removeInvoice(inv) {
    const extra = inv.payments.length ? ' Its recorded payments will be deleted too.' : '';
    if (!window.confirm(`Delete ${inv.number}?${extra} This can't be undone.`)) return;
    if (!(await attempt(() => deleteInvoice(inv.id)))) return;
    setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    setInvId(null);
  }

  // ---------- Layout ----------

  // Printable invoice: its own full page, no admin chrome.
  if (route.section === 'invoices' && route.view === 'print') {
    if (invLoading) return <p className="adm-loading">Loading invoice…</p>;
    if (invoice) {
      return (
        <InvoicePrint
          invoice={invoice}
          client={clientsById.get(invoice.clientId)}
          settings={settings}
          justSent={justSent}
          onBack={() => {
            setJustSent(false);
            setInvId(invoice.id);
            go({ section: 'invoices' });
          }}
        />
      );
    }
  }

  const { section, view } = route;
  const isLeads = section === 'leads';
  const isInvoices = section === 'invoices';
  const isSettings = section === 'settings';
  const isEditor = isInvoices && (view === 'new' || view === 'edit');
  const showInvPanel = isInvoices && !view && !!invoice;
  const hasPanel = isLeads ? !!lead : isInvoices ? showInvPanel : section === 'clients' ? !!panel : false;
  const userInitial = (session.email || 'K')[0].toUpperCase();
  const searchLabel = isLeads ? 'Search leads' : isInvoices ? 'Search invoices' : 'Search clients';

  let editorInitial = null;
  if (isEditor) {
    // A leftover draft whose number is already taken (e.g. after Back) starts fresh instead.
    const draftOk = newDraft && !invoices.some((i) => i.number === newDraft.number);
    editorInitial = view === 'new' ? (draftOk ? newDraft : blankInvoice()) : invoice;
  }

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

        <a href="/admin" className="adm-brand" aria-label="builtbykayde admin" onClick={(e) => go({ section: 'clients' }, e)}>
          <Logo tagline={false} />
          <span className="adm-brand__badge">admin</span>
        </a>

        <div className="adm-search" role="search">
          <Icon name="search" />
          <label htmlFor="admin-search" className="visually-hidden">
            {searchLabel}
          </label>
          <input
            id="admin-search"
            type="search"
            placeholder={searchLabel}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (isEditor || isSettings) go({ section: isSettings ? 'invoices' : section });
            }}
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
          {isInvoices || isSettings ? (
            <button type="button" className="adm-new" onClick={() => newInvoice()}>
              <Icon name="plus" size={22} /> New invoice
            </button>
          ) : (
            <button type="button" className="adm-new" onClick={startNewClient}>
              <Icon name="plus" size={22} /> New client
            </button>
          )}
          <nav className="adm-navlist">
            <a
              href="/admin/leads"
              className={`adm-navitem${isLeads ? ' is-active' : ''}`}
              aria-current={isLeads ? 'page' : undefined}
              onClick={(e) => go({ section: 'leads' }, e)}
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
              className={`adm-navitem${section === 'clients' ? ' is-active' : ''}`}
              aria-current={section === 'clients' ? 'page' : undefined}
              onClick={(e) => go({ section: 'clients' }, e)}
            >
              <Icon name="users" />
              <span>Clients</span>
              <span className="adm-navitem__count">{clients.length}</span>
            </a>
            <a
              href="/admin/invoices"
              className={`adm-navitem${isInvoices ? ' is-active' : ''}`}
              aria-current={isInvoices ? 'page' : undefined}
              onClick={(e) => go({ section: 'invoices' }, e)}
            >
              <Icon name="invoice" />
              <span>Invoices</span>
              {overdueCount > 0 ? (
                <span className="adm-navitem__warn" aria-label={`${overdueCount} overdue`}>
                  {overdueCount}
                </span>
              ) : (
                <span className="adm-navitem__count">{invoices.length}</span>
              )}
            </a>
            <div className="adm-navsep" role="separator" />
            <a
              href="/admin/settings"
              className={`adm-navitem${isSettings ? ' is-active' : ''}`}
              aria-current={isSettings ? 'page' : undefined}
              onClick={(e) => go({ section: 'settings' }, e)}
            >
              <Icon name="settings" />
              <span>Invoice settings</span>
            </a>
          </nav>
          {authConnected ? (
            <p className="adm-nav__note">Messages from your website’s contact form land in Leads.</p>
          ) : (
            <p className="adm-nav__note">
              Test mode: everything is saved in this browser only until Supabase is connected.
            </p>
          )}
        </aside>
        {navOpen && <div className="adm-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}

        <main className={`adm-main${isEditor || isSettings ? ' adm-main--page' : ''}`}>
          {error && (
            <div className="adm-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}

          {isLeads && (
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
          )}

          {section === 'clients' && (
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
              onNew={startNewClient}
              onLoadSamples={() => attempt(async () => setClients(await loadSampleClients()))}
            />
          )}

          {isInvoices && !view && (
            <InvoiceList
              invoices={invoices}
              clientsById={clientsById}
              loading={invLoading}
              query={query.trim()}
              filter={invFilter}
              onFilter={setInvFilter}
              selectedId={invId}
              onOpen={(id) => {
                setInvId(id);
                setNavOpen(false);
              }}
              onNew={() => newInvoice()}
              onRefresh={refreshInvoices}
            />
          )}

          {isInvoices && view === 'print' && <p className="alist__empty">That invoice doesn’t exist any more.</p>}

          {isEditor &&
            (invLoading ? (
              <p className="alist__empty">Loading…</p>
            ) : editorInitial ? (
              <InvoiceEditor
                key={editorInitial.id || `new-${editorInitial.number}`}
                initial={editorInitial}
                isNew={view === 'new'}
                clients={clients}
                invoices={invoices}
                settings={settings}
                presets={presets}
                onSave={saveInv}
                onCancel={() => go({ section: 'invoices' })}
                onAddPreset={(p) => attempt(async () => setPresets(await addPreset(p)))}
              />
            ) : (
              <p className="alist__empty">That invoice doesn’t exist any more.</p>
            ))}

          {isSettings &&
            (invLoading ? (
              <p className="alist__empty">Loading…</p>
            ) : (
              <InvoiceSettings
                key={settings.businessName + settings.bankAccount + settings.gstRegistered}
                settings={settings}
                presets={presets}
                onSave={(s) => attempt(async () => setSettings(await saveInvoiceSettings(s)))}
                onDeletePreset={(id) => attempt(async () => setPresets(await deletePreset(id)))}
                onBack={() => go({ section: 'invoices' })}
              />
            ))}
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

        {showInvPanel && (
          <aside className="adm-panel" aria-label="Invoice details">
            <InvoicePanel
              key={invoice.id}
              invoice={invoice}
              client={clientsById.get(invoice.clientId)}
              settings={settings}
              onClose={() => setInvId(null)}
              onEdit={() => go({ section: 'invoices', view: 'edit', id: invoice.id })}
              onDuplicate={() => duplicateInvoice(invoice)}
              onDelete={() => removeInvoice(invoice)}
              onPrint={() => {
                setJustSent(false);
                go({ section: 'invoices', view: 'print', id: invoice.id });
              }}
              onMarkSent={() => attempt(async () => replaceInvoice(await setInvoiceStatus(invoice.id, 'sent')))}
              onAddPayment={(p) => attempt(async () => replaceInvoice(await addPayment(invoice.id, p)))}
              onDeletePayment={(pid) => attempt(async () => replaceInvoice(await deletePayment(invoice.id, pid)))}
              onOpenClient={() => {
                go({ section: 'clients' });
                openClient(invoice.clientId);
              }}
            />
          </aside>
        )}

        {section === 'clients' && panel && (
          <aside className="adm-panel" aria-label="Client details">
            {panel === 'view' && selected && (
              <ClientPanel
                key={selected.id}
                client={selected}
                invoices={invoices.filter((i) => i.clientId === selected.id)}
                onClose={() => setPanel(null)}
                onEdit={() => setPanel('edit')}
                onDelete={() => remove([selected.id])}
                onNewInvoice={() => newInvoice({ clientId: selected.id })}
                onOpenInvoice={(id) => {
                  setInvId(id);
                  go({ section: 'invoices' });
                }}
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
