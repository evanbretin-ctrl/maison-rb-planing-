import { useState, useEffect } from 'react'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'

import API_BASE from '../api'
const API = API_BASE

export default function Admin() {
  const [autentifie, setAuthentifie] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const login = async (e) => {
    e.preventDefault()
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setAuthentifie(true)
    } else {
      setLoginError('Mot de passe incorrect')
    }
  }

  if (!autentifie) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitre}>Maison RB</h1>
          <p style={styles.loginSub}>Espace coiffeur</p>
          <form onSubmit={login} style={styles.loginForm}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
              style={styles.input}
            />
            {loginError && <p style={styles.erreur}>{loginError}</p>}
            <button type="submit" style={styles.btn}>Connexion</button>
          </form>
        </div>
      </div>
    )
  }

  return <Dashboard />
}

function Dashboard() {
  const [onglet, setOnglet] = useState('agenda')
  const [semaine, setSemaine] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [reservations, setReservations] = useState([])
  const [services, setServices] = useState([])
  const [blocages, setBlocages] = useState([])
  const [horaires, setHoraires] = useState([])

  useEffect(() => { fetchReservations() }, [semaine])
  useEffect(() => { fetchServices(); fetchBlocages(); fetchHoraires() }, [])

  const fetchReservations = async () => {
    const jours = Array.from({ length: 7 }, (_, i) => format(addDays(semaine, i), 'yyyy-MM-dd'))
    const results = await Promise.all(
      jours.map(d => fetch(`${API}/reservations/?date_str=${d}`).then(r => r.json()))
    )
    setReservations(results.flat())
  }

  const fetchServices = () => fetch(`${API}/services/?actif_only=false`).then(r => r.json()).then(setServices)
  const fetchBlocages = () => fetch(`${API}/blocages/`).then(r => r.json()).then(setBlocages)
  const fetchHoraires = () => fetch(`${API}/horaires/`).then(r => r.json()).then(setHoraires)

  const annulerReservation = async (id) => {
    if (!confirm('Annuler cette réservation ?')) return
    await fetch(`${API}/reservations/${id}/annuler`, { method: 'PATCH' })
    fetchReservations()
  }

  const toggleService = async (s) => {
    await fetch(`${API}/services/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !s.actif }),
    })
    fetchServices()
  }

  const supprimerBlocage = async (id) => {
    await fetch(`${API}/blocages/${id}`, { method: 'DELETE' })
    fetchBlocages()
  }

  const jours = Array.from({ length: 7 }, (_, i) => addDays(semaine, i))
  const dateAujourdhui = format(new Date(), 'yyyy-MM-dd')
  const resasAujourdhui = reservations.filter(r => r.debut.startsWith(dateAujourdhui) && r.statut !== 'annulee')

  return (
    <div style={styles.dashboard}>
      <aside style={styles.sidebar}>
        <h2 style={styles.sidebarTitre}>Maison RB</h2>
        {['agenda', 'services', 'blocages'].map(o => (
          <button key={o} style={{ ...styles.navBtn, ...(onglet === o ? styles.navBtnActive : {}) }} onClick={() => setOnglet(o)}>
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </button>
        ))}
      </aside>

      <main style={styles.mainContent}>
        {/* AGENDA */}
        {onglet === 'agenda' && (
          <div>
            <div style={styles.agendaHeader}>
              <button style={styles.navSemBtn} onClick={() => setSemaine(subWeeks(semaine, 1))}>‹</button>
              <h2 style={styles.sectionTitle}>
                Semaine du {format(semaine, 'd MMMM', { locale: fr })}
              </h2>
              <button style={styles.navSemBtn} onClick={() => setSemaine(addWeeks(semaine, 1))}>›</button>
            </div>

            <div style={styles.joursList}>
              {jours.map(jour => {
                const dateStr = format(jour, 'yyyy-MM-dd')
                const resasJour = reservations.filter(r => r.debut.startsWith(dateStr) && r.statut !== 'annulee')
                const estAujourdhui = dateStr === dateAujourdhui
                return (
                  <div key={dateStr} style={{ ...styles.jourCard, ...(estAujourdhui ? styles.jourCardAujourdhui : {}) }}>
                    <div style={styles.jourCardHeader}>
                      <span style={styles.jourCardNom}>{format(jour, 'EEEE d', { locale: fr })}</span>
                      <span style={styles.jourCardCount}>{resasJour.length} RDV</span>
                    </div>
                    {resasJour.length === 0 ? (
                      <p style={styles.jourVide}>Aucun rendez-vous</p>
                    ) : resasJour.map(r => (
                      <div key={r.id} style={styles.resaItem}>
                        <div style={styles.resaHeure}>{format(new Date(r.debut), 'HH:mm')}</div>
                        <div style={styles.resaInfo}>
                          <span style={styles.resaNom}>{r.client_nom}</span>
                          <span style={styles.resaTel}>{r.client_tel}</span>
                        </div>
                        <button style={styles.annulerBtn} onClick={() => annulerReservation(r.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SERVICES */}
        {onglet === 'services' && (
          <div>
            <h2 style={styles.sectionTitle}>Gestion des services</h2>
            <NouveauService onCreated={fetchServices} />
            <div style={{ marginTop: '1.5rem' }}>
              {services.map(s => (
                <div key={s.id} style={styles.serviceItem}>
                  <div>
                    <span style={styles.serviceNom}>{s.nom}</span>
                    <span style={styles.serviceInfo}>{s.duree_min} min · {Number(s.prix).toFixed(0)} €</span>
                  </div>
                  <button
                    style={{ ...styles.toggleBtn, ...(s.actif ? styles.toggleBtnActif : styles.toggleBtnInactif) }}
                    onClick={() => toggleService(s)}
                  >
                    {s.actif ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BLOCAGES */}
        {onglet === 'blocages' && (
          <div>
            <h2 style={styles.sectionTitle}>Blocages de créneaux</h2>
            <NouveauBlocage onCreated={fetchBlocages} />
            <div style={{ marginTop: '1.5rem' }}>
              {blocages.length === 0 ? (
                <p style={styles.vide}>Aucun blocage en cours.</p>
              ) : blocages.map(b => (
                <div key={b.id} style={styles.blocageItem}>
                  <div>
                    <span style={styles.blocageDates}>
                      {format(new Date(b.debut), 'dd/MM HH:mm')} → {format(new Date(b.fin), 'dd/MM HH:mm')}
                    </span>
                    {b.motif && <span style={styles.blocageMotif}>{b.motif}</span>}
                  </div>
                  <button style={styles.supprimerBtn} onClick={() => supprimerBlocage(b.id)}>Supprimer</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function NouveauService({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nom: '', duree_min: 30, prix: 0 })

  const submit = async (e) => {
    e.preventDefault()
    await fetch(`${API}/services/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, duree_min: Number(form.duree_min), prix: Number(form.prix) }),
    })
    setForm({ nom: '', duree_min: 30, prix: 0 })
    setOpen(false)
    onCreated()
  }

  if (!open) return <button style={styles.btnSecondaire} onClick={() => setOpen(true)}>+ Nouveau service</button>

  return (
    <form onSubmit={submit} style={styles.formInline}>
      <input style={styles.inputSm} placeholder="Nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
      <input style={styles.inputSm} type="number" placeholder="Durée (min)" value={form.duree_min} onChange={e => setForm(f => ({ ...f, duree_min: e.target.value }))} required />
      <input style={styles.inputSm} type="number" placeholder="Prix (€)" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))} required />
      <button type="submit" style={styles.btn}>Ajouter</button>
      <button type="button" style={styles.btnSecondaire} onClick={() => setOpen(false)}>Annuler</button>
    </form>
  )
}

function NouveauBlocage({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ debut: '', fin: '', motif: '' })

  const submit = async (e) => {
    e.preventDefault()
    await fetch(`${API}/blocages/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ debut: '', fin: '', motif: '' })
    setOpen(false)
    onCreated()
  }

  if (!open) return <button style={styles.btnSecondaire} onClick={() => setOpen(true)}>+ Nouveau blocage</button>

  return (
    <form onSubmit={submit} style={styles.formInline}>
      <input style={styles.inputSm} type="datetime-local" value={form.debut} onChange={e => setForm(f => ({ ...f, debut: e.target.value }))} required />
      <input style={styles.inputSm} type="datetime-local" value={form.fin} onChange={e => setForm(f => ({ ...f, fin: e.target.value }))} required />
      <input style={styles.inputSm} placeholder="Motif (optionnel)" value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} />
      <button type="submit" style={styles.btn}>Bloquer</button>
      <button type="button" style={styles.btnSecondaire} onClick={() => setOpen(false)}>Annuler</button>
    </form>
  )
}

const styles = {
  loginPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' },
  loginBox: { background: '#fff', borderRadius: 12, padding: '3rem 2.5rem', width: '100%', maxWidth: 360, textAlign: 'center' },
  loginTitre: { fontSize: '1.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' },
  loginSub: { color: '#b8963e', fontFamily: 'sans-serif', fontSize: '0.85rem', marginBottom: '2rem', letterSpacing: '0.1em' },
  loginForm: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  input: { width: '100%', padding: '0.75rem 1rem', border: '2px solid #e8e8e8', borderRadius: 8, fontSize: '1rem', fontFamily: 'sans-serif' },
  inputSm: { padding: '0.5rem 0.75rem', border: '1px solid #e8e8e8', borderRadius: 6, fontSize: '0.875rem', fontFamily: 'sans-serif' },
  erreur: { color: '#cc0000', fontFamily: 'sans-serif', fontSize: '0.875rem' },
  btn: { background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1.5rem', fontSize: '0.95rem', fontFamily: 'sans-serif', cursor: 'pointer' },
  btnSecondaire: { background: 'transparent', color: '#6b6b6b', border: '1px solid #e8e8e8', borderRadius: 8, padding: '0.7rem 1.5rem', fontSize: '0.875rem', fontFamily: 'sans-serif', cursor: 'pointer' },
  dashboard: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: 200, background: '#1a1a1a', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 },
  sidebarTitre: { color: '#b8963e', fontSize: '1rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 'normal' },
  navBtn: { background: 'transparent', color: '#999', border: 'none', borderRadius: 6, padding: '0.6rem 1rem', textAlign: 'left', fontFamily: 'sans-serif', fontSize: '0.9rem', cursor: 'pointer' },
  navBtnActive: { background: 'rgba(184,150,62,0.15)', color: '#b8963e' },
  mainContent: { flex: 1, padding: '2rem', background: '#f5f5f5', overflowY: 'auto' },
  sectionTitle: { fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 'normal', color: '#1a1a1a' },
  agendaHeader: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' },
  navSemBtn: { background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, width: 32, height: 32, fontSize: '1.1rem', cursor: 'pointer' },
  joursList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  jourCard: { background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  jourCardAujourdhui: { border: '2px solid #b8963e' },
  jourCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#fafafa', borderBottom: '1px solid #f0f0f0' },
  jourCardNom: { fontFamily: 'sans-serif', fontSize: '0.85rem', textTransform: 'capitalize', color: '#1a1a1a' },
  jourCardCount: { fontFamily: 'sans-serif', fontSize: '0.75rem', color: '#6b6b6b' },
  jourVide: { padding: '0.75rem 1rem', fontFamily: 'sans-serif', fontSize: '0.8rem', color: '#bbb' },
  resaItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 1rem', borderBottom: '1px solid #f5f5f5' },
  resaHeure: { fontFamily: 'monospace', fontSize: '0.9rem', color: '#b8963e', minWidth: 40 },
  resaInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  resaNom: { fontFamily: 'sans-serif', fontSize: '0.875rem', color: '#1a1a1a' },
  resaTel: { fontFamily: 'sans-serif', fontSize: '0.75rem', color: '#6b6b6b' },
  annulerBtn: { background: 'transparent', border: 'none', color: '#ccc', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem' },
  serviceItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  serviceNom: { display: 'block', fontFamily: 'sans-serif', fontSize: '0.9rem', color: '#1a1a1a' },
  serviceInfo: { display: 'block', fontFamily: 'sans-serif', fontSize: '0.75rem', color: '#6b6b6b', marginTop: '0.15rem' },
  toggleBtn: { border: 'none', borderRadius: 20, padding: '0.3rem 0.9rem', fontFamily: 'sans-serif', fontSize: '0.75rem', cursor: 'pointer' },
  toggleBtnActif: { background: '#e8f5e9', color: '#2e7d32' },
  toggleBtnInactif: { background: '#fafafa', color: '#999' },
  blocageItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  blocageDates: { display: 'block', fontFamily: 'monospace', fontSize: '0.85rem', color: '#1a1a1a' },
  blocageMotif: { display: 'block', fontFamily: 'sans-serif', fontSize: '0.75rem', color: '#6b6b6b', marginTop: '0.15rem' },
  supprimerBtn: { background: 'transparent', border: '1px solid #ffcccc', color: '#cc4444', borderRadius: 6, padding: '0.3rem 0.7rem', fontFamily: 'sans-serif', fontSize: '0.75rem', cursor: 'pointer' },
  formInline: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', background: '#fff', padding: '1rem', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  vide: { color: '#bbb', fontFamily: 'sans-serif', fontSize: '0.875rem' },
}
