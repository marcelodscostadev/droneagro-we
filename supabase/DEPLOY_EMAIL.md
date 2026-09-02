# Configuração do Resend + Supabase Edge Functions

## Passo 1 — Gerar o Token Pessoal do Supabase

1. Acesse: **https://supabase.com/dashboard/account/tokens**
2. Clique em **"Generate new token"**
3. Dê o nome `droneagro-cli`
4. **Copie o token** — começa com `sbp_...`

## Passo 2 — Fazer Login e Deploy via Terminal

Abra o terminal na pasta do projeto e execute:

```bash
# Login no Supabase CLI
npx supabase login

# Linkar com o projeto (já está configurado no config.toml)
npx supabase link --project-ref xrppalgvjkmmwfhqztcb

# Configurar os secrets (variáveis de ambiente das Edge Functions)
npx supabase secrets set RESEND_API_KEY=sua_chave_aqui

# Fazer o deploy da Edge Function
npx supabase functions deploy send-client-email --no-verify-jwt
```

## Passo 3 — Verificar se funcionou

```bash
npx supabase functions list
```

Deve aparecer `send-client-email` na lista.

## Passo 4 — Testar o envio de e-mail

Substitua `SEU_EMAIL` pelo seu e-mail e execute:

```bash
curl -X POST \
  "https://xrppalgvjkmmwfhqztcb.supabase.co/functions/v1/send-client-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycHBhbGd2amttbXdmaHF6dGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MTE0NDAsImV4cCI6MjEwMjM4NzQ0MH0.Irdse1u61DcP9BsOgCUcptjNiJK35jL4FMy8H8kBuIM" \
  -d '{
    "type": "solicitacao",
    "data": {
      "client_email": "SEU_EMAIL@gmail.com",
      "client_name": "João da Fazenda",
      "scheduled_at": "2026-09-15T08:00:00Z",
      "notes": "Campo próximo ao rio"
    }
  }'
```

Se receber `{"success":true,"id":"..."}` está funcionando! ✅

## Estrutura de Arquivos Criados

```
supabase/
├── config.toml                          ← Configuração do projeto
└── functions/
    ├── _shared/
    │   └── email-templates.ts           ← Templates HTML dos e-mails
    └── send-client-email/
        └── index.ts                     ← Edge Function principal

src/lib/
└── send-email.ts                        ← Helper do frontend para chamar a função
```

## Como usar no código

```typescript
import { sendClientEmail } from '@/lib/send-email'

// Ao aprovar um agendamento:
await sendClientEmail('aprovacao', {
  client_email: 'joao@fazenda.com',
  client_name: 'João da Fazenda',
  scheduled_at: '2026-09-15T08:00:00Z',
  technician_name: 'Carlos Silva',
  area_ha: 45.5,
})
```
