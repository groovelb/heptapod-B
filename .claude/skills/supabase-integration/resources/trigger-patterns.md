# Trigger Patterns

Phase 1, 2에서 참조. 반드시 생성해야 하는 트리거 템플릿.

---

## 1. set_updated_at (필수 · 모든 updated_at 컬럼)

### 함수 정의 (프로젝트 당 1회, `init_schema.sql` 맨 위에)

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### 테이블마다 부착

```sql
create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger trg_posts_set_updated_at
  before update on public.posts
  for each row execute procedure public.set_updated_at();
```

**규칙**: `updated_at` 컬럼이 있으면 이 트리거가 반드시 붙어야 함. 누락 시 Phase 5 검증에서 FAIL.

---

## 2. handle_new_user (필수 · Phase 2 auth_profiles.sql)

`auth.users` insert → `profiles`에 row 자동 생성. 누락되면 회원가입 직후 profiles 조회 실패.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer    -- 매우 중요: auth.users 접근 권한 필요
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nickname',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 주의사항

- **`security definer` 필수** — 트리거 소유자 권한으로 실행되어야 `auth.users` 트리거에서 public.profiles insert 가능
- **`set search_path = public`** — SQL injection 방어
- **nickname 충돌**: `unique` 제약이 있으면 중복 시 회원가입 실패. 대응 전략:
  - `split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 8)`
  - 또는 unique 제약 제거, 프로필 편집 시 체크

### 회원가입 시 메타데이터 전달 (클라이언트)

```js
await supabase.auth.signUp({
  email,
  password,
  options: { data: { nickname: '홍길동' } }  // → raw_user_meta_data
});
```

---

## 3. handle_user_delete (선택 · 계정 삭제 시 cleanup)

`on delete cascade`로 대부분 해결되지만, 외부 시스템(Stripe 등) 정리 필요 시.

```sql
create or replace function public.handle_user_delete()
returns trigger
language plpgsql security definer
as $$
begin
  -- 외부 리소스 정리 로직 (선택)
  return old;
end;
$$;

create trigger on_auth_user_deleted
  before delete on auth.users
  for each row execute procedure public.handle_user_delete();
```

---

## 4. prevent_id_change (선택 · PK 변경 방지)

```sql
create or replace function public.prevent_id_change()
returns trigger
language plpgsql
as $$
begin
  if new.id <> old.id then
    raise exception 'id is immutable';
  end if;
  return new;
end;
$$;
```

---

## 트리거 검증 (Phase 5)

MCP로 다음 쿼리 실행해 트리거 동작 확인:

```sql
-- 회원가입 → profiles 자동 생성 확인
select count(*) from public.profiles where id = '{test-user-id}';

-- updated_at 트리거 확인
update public.posts set title = 'test' where id = '{test-post-id}';
select updated_at > created_at from public.posts where id = '{test-post-id}';
```
