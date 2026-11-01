# Configuração — Área do Aluno CA

Passo a passo para colocar o sistema no ar. Tudo nos planos gratuitos.

## 1. Supabase (banco, login e arquivos)

1. Em https://supabase.com/dashboard, **New project**: nome `area-aluno-ca`, região **South America (São Paulo)**. Guarde a senha do banco num lugar seguro.
2. **Project Settings > API**: copie `Project URL`, a chave `anon public` e a chave `service_role` para o arquivo `.env.local` (modelo em `.env.example`). A `service_role` é secreta: nunca mande por mensagem.
3. **Criar as tabelas e regras de segurança.** No terminal, na pasta do projeto:

   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase db push
   ```

   O `PROJECT_REF` é o código no endereço do projeto (`https://SEU_PROJECT_REF.supabase.co`).
   Alternativa sem terminal: abra **SQL Editor** e rode, na ordem, os três arquivos de `supabase/migrations/`.
4. **Authentication > Sign In / Providers > Email**: deixe o e-mail ligado e **desligue "Allow new users to sign up"**. Só entra quem o Carlos cadastrar.
5. **Authentication > URL Configuration**:
   - Site URL: o endereço da Vercel (ex.: `https://area-aluno-ca.vercel.app`)
   - Redirect URLs: `https://area-aluno-ca.vercel.app/**` e `http://localhost:3000/**`
6. **Authentication > Emails > Magic Link**: troque o modelo por:

   ```html
   <h2>Seu acesso à Área do Aluno CA</h2>
   <p>Toca no botão para entrar:</p>
   <p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email">Entrar na Área do Aluno</a></p>
   <p>Ou digita este código no app: <strong>{{ .Token }}</strong></p>
   <p>Se não foi você que pediu, ignora este e-mail.</p>
   ```

   O código é importante no iPhone: com o app instalado na tela inicial, o link do e-mail abre no Safari, e o código permite entrar dentro do app.

## 2. Resend (envio do e-mail de login)

O e-mail padrão do Supabase só entrega para a equipe do projeto. Para os alunos receberem o link:

1. Em https://resend.com, **API Keys > Create API key** (permissão "Sending access").
2. No Supabase, **Authentication > Emails > SMTP Settings**, ligue **Custom SMTP**:
   - Host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a API key do Resend
   - Remetente: enquanto não houver domínio próprio, use `onboarding@resend.dev`
3. **Limite sem domínio:** o Resend só entrega para o e-mail dono da conta. Dá para testar com o seu e-mail; para os alunos e a Isabela receberem, é preciso verificar um domínio no Resend (Domains > Add domain) e trocar o remetente para algo como `acesso@seudominio.com.br`.

## 3. Primeiro acesso do professor

```bash
npm run professor -- seu@email.com
```

## 4. Importar os alunos

Coloque o arquivo exportado do sistema antigo na pasta `dados/` (ela não vai para o Git).

```bash
npm run importar:gpt -- --arquivo dados/export-area-aluno-ca-2026-10-31.json --verificar
npm run importar:gpt -- --arquivo dados/export-area-aluno-ca-2026-10-31.json
npm run importar:gpt -- --arquivo dados/export-area-aluno-ca-2026-10-31.json --aplicar
```

O primeiro mostra só a estrutura do arquivo; o segundo simula; o terceiro grava. Use `--sem-login` para importar sem liberar o acesso dos alunos ainda.

### Notion (Gestão de Clientes)

1. Em https://www.notion.so/profile/integrations, **New integration** (interna), só leitura de conteúdo. Copie o token para `NOTION_TOKEN` no `.env.local`.
2. Na base **Gestão de Clientes**: ••• > **Conexões** > adicione a integração.
3. Rode:

```bash
npm run importar:notion
npm run importar:notion -- --aplicar
```

O Notion não tem e-mail, então a ligação é pelo nome. Páginas de cliente sem aluno correspondente aparecem pelo link para você conferir.

## 5. Vercel (publicação)

1. Em https://vercel.com/new, importe o repositório `carlosbhz31/area-aluno-ca`.
2. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `NEXT_PUBLIC_SITE_URL` (o endereço da Vercel).
3. **Deploy.** Cada `git push` publica uma versão nova.

## Rodar no computador

```bash
npm install
npm run dev
```

Abre em http://localhost:3000. Testes do cálculo de semana: `npm test`.
