# Shopping Mall Server

Node.js, Express, MongoDB 기반 API 서버입니다.

## 시작하기

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

기본 서버 주소는 `http://localhost:5000` 입니다.

아래 명령으로도 실행할 수 있습니다.

```bash
npm start
node index.js
```

## 환경 변수

- `PORT`: 서버 포트
- `HOST`: 서버 호스트
- `MONGODB_URI`: MongoDB 연결 문자열
- `CLIENT_ORIGIN`: CORS 허용 프론트엔드 주소
- `SOLAPI_API_KEY`: Solapi API Key
- `SOLAPI_API_SECRET`: Solapi API Secret
- `SOLAPI_SENDER`: Solapi 계정에 등록된 발신번호
- `VERIFICATION_CODE_SECRET`: 인증번호 해시용 서버 비밀값
- `VERIFICATION_CODE_TTL_MS`: 인증번호 만료 시간
- `VERIFICATION_CODE_MAX_ATTEMPTS`: 인증번호 최대 검증 시도 횟수
- `VERIFICATION_CODE_RESEND_COOLDOWN_MS`: 인증번호 재전송 대기 시간

## SMS 인증 API

```bash
curl -X POST http://localhost:5000/api/auth/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"010-1234-5678"}'
```

```bash
curl -X POST http://localhost:5000/api/auth/verify-verification-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"010-1234-5678","code":"1234"}'
```
