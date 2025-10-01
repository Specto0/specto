# 🎬 Specto

**Specto** é uma aplicação web para descobrir e explorar filmes e séries populares, utilizando a API do TMDb (The Movie Database).

---

## 🚀 Tecnologias Utilizadas

### **Frontend**
- ⚛️ **React** com TypeScript
- 🎨 **Vite** (build tool)
- 🧭 **React Router DOM** (navegação)

### **Backend**
- 🐍 **Python 3**
- ⚡ **FastAPI** (API REST)
- 🌐 **httpx** (requisições HTTP)
- 🎬 **TMDb API** (dados de filmes e séries)

---

## 📁 Estrutura do Projeto

```
specto/
├── frontend-specto/     # Aplicação React
├── backend-specto/      # API FastAPI
├── package.json         # Scripts de desenvolvimento
└── README.md
```

---

## 🛠️ Instalação

### **1. Clonar o repositório**

```bash
git clone https://github.com/Specto0/specto.git
cd specto
```

### **2. Instalar dependências do Frontend**

```bash
cd frontend-specto
npm install
cd ..
```

### **3. Configurar o Backend**

```bash
cd backend-specto

# Criar ambiente virtual Python
python3 -m venv venv

# Ativar ambiente virtual
source venv/bin/activate  # macOS/Linux
# ou
venv\Scripts\activate     # Windows

# Instalar dependências
pip install fastapi uvicorn httpx

cd ..
```

### **4. Configurar variáveis de ambiente**

Cria um ficheiro `config.py` dentro de `backend-specto/` com:

```python
API_KEY = "tua_chave_api_tmdb"
BASE_URL = "https://api.themoviedb.org/3"
```

> 💡 Obtém a tua chave API em: [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

---

## ▶️ Como Executar

### **Opção 1: Executar tudo de uma vez (Recomendado)**

Na raiz do projeto:

```bash
npm install  # Instala concurrently (apenas primeira vez)
npm run dev
```

Isto vai iniciar:
- 🎨 **Frontend** em `http://localhost:5173`
- ⚡ **Backend** em `http://localhost:8000`

---

### **Opção 2: Executar separadamente**

**Terminal 1 - Backend:**
```bash
npm run backend
```

**Terminal 2 - Frontend:**
```bash
npm run frontend
```

---

## 🌐 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/` | Mensagem de teste |
| `GET` | `/filmes-populares` | Lista filmes populares |
| `GET` | `/series-populares` | Lista séries populares |
| `GET` | `/pesquisa?query=...` | Pesquisa filmes e séries |
| `GET` | `/filme/{id}` | Detalhes de um filme |
| `GET` | `/filmes/...` | Rotas adicionais de filmes |
| `GET` | `/series/...` | Rotas adicionais de séries |

---

## 📝 Scripts Disponíveis

```bash
npm run dev       # Executa frontend + backend simultaneamente
npm run frontend  # Executa apenas o frontend
npm run backend   # Executa apenas o backend
```

---

## 🔧 Configurações

### **CORS**
O backend está configurado para aceitar requisições de:
- `http://localhost:5173` (Vite padrão)
- `http://localhost:5174` (Vite alternativo)

---

## 🤝 Contribuir

1. Faz fork do projeto
2. Cria uma branch para a tua feature (`git checkout -b feature/nova-feature`)
3. Commit as tuas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abre um Pull Request

---

## 📄 Licença

Este projeto é open source e está disponível sob a licença MIT.

---

## 👤 Autor

**Specto Team**

- GitHub:[@Specto0](https://github.com/Specto0)
         [@SWAGGATH4K1NG](https://github.com/SWAGGATH4K1NG)
         [@Daniel](https://github.com/DanielTeixeira22)
         [@DMonteiro](https://github.com/DMonteiro-dev)
         [@Churrasco](https://github.com/churrasco1)
         [@ogait](https://github.com/ogait222)


---

## 🙏 Agradecimentos

- [TMDb](https://www.themoviedb.org/) pela API de filmes e séries
- Comunidade React e FastAPI

---

**Feito com ❤ por Specto Team ☕**