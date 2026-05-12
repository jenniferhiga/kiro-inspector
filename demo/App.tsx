import { useState } from 'react'
import { KiroInspector } from '../src'

// SVG Icons
const RunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>
  </svg>
)

const MapIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z"/>
    <path d="M9 4v13"/>
    <path d="M15 7v13"/>
  </svg>
)

const RouteMap = () => (
  <svg width="100%" height="180" viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Dark map background */}
    <rect width="400" height="180" fill="#242428"/>
    {/* Grid streets */}
    <path d="M0 45h400M0 90h400M0 135h400" stroke="#3a3a3f" strokeWidth="1"/>
    <path d="M80 0v180M160 0v180M240 0v180M320 0v180" stroke="#3a3a3f" strokeWidth="1"/>
    {/* Parks/blocks */}
    <rect x="85" y="50" width="70" height="35" rx="2" fill="#2d3a2d"/>
    <rect x="245" y="95" width="70" height="35" rx="2" fill="#2d3a2d"/>
    <rect x="165" y="140" width="50" height="35" rx="2" fill="#2d3a2d"/>
    {/* Water feature */}
    <path d="M0 160c40-10 80 5 120-5s80-20 120-10 80 15 120 5 40-15 40-15v45H0z" fill="#1a2a3a"/>
    {/* Route line */}
    <path 
      d="M30 140 L80 140 L80 90 L160 90 L160 45 L240 45 L240 90 L320 90 L320 50 L370 50" 
      stroke="#FC4C02" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill="none"
    />
    {/* Start marker */}
    <circle cx="30" cy="140" r="6" fill="#FC4C02"/>
    <circle cx="30" cy="140" r="3" fill="#fff"/>
    {/* End marker */}
    <rect x="364" y="44" width="12" height="12" rx="2" fill="#FC4C02"/>
    <path d="M367 47v6M370 47v6M373 47v6" stroke="#fff" strokeWidth="1"/>
  </svg>
)

const StravaLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="#FC4C02">
    <path d="M17.78 25.24l-3.63-7.15-3.63 7.15h-2.9l6.53-12.86 6.53 12.86h-2.9zm-7.26-14.29l3.63 7.15 1.45-2.86-2.18-4.29h-2.9zm10.16 0h-2.9l-2.18 4.29 1.45 2.86 3.63-7.15z"/>
  </svg>
)

const runs = [
  { id: 1, date: 'May 12', distance: '5.2 km', time: '28:34', pace: "5'30\"", elevation: '42m' },
  { id: 2, date: 'May 10', distance: '3.1 km', time: '16:45', pace: "5'24\"", elevation: '18m' },
  { id: 3, date: 'May 8', distance: '8.0 km', time: '45:12', pace: "5'39\"", elevation: '87m' },
  { id: 4, date: 'May 6', distance: '4.5 km', time: '24:30', pace: "5'27\"", elevation: '31m' },
]

const ORANGE = '#FC4C02'

export default function App() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState<typeof runs[0] | null>(null)

  const openRunDetails = (run: typeof runs[0]) => {
    setSelectedRun(run)
    setModalOpen(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StravaLogo />
            <span style={{ fontWeight: 700, fontSize: 18, color: '#242428' }}>RunTrack</span>
          </div>
          <button style={{ background: ORANGE, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            + Record
          </button>
        </div>
      </header>

      {/* This Week Stats */}
      <div style={{ background: '#f7f7fa', padding: '20px 16px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6d6d78', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>This Week</div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#242428' }}>20.8</div>
              <div style={{ fontSize: 13, color: '#6d6d78' }}>Kilometers</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#242428' }}>4</div>
              <div style={{ fontSize: 13, color: '#6d6d78' }}>Activities</div>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#242428' }}>178</div>
              <div style={{ fontSize: 13, color: '#6d6d78' }}>Elevation (m)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6d6d78', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Your Activities</div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {runs.map(run => (
            <div
              key={run.id}
              onClick={() => openRunDetails(run)}
              style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}
            >
              {/* Activity header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: ORANGE, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RunIcon />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#242428', fontSize: 15 }}>Morning Run</div>
                  <div style={{ fontSize: 13, color: '#6d6d78' }}>{run.date} • San Francisco, CA</div>
                </div>
              </div>
              
              {/* Stats row */}
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#242428' }}>{run.distance}</div>
                  <div style={{ fontSize: 12, color: '#6d6d78' }}>Distance</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#242428' }}>{run.pace}</div>
                  <div style={{ fontSize: 12, color: '#6d6d78' }}>Pace</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#242428' }}>{run.time}</div>
                  <div style={{ fontSize: 12, color: '#6d6d78' }}>Time</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#242428' }}>{run.elevation}</div>
                  <div style={{ fontSize: 12, color: '#6d6d78' }}>Elev Gain</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && selectedRun && (
        <>
          <div
            onClick={() => setModalOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
          />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', borderRadius: 12, zIndex: 50, width: '90%', maxWidth: 420, maxHeight: '85vh', overflow: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: ORANGE, textTransform: 'uppercase', letterSpacing: 0.5 }}>Run</div>
                <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#242428' }}>Morning Run</h2>
                <div style={{ fontSize: 14, color: '#6d6d78', marginTop: 4 }}>{selectedRun.date} at 7:32 AM</div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6d6d78', fontSize: 20 }}>✕</button>
            </div>
            
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', borderBottom: '1px solid #eee' }}>
              <div style={{ padding: 20, borderRight: '1px solid #eee', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#242428' }}>{selectedRun.distance}</div>
                <div style={{ fontSize: 13, color: '#6d6d78' }}>Distance</div>
              </div>
              <div style={{ padding: 20, borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#242428' }}>{selectedRun.time}</div>
                <div style={{ fontSize: 13, color: '#6d6d78' }}>Moving Time</div>
              </div>
              <div style={{ padding: 20, borderRight: '1px solid #eee' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#242428' }}>{selectedRun.pace}</div>
                <div style={{ fontSize: 13, color: '#6d6d78' }}>Avg Pace</div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#242428' }}>{selectedRun.elevation}</div>
                <div style={{ fontSize: 13, color: '#6d6d78' }}>Elev Gain</div>
              </div>
            </div>

            {/* Map */}
            <div style={{ margin: 16, borderRadius: 8, overflow: 'hidden' }}>
              <RouteMap />
            </div>

            {/* Actions */}
            <div style={{ padding: '16px 20px 20px', display: 'flex', gap: 12 }}>
              <button style={{ flex: 1, padding: '14px', background: ORANGE, color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Share Activity
              </button>
              <button
                onClick={() => setModalOpen(false)}
                style={{ flex: 1, padding: '14px', background: '#f0f0f0', color: '#242428', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      <KiroInspector />
    </div>
  )
}
