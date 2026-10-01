This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Error Handling

API requests are centralized and return [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) problem objects when an error occurs.

- `apiFetch` (`src/lib/api-client.ts`) wraps `fetch` with `credentials: 'include'` and throws a `Problem` on non-2xx responses.
- `fetchWithAuth` (`src/lib/auth.ts`) builds on top of `apiFetch` and refreshes tokens automatically.
- UI components can map problems to user feedback through `mapProblemToUI` (`src/lib/errors.ts`).

### Simulating scenarios

- **Insufficient credits** – trigger any generation endpoint when your balance is low to see the modal.
- **Forbidden feature** – request a feature not available on the current plan.
- **Validation failed** – submit invalid data on forms such as login or registration.
- **Rate limited** – perform many requests quickly to view the rate-limit toast.

Unhandled errors fall back to a generic toast containing the backend `traceId` for support.
## Phase 0B.1: autenticação e mídia

Google inicia na API em `/api/auth/google/login` e retorna sem JWT na URL.
O frontend obtém acesso pelo refresh cookie HttpOnly e mantém o JWT em memória.
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` e `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` não são mais lidas;
remover do painel apenas em uma etapa operacional autorizada.

Configure `NEXT_PUBLIC_API_URL` por ambiente. O inventário encontrou as variáveis
atuais em All Environments: previews existentes não constituem staging isolado.
Antes de validar uma preview, apontá-la à API de staging, com dados sintéticos.

O proxy de imagens aceita Replicate delivery e hosts exatos definidos na variável
server-only `MEDIA_ALLOWED_HOSTS`. Configure os hosts públicos R2 de cada ambiente;
não use wildcard ou hosts internos. DNS privado, redirects, conteúdo não imagem,
respostas maiores que 20 MiB e downloads acima de 30 segundos são recusados.
Veja o plano operacional na PR da API para os gates de rollout e rollback.

### Redirects de entrada — revisão antes da Phase 0B.2

Login normal e Google OAuth redirecionam para `/images`; o catálogo existente
seleciona o modelo disponível. A busca em todo o código encontrou também dois
links explícitos para `/images/replicate`, preservados nesta revisão:

| Referência | Classificação |
| --- | --- |
| `src/app/page.tsx` — Explore gallery | Link de galeria na home |
| `src/app/_components/ClientGallery.tsx` — Browse entire library | Link da galeria comunitária |

Esses links não são redirects de login e ficam para uma revisão posterior.
Verificação local: `npm test` 7/7 e `npx tsc --noEmit` sem erros.
