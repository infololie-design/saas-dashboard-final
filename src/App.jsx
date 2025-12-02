import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Play, Activity, LogOut, Loader2 } from 'lucide-react';

// --- BİLEŞENLER ---

// 1. Basit Login Ekranı
const Login = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Magic Link ile giriş (Şifresiz)
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert('Mail kutunuza gelen linke tıklayın!');
    setLoading(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Otomasyon Paneli</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="E-posta adresiniz"
            className="w-full p-3 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor...' : 'Giriş Linki Gönder'}
          </button>
        </form>
      </div>
    </div>
  );
};

// 2. Ana Dashboard
const Dashboard = ({ session }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(null);

  // Verileri çek (Sadece bu kullanıcıya ait olanlar gelir - RLS sayesinde)
  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('automations_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) console.error('Hata:', error);
    else setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    
    // Gerçek zamanlı güncelleme (Opsiyonel: Supabase Realtime)
    const channel = supabase
      .channel('logs_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automations_logs' }, (payload) => {
        // Yeni veri geldiğinde listeyi güncelle
        if(payload.new.user_id === session.user.id) {
            setLogs((prev) => [payload.new, ...prev]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // n8n Tetikleme Fonksiyonu
  const triggerAutomation = async (automationName, webhookUrl) => {
    setTriggering(automationName);
    try {
      // n8n'e user_id'yi de gönderiyoruz ki işlem sonucunu kime yazacağını bilsin
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          user_email: session.user.email,
          action: automationName,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        alert(`${automationName} başarıyla tetiklendi! Sonuç birazdan düşecek.`);
      } else {
        alert('Otomasyon tetiklenirken hata oluştu.');
      }
    } catch (error) {
      console.error(error);
      alert('Bağlantı hatası.');
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Üst Bar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Activity className="text-blue-600" /> n8n Kontrol Merkezi
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.user.email}</span>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="p-2 text-gray-500 hover:text-red-600 transition"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto mt-8 px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Sol Kolon: Aksiyonlar (Butonlar) */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Otomasyonları Başlat</h3>
          
          {/* Örnek Buton 1 */}
          <AutomationCard 
            title="SEO Analizi Yap" 
            desc="Web sitenizin SEO puanlarını günceller."
            isLoading={triggering === 'SEO_ANALYSIS'}
            onClick={() => triggerAutomation('SEO_ANALYSIS', 'https://webhook.site/your-n8n-webhook-url-1')}
          />

          {/* Örnek Buton 2 */}
          <AutomationCard 
            title="Haftalık Rapor" 
            desc="Satış verilerini derleyip mail atar."
            isLoading={triggering === 'WEEKLY_REPORT'}
            onClick={() => triggerAutomation('WEEKLY_REPORT', 'https://webhook.site/your-n8n-webhook-url-2')}
          />
        </div>

        {/* Sağ Kolon: Geçmiş / Loglar */}
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">İşlem Geçmişi</h3>
            <button onClick={fetchLogs} className="text-sm text-blue-600 hover:underline">Yenile</button>
          </div>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Henüz veri yok.</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-600 text-sm">
                  <tr>
                    <th className="p-4">Otomasyon</th>
                    <th className="p-4">Durum</th>
                    <th className="p-4">Zaman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium">{log.automation_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold
                          ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                        `}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

// UI Bileşeni: Kart
const AutomationCard = ({ title, desc, onClick, isLoading }) => (
  <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
    <h4 className="font-bold text-gray-800 mb-1">{title}</h4>
    <p className="text-sm text-gray-500 mb-4">{desc}</p>
    <button 
      onClick={onClick}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50"
    >
      {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
      {isLoading ? 'Çalışıyor...' : 'Başlat'}
    </button>
  </div>
);

// Ana App Bileşeni
function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Login />;
  }
  else {
    return <Dashboard session={session} />;
  }
}

export default App;
