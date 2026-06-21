# Auth Flows

Phase 2, 4에서 참조. Email+Password 표준 플로우 + OAuth 확장 가이드.

---

## 1. Email + Password (표준 채택)

### 회원가입

```
사용자 입력 (email, password, nickname?)
  ↓
supabase.auth.signUp({ email, password, options: { data: { nickname } }})
  ↓
Supabase가 이메일 인증 링크 발송
  ↓
auth.users insert → handle_new_user 트리거 → public.profiles insert
  ↓
사용자가 이메일 링크 클릭
  ↓
email_confirmed_at 채워짐 → 로그인 가능
```

**주의**:
- 이메일 인증 전에는 `signInWithPassword` 호출 시 `Email not confirmed` 에러
- redirect URL이 Dashboard에 등록되어 있어야 인증 링크 작동

### 로그인

```
사용자 입력 (email, password)
  ↓
supabase.auth.signInWithPassword({ email, password })
  ↓
성공 시: access_token + refresh_token 저장 (localStorage, Supabase 기본)
  ↓
onAuthStateChange 리스너가 SIGNED_IN 이벤트 수신
  ↓
앱 상태 업데이트 (user, session)
```

### 로그아웃

```
supabase.auth.signOut()
  ↓
localStorage 토큰 삭제
  ↓
SIGNED_OUT 이벤트 → 앱 상태 초기화
```

### 세션 복원 (새로고침 시)

`supabase-js`가 자동 처리. `supabase.auth.getSession()`으로 현재 세션 조회.
`onAuthStateChange`를 `useEffect`에서 구독해 user/session 상태를 React state에 동기화.

### 비밀번호 재설정

```
사용자: "비밀번호 찾기" → 이메일 입력
  ↓
supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })
  ↓
사용자 이메일의 링크 클릭 → /reset-password 페이지 진입
  ↓
이 페이지에서 supabase.auth.updateUser({ password: newPassword })
```

### 이메일 변경

```
supabase.auth.updateUser({ email: newEmail })
→ 양쪽(구/신) 이메일로 확인 링크 발송 → 둘 다 클릭해야 변경 완료
```

---

## 2. Supabase Dashboard 설정 (Phase 2 필수)

### Auth → Providers
- **Email**: Enabled
- **Confirm email**: ON (필수)
- **Secure email change**: ON (양쪽 확인)

### Auth → URL Configuration
- **Site URL**: `http://localhost:5173` (dev) / 프로덕션 URL
- **Redirect URLs**: 아래 패턴 등록
  - `http://localhost:5173/*`
  - `https://your-domain.com/*`
  - `/auth/callback`
  - `/reset-password`

### Auth → Email Templates (선택, 한국어 커스터마이즈)
- Confirm signup
- Reset password
- Magic link
- Change email

---

## 3. 클라이언트 훅 책임 분담

| 훅 | 책임 |
|---|---|
| `useAuth` | 현재 user/session 구독. 전역 Provider에서 1회 |
| `useSignUp` | signUp 호출 + loading/error 상태 |
| `useSignIn` | signInWithPassword 호출 + loading/error |
| `useSignOut` | signOut 호출 |
| `useResetPassword` | resetPasswordForEmail 호출 |
| `useUpdatePassword` | updateUser({ password }) 호출 |

**구현**: `client-templates.md` 참조.

---

## 4. OAuth 확장 가이드 (나중에 필요 시)

### Google OAuth 추가

1. **Google Cloud Console**
   - OAuth 2.0 Client ID 생성
   - Authorized redirect URI: `https://{your-project-ref}.supabase.co/auth/v1/callback`

2. **Supabase Dashboard**
   - Auth → Providers → Google: Enable
   - Client ID / Secret 입력

3. **클라이언트 코드**
   ```js
   await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${window.location.origin}/auth/callback` }
   });
   ```

4. **콜백 페이지** (`/auth/callback`)
   - supabase-js가 자동으로 URL 해시의 토큰 파싱
   - `onAuthStateChange`로 SIGNED_IN 감지 후 `/` 리다이렉트

### Kakao OAuth
Supabase는 Kakao를 직접 지원하지 않음 → **Edge Function + OAuth 직접 구현** 필요.
대안: [supabase-kakao-auth](https://github.com/topics/supabase-kakao) 오픈소스 참고.

### GitHub
Google과 동일 방식. GitHub OAuth App 생성 → Supabase에 Client ID/Secret 등록.

---

## 5. 보안 체크리스트

- [ ] `.env.local`에 `VITE_SUPABASE_ANON_KEY`만 (service_role ❌)
- [ ] `.gitignore`에 `.env.local`, `.env*.local`
- [ ] 비밀번호 최소 8자 (Dashboard 설정 or 클라이언트 validation)
- [ ] Rate limiting (Supabase 기본 제공, Dashboard에서 조정)
- [ ] 이메일 도메인 허용/차단 목록 (필요 시 Dashboard)
- [ ] CAPTCHA (Cloudflare Turnstile, 필요 시 Dashboard)

---

## 6. 자주 발생하는 이슈

| 증상 | 원인 / 해결 |
|------|------------|
| 회원가입 후 로그인 "Email not confirmed" | 이메일 인증 필수 설정됨. Inbox 확인 |
| 이메일 링크 클릭 시 redirect 실패 | Dashboard의 Redirect URLs에 등록 안 됨 |
| 회원가입은 되는데 profiles row 없음 | `handle_new_user` 트리거 누락 또는 nickname unique 충돌 |
| 새로고침하면 로그아웃됨 | `onAuthStateChange` 미구독 or localStorage 접근 실패 |
| 토큰 만료 에러 | supabase-js가 자동 갱신. autoRefreshToken: false 설정했는지 확인 |
