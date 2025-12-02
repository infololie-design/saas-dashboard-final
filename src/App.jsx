import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { 
  LayoutDashboard, 
  TrendingUp, 
  AlertTriangle, 
  PackageX, 
  LogOut, 
  RefreshCw 
} from 'lucide-react';

// --- GİRİŞ EKRANI ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert('Hata: ' + error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">SaaS Analiz</h1>
          <p className="text-indigo-100">Yönetici Girişi</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50">
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- ANA DASHBOARD ---
const Dashboard = ({ session }) => {
  const [activeTab, setActiveTab] = useState('cost'); 
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const CONFIG = {
    cost: {
      title: 'Maliyet Analizi',
      desc: 'Ürün bazlı karlılık ve genel gider dağılımı.',
      // Gerçek n8n adresi buraya, ama biz proxy'e göndereceğiz
      url: 'https://n8n.lolie.com.tr/webhook/maliyet-analizi',
      color: 'blue'
    },
    dead: {
      title: 'Ölü Stok Analizi',
      desc: '30 gündür satılmayan ve sermaye bağlayan ürünler.',
      url: 'https://n8n.lolie.com.tr/webhook/deadstock',
      color: 'red'
    },
    stockout: {
      title: 'Stok Tükenme Riski',
      desc: 'Satış hızına göre kritik seviyedeki ürünler.',
      url: 'https://n8n.lolie.com.tr/webhook/stockout-api',
      color: 'amber'
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setData(null);
    try {
      // DİKKAT: Artık direkt n8n'e değil, kendi içimizdeki /api/proxy'e gidiyoruz
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: CONFIG[activeTab].url, // Hedef adresi paketin içine koyduk
          user_id: session.user.id,
          email: session.user.email
        })
      });

      if (!response.ok) throw new Error('Proxy hatası');
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error(error);
      alert('İşlem başarısız. Lütfen n8n tarafında Webhook metodunun POST olduğundan emin olun.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setData(null); }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg"><LayoutDashboard className="text-white" size={24} /></div>
          <h1 className="text-xl font-bold text-gray-800">SaaS Yönetim Paneli</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{session.user.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="text-gray-400 hover:text-red-600 transition"><LogOut size={20} /></button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block">
          <nav className="p-4 space-y-2">
            <button onClick={() => setActiveTab('cost')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'cost' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}><TrendingUp size={20} /> Maliyet Analizi</button>
            <button onClick={() => setActiveTab('dead')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'dead' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}><PackageX size={20} /> Ölü Stoklar</button>
            <button onClick={() => setActiveTab('stockout')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'stockout' ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-50'}`}><AlertTriangle size={20} /> Kritik Stoklar</button>
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{CONFIG[activeTab].title}</h2>
              <p className="text-gray-500 mt-1">{CONFIG[activeTab].desc}</p>
            </div>
            <button onClick={fetchData} disabled={loading} className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-md transition active:scale-95 disabled:opacity-70 ${activeTab === 'cost' ? 'bg-blue-600' : activeTab === 'dead' ? 'bg-red-600' : 'bg-amber-600'}`}>
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Analiz Yapılıyor...' : 'Analizi Başlat'}
            </button>
          </div>
          {!data && !loading && <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200"><p className="text-gray-400">Analizi başlatın.</p></div>}
          
          {/* VERİ GÖSTERİM ALANLARI (Öncekiyle aynı) */}
          {data && (
            <div className="space-y-6 animate-fade-in-up">
              {activeTab === 'cost' && data.stats && (
                <>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border"><p className="text-sm text-gray-500">Oran</p><h3 className="text-3xl font-bold text-blue-600">%{Number(data.stats.ratio * 100).toFixed(1)}</h3></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border"><p className="text-sm text-gray-500">Gider</p><h3 className="text-2xl font-bold">₺{data.stats.totalExp?.toLocaleString()}</h3></div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border"><p className="text-sm text-gray-500">Ciro</p><h3 className="text-2xl font-bold">₺{data.stats.totalRev?.toLocaleString()}</h3></div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-sm uppercase"><tr><th className="p-4">SKU</th><th className="p-4">Ürün</th><th className="p-4 text-right">Ham</th><th className="p-4 text-right">Yüklü</th></tr></thead>
                      <tbody>{data.rows?.map((row, i) => (<tr key={i} className="hover:bg-blue-50"><td className="p-4">{row.sku}</td><td className="p-4">{row.name}</td><td className="p-4 text-right">₺{row.cost}</td><td className="p-4 text-right font-bold text-blue-600">₺{row.loaded_cost}</td></tr>))}</tbody>
                    </table>
                  </div>
                </>
              )}
              {activeTab === 'dead' && (
                <>
                   <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500 flex justify-between"><h3 className="text-lg font-bold">Bağlı Sermaye</h3><div className="text-3xl font-bold text-red-600">₺{data.totalCapital?.toLocaleString()}</div></div>
                   <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left"><thead className="bg-red-50 text-red-900 text-sm uppercase"><tr><th className="p-4">SKU</th><th className="p-4">Ürün</th><th className="p-4">Stok</th><th className="p-4 text-right">Tutar</th></tr></thead><tbody>{data.list?.map((item, i) => (<tr key={i} className="hover:bg-red-50"><td className="p-4">{item.kod}</td><td className="p-4">{item.urun_adi}</td><td className="p-4">{item.adet}</td><td className="p-4 text-right font-bold text-red-600">₺{item.bagli_para?.toLocaleString()}</td></tr>))}</tbody></table>
                  </div>
                </>
              )}
              {activeTab === 'stockout' && (
                <>
                  {data.advice && <div dangerouslySetInnerHTML={{ __html: data.advice }} />}
                  <div className="bg-white rounded-xl shadow-sm border mt-6 overflow-hidden">
                    <table className="w-full text-left"><thead className="bg-amber-50 text-amber-900 text-sm uppercase"><tr><th className="p-4">SKU</th><th className="p-4">Ürün</th><th className="p-4 text-center">Gün</th><th className="p-4 text-center">Aciliyet</th></tr></thead><tbody>{data.stockoutList?.map((item, i) => (<tr key={i} className="hover:bg-amber-50"><td className="p-4">{item.kod}</td><td className="p-4">{item.urun_adi}</td><td className="p-4 text-center font-bold">{item.gun}</td><td className="p-4 text-center"><span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-bold">{item.aciliyet}</span></td></tr>))}</tbody></table>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);
  if (!session) return <Login />;
  return <Dashboard session={session} />;
}
export default App;
