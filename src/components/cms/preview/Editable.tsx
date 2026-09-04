'use client';

import * as React from 'react';

type EditableKind = 'text' | 'multiline' | 'date' | 'tags' | 'image' | 'list';

interface EditableProps {
  kind?: EditableKind;
  value: string;
  onSave: (next: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
  placeholder?: string;
  rows?: number;
}

/**
 * Canva-style inline editor primitive.
 * Display: renders the value. Click → becomes an input/textarea.
 * Blur or Cmd+Enter → saves via onSave. Esc → cancel.
 */
export function Editable({
  kind = 'text',
  value,
  onSave,
  disabled,
  className = '',
  as: Tag = 'span',
  placeholder = 'Click to edit…',
  rows = 4,
}: EditableProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) inputRef.current.select();
    }
  }, [editing]);

  const beginEdit = () => {
    if (disabled) return;
    setError(null);
    setDraft(value);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
    setError(null);
  };

  const commit = async () => {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (kind === 'image') {
    return (
      <ImageEditable
        value={value}
        onSave={onSave}
        disabled={disabled}
        className={className}
        placeholder={placeholder}
      />
    );
  }

  if (kind === 'date') {
    return (
      <DateEditable
        value={value}
        onSave={onSave}
        disabled={disabled}
        className={className}
      />
    );
  }

  if (kind === 'tags') {
    return (
      <TagsEditable
        value={value}
        onSave={onSave}
        disabled={disabled}
        className={className}
      />
    );
  }

  if (kind === 'list') {
    return (
      <div
        onClick={beginEdit}
        title={disabled ? undefined : 'Click to edit'}
        className={
          'inline-flex flex-wrap gap-1.5 ' +
          (disabled ? '' : 'cursor-text hover:outline hover:outline-1 hover:outline-primary/30') +
          ' ' +
          className
        }
      >
        {value
          ? value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider"
                >
                  #{s.replace(/-/g, ' ')}
                </span>
              ))
          : <span className="text-xs text-on-surface-variant italic">{placeholder}</span>}
      </div>
    );
  }

  const isMultiline = kind === 'multiline';

  if (editing && isMultiline) {
    return (
      <div className="relative">
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          disabled={saving}
          rows={rows}
          className={
            'w-full border border-primary bg-surface-container-lowest text-foreground placeholder:text-on-surface-variant/50 px-3 py-2 text-sm font-mono focus:outline-none ' +
            className
          }
        />
        <div className="mt-1 text-[10px] text-on-surface-variant flex items-center gap-2">
          <span>{saving ? 'Saving…' : 'Cmd+Enter save · Esc cancel'}</span>
          {error && <span className="text-error">{error}</span>}
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="relative">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          disabled={saving}
          className={
            'w-full border border-primary bg-surface-container-lowest text-foreground placeholder:text-on-surface-variant/50 px-2 py-1 text-sm focus:outline-none ' +
            className
          }
        />
        {error && <p className="mt-1 text-[10px] text-error">{error}</p>}
      </div>
    );
  }

  return React.createElement(
    Tag,
    {
      onClick: beginEdit,
      title: disabled ? undefined : 'Click to edit',
      className:
        'group/edit ' +
        (disabled
          ? ''
          : 'cursor-text hover:outline hover:outline-1 hover:outline-primary/30 hover:outline-offset-2 transition-all') +
        ' ' +
        className,
    },
    value ? value : <span className="text-on-surface-variant italic text-sm">{placeholder}</span>,
  );
}

function ImageEditable({
  value,
  onSave,
  disabled,
  className,
  placeholder,
}: Pick<EditableProps, 'value' | 'onSave' | 'disabled' | 'className' | 'placeholder'>) {
  const [editing, setEditing] = React.useState(false);
  const [url, setUrl] = React.useState(value);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const save = async (next: string) => {
    setBusy(true);
    setError(null);
    try {
      await onSave(next);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => save(String(reader.result));
    reader.readAsDataURL(file);
  };

  if (editing) {
    return (
      <div className="border border-primary bg-surface-container-lowest p-3 space-y-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste image URL or /public path"
          className="w-full border border-outline/50 bg-surface-container-lowest text-foreground placeholder:text-on-surface-variant/50 px-2 py-1 text-sm font-mono"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <label className="border border-outline-variant bg-surface-container-low px-3 py-1 text-xs font-technical-ui uppercase tracking-[0.18em] cursor-pointer">
            Upload file
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>
          <button
            type="button"
            onClick={() => save(url)}
            disabled={busy}
            className="border border-oxblood bg-oxblood text-white px-3 py-1 text-xs font-technical-ui uppercase tracking-[0.18em]"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              setUrl(value);
              setEditing(false);
              setError(null);
            }}
            className="border border-outline-variant px-3 py-1 text-xs font-technical-ui uppercase tracking-[0.18em]"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      title={disabled ? undefined : 'Click to change image'}
      className={
        'block w-full text-left ' +
        (disabled ? '' : 'cursor-pointer hover:outline hover:outline-1 hover:outline-primary/30') +
        ' ' +
        className
      }
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="cover" className="w-full h-auto" />
      ) : (
        <div className="border border-dashed border-outline-variant h-48 flex items-center justify-center text-on-surface-variant text-xs">
          {placeholder || 'Click to add cover image'}
        </div>
      )}
    </button>
  );
}

function DateEditable({
  value,
  onSave,
  disabled,
  className,
}: Pick<EditableProps, 'value' | 'onSave' | 'disabled' | 'className'>) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  const save = async () => {
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // swallow
    }
  };

  if (editing) {
    return (
      <input
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
        }}
        autoFocus
        className={'border border-primary bg-surface-container-lowest text-foreground px-2 py-1 text-sm ' + className}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className={
        (disabled ? '' : 'cursor-text hover:underline ') + 'inline-flex items-center gap-1.5 ' + className
      }
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-indigo-500"
        aria-hidden
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <span>{value || '—'}</span>
    </button>
  );
}

function TagsEditable({
  value,
  onSave,
  disabled,
  className,
}: Pick<EditableProps, 'value' | 'onSave' | 'disabled' | 'className'>) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  const save = async () => {
    try {
      await onSave(draft);
      setEditing(false);
    } catch {
      // swallow
    }
  };

  if (editing) {
    return (
      <div className="border border-primary bg-surface-container-lowest p-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
          placeholder="comma, separated, tags"
          autoFocus
          className="w-full text-sm font-mono"
        />
        <p className="mt-1 text-[10px] text-on-surface-variant">Enter save · Esc cancel</p>
      </div>
    );
  }

  return (
    <div
      onClick={() => !disabled && setEditing(true)}
      className={
        'flex flex-wrap gap-1.5 ' +
        (disabled ? '' : 'cursor-text hover:outline hover:outline-1 hover:outline-primary/30') +
        ' ' +
        className
      }
    >
      {value
        ? value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s, i) => (
              <span
                key={`${s}-${i}`}
                className="bg-oxblood/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-oxblood dark:bg-primary/10 dark:text-primary"
              >
                {s}
              </span>
            ))
        : <span className="text-xs text-on-surface-variant italic">Add tags…</span>}
    </div>
  );
}
