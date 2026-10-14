const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

// Função para buscar no DuckDuckGo (HTML)
async function searchDuckDuckGo(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const results = [];

    $('.result').each((i, el) => {
      const title = $(el).find('.result__title a').text().trim();
      let link = $(el).find('.result__url').attr('href') || '';
      const snippet = $(el).find('.result__snippet').text().trim();

      if (title) {
        link = link.trim();
        if (!link.startsWith('http')) link = 'https://' + link;
        results.push({ title, link, snippet, source: 'NexaWeb MultiEngine' });
      }
    });
    return results;
  } catch (err) {
    console.error('Erro na busca:', err.message);
    return [];
  }
}

// Rota Principal (Interface HTML do NexaWeb)
app.get('/', (req, res) => {
  const query = req.query.q || '';
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${query ? query + ' - NexaWeb' : 'NexaWeb - Buscador Inteligente'}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; min-height: 100vh; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 42px; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-decoration: none; display: inline-block; }
        .tagline { color: #94a3b8; font-size: 14px; margin-top: 5px; }

        .search-box { display: flex; gap: 10px; background: #1e293b; padding: 8px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2); }
        .search-box input { flex: 1; background: transparent; border: none; outline: none; padding: 12px 16px; font-size: 16px; color: #fff; }
        .search-box button { background: linear-gradient(135deg, #38bdf8, #6366f1); border: none; padding: 12px 24px; color: #fff; font-weight: 600; border-radius: 8px; cursor: pointer; transition: opacity 0.2s; }
        .search-box button:hover { opacity: 0.9; }

        .results-container { margin-top: 30px; }
        .result-card { background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #334155; transition: transform 0.2s; }
        .result-card:hover { transform: translateY(-2px); border-color: #38bdf8; }
        .result-source { font-size: 11px; font-weight: bold; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block; }
        .result-title { font-size: 18px; color: #60a5fa; text-decoration: none; font-weight: 600; display: inline-block; margin-bottom: 6px; }
        .result-title:hover { text-decoration: underline; }
        .result-url { font-size: 13px; color: #10b981; display: block; word-break: break-all; margin-bottom: 8px; }
        .result-snippet { font-size: 14px; color: #cbd5e1; line-height: 1.5; }

        .loading { text-align: center; color: #94a3b8; padding: 40px; font-size: 18px; }
        .empty-state { text-align: center; color: #64748b; margin-top: 60px; font-size: 15px; }
        footer { text-align: center; margin-top: 50px; color: #475569; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <a href="/" class="logo">NexaWeb</a>
          <p class="tagline">Buscador Independiente e Agregador Web</p>
        </div>

        <form class="search-box" action="/" method="GET">
          <input type="text" name="q" value="${query}" placeholder="Pesquisar na web..." required />
          <button type="submit">Buscar</button>
        </form>

        <div id="results" class="results-container">
          ${query ? '<div class="loading">🔍 Conectando aos motores e extraindo resultados...</div>' : '<p class="empty-state">Digite algo no campo acima para iniciar uma pesquisa.</p>'}
        </div>

        <footer>
          NexaWeb &copy; 2026 - Todos os direitos reservados
        </footer>
      </div>

      ${query ? `
      <script>
        fetch('/api/search?q=${encodeURIComponent(query)}')
          .then(res => res.json())
          .then(data => {
            const container = document.getElementById('results');
            if (!data || data.length === 0) {
              container.innerHTML = '<div class="empty-state">Nenhum resultado encontrado para esta busca.</div>';
              return;
            }
            container.innerHTML = data.map(item => \`
              <div class="result-card">
                <span class="result-source">\${item.source}</span>
                <a href="\${item.link}" target="_blank" rel="noopener noreferrer" class="result-title">\${item.title}</a>
                <span class="result-url">\${item.link}</span>
                <p class="result-snippet">\${item.snippet}</p>
              </div>
            \`).join('');
          })
          .catch(() => {
            document.getElementById('results').innerHTML = '<div class="empty-state">Ocorreu um erro ao buscar os resultados. Tente novamente.</div>';
          });
      </script>
      ` : ''}
    </body>
    </html>
  `);
});

// API interna de busca
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);

  const results = await searchDuckDuckGo(query);
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`NexaWeb rodando com sucesso na porta ${PORT}`);
});
