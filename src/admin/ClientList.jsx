import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';
import { shortDate, initials, domain, tint } from './format.js';

function SelectAll({ checked, indeterminate, onChange, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="acheck"
      aria-label="Select all clients"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

function contactLine(c) {
  return [c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details';
}

export default function ClientList({
  clients,
  total,
  loading,
  query,
  sort,
  onSort,
  checked,
  onToggle,
  onToggleAll,
  selectedId,
  onOpen,
  onDelete,
  onRefresh,
  onNew,
  onLoadSamples,
}) {
  const checkedVisible = clients.filter((c) => checked.has(c.id));
  const allChecked = clients.length > 0 && checkedVisible.length === clients.length;

  return (
    <section className="alist" aria-label="Clients">
      <div className="alist__bar">
        <div className="alist__bar-left">
          <SelectAll
            checked={allChecked}
            indeterminate={checkedVisible.length > 0 && !allChecked}
            onChange={onToggleAll}
            disabled={clients.length === 0}
          />
          {checked.size > 0 ? (
            <>
              <button
                type="button"
                className="aicon"
                aria-label={`Delete ${checked.size} selected`}
                title="Delete selected"
                onClick={() => onDelete([...checked])}
              >
                <Icon name="trash" />
              </button>
              <span className="alist__selected">{checked.size} selected</span>
            </>
          ) : (
            <button type="button" className="aicon" aria-label="Refresh" title="Refresh" onClick={onRefresh}>
              <Icon name="refresh" />
            </button>
          )}
        </div>
        <div className="alist__bar-right">
          <label className="alist__sort">
            <span className="visually-hidden">Sort clients by</span>
            <select value={sort} onChange={(e) => onSort(e.target.value)}>
              <option value="recent">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="business">Business A–Z</option>
            </select>
          </label>
          <span className="alist__count">
            {clients.length === 0 ? '0' : `1–${clients.length}`} of {total}
          </span>
        </div>
      </div>

      {loading ? (
        <p className="alist__empty">Loading clients…</p>
      ) : total === 0 ? (
        <div className="alist__empty">
          <span className="alist__empty-icon">
            <Icon name="users" size={28} />
          </span>
          <h2>No clients yet</h2>
          <p>Add your first client, or load a few made-up ones to try the dashboard.</p>
          <div className="alist__empty-actions">
            <button type="button" className="abtn abtn--primary" onClick={onNew}>
              <Icon name="plus" size={18} /> New client
            </button>
            <button type="button" className="abtn" onClick={onLoadSamples}>
              Load sample clients
            </button>
          </div>
        </div>
      ) : clients.length === 0 ? (
        <p className="alist__empty">No clients match “{query}”.</p>
      ) : (
        <ul className="alist__rows">
          {clients.map((c) => {
            const isChecked = checked.has(c.id);
            return (
              <li
                key={c.id}
                className={`arow${c.id === selectedId ? ' is-selected' : ''}${isChecked ? ' is-checked' : ''}`}
              >
                <input
                  type="checkbox"
                  className="acheck"
                  aria-label={`Select ${c.name}`}
                  checked={isChecked}
                  onChange={() => onToggle(c.id)}
                />
                <button type="button" className="arow__open" onClick={() => onOpen(c.id)}>
                  <span className="aavatar" style={{ '--tint': tint(c.id) }} aria-hidden="true">
                    {initials(c.name)}
                  </span>
                  <span className="arow__name">{c.name}</span>
                  <span className="arow__summary">
                    <span className="arow__business">{c.business || 'No business name'}</span>
                    <span className="arow__contact"> — {contactLine(c)}</span>
                  </span>
                  <span className="arow__site">{c.website ? domain(c.website) : ''}</span>
                  <span className="arow__date">{shortDate(c.createdAt)}</span>
                </button>
                <span className="arow__hover">
                  {(c.comments?.length ?? 0) > 0 && (
                    <span className="arow__notes" title={`${c.comments.length} notes`}>
                      <Icon name="note" size={16} /> {c.comments.length}
                    </span>
                  )}
                  <button
                    type="button"
                    className="aicon"
                    aria-label={`Delete ${c.name}`}
                    title="Delete"
                    onClick={() => onDelete([c.id])}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
