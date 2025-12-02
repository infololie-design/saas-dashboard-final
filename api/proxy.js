export default async function handler(req, res) {
  // 1. Tarayıcıya "Sorun yok, izin ver" diyelim (CORS Başlıkları)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Eğer tarayıcı sadece "Yol açık mı?" diye soruyorsa (OPTIONS), "Evet" de ve bitir.
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Frontend'den gelen hedef URL'i alalım
  const { targetUrl, ...bodyData } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Hedef URL eksik' });
  }

  try {
    // 3. n8n'e sunucu arkasından isteği biz yapalım
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData), // Veriyi n8n'e ilet
    });

    const data = await response.json();
    
    // 4. n8n'den gelen cevabı Dashboard'a geri gönderelim
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy Hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası', details: error.message });
  }
}
