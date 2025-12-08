# 노트북 클라우드 랩 3단계: 애플리케이션 컨테이너화 및 배포

**문서 최종 수정일:** 2025년 11월 29일

## 1. 개요

서버 환경 구성이 완료되었으므로, 이제 실제 웹 애플리케이션을 배포합니다. 이 단계에서는 간단한 '방명록' 애플리케이션을 Docker 컨테이너 기술을 사용하여 패키징하고, Docker Compose를 통해 프론트엔드, 백엔드, 데이터베이스로 구성된 전체 서비스 스택을 명령어 하나로 실행하고 관리하는 방법을 다룹니다.

## 2. 샘플 애플리케이션 및 Docker 설정 파일 준비

프로젝트 폴더(`~/iksan-cloud-lab`) 내에 `app` 디렉토리를 만들고, 그 안에 프론트엔드와 백엔드 코드를 각각 생성합니다. `write_file` 도구를 사용하여 아래 파일들을 생성하거나, 직접 내용을 복사하여 파일을 만듭니다.

### 2.1. 프로젝트 디렉토리 구조 생성
```bash
cd ~/iksan-cloud-lab
mkdir -p app/frontend app/backend
```

### 2.2. 백엔드 (Node.js + Express)
- **`app/backend/package.json`**
  ```json
  {
    "name": "backend",
    "version": "1.0.0",
    "main": "server.js",
    "scripts": { "start": "node server.js" },
    "dependencies": { "express": "^4.18.2", "pg": "^8.11.3" }
  }
  ```
- **`app/backend/server.js`**
  ```javascript
  const express = require('express');
  const { Pool } = require('pg');
  const app = express();
  app.use(express.json());

  const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: 'db', // docker-compose에서 정의한 DB 서비스 이름
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
  });

  // 테이블 자동 생성
  pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      author VARCHAR(100) NOT NULL,
      text VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  app.get('/api/messages', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(rows);
  });

  app.post('/api/messages', async (req, res) => {
    const { author, text } = req.body;
    const result = await pool.query(
      'INSERT INTO messages (author, text) VALUES ($1, $2) RETURNING *',
      [author, text]
    );
    res.status(201).json(result.rows[0]);
  });

  app.listen(3001, () => console.log('Backend server running on port 3001'));
  ```
- **`app/backend/Dockerfile`**
  ```dockerfile
  FROM node:18-alpine
  WORKDIR /usr/src/app
  COPY package*.json ./
  RUN npm install
  COPY . .
  EXPOSE 3001
  CMD [ "npm", "start" ]
  ```

### 2.3. 프론트엔드 (React + Nginx)
- **`app/frontend/package.json`**
  ```json
  {
    "name": "frontend",
    "version": "0.1.0",
    "private": true,
    "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0" },
    "devDependencies": { "react-scripts": "5.0.1" },
    "scripts": { "start": "react-scripts start", "build": "react-scripts build" }
  }
  ```
- **`app/frontend/src/App.js`** (간소화를 위해 기본 `App.js` 대신 사용)
  ```javascript
  import React, { useState, useEffect } from 'react';

  function App() {
    const [messages, setMessages] = useState([]);
    const [author, setAuthor] = useState('');
    const [text, setText] = useState('');

    useEffect(() => {
      fetch('/api/messages')
        .then(res => res.json())
        .then(data => setMessages(data));
    }, []);

    const handleSubmit = (e) => {
      e.preventDefault();
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, text }),
      })
      .then(res => res.json())
      .then(newMessage => {
        setMessages([newMessage, ...messages]);
        setAuthor('');
        setText('');
      });
    };

    return (
      <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto', padding: '20px' }}>
        <h1>방명록</h1>
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="이름" required style={{ display: 'block', width: '100%', marginBottom: '10px' }} />
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="메시지" required style={{ display: 'block', width: '100%', marginBottom: '10px' }} />
          <button type="submit">작성</button>
        </form>
        <div>
          {messages.map(msg => (
            <div key={msg.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
              <strong>{msg.author}</strong>
              <p>{msg.text}</p>
              <small>{new Date(msg.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
    );
  }
  export default App;
  ```
- **`app/frontend/Dockerfile`** (Multi-stage build)
  ```dockerfile
  # Stage 1: Build a React app
  FROM node:18-alpine AS build
  WORKDIR /usr/src/app
  COPY package*.json ./
  RUN npm install
  COPY . .
  RUN npm run build

  # Stage 2: Serve with Nginx
  FROM nginx:1.25-alpine
  COPY --from=build /usr/src/app/build /usr/share/nginx/html
  # Nginx가 API 요청을 백엔드로 프록시하도록 설정
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```
- **`app/frontend/nginx.conf`** (API 프록시 설정)
  ```nginx
  server {
    listen 80;
    server_name localhost;

    location / {
      root   /usr/share/nginx/html;
      index  index.html index.htm;
      try_files $uri $uri/ /index.html;
    }

    location /api {
      proxy_pass http://backend:3001; # docker-compose에서 정의한 백엔드 서비스
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;
    }
  }
  ```

### 2.4. Docker Compose 파일
- 프로젝트 최상위 폴더(`~/iksan-cloud-lab`)에 `docker-compose.yml` 파일을 작성합니다.
```yaml
# ~/iksan-cloud-lab/docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./app/frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build: ./app/backend
    environment:
      - POSTGRES_USER=iks-user
      - POSTGRES_PASSWORD=iks-password
      - POSTGRES_DB=guestbook
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=iks-user
      - POSTGRES_PASSWORD=iks-password
      - POSTGRES_DB=guestbook
    volumes:
      - pg-data:/var/lib/postgresql/data

volumes:
  pg-data:
```

## 3. 애플리케이션 배포 및 최종 테스트

### 3.1. 파일 전송
- 노트북의 터미널에서 `scp` 명령어를 사용하여 `app` 디렉토리와 `docker-compose.yml` 파일을 `web-server-01` VM으로 복사합니다.

```bash
cd ~/iksan-cloud-lab
# 'app' 디렉토리 전체와 docker-compose.yml 파일을 web-server-01의 홈 디렉토리로 복사
scp -r ./app ./docker-compose.yml iks-admin@192.168.56.101:~/
```

### 3.2. 애플리케이션 실행
1.  `web-server-01` VM에 SSH로 접속합니다.
    ```bash
    ssh iks-admin@192.168.56.101
    ```
2.  `docker-compose` 명령어로 전체 서비스를 빌드하고 실행합니다.
    ```bash
    # --build 옵션은 처음 실행하거나 코드가 변경되었을 때 이미지를 새로 빌드합니다.
    # -d 옵션은 백그라운드에서 실행합니다.
    docker-compose up -d --build
    ```
3.  `docker ps` 명령어로 `frontend`, `backend`, `db` 컨테이너가 모두 정상적으로 실행 중인지 확인합니다.

### 3.3. OPNsense 포트 포워딩 설정
1.  노트북의 웹 브라우저에서 OPNsense 관리 페이지(`http://192.168.56.2`)에 접속.
2.  `Firewall` > `NAT` > `Port Forward` 메뉴로 이동 후 `Add` 버튼 클릭.
3.  아래와 같이 규칙을 설정합니다.
    - `Interface`: `WAN`
    - `Protocol`: `TCP`
    - `Destination / Invert`: `WAN address`
    - `Destination port range`: `8080` (From), `8080` (To) (노트북의 8080 포트로 접속)
    - `Redirect target IP`: `192.168.56.101` (`web-server-01` VM의 IP)
    - `Redirect target port`: `80` (프론트엔드 컨테이너가 노출하는 포트)
    - `Description`: `Guestbook Web Access`
4.  `Save` 후 `Apply changes` 클릭.

### 3.4. 최종 테스트
- 노트북의 웹 브라우저 주소창에 `http://localhost:8080` 을 입력하여 접속합니다.
- 방명록 UI가 나타나는지 확인합니다.
- 이름과 메시지를 입력하고 '작성' 버튼을 눌렀을 때, 목록에 정상적으로 추가되는지 확인하여 프론트엔드-백엔드-데이터베이스 연동을 최종 검증합니다.

---

## 4. 결론 및 다음 단계

이 3단계의 과정을 통해, 우리는 노트북 안에 실제 상용 서비스와 유사한 구조의 인프라와 애플리케이션을 구축했습니다. 모든 과정은 코드로 관리되며(Ansible, Docker), 이는 향후 `Phase 1`의 물리 서버 환경으로 이전할 때 **거의 동일한 코드를 재사용하여 매우 빠르고 안정적으로 확장할 수 있음**을 의미합니다.

이제 이 '노트북 클라우드 랩' 환경 위에서 실제 기획 중인 프로젝트의 프론트엔드와 백엔드 개발을 진행할 수 있습니다.
