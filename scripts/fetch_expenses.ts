import fetch from 'node-fetch';

async function main() {
  // login
  const login = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const j = await login.json();
  const token = j.token;
  console.log('Got token:', token?.slice?.(0,8));

  const res = await fetch('http://127.0.0.1:5000/api/expenses/all', { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  console.log('Expenses count:', Array.isArray(data) ? data.length : typeof data);
  console.log(data.slice ? data.slice(0,5) : data);
}

main().catch(e => { console.error(e); process.exit(1); });
