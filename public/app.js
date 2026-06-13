// ============================================================
// FOOD JOURNEY - Main React App
// ============================================================
const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

// ---- API ----
const API = 'http://localhost:3001/api';
const GMAPS_KEY = window.GMAPS_KEY || '';

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('fj_token');
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    ...opts,
    body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---- Color coding by category ----
const CATEGORY_COLORS = {
  'Restaurant': '#E8821A', 'Cafe': '#5C7A4E', 'Street Food': '#C4533A',
  'Fast Food': '#8B5CF6', 'Seafood': '#0EA5E9', 'Bakery': '#F59E0B',
  'Japanese': '#EC4899', 'Chinese': '#EF4444', 'Italian': '#10B981',
  'Lainnya': '#6B7280',
};
function categoryColor(cat) { return CATEGORY_COLORS[cat] || '#9C7B50'; }

// ---- Stars ----
function Stars({ value, max = 5, size = 14 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: 1 }}>
      {Array.from({ length: max }).map((_, i) =>
        <span key={i} style={{ color: i < value ? '#F5A623' : '#E8DDD0' }}>★</span>
      )}
    </span>
  );
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} className={`star-btn ${(hover || value) >= n ? 'active' : ''}`}
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)} type="button">★</button>
      ))}
    </div>
  );
}

// ---- Toast ----
const ToastContext = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'default') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
const useToast = () => useContext(ToastContext);

// ---- Auth Context ----
const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fj_user')); } catch { return null; }
  });
  const login = (user, token) => {
    localStorage.setItem('fj_token', token);
    localStorage.setItem('fj_user', JSON.stringify(user));
    setUser(user);
  };
  const logout = () => {
    localStorage.removeItem('fj_token');
    localStorage.removeItem('fj_user');
    setUser(null);
  };
  const updateUser = (u) => {
    const updated = { ...user, ...u };
    localStorage.setItem('fj_user', JSON.stringify(updated));
    setUser(updated);
  };
  return <AuthContext.Provider value={{ user, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}
const useAuth = () => useContext(AuthContext);

// ---- Modal ----
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 800 } : {}}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- Auth Page ----
function AuthPage() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await apiFetch(`/auth/${tab}`, { method: 'POST', body: form });
      login(data.user, data.token);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">
          <h1>🍜 Food Journey</h1>
          <p>Catat setiap momen kuliner Anda</p>
        </div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Masuk</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Daftar</button>
        </div>
        {error && <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 14, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={submit}>
          {tab === 'register' && (
            <div className="form-group">
              <label className="form-label">Nama Lengkap</label>
              <input className="form-input" placeholder="Masukkan nama Anda" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" placeholder="nama@email.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="Minimal 6 karakter" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? '...' : tab === 'login' ? 'Masuk' : 'Buat Akun'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---- Google Places Search ----
function PlacesSearch({ onSelect }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const debounceRef = useRef(null);

  const search = (val) => {
    setQ(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Use Google Places Text Search via proxy or direct
        if (window.google && window.google.maps && window.google.maps.places) {
          const svc = new window.google.maps.places.PlacesService(document.createElement('div'));
          svc.textSearch({ query: val, type: ['restaurant', 'food', 'cafe'] }, (results, status) => {
            if (status === 'OK') {
              setResults(results.slice(0, 6).map(r => ({
                place_id: r.place_id,
                name: r.name,
                address: r.formatted_address,
                lat: r.geometry.location.lat(),
                lng: r.geometry.location.lng(),
                category: r.types?.[0]?.replace(/_/g, ' ') || 'Restaurant',
                google_rating: r.rating,
                google_photo: r.photos?.[0]?.getUrl({ maxWidth: 600 }) || null,
              })));
            }
            setLoading(false);
          });
        } else {
          // Fallback: mock results for demo without API key
          setResults([
            { place_id: 'demo_1', name: val + ' Restaurant', address: 'Jl. Pemuda No. 1, Semarang', lat: -6.9903, lng: 110.4228, category: 'Restaurant', google_rating: 4.2, google_photo: null },
            { place_id: 'demo_2', name: val + ' Cafe', address: 'Jl. Pandanaran No. 5, Semarang', lat: -6.9839, lng: 110.4101, category: 'Cafe', google_rating: 4.0, google_photo: null },
          ]);
          setLoading(false);
        }
      } catch { setLoading(false); }
    }, 500);
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setResults([]); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Cari Tempat Makan</label>
        <input className="form-input" placeholder="Ketik nama restoran atau cafe..." value={q}
          onChange={e => search(e.target.value)} autoComplete="off" />
      </div>
      {(results.length > 0 || loading) && (
        <div className="search-results">
          {loading && <div style={{ padding: '12px 16px', fontSize: 14, color: 'var(--text-light)' }}>Mencari...</div>}
          {results.map(r => (
            <div key={r.place_id} className="search-result-item" onClick={() => { onSelect(r); setResults([]); setQ(r.name); }}>
              <span className="search-result-icon">📍</span>
              <div>
                <div className="search-result-name">{r.name}</div>
                <div className="search-result-addr">{r.address}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Add Restaurant Modal ----
function AddRestaurantModal({ open, onClose, onSaved, initial }) {
  const toast = useToast();
  const [place, setPlace] = useState(null);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    personal_rating: 0, review: '', category: 'Restaurant', is_favorite: false,
    name: '', address: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) {
      setPlace(initial);
      setForm(f => ({ ...f, name: initial.name, address: initial.address, category: initial.category || 'Restaurant' }));
    }
  }, [initial]);

  const handleSelect = (r) => {
    setPlace(r);
    setForm(f => ({ ...f, name: r.name, address: r.address, category: r.category || 'Restaurant' }));
  };

  const submit = async () => {
    if (!form.name) { toast('Nama tempat wajib diisi', 'error'); return; }
    setLoading(true);
    try {
      const payload = { ...form, ...(place ? { place_id: place.place_id, lat: place.lat, lng: place.lng, google_rating: place.google_rating, google_photo: place.google_photo } : {}) };
      const saved = await apiFetch('/restaurants', { method: 'POST', body: payload });
      toast('Tempat makan berhasil ditambahkan! 🎉', 'success');
      onSaved(saved);
      onClose();
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const CATEGORIES = ['Restaurant', 'Cafe', 'Street Food', 'Fast Food', 'Seafood', 'Bakery', 'Japanese', 'Chinese', 'Italian', 'Lainnya'];

  return (
    <Modal open={open} onClose={onClose} title="Tambah Tempat Makan" wide>
      <PlacesSearch onSelect={handleSelect} />
      {place && (
        <div style={{ background: 'var(--amber-pale)', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 13 }}>
          <strong>📍 {place.name}</strong> · {place.address}
          {place.google_rating && <span style={{ marginLeft: 8, color: 'var(--amber)' }}>★ {place.google_rating}</span>}
        </div>
      )}
      {!place && (
        <div className="mt-3">
          <div className="form-group">
            <label className="form-label">Nama Tempat (manual)</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Masukkan nama tempat" />
          </div>
          <div className="form-group">
            <label className="form-label">Alamat</label>
            <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Alamat tempat makan" />
          </div>
        </div>
      )}
      <div className="form-row mt-3">
        <div className="form-group">
          <label className="form-label">Tanggal Kunjungan</label>
          <input type="date" className="form-input" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Kategori</label>
          <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Rating Pribadi</label>
        <StarInput value={form.personal_rating} onChange={v => setForm(f => ({ ...f, personal_rating: v }))} />
      </div>
      <div className="form-group">
        <label className="form-label">Review / Komentar</label>
        <textarea className="form-input" value={form.review} onChange={e => setForm(f => ({ ...f, review: e.target.value }))} placeholder="Ceritakan pengalaman makan Anda..." />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginBottom: 20 }}>
        <input type="checkbox" checked={form.is_favorite} onChange={e => setForm(f => ({ ...f, is_favorite: e.target.checked }))} />
        <span>❤️ Tandai sebagai favorit</span>
      </label>
      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? '...' : 'Simpan'}</button>
      </div>
    </Modal>
  );
}

// ============================================================
// PAGES
// ============================================================

// ---- Dashboard ----
function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    apiFetch('/restaurants/stats/dashboard').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data || !data.allLocations.length) return;
    if (!window.google) return;
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 12, center: { lat: data.allLocations[0].lat, lng: data.allLocations[0].lng },
      styles: mapStyle,
    });
    data.allLocations.forEach(loc => {
      if (!loc.lat) return;
      const marker = new window.google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng }, map, title: loc.name,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#E8821A', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 },
      });
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-family:Inter,sans-serif;padding:4px"><strong>${loc.name}</strong><br/>
          <span style="color:#9C7B50;font-size:12px">⭐ ${loc.personal_rating || '–'}/5</span><br/>
          <button onclick="window.fjNav('detail','${loc.id}')" style="margin-top:8px;background:#E8821A;color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px">Lihat Detail</button></div>`,
      });
      marker.addListener('click', () => info.open(map, marker));
    });
    window.fjNav = onNavigate;
  }, [data]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const stats = data?.stats || {};
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title playfair">Selamat datang, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Rangkuman perjalanan kuliner Anda</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🍽️</div>
          <div className="stat-value">{stats.total || 0}</div>
          <div className="stat-label">Tempat dikunjungi</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : '–'}</div>
          <div className="stat-label">Rata-rata rating</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❤️</div>
          <div className="stat-value">{stats.total_favorites || 0}</div>
          <div className="stat-label">Tempat favorit</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🥘</div>
          <div className="stat-value">{data?.topFoods?.length || 0}</div>
          <div className="stat-label">Rekomendasi makanan</div>
        </div>
      </div>

      {data?.allLocations?.length > 0 && (
        <div className="section">
          <h2 className="section-title">🗺️ Peta Kuliner Saya</h2>
          {window.google ? <div ref={mapRef} id="main-map" /> : (
            <div style={{ background: 'var(--amber-pale)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--text-mid)' }}>
              📍 {data.allLocations.length} lokasi tersimpan · Tambahkan Google Maps API key untuk melihat peta
            </div>
          )}
        </div>
      )}

      {data?.topFoods?.length > 0 && (
        <div className="section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title" style={{ margin: 0 }}>🏆 Makanan Terekomendasi</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('foods')}>Lihat semua →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.topFoods.map(f => (
              <div key={f.id} className="food-card card">
                <div className="food-card-img">
                  {f.photo ? <img src={f.photo} alt={f.name} /> : '🍱'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{f.restaurant_name}</div>
                  {f.description && <div style={{ fontSize: 13, marginTop: 4 }}>{f.description}</div>}
                </div>
                <div><Stars value={f.rating} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.favorites?.length > 0 && (
        <div className="section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title" style={{ margin: 0 }}>❤️ Favorit Saya</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('favorites')}>Lihat semua →</button>
          </div>
          <div className="card-grid">
            {data.favorites.map(r => <RestaurantCard key={r.id} restaurant={r} onClick={() => onNavigate('detail', r.id)} />)}
          </div>
        </div>
      )}

      {!stats.total && (
        <div className="empty-state">
          <div className="empty-icon">🍜</div>
          <div className="empty-title">Mulai petualangan kuliner Anda!</div>
          <div className="empty-desc">Tambahkan tempat makan pertama yang pernah Anda kunjungi.</div>
          <button className="btn btn-primary" onClick={() => onNavigate('add')}>+ Tambah Tempat Makan</button>
        </div>
      )}
    </div>
  );
}

// ---- Restaurant Card ----
function RestaurantCard({ restaurant: r, onClick }) {
  const color = categoryColor(r.category);
  return (
    <div className="card restaurant-card" onClick={onClick}>
      <div className="flavor-strip" style={{ background: color }} />
      <div className="card-img">
        {r.google_photo ? <img src={r.google_photo} alt={r.name} onError={e => { e.target.style.display = 'none'; }} /> : (
          <span style={{ fontSize: 48 }}>🍽️</span>
        )}
      </div>
      <div className="card-body">
        <div className="card-title">{r.name}</div>
        <div className="card-meta">📍 {r.address ? r.address.substring(0, 50) + (r.address.length > 50 ? '…' : '') : 'Alamat tidak tersedia'}</div>
        {r.visit_date && <div className="card-meta">📅 {new Date(r.visit_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>}
        <div className="card-footer">
          <div>
            <Stars value={r.personal_rating} />
            {r.personal_rating && <span style={{ fontSize: 12, color: 'var(--text-light)', marginLeft: 4 }}>{r.personal_rating}/5</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {r.is_favorite == 1 && <span title="Favorit" style={{ fontSize: 16 }}>❤️</span>}
            <span className="badge" style={{ background: color + '20', color }}>{r.category}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Restaurant List Page ----
function RestaurantListPage({ onNavigate, refreshKey }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ rating: '', category: '', favorite: '' });
  const [showAdd, setShowAdd] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter.rating) params.set('rating', filter.rating);
      if (filter.category) params.set('category', filter.category);
      if (filter.favorite) params.set('favorite', filter.favorite);
      const data = await apiFetch('/restaurants?' + params);
      setRestaurants(data);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filter, refreshKey]);

  const CATEGORIES = ['', 'Restaurant', 'Cafe', 'Street Food', 'Fast Food', 'Seafood', 'Bakery', 'Japanese', 'Chinese', 'Italian', 'Lainnya'];

  return (
    <div className="page">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title playfair">Koleksi Tempat Makan</h1>
          <p className="page-subtitle">{restaurants.length} tempat tersimpan</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Tambah</button>
      </div>

      <div className="flex gap-3 mb-3" style={{ flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 260 }} placeholder="🔍 Cari nama tempat..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input" style={{ maxWidth: 180 }} value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
          <option value="">Semua Kategori</option>
          {CATEGORIES.filter(Boolean).map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-input" style={{ maxWidth: 150 }} value={filter.rating} onChange={e => setFilter(f => ({ ...f, rating: e.target.value }))}>
          <option value="">Semua Rating</option>
          {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>≥ {r} Bintang</option>)}
        </select>
        <button className={`filter-chip ${filter.favorite === '1' ? 'active' : ''}`}
          onClick={() => setFilter(f => ({ ...f, favorite: f.favorite === '1' ? '' : '1' }))}>❤️ Favorit</button>
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> :
        restaurants.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">Belum ada tempat makan</div>
            <div className="empty-desc">Coba ubah filter atau tambah tempat makan baru.</div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Tambah Tempat Makan</button>
          </div>
        ) : (
          <div className="card-grid">
            {restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} onClick={() => onNavigate('detail', r.id)} />)}
          </div>
        )
      }
      <AddRestaurantModal open={showAdd} onClose={() => setShowAdd(false)} onSaved={(r) => { load(); toast('Berhasil ditambahkan!', 'success'); }} />
    </div>
  );
}

// ---- Detail Page ----
function DetailPage({ id, onNavigate, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddFood, setShowAddFood] = useState(false);
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const mapRef = useRef(null);
  const toast = useToast();

  const load = async () => {
    try {
      const d = await apiFetch(`/restaurants/${id}`);
      setData(d);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!data || !data.lat || !window.google || activeTab !== 'map') return;
    setTimeout(() => {
      if (!mapRef.current) return;
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 16, center: { lat: data.lat, lng: data.lng }, styles: mapStyle,
      });
      new window.google.maps.Marker({ position: { lat: data.lat, lng: data.lng }, map, title: data.name });
    }, 100);
  }, [data, activeTab]);

  const toggleFavorite = async () => {
    try {
      const res = await apiFetch(`/restaurants/${id}/favorite`, { method: 'PATCH', body: {} });
      setData(d => ({ ...d, is_favorite: res.is_favorite ? 1 : 0 }));
      toast(res.is_favorite ? 'Ditambahkan ke favorit ❤️' : 'Dihapus dari favorit', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const deleteRestaurant = async () => {
    if (!confirm('Hapus tempat makan ini?')) return;
    try {
      await apiFetch(`/restaurants/${id}`, { method: 'DELETE', body: {} });
      toast('Berhasil dihapus', 'success');
      onBack();
    } catch (e) { toast(e.message, 'error'); }
  };

  const deleteFood = async (foodId) => {
    if (!confirm('Hapus rekomendasi ini?')) return;
    try {
      await apiFetch(`/foods/${foodId}`, { method: 'DELETE', body: {} });
      setData(d => ({ ...d, foods: d.foods.filter(f => f.id !== foodId) }));
      toast('Rekomendasi dihapus', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  const deletePhoto = async (photoId) => {
    if (!confirm('Hapus foto ini?')) return;
    try {
      await apiFetch(`/photos/${photoId}`, { method: 'DELETE', body: {} });
      setData(d => ({ ...d, photos: d.photos.filter(p => p.id !== photoId) }));
      toast('Foto dihapus', 'success');
    } catch (e) { toast(e.message, 'error'); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return <div className="page"><div className="empty-state"><div className="empty-title">Tempat tidak ditemukan</div></div></div>;

  const color = categoryColor(data.category);

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-3">
        <button className="btn btn-ghost" onClick={onBack}>← Kembali</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-icon" onClick={toggleFavorite} title="Toggle Favorit">
          <span style={{ fontSize: 20 }}>{data.is_favorite == 1 ? '❤️' : '🤍'}</span>
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(true)}>✏️ Edit</button>
        <button className="btn btn-danger btn-sm" onClick={deleteRestaurant}>🗑️ Hapus</button>
      </div>

      <div className="detail-hero">
        {data.google_photo ? <img src={data.google_photo} alt={data.name} onError={e => e.target.style.display = 'none'} /> : <span>🍽️</span>}
        <div className="detail-hero-overlay" />
        <div className="detail-hero-info">
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span className="badge" style={{ background: color + '90', color: 'white' }}>{data.category}</span>
            {data.is_favorite == 1 && <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>❤️ Favorit</span>}
          </div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 28, color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{data.name}</h1>
        </div>
      </div>

      <div className="tabs">
        {['info', 'foods', 'photos', 'map'].map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {{ info: '📋 Info', foods: `🍱 Makanan (${data.foods?.length || 0})`, photos: `📸 Foto (${data.photos?.length || 0})`, map: '🗺️ Peta' }[t]}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="detail-grid">
          <div>
            {data.address && <div className="flex gap-2 items-center mb-3"><span>📍</span><span style={{ fontSize: 14 }}>{data.address}</span></div>}
            {data.visit_date && <div className="flex gap-2 items-center mb-3"><span>📅</span><span style={{ fontSize: 14 }}>Dikunjungi: {new Date(data.visit_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>}
            {data.review && (
              <div className="card" style={{ padding: 20, marginTop: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>💬 Review Saya</div>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-mid)' }}>{data.review}</p>
              </div>
            )}
          </div>
          <div>
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Rating</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>Rating Saya</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Stars value={data.personal_rating} size={20} />
                  <span style={{ fontFamily: 'Playfair Display', fontSize: 24, color: 'var(--amber)' }}>{data.personal_rating || '–'}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-light)' }}>/5</span>
                </div>
              </div>
              {data.google_rating && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 4 }}>Rating Google</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Stars value={Math.round(data.google_rating)} size={16} />
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{data.google_rating}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'foods' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Rekomendasi Makanan</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddFood(true)}>+ Tambah</button>
          </div>
          {data.foods?.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🍱</div><div className="empty-title">Belum ada rekomendasi</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddFood(true)}>+ Tambah Makanan</button></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.foods.map(f => (
                <div key={f.id} className="food-card card" style={{ position: 'relative' }}>
                  <div className="food-card-img">{f.photo ? <img src={f.photo} alt={f.name} /> : '🍱'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</div>
                    {f.description && <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 3 }}>{f.description}</div>}
                    <Stars value={f.rating} size={14} />
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteFood(f.id)} style={{ alignSelf: 'flex-start' }}>🗑️</button>
                </div>
              ))}
            </div>
          )}
          <AddFoodModal open={showAddFood} onClose={() => setShowAddFood(false)} restaurantId={id}
            onSaved={f => { setData(d => ({ ...d, foods: [...(d.foods || []), f] })); toast('Rekomendasi ditambahkan!', 'success'); }} />
        </div>
      )}

      {activeTab === 'photos' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Galeri Foto</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddPhoto(true)}>+ Upload Foto</button>
          </div>
          {data.photos?.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📸</div><div className="empty-title">Belum ada foto</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddPhoto(true)}>+ Upload Foto</button></div>
          ) : (
            <div className="photo-grid">
              {data.photos.map(p => (
                <div key={p.id} className="photo-item">
                  <img src={p.data} alt={p.caption || 'foto'} />
                  {p.caption && <div className="photo-caption">{p.caption}</div>}
                  <button onClick={() => deletePhoto(p.id)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <AddPhotoModal open={showAddPhoto} onClose={() => setShowAddPhoto(false)} restaurantId={id}
            onSaved={p => { setData(d => ({ ...d, photos: [...(d.photos || []), p] })); toast('Foto berhasil diupload!', 'success'); }} />
        </div>
      )}

      {activeTab === 'map' && (
        <div>
          {data.lat ? (
            window.google ? <div ref={mapRef} className="map-embed" /> :
              <div style={{ background: 'var(--amber-pale)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
                <p style={{ fontSize: 14, marginBottom: 16 }}>📍 Koordinat: {data.lat}, {data.lng}</p>
                <a href={`https://maps.google.com/?q=${data.lat},${data.lng}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Buka di Google Maps</a>
              </div>
          ) : (
            <div className="empty-state"><div className="empty-icon">🗺️</div><div className="empty-title">Lokasi tidak tersedia</div>
              <div className="empty-desc">Tambahkan tempat makan melalui pencarian Google Maps untuk mendapatkan koordinat.</div></div>
          )}
        </div>
      )}

      {showEditModal && <EditRestaurantModal restaurant={data} onClose={() => setShowEditModal(false)} onSaved={(d) => { setData(prev => ({ ...prev, ...d })); toast('Berhasil diperbarui!', 'success'); }} />}
    </div>
  );
}

// ---- Add Food Modal ----
function AddFoodModal({ open, onClose, restaurantId, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '', rating: 0, photo: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!form.name) { toast('Nama makanan wajib', 'error'); return; }
    setLoading(true);
    try {
      const data = await apiFetch(`/restaurants/${restaurantId}/foods`, { method: 'POST', body: form });
      onSaved(data); onClose();
      setForm({ name: '', description: '', rating: 0, photo: '' });
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Tambah Rekomendasi Makanan">
      <div className="form-group"><label className="form-label">Nama Makanan</label>
        <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama makanan" /></div>
      <div className="form-group"><label className="form-label">Deskripsi</label>
        <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ceritakan tentang makanan ini..." style={{ minHeight: 80 }} /></div>
      <div className="form-group"><label className="form-label">Rating Makanan</label>
        <StarInput value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} /></div>
      <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? '...' : 'Simpan'}</button>
      </div>
    </Modal>
  );
}

// ---- Add Photo Modal ----
function AddPhotoModal({ open, onClose, restaurantId, onSaved }) {
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!preview) { toast('Pilih foto terlebih dahulu', 'error'); return; }
    setLoading(true);
    try {
      const data = await apiFetch(`/restaurants/${restaurantId}/photos`, { method: 'POST', body: { data: preview, caption } });
      onSaved(data); onClose();
      setPreview(null); setCaption('');
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Foto">
      <div className="form-group">
        <label className="form-label">Pilih Foto</label>
        <input type="file" accept="image/*" className="form-input" onChange={handleFile} />
      </div>
      {preview && <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />}
      <div className="form-group"><label className="form-label">Caption (opsional)</label>
        <input className="form-input" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Tambahkan caption..." /></div>
      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? '...' : 'Upload'}</button>
      </div>
    </Modal>
  );
}

// ---- Edit Restaurant Modal ----
function EditRestaurantModal({ restaurant, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: restaurant.name, address: restaurant.address, visit_date: restaurant.visit_date?.split('T')[0] || '',
    personal_rating: restaurant.personal_rating || 0, review: restaurant.review || '',
    is_favorite: restaurant.is_favorite == 1, category: restaurant.category || 'Restaurant',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const CATEGORIES = ['Restaurant', 'Cafe', 'Street Food', 'Fast Food', 'Seafood', 'Bakery', 'Japanese', 'Chinese', 'Italian', 'Lainnya'];

  const submit = async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/restaurants/${restaurant.id}`, { method: 'PUT', body: form });
      onSaved(data); onClose();
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Edit Tempat Makan">
      <div className="form-group"><label className="form-label">Nama</label>
        <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
      <div className="form-group"><label className="form-label">Alamat</label>
        <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Tanggal Kunjungan</label>
          <input type="date" className="form-input" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Kategori</label>
          <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="form-group"><label className="form-label">Rating Pribadi</label>
        <StarInput value={form.personal_rating} onChange={v => setForm(f => ({ ...f, personal_rating: v }))} /></div>
      <div className="form-group"><label className="form-label">Review</label>
        <textarea className="form-input" value={form.review} onChange={e => setForm(f => ({ ...f, review: e.target.value }))} /></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, marginBottom: 20 }}>
        <input type="checkbox" checked={form.is_favorite} onChange={e => setForm(f => ({ ...f, is_favorite: e.target.checked }))} />
        ❤️ Tandai sebagai favorit</label>
      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? '...' : 'Simpan'}</button>
      </div>
    </Modal>
  );
}

// ---- Favorites Page ----
function FavoritesPage({ onNavigate }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    apiFetch('/restaurants?favorite=1').then(setRestaurants).catch(e => toast(e.message, 'error')).finally(() => setLoading(false));
  }, []);
  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title playfair">❤️ Favorit Saya</h1>
        <p className="page-subtitle">{restaurants.length} tempat favorit</p></div>
      {loading ? <div className="loading"><div className="spinner" /></div> :
        restaurants.length === 0 ? <div className="empty-state"><div className="empty-icon">🤍</div>
          <div className="empty-title">Belum ada favorit</div>
          <div className="empty-desc">Tandai tempat makan sebagai favorit dari halaman detail.</div></div> :
          <div className="card-grid">{restaurants.map(r => <RestaurantCard key={r.id} restaurant={r} onClick={() => onNavigate('detail', r.id)} />)}</div>}
    </div>
  );
}

// ---- Foods Page ----
function FoodsPage({ onNavigate }) {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  useEffect(() => {
    apiFetch('/foods').then(setFoods).catch(e => toast(e.message, 'error')).finally(() => setLoading(false));
  }, []);
  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title playfair">🥘 Rekomendasi Makanan</h1>
        <p className="page-subtitle">{foods.length} makanan direkomendasikan</p></div>
      {loading ? <div className="loading"><div className="spinner" /></div> :
        foods.length === 0 ? <div className="empty-state"><div className="empty-icon">🍱</div>
          <div className="empty-title">Belum ada rekomendasi</div>
          <div className="empty-desc">Tambahkan rekomendasi makanan di halaman detail tempat makan.</div></div> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {foods.map((f, i) => (
              <div key={f.id} className="food-card card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('detail', f.restaurant_id)}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--amber)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>#{i + 1}</div>
                <div className="food-card-img">{f.photo ? <img src={f.photo} alt={f.name} /> : '🍱'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>dari {f.restaurant_name}</div>
                  {f.description && <div style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 4 }}>{f.description}</div>}
                  <Stars value={f.rating} size={14} />
                </div>
                <span className="badge">{f.category}</span>
              </div>
            ))}
          </div>}
    </div>
  );
}

// ---- Profile Page ----
function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleAvatar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, avatar: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/profile', { method: 'PUT', body: form });
      updateUser(data);
      setEditing(false);
      toast('Profil diperbarui!', 'success');
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title playfair">Profil Saya</h1></div>
      <div className="profile-header">
        <div className="profile-avatar">
          {user?.avatar ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <div className="profile-name">{user?.name}</div>
        <div className="profile-email">{user?.email}</div>
      </div>
      {editing ? (
        <div className="card" style={{ padding: 24, maxWidth: 480 }}>
          <div className="form-group"><label className="form-label">Nama</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Foto Profil</label>
            <input type="file" accept="image/*" className="form-input" onChange={handleAvatar} /></div>
          {form.avatar && <img src={form.avatar} alt="preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }} />}
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Batal</button>
            <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? '...' : 'Simpan'}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>✏️ Edit Profil</button>
          <button className="btn btn-danger" onClick={logout}>🚪 Keluar</button>
        </div>
      )}
    </div>
  );
}

// ---- Map Style ----
const mapStyle = [
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e9e9e9' }] },
  { featureType: 'landscape', stylers: [{ color: '#f5f0e8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dce8d0' }] },
];

// ---- Sidebar ----
function Sidebar({ page, onNavigate, user }) {
  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'restaurants', icon: '🍽️', label: 'Tempat Makan' },
    { id: 'favorites', icon: '❤️', label: 'Favorit' },
    { id: 'foods', icon: '🥘', label: 'Rekomendasi' },
    { id: 'profile', icon: '👤', label: 'Profil' },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>🍜 Food Journey</h1>
        <span>Catat kuliner Anda</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${page === item.id || (page === 'detail' && item.id === 'restaurants') ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-user" onClick={() => onNavigate('profile')}>
        <div className="avatar">
          {user?.avatar ? <img src={user.avatar} alt="avatar" /> : initials}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Lihat profil</div>
        </div>
      </div>
    </aside>
  );
}

// ---- App Root ----
function App() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [detailId, setDetailId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = (p, id) => {
    setPage(p);
    if (id) setDetailId(id);
  };

  if (!user) return <AuthPage />;

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={navigate} user={user} />
      <main className="main-content">
        {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {page === 'restaurants' && <RestaurantListPage onNavigate={navigate} refreshKey={refreshKey} />}
        {page === 'detail' && detailId && <DetailPage id={detailId} onNavigate={navigate} onBack={() => setPage('restaurants')} />}
        {page === 'favorites' && <FavoritesPage onNavigate={navigate} />}
        {page === 'foods' && <FoodsPage onNavigate={navigate} />}
        {page === 'profile' && <ProfilePage />}
      </main>
    </div>
  );
}

// ---- Mount ----
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </AuthProvider>
);
