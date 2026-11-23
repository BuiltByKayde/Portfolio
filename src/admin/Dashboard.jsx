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
import ReviewList from './ReviewList.jsx';
import { ReviewView, ReviewForm } from './ReviewPanel.jsx';
import { listReviews, createReview, updateReview, deleteReview, loadSampleReviews } from './reviewsStore.js';
import CarePlanList from './CarePlanList.jsx';
import { CarePlanView, CarePlanForm } from './CarePlanPanel.jsx';
import {
  listPlans,
  savePlan,
  setPlanStatus,
  deletePlan,
  addPlanLog,
  deletePlanLog,
  linkPlanInvoice,
  currentPeriod,
  periodLabel,
  minutesLabel,
} from './carePlansStore.js';
import './invoices.css';
import './reviews-admin.css';
import './care-plans.css';

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
  if (p === '/admin/reviews') return { section: 'reviews' };
  if (p === '/admin/care-plans') return { section: 'care' };
  if (p === '/admin/settings') return { section: 'settings' };
  if (p === '/admin/invoices') return { section: 'invoices' };
  if (p === '/admin/invoices/new') return { section: 'invoices', view: 'new' };
  const m = p.match(/^\/admin\/invoices\/([^/]+)\/(edit|print)$/);
  if (m) return { section: 'invoices', view: m[2], id: m[1] };
  return { section: 'clients' };
}

function routePath(r) {
  if (r.section === 'leads') return '/admin/leads';
  if (r.section === 'reviews') return '/admin/reviews';
  if (r.section === 'care') return '/admin/care-plans';
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

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [rvLoading, setRvLoading] = useState(true);
  const [rvFilter, setRvFilter] = useState('all');
  const [rvId, setRvId] = useState(null);
  const [rvPanel, setRvPanel] = useState(null); // 'view' | 'edit' | 'new' | null

  // Care plans
  const [plans, setPlans] = useState([]);
  const [cpLoading, setCpLoading] = useState(true);
  const [cpId, setCpId] = useState(null);
  const [cpPanel, setCpPanel] = useState(null); // 'view' | 'edit' | 'new' | null
  const [cpCreating, setCpCreating] = useState(false);

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

  const refreshPlans = useCallback(async () => {
    setCpLoading(true);
    await attempt(async () => setPlans(await listPlans()));
    setCpLoading(false);
  }, [attempt]);

  const refreshReviews = useCallback(async () => {
    setRvLoading(true);
    await attempt(async () => setReviews(await listReviews()));
    setRvLoading(false);
  }, [attempt]);

  useEffect(() => {
    refresh();
    refreshLeads();
    refreshInvoices();
    refreshReviews();
    refreshPlans();
  }, [refresh, refreshLeads, refreshInvoices, refreshReviews, refreshPlans]);

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
      setRvPanel((p) => (p === 'view' ? null : p));
      setCpPanel((p) => (p === 'view' ? null : p));
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
    setPlans((prev) => prev.filter((p) => !ids.includes(p.clientId)));
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
    setPlans((prev) =>
      prev.map((p) => ({ ...p, invoiceLinks: p.invoiceLinks.filter((l) => l.invoiceId !== inv.id) }))
    );
    setInvId(null);
  }

  // ---------- Care plans ----------

  const period = currentPeriod();
  const invoicesById = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);
  const plan = plans.find((p) => p.id === cpId) ?? null;

  // This month's (or another month's) invoice for a plan, and where it's at.
  const monthOf = (p, per = period) => {
    const link = p.invoiceLinks.find((l) => l.period === per);
    const inv = link ? invoicesById.get(link.invoiceId) : null;
    if (!inv) return { state: 'none', owing: 0, total: 0, inv: null };
    const c = calc(inv);
    return { state: c.state, owing: c.owing, total: c.total, inv };
  };

  const missedPlans = plans.filter((p) => p.status === 'active' && monthOf(p).state === 'overdue').length;

  // The fixed payment reference, if this invoice bills a care plan.
  const planReference = (invoiceId) =>
    plans.find((p) => p.invoiceLinks.some((l) => l.invoiceId === invoiceId))?.reference || '';

  const replacePlan = (updated) => {
    if (!updated) return;
    setPlans((prev) =>
      prev.some((p) => p.id === updated.id) ? prev.map((p) => (p.id === updated.id ? updated : p)) : [updated, ...prev]
    );
  };

  function newPlan() {
    go({ section: 'care' });
    setCpId(null);
    setCpPanel('new');
  }

  async function saveCarePlan(f) {
    const ok = await attempt(async () => {
      const saved = await savePlan(f);
      replacePlan(saved);
      setCpId(saved.id);
    });
    if (ok) setCpPanel('view');
  }

  async function removePlan(p) {
    const name = clientsById.get(p.clientId)?.name || 'this client';
    if (!window.confirm(`Delete the care plan for ${name}? Its invoices are kept. This can't be undone.`)) return;
    if (!(await attempt(() => deletePlan(p.id)))) return;
    setPlans((prev) => prev.filter((x) => x.id !== p.id));
    setCpId(null);
    setCpPanel(null);
  }

  // " Month 2 of a 6-month minimum term (ends April 2027)." while the term is running.
  function planTermNote(p, per) {
    const min = p.minTermMonths;
    if (!min || !p.startedOn) return '';
    const [sy, sm] = p.startedOn.split('-').map(Number);
    const [py, pm] = per.split('-').map(Number);
    const n = py * 12 + pm - (sy * 12 + sm) + 1;
    if (n < 1 || n > min) return '';
    const end = new Date(sy, sm - 1 + min - 1, 1).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });
    return ` Month ${n} of a ${min}-month minimum term (ends ${end}), as set out in your care plan agreement.`;
  }

  // Makes a draft invoice for this month for each plan, and links the two.
  async function createPlanInvoices(list) {
    setCpCreating(true);
    await attempt(async () => {
      let known = invoices;
      const label = periodLabel(period);
      const today = todayISO();
      for (const p of list) {
        const inv = await saveInvoice({
          ...blankInvoice(),
          number: nextNumber(known),
          clientId: p.clientId,
          title: `Website care plan: ${label}`,
          dueOn: dueFromTerms(today, '7'),
          note: `Monthly care plan. Please use the reference ${p.reference || 'on this invoice'} for your automatic payment.${planTermNote(p, period)} New pages or features are quoted separately.`,
          lines: [
            {
              description: `${p.tier} care plan, ${label}${
                p.minutesIncluded ? `: includes up to ${minutesLabel(p.minutesIncluded)} of small changes` : ''
              }`,
              qty: 1,
              rate: p.price,
            },
          ],
        });
        known = [inv, ...known];
        replaceInvoice(inv);
        replacePlan(await linkPlanInvoice(p.id, period, inv.id));
      }
    });
    setCpCreating(false);
  }

  // ---------- Reviews ----------

  const review = reviews.find((r) => r.id === rvId) ?? null;
  const pendingReviews = reviews.filter((r) => r.status === 'pending').length;

  const replaceReview = (updated) => {
    if (!updated) return;
    setReviews((prev) =>
      prev.some((r) => r.id === updated.id) ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated, ...prev]
    );
  };

  function newReview() {
    go({ section: 'reviews' });
    setRvId(null);
    setRvPanel('new');
  }

  async function saveReview(f) {
    // Without permission a review can never be public.
    const fields = f.consent ? f : { ...f, status: 'hidden', featured: false };
    const ok = await attempt(async () => {
      const saved = rvPanel === 'new' ? await createReview(fields) : await updateReview(rvId, fields);
      replaceReview(saved);
      setRvId(saved.id);
    });
    if (ok) setRvPanel('view');
  }

  async function removeReview(r) {
    if (!window.confirm(`Delete ${r.name}'s review? This can't be undone.`)) return;
    if (!(await attempt(() => deleteReview(r.id)))) return;
    setReviews((prev) => prev.filter((x) => x.id !== r.id));
    setRvId(null);
    setRvPanel(null);
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
          reference={planReference(invoice.id)}
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
  const isReviews = section === 'reviews';
  const isEditor = isInvoices && (view === 'new' || view === 'edit');
  const showInvPanel = isInvoices && !view && !!invoice;
  const showRvPanel = isReviews && (rvPanel === 'new' || (!!rvPanel && !!review));
  const isCare = section === 'care';
  const showCpPanel = isCare && (cpPanel === 'new' || (!!cpPanel && !!plan));
  const hasPanel = isLeads
    ? !!lead
    : isInvoices
      ? showInvPanel
      : isReviews
        ? showRvPanel
        : isCare
          ? showCpPanel
          : section === 'clients'
            ? !!panel
            : false;
  const userInitial = (session.email || 'K')[0].toUpperCase();
  const searchLabel = isLeads
    ? 'Search leads'
    : isInvoices
      ? 'Search invoices'
      : isReviews
        ? 'Search reviews'
        : isCare
          ? 'Search care plans'
          : 'Search clients';

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
          {isCare ? (
            <button type="button" className="adm-new" onClick={newPlan}>
              <Icon name="plus" size={22} /> New care plan
            </button>
          ) : isReviews ? (
            <button type="button" className="adm-new" onClick={newReview}>
              <Icon name="plus" size={22} /> Add review
            </button>
          ) : isInvoices || isSettings ? (
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
            <a
              href="/admin/care-plans"
              className={`adm-navitem${isCare ? ' is-active' : ''}`}
              aria-current={isCare ? 'page' : undefined}
              onClick={(e) => go({ section: 'care' }, e)}
            >
              <Icon name="shield" />
              <span>Care plans</span>
              {missedPlans > 0 ? (
                <span className="adm-navitem__warn" aria-label={`${missedPlans} missed payments`}>
                  {missedPlans}
                </span>
              ) : (
                <span className="adm-navitem__count">{plans.filter((p) => p.status === 'active').length}</span>
              )}
            </a>
            <a
              href="/admin/reviews"
              className={`adm-navitem${isReviews ? ' is-active' : ''}`}
              aria-current={isReviews ? 'page' : undefined}
              onClick={(e) => go({ section: 'reviews' }, e)}
            >
              <Icon name="star" />
              <span>Reviews</span>
              {pendingReviews > 0 ? (
                <span className="adm-navitem__pending" aria-label={`${pendingReviews} waiting for approval`}>
                  {pendingReviews}
                </span>
              ) : (
                <span className="adm-navitem__count">{reviews.length}</span>
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

          {isCare && (
            <CarePlanList
              plans={plans}
              clientsById={clientsById}
              loading={cpLoading}
              query={query.trim()}
              period={period}
              monthOf={monthOf}
              selectedId={cpPanel ? cpId : null}
              onOpen={(id) => {
                setCpId(id);
                setCpPanel('view');
                setNavOpen(false);
              }}
              onNew={newPlan}
              onRefresh={() => {
                refreshPlans();
                refreshInvoices();
              }}
              onCreateAll={createPlanInvoices}
              creating={cpCreating}
            />
          )}

          {isReviews && (
            <ReviewList
              reviews={reviews}
              loading={rvLoading}
              query={query.trim()}
              filter={rvFilter}
              onFilter={setRvFilter}
              selectedId={rvPanel ? rvId : null}
              onOpen={(id) => {
                setRvId(id);
                setRvPanel('view');
                setNavOpen(false);
              }}
              onRefresh={refreshReviews}
              onNew={newReview}
              canLoadSamples={!authConnected}
              onLoadSamples={() => attempt(async () => setReviews(await loadSampleReviews()))}
            />
          )}

          {isInvoices && view === 'print' &&<p className="alist__empty">That invoice doesn’t exist any more.</p>}

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

        {showCpPanel && (
          <aside className="adm-panel" aria-label="Care plan details">
            {cpPanel === 'view' && plan && (
              <CarePlanView
                key={plan.id}
                plan={plan}
                client={clientsById.get(plan.clientId)}
                period={period}
                monthOf={monthOf}
                onClose={() => setCpPanel(null)}
                onEdit={() => setCpPanel('edit')}
                onDelete={() => removePlan(plan)}
                onCreateInvoice={() => createPlanInvoices([plan])}
                onOpenInvoice={(id) => {
                  setInvId(id);
                  go({ section: 'invoices' });
                }}
                onOpenClient={() => {
                  go({ section: 'clients' });
                  openClient(plan.clientId);
                }}
                onAddLog={(l) => attempt(async () => replacePlan(await addPlanLog(plan.id, l)))}
                onDeleteLog={(logId) => attempt(async () => replacePlan(await deletePlanLog(plan.id, logId)))}
                onStatus={(status) => attempt(async () => replacePlan(await setPlanStatus(plan.id, status)))}
              />
            )}
            {(cpPanel === 'new' || (cpPanel === 'edit' && plan)) && (
              <CarePlanForm
                key={cpPanel === 'new' ? 'new' : plan.id}
                mode={cpPanel}
                initial={
                  cpPanel === 'edit'
                    ? { ...plan, price: String(plan.price), minutesIncluded: String(plan.minutesIncluded), minTermMonths: String(plan.minTermMonths) }
                    : null
                }
                clients={clients}
                plans={plans}
                onSave={saveCarePlan}
                onCancel={() => setCpPanel(cpPanel === 'edit' ? 'view' : null)}
              />
            )}
          </aside>
        )}

        {showRvPanel && (
          <aside className="adm-panel" aria-label="Review details">
            {rvPanel === 'view' && review && (
              <ReviewView
                key={review.id}
                review={review}
                onClose={() => setRvPanel(null)}
                onEdit={() => setRvPanel('edit')}
                onDelete={() => removeReview(review)}
                onUpdate={(patch) => attempt(async () => replaceReview(await updateReview(review.id, patch)))}
              />
            )}
            {(rvPanel === 'new' || (rvPanel === 'edit' && review)) && (
              <ReviewForm
                key={rvPanel === 'new' ? 'new' : review.id}
                mode={rvPanel}
                initial={rvPanel === 'edit' ? review : null}
                onSave={saveReview}
                onCancel={() => setRvPanel(rvPanel === 'edit' ? 'view' : null)}
              />
            )}
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
