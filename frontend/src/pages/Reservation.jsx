import { useState, useEffect } from 'react'
import { format, addDays, startOfToday } from 'date-fns'
import { fr } from 'date-fns/locale'

import API_BASE from '../api'
const API = API_BASE

const ETAPES = ['Service', 'Créneau', 'Coordonnées', 'Confirmation']

export default function Reservation() {
  const [etape, setEtape] = useState(0)
  const [services, setServices] = useState([])
  const [serviceChoisi, setServiceChoisi] = useState(null)
  const [dateChoisie, setDateChoisie] = useState(format(startOfToday(), 'yyyy-MM-dd'))
  const [creneaux, setCreneaux] = useState([])
  const [creneauChoisi, setCreneauChoisi] = useState(null)
  const [form, setForm] = useState({ nom: '', email: '', tel: '' })
  const [reservation, setReservation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/services/`)
      .then(r => r.json())
      .then(setServices)
      .catch(() => setError('Impossible de charger les services'))
  }, [])

  useEffect(() => {
    if (!serviceChoisi || !dateChoisie) return
    setLoading(true)
    setCreneaux([])
    setCreneauChoisi(null)
    fetch(`${API}/reservations/creneaux?service_id=${serviceChoisi.id}&date_str=${dateChoisie}`)
      .then(r => r.json())
      .then(setCreneaux)
      .catch(() => setError('Impossible de charger les créneaux'))
      .finally(() => setLoading(false))
  }, [serviceChoisi, dateChoisie])

  const confirmer = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/reservations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceChoisi.id,
          client_nom: form.nom,
          client_email: form.email,
          client_tel: form.tel,
          debut: creneauChoisi.debut,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Une erreur est survenue')
        return
      }
      const data = await res.json()
      setReservation(data)
      setEtape(3)
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const jours = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i))

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.titre}>Maison RB</h1>
        <p style={styles.sousTitre}>Réservation en ligne</p>
      </header>

      <div style={styles.stepper}>
        {ETAPES.map((e, i) => (
          <div key={e} style={{ ...styles.step, ...(i === etape ? styles.stepActive : i < etape ? styles.stepDone : {}) }}>
            <span style={styles.stepNum}>{i < etape ? '✓' : i + 1}</span>
            <span style={styles.stepLabel}>{e}</span>
          </div>
        ))}
      </div>

      <main style={styles.main}>
        {error && <div style={styles.error}>{error}</div>}

        {/* Étape 0 : Service */}
        {etape === 0 && (
          <div>
            <h2 style={styles.sectionTitle}>Choisissez votre service</h2>
            <div style={styles.grid}>
              {services.map(s => (
                <button
                  key={s.id}
                  style={{ ...styles.card, ...(serviceChoisi?.id === s.id ? styles.cardSelected : {}) }}
                  onClick={() => setServiceChoisi(s)}
                >
                  <span style={styles.cardNom}>{s.nom}</span>
                  <span style={styles.cardInfo}>{s.duree_min} min · {Number(s.prix).toFixed(0)} €</span>
                </button>
              ))}
            </div>
            <div style={styles.footer}>
              <button
                style={{ ...styles.btn, ...(!serviceChoisi ? styles.btnDisabled : {}) }}
                disabled={!serviceChoisi}
                onClick={() => setEtape(1)}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 1 : Créneau */}
        {etape === 1 && (
          <div>
            <h2 style={styles.sectionTitle}>Choisissez un créneau</h2>
            <div style={styles.joursScroll}>
              {jours.map(j => {
                const val = format(j, 'yyyy-MM-dd')
                return (
                  <button
                    key={val}
                    style={{ ...styles.jourBtn, ...(dateChoisie === val ? styles.jourBtnActive : {}) }}
                    onClick={() => setDateChoisie(val)}
                  >
                    <span style={styles.jourNom}>{format(j, 'EEE', { locale: fr })}</span>
                    <span style={styles.jourNum}>{format(j, 'd')}</span>
                  </button>
                )
              })}
            </div>
            {loading ? (
              <p style={styles.loading}>Chargement...</p>
            ) : creneaux.length === 0 ? (
              <p style={styles.vide}>Aucun créneau disponible ce jour.</p>
            ) : (
              <div style={styles.creneauxGrid}>
                {creneaux.map(c => (
                  <button
                    key={c.debut}
                    disabled={!c.disponible}
                    style={{
                      ...styles.creneauBtn,
                      ...(creneauChoisi?.debut === c.debut ? styles.creneauBtnSelected : {}),
                      ...(!c.disponible ? styles.creneauBtnPris : {}),
                    }}
                    onClick={() => c.disponible && setCreneauChoisi(c)}
                  >
                    {format(new Date(c.debut), 'HH:mm')}
                  </button>
                ))}
              </div>
            )}
            <div style={styles.footer}>
              <button style={{ ...styles.btnSecondaire }} onClick={() => setEtape(0)}>Retour</button>
              <button
                style={{ ...styles.btn, ...(!creneauChoisi ? styles.btnDisabled : {}) }}
                disabled={!creneauChoisi}
                onClick={() => setEtape(2)}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 : Coordonnées */}
        {etape === 2 && (
          <div>
            <h2 style={styles.sectionTitle}>Vos coordonnées</h2>
            <div style={styles.recap}>
              <strong>{serviceChoisi.nom}</strong> · {format(new Date(creneauChoisi.debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nom complet</label>
              <input style={styles.input} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Jean Dupont" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input style={styles.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jean@example.com" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Téléphone</label>
              <input style={styles.input} type="tel" value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} placeholder="06 12 34 56 78" />
            </div>
            <div style={styles.footer}>
              <button style={styles.btnSecondaire} onClick={() => setEtape(1)}>Retour</button>
              <button
                style={{ ...styles.btn, ...((!form.nom || !form.email || !form.tel || loading) ? styles.btnDisabled : {}) }}
                disabled={!form.nom || !form.email || !form.tel || loading}
                onClick={confirmer}
              >
                {loading ? 'Confirmation...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 : Confirmation */}
        {etape === 3 && reservation && (
          <div style={styles.confirmation}>
            <div style={styles.checkmark}>✓</div>
            <h2 style={styles.confirmTitre}>Réservation confirmée !</h2>
            <p style={styles.confirmTexte}>
              Bonjour {reservation.client_nom}, votre rendez-vous pour{' '}
              <strong>{serviceChoisi.nom}</strong> est confirmé le{' '}
              <strong>{format(new Date(reservation.debut), "EEEE d MMMM 'à' HH:mm", { locale: fr })}</strong>.
            </p>
            <p style={{ ...styles.confirmTexte, marginTop: '0.5rem' }}>
              Un email de confirmation a été envoyé à <strong>{reservation.client_email}</strong>.
            </p>
            <button style={{ ...styles.btn, marginTop: '2rem' }} onClick={() => { setEtape(0); setServiceChoisi(null); setCreneauChoisi(null); setForm({ nom: '', email: '', tel: '' }); setReservation(null) }}>
              Nouvelle réservation
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#fafafa' },
  header: { background: '#1a1a1a', color: '#fafafa', textAlign: 'center', padding: '2rem 1rem 1.5rem' },
  titre: { fontSize: '2rem', letterSpacing: '0.15em', textTransform: 'uppercase' },
  sousTitre: { color: '#b8963e', marginTop: '0.3rem', letterSpacing: '0.1em', fontSize: '0.9rem' },
  stepper: { display: 'flex', background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0' },
  step: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.75rem 0.5rem', color: '#999', fontSize: '0.75rem', gap: '0.25rem' },
  stepActive: { color: '#b8963e', borderBottom: '2px solid #b8963e' },
  stepDone: { color: '#1a1a1a' },
  stepNum: { width: 24, height: 24, borderRadius: '50%', background: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontStyle: 'normal' },
  stepLabel: { fontFamily: 'sans-serif' },
  main: { maxWidth: 600, margin: '0 auto', padding: '2rem 1rem' },
  sectionTitle: { fontSize: '1.25rem', marginBottom: '1.5rem', color: '#1a1a1a' },
  error: { background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontFamily: 'sans-serif', fontSize: '0.875rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' },
  card: { background: '#fff', border: '2px solid #e8e8e8', borderRadius: 8, padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', transition: 'border-color 0.15s' },
  cardSelected: { borderColor: '#b8963e', background: '#fdf9f2' },
  cardNom: { fontSize: '1rem', color: '#1a1a1a' },
  cardInfo: { fontFamily: 'sans-serif', fontSize: '0.8rem', color: '#6b6b6b' },
  joursScroll: { display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' },
  jourBtn: { flexShrink: 0, width: 52, padding: '0.6rem 0', background: '#fff', border: '2px solid #e8e8e8', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem', fontFamily: 'sans-serif' },
  jourBtnActive: { borderColor: '#b8963e', background: '#fdf9f2' },
  jourNom: { fontSize: '0.65rem', textTransform: 'uppercase', color: '#6b6b6b' },
  jourNum: { fontSize: '1.1rem', color: '#1a1a1a' },
  creneauxGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' },
  creneauBtn: { padding: '0.6rem 1.2rem', background: '#fff', border: '2px solid #e8e8e8', borderRadius: 8, fontFamily: 'sans-serif', fontSize: '0.95rem', color: '#1a1a1a' },
  creneauBtnSelected: { borderColor: '#b8963e', background: '#fdf9f2', color: '#b8963e' },
  creneauBtnPris: { background: '#f0f0f0', borderColor: '#e0e0e0', color: '#bbb', cursor: 'not-allowed', textDecoration: 'line-through' },
  loading: { textAlign: 'center', color: '#6b6b6b', fontFamily: 'sans-serif', padding: '2rem' },
  vide: { textAlign: 'center', color: '#6b6b6b', fontFamily: 'sans-serif', padding: '2rem' },
  recap: { background: '#f5f5f5', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontFamily: 'sans-serif', fontSize: '0.9rem', color: '#1a1a1a' },
  formGroup: { marginBottom: '1.25rem' },
  label: { display: 'block', fontFamily: 'sans-serif', fontSize: '0.8rem', color: '#6b6b6b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { width: '100%', padding: '0.75rem 1rem', border: '2px solid #e8e8e8', borderRadius: 8, fontSize: '1rem', outline: 'none', fontFamily: 'sans-serif' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e8e8e8' },
  btn: { background: '#1a1a1a', color: '#fafafa', border: 'none', borderRadius: 8, padding: '0.75rem 2rem', fontSize: '0.95rem', fontFamily: 'sans-serif', letterSpacing: '0.05em', cursor: 'pointer' },
  btnDisabled: { background: '#ccc', cursor: 'not-allowed' },
  btnSecondaire: { background: 'transparent', color: '#6b6b6b', border: '2px solid #e8e8e8', borderRadius: 8, padding: '0.75rem 1.5rem', fontSize: '0.95rem', fontFamily: 'sans-serif' },
  confirmation: { textAlign: 'center', padding: '2rem 0' },
  checkmark: { width: 64, height: 64, background: '#b8963e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', color: '#fff', margin: '0 auto 1.5rem' },
  confirmTitre: { fontSize: '1.5rem', marginBottom: '1rem' },
  confirmTexte: { fontFamily: 'sans-serif', color: '#6b6b6b', lineHeight: 1.6 },
}
