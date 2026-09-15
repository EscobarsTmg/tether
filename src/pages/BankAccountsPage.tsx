import { useState } from 'react';

const SCRAPER_API = import.meta.env.VITE_SCRAPER_API_URL || 'http://localhost:3001';

export function BankAccountsPage() {
  const [form, setForm] = useState({ bankId: 'tr:garanti', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${SCRAPER_API}/api/connect`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankId: form.bankId,
          credentials: { username: form.username, password: form.password }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('✅ Banka başarıyla bağlandı. Şifreniz saklanmadı.');
      setForm({ ...form, username: '', password: '' });
    } catch (err: any) {
      setMessage(`❌ Hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1>Banka Bağla</h1>
      <select value={form.bankId} onChange={e => setForm({ ...form, bankId: e.target.value })}>
        <option value="tr:garanti">Garanti BBVA</option>
        <option value="tr:bankb">Diğer Banka</option>
      </select>
      <input
        placeholder="TCKN / Kullanıcı Adı"
        value={form.username}
        onChange={e => setForm({ ...form, username: e.target.value })}
      />
      <input
        type="password"
        placeholder="Şifre"
        value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })}
      />
      <button onClick={handleConnect} disabled={loading}>
        {loading ? 'Bağlanıyor...' : 'Bağlan'}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
export default BankAccountsPage;