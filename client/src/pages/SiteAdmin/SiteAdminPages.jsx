import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SiteAdminLogin from './SiteAdminLogin'
import styles from './SiteAdminPages.module.css'

async function siteApi(path, opts = {}) {
  const res = await fetch(`/api/site-admin${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

function NavPlacementBadge({ showInNav, showInFooter }) {
  let label, color
  if (showInNav && showInFooter) { label = 'Navbar + Footer'; color = '#60a5fa' }
  else if (showInNav)            { label = 'Navbar only';     color = '#a78bfa' }
  else if (showInFooter)         { label = 'Footer only';     color = '#94a3b8' }
  else                           { label = 'Hidden';          color = '#475569' }
  return <span className={styles.placementBadge} style={{ '--badge-color': color }}>{label}</span>
}

function NavPlacementSelector({ showInNav, showInFooter, onChange }) {
  const options = [
    { nav: true,  footer: true,  label: 'Navbar + Footer' },
    { nav: true,  footer: false, label: 'Navbar only' },
    { nav: false, footer: true,  label: 'Footer only' },
    { nav: false, footer: false, label: 'Hidden' },
  ]
  return (
    <div className={styles.placementOptions}>
      {options.map(opt => {
        const active = showInNav === opt.nav && showInFooter === opt.footer
        return (
          <button
            key={opt.label}
            className={active ? styles.placementOptActive : styles.placementOpt}
            onClick={() => onChange(opt.nav, opt.footer)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function CreatePageModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [showInNav, setShowInNav] = useState(true)
  const [showInFooter, setShowInFooter] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleTitleChange(e) {
    const val = e.target.value
    setTitle(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  function handleSlugChange(e) {
    setSlugEdited(true)
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return setError('Title is required')
    if (!slug.trim()) return setError('Slug is required')
    setSaving(true); setError('')
    try {
      const data = await siteApi('/pages', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), slug: slug.trim(), show_in_nav: showInNav, show_in_footer: showInFooter }),
      })
      onCreate(data.slug)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New page</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <input
              className={styles.input}
              value={title}
              onChange={handleTitleChange}
              placeholder="e.g. About Beacon"
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>URL slug</label>
            <div className={styles.slugRow}>
              <span className={styles.slugPrefix}>/</span>
              <input
                className={styles.input}
                value={slug}
                onChange={handleSlugChange}
                placeholder="about-beacon"
                style={{ flex: 1 }}
              />
            </div>
            <span className={styles.fieldHint}>beaconscreen.com/{slug || '…'}</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Navigation placement</label>
            <NavPlacementSelector
              showInNav={showInNav}
              showInFooter={showInFooter}
              onChange={(nav, footer) => { setShowInNav(nav); setShowInFooter(footer) }}
            />
          </div>
          {error && <p className={styles.errorMsg}>{error}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.createBtn} disabled={saving}>
              {saving ? 'Creating…' : 'Create page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PageSettingsModal({ page, onClose, onSave }) {
  const [title, setTitle]           = useState(page.title)
  const [slug, setSlug]             = useState(page.slug)
  const [slugEdited, setSlugEdited] = useState(false)
  const [showInNav, setShowInNav]   = useState(page.show_in_nav)
  const [showInFooter, setShowInFooter] = useState(page.show_in_footer)
  const [error, setError]           = useState('')
  const [saving, setSaving]         = useState(false)

  function handleTitleChange(e) {
    const val = e.target.value
    setTitle(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  function handleSlugChange(e) {
    setSlugEdited(true)
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const data = await siteApi(`/pages/${page.slug}/settings`, {
        method: 'PATCH',
        body: JSON.stringify({ title, slug, show_in_nav: showInNav, show_in_footer: showInFooter }),
      })
      onSave(data.slug)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Page settings</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <input className={styles.input} value={title} onChange={handleTitleChange} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>URL slug</label>
            <div className={styles.slugRow}>
              <span className={styles.slugPrefix}>/</span>
              <input className={styles.input} value={slug} onChange={handleSlugChange} style={{ flex: 1 }} />
            </div>
            <span className={styles.fieldHint}>beaconscreen.com/{slug || '…'}</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Navigation placement</label>
            <NavPlacementSelector
              showInNav={showInNav}
              showInFooter={showInFooter}
              onChange={(nav, footer) => { setShowInNav(nav); setShowInFooter(footer) }}
            />
          </div>
          {error && <p className={styles.errorMsg}>{error}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.createBtn} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ page, onConfirm, onCancel, deleting }) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} style={{ maxWidth: 400 }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Delete page?</h2>
        </div>
        <p className={styles.confirmMsg}>
          Permanently delete <strong>{page.title}</strong> (<code>/{page.slug}</code>) and all its content?
          This can't be undone.
        </p>
        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onCancel} disabled={deleting}>Cancel</button>
          <button className={styles.deleteBtn} onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PagesList({ pages, onRefresh }) {
  const navigate = useNavigate()
  const [showCreate, setShowCreate]     = useState(false)
  const [settingsPage, setSettingsPage] = useState(null)
  const [deletePage, setDeletePage]     = useState(null)
  const [deleting, setDeleting]         = useState(false)

  async function handleDelete() {
    if (!deletePage) return
    setDeleting(true)
    try {
      await siteApi(`/pages/${deletePage.slug}`, { method: 'DELETE' })
      setDeletePage(null)
      onRefresh()
    } catch (err) {
      alert(err.message)
    } finally { setDeleting(false) }
  }

  return (
    <>
      <header className={styles.topBar}>
        <Link to="/admin" className={styles.backLink}>← Site Admin</Link>
        <span className={styles.topBarTitle}>Pages</span>
        <button className={styles.newBtn} onClick={() => setShowCreate(true)}>+ New page</button>
      </header>

      <main className={styles.main}>
        {pages.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyMsg}>No custom pages yet.</p>
            <button className={styles.newBtn} onClick={() => setShowCreate(true)}>Create your first page</button>
          </div>
        ) : (
          <div className={styles.pageList}>
            {pages.map(p => (
              <div key={p.id} className={styles.pageRow}>
                <div className={styles.pageInfo}>
                  <span className={styles.pageTitle}>{p.title}</span>
                  <code className={styles.pageSlug}>/{p.slug}</code>
                  <NavPlacementBadge showInNav={p.show_in_nav} showInFooter={p.show_in_footer} />
                </div>
                <div className={styles.pageActions}>
                  <button className={styles.settingsBtn} onClick={() => setSettingsPage(p)} title="Page settings">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </button>
                  <a className={styles.previewBtn} href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" title="Preview">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                  <button className={styles.editBtn} onClick={() => navigate(`/admin/pages/${p.slug}`)}>Edit</button>
                  <button className={styles.delBtn} onClick={() => setDeletePage(p)} title="Delete">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreatePageModal
          onClose={() => setShowCreate(false)}
          onCreate={slug => { setShowCreate(false); navigate(`/admin/pages/${slug}`) }}
        />
      )}
      {settingsPage && (
        <PageSettingsModal
          page={settingsPage}
          onClose={() => setSettingsPage(null)}
          onSave={() => { setSettingsPage(null); onRefresh() }}
        />
      )}
      {deletePage && (
        <DeleteConfirm
          page={deletePage}
          onConfirm={handleDelete}
          onCancel={() => setDeletePage(null)}
          deleting={deleting}
        />
      )}
    </>
  )
}

export default function SiteAdminPages() {
  const [authenticated, setAuthenticated] = useState(null)
  const [pages, setPages] = useState([])
  const [loadErr, setLoadErr] = useState('')

  useEffect(() => {
    siteApi('/me')
      .then(d => setAuthenticated(d.authenticated))
      .catch(() => setAuthenticated(false))
  }, [])

  async function loadPages() {
    try {
      const data = await siteApi('/pages')
      setPages(data.pages || [])
    } catch (err) {
      setLoadErr(err.message)
    }
  }

  useEffect(() => {
    if (authenticated) loadPages()
  }, [authenticated])

  if (authenticated === null) return null
  if (!authenticated) return <SiteAdminLogin onAuth={() => setAuthenticated(true)} />
  if (loadErr) return <div style={{ padding: 40, color: '#f87171' }}>{loadErr}</div>

  return (
    <div className={styles.page}>
      <PagesList pages={pages} onRefresh={loadPages} />
    </div>
  )
}
