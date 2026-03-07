# CONTEXTO DEL PROYECTO: Newsletter SaaS Platform

## Hackathon: Viberacing
**Objetivo**: Crear la plataforma de newsletters con IA mas impresionante, util e interesante.
**Criterio de evaluacion**: El newsletter mas impresionante, util, interesante, sofisticado y valioso. Jurado anonimo.

---

## QUE ES ESTE PRODUCTO

Una plataforma SaaS tipo Substack/Beehiiv donde cualquier usuario puede:
1. Registrarse en la plataforma
2. Crear su propio newsletter configurando: nombre, tema, frecuencia, estilo
3. Obtener automaticamente una landing page publica donde la gente se suscribe
4. La IA genera el contenido del newsletter de forma 100% automatica
5. Se envia automaticamente a los suscriptores via Zavu.dev

---

## STACK TECNOLOGICO (YA INSTALADO)

- **Framework**: Next.js 15.1.6 (App Router)
- **Base de datos**: MongoDB con Mongoose
- **Estilos**: Tailwind CSS + tailwindcss-animate
- **Animaciones**: Framer Motion
- **UI**: Radix UI, Lucide React, class-variance-authority
- **Auth**: JWT (jsonwebtoken) + bcryptjs + Google OAuth
- **Pagos**: Stripe (ya integrado)
- **Temas**: next-themes (dark/light mode)
- **Idiomas**: Espanol/Ingles (ya hay sistema basico de i18n)

## DEPENDENCIAS A INSTALAR
```bash
npm install @zavudev/sdk openai @anthropic-ai/sdk
```
- `@zavudev/sdk` - Para enviar emails via Zavu.dev
- `openai` - SDK de OpenAI (tambien compatible con providers OpenAI-compatible)
- `@anthropic-ai/sdk` - SDK de Anthropic/Claude

**IMPORTANTE**: Las API keys de IA NO son variables de entorno del servidor.
Cada usuario configura su propia API key y modelo desde el dashboard.
La plataforma soporta multiples providers (OpenAI, Anthropic/Claude, etc).

---

## ESTRUCTURA DE ARCHIVOS EXISTENTE

```
src/
  app/
    page.tsx                          # Landing principal (MODIFICAR)
    layout.tsx                        # Root layout con ThemeProvider
    globals.css                       # CSS variables light/dark
    signin/page.tsx                   # Login existente
    signup/page.tsx                   # Registro existente
    dashboard/
      page.tsx                        # Dashboard principal (MODIFICAR)
      layout.tsx                      # Layout del dashboard con sidebar
      settings/                       # Settings existentes
    api/
      auth/signin/route.ts            # API login
      auth/signup/route.ts            # API registro
      auth/google/route.ts            # Google OAuth
      user/profile/route.ts           # Perfil de usuario
      stripe/                         # Stripe webhooks y pagos
  components/
    mode-toggle.tsx                   # Toggle dark/light
    theme-provider.tsx                # Theme provider
    ui/button.tsx                     # Button component (shadcn style)
  lib/
    auth.ts                           # JWT auth helpers
    db.ts                             # MongoDB connection
    stripe.ts                         # Stripe config
    utils.ts                          # cn() utility
  models/
    User.ts                           # User model (ya tiene roles, stripe, etc)
```

---

## MODELOS DE DATOS (MONGOOSE)

### User.ts (YA EXISTE - No modificar campos existentes, solo agregar si necesario)
```typescript
// Campos existentes: name, email, password, googleId, role, status,
// stripeCustomerId, subscriptionId, subscriptionStatus, subscriptionPlan
// Ya tiene: password hashing, comparePassword method
```

### Newsletter.ts (CREAR NUEVO)
```typescript
{
  userId: ObjectId,           // ref: 'User' - dueno del newsletter
  name: String,               // "AI Daily Digest"
  slug: String,               // "ai-daily-digest" (unique, para URL publica)
  description: String,        // Descripcion corta para la landing
  topic: String,              // Tema/prompt para la IA: "Latest AI news and breakthroughs"
  frequency: 'daily' | 'weekly',
  style: 'professional' | 'casual' | 'technical' | 'creative',
  accentColor: String,        // Color hex para personalizar la landing
  isActive: Boolean,          // default: true
  subscriberCount: Number,    // default: 0 (cache counter)
  lastGeneratedAt: Date,

  // Configuracion de IA del usuario (cada usuario trae su propia key)
  aiProvider: 'openai' | 'anthropic',  // default: 'openai'
  aiModel: String,            // ej: "gpt-4o-mini", "claude-sonnet-4-20250514"
  aiApiKey: String,           // API key del usuario (ENCRIPTADA en BD)

  createdAt, updatedAt        // timestamps: true
}
```

### Subscriber.ts (CREAR NUEVO)
```typescript
{
  email: String,              // required, email del suscriptor
  newsletterId: ObjectId,     // ref: 'Newsletter'
  status: 'active' | 'unsubscribed',  // default: 'active'
  subscribedAt: Date,         // default: Date.now
  createdAt, updatedAt
}
// Index compuesto: { email: 1, newsletterId: 1 } unique
```

### NewsletterIssue.ts (CREAR NUEVO)
```typescript
{
  newsletterId: ObjectId,     // ref: 'Newsletter'
  subject: String,            // Asunto del email
  contentHtml: String,        // HTML completo del newsletter
  contentText: String,        // Version texto plano
  generatedAt: Date,
  sentAt: Date,               // null si no se ha enviado
  recipientCount: Number,     // cuantos emails se enviaron
  status: 'draft' | 'sent' | 'failed',
  createdAt, updatedAt
}
```

---

## RUTAS Y PAGINAS A CREAR

### Paginas (Frontend)
| Ruta | Descripcion |
|------|-------------|
| `/` | Landing principal de la plataforma SaaS |
| `/signin` | Login (ya existe) |
| `/signup` | Registro (ya existe) |
| `/dashboard` | Dashboard - lista de newsletters del usuario |
| `/dashboard/newsletter/new` | Crear nuevo newsletter |
| `/dashboard/newsletter/[id]` | Editar newsletter + ver stats |
| `/dashboard/newsletter/[id]/issues` | Ver issues generados |
| `/dashboard/newsletter/[id]/subscribers` | Ver suscriptores |
| `/n/[slug]` | **LANDING PUBLICA** del newsletter (con subscribe + preview) |
| `/n/[slug]/unsubscribe` | Pagina de unsuscribe |

### API Routes (Backend)
| Ruta | Metodo | Descripcion |
|------|--------|-------------|
| `/api/auth/signin` | POST | Login (ya existe) |
| `/api/auth/signup` | POST | Registro (ya existe) |
| `/api/newsletters` | GET, POST | Listar/Crear newsletters del usuario |
| `/api/newsletters/[id]` | GET, PUT, DELETE | CRUD de un newsletter |
| `/api/newsletters/[id]/subscribers` | GET | Listar suscriptores |
| `/api/newsletters/[id]/issues` | GET | Listar issues |
| `/api/newsletters/[id]/generate` | POST | Generar nuevo issue con IA |
| `/api/newsletters/[id]/send` | POST | Enviar ultimo issue a suscriptores |
| `/api/subscribe/[slug]` | POST | Suscribirse (publico, no requiere auth) |
| `/api/unsubscribe` | POST | Desuscribirse |
| `/api/public/newsletter/[slug]` | GET | Info publica del newsletter + ultimo issue |
| `/api/cron/generate-newsletters` | POST | Cron job para generar y enviar automaticamente |

---

## INTEGRACION ZAVU.DEV (ENVIO DE EMAILS)

### Variables de entorno necesarias:
```env
ZAVU_API_KEY=tu-api-key
ZAVU_SENDER_EMAIL=newsletter@tuproyecto.sandbox.zavu.dev
```

### Configuracion:
```typescript
import Zavu from "@zavudev/sdk";

const zavu = new Zavu({ apiKey: process.env.ZAVU_API_KEY });
```

### Enviar email:
```typescript
const result = await zavu.messages.send({
  to: "recipient@example.com",
  channel: "email",
  subject: "Tu Newsletter - Edicion #5",
  text: "Version texto plano",
  // Para HTML usar el campo correspondiente segun SDK
});
```

### Sandbox:
- No requiere DNS ni KYC
- Limite: 100 emails/hora
- Dominio: `*@tuproyecto.sandbox.zavu.dev`

---

## GENERACION DE CONTENIDO CON IA (MULTI-PROVIDER)

### IMPORTANTE: El usuario configura su propia API key y modelo
La plataforma NO tiene una API key global de IA. Cada usuario configura:
- **Provider**: OpenAI o Anthropic (Claude)
- **Modelo**: gpt-4o-mini, gpt-4o, claude-sonnet-4-20250514, claude-haiku-4-5-20251001, etc.
- **API Key**: Su propia key (se guarda encriptada en el Newsletter model)

### Patron multi-provider:
```typescript
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Servicio que decide que provider usar segun la config del newsletter
async function generateWithAI(newsletter: INewsletter, prompt: string): Promise<string> {
  if (newsletter.aiProvider === 'openai') {
    const openai = new OpenAI({ apiKey: decrypt(newsletter.aiApiKey) });
    const response = await openai.chat.completions.create({
      model: newsletter.aiModel || 'gpt-4o-mini',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    return response.choices[0].message.content;

  } else if (newsletter.aiProvider === 'anthropic') {
    const anthropic = new Anthropic({ apiKey: decrypt(newsletter.aiApiKey) });
    const response = await anthropic.messages.create({
      model: newsletter.aiModel || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }]
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}
```

### Modelos sugeridos para mostrar en el UI:
**OpenAI:**
- `gpt-4o-mini` - Rapido y economico (recomendado)
- `gpt-4o` - Mas potente

**Anthropic (Claude):**
- `claude-haiku-4-5-20251001` - Rapido y economico (recomendado)
- `claude-sonnet-4-20250514` - Balance calidad/velocidad
- `claude-opus-4-20250514` - Mas potente

### El prompt del sistema debe generar JSON con esta estructura:
```json
{ "subject": "...", "sections": [{ "title": "...", "content": "..." }] }
```

### Template HTML para el email:
Crear un template HTML responsive inline-styled (los emails no soportan CSS externo).
Debe incluir:
- Header con nombre del newsletter
- Secciones de contenido
- Footer con link de unsubscribe
- Estilos inline (no clases CSS)

---

## AUTH EXISTENTE

El sistema de auth usa JWT. Patron para proteger API routes:
```typescript
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const decoded = verifyToken(token);
  if (!decoded) return Response.json({ error: 'Token invalido' }, { status: 401 });

  // decoded.userId contiene el ID del usuario
}
```

---

## VARIABLES DE ENTORNO (.env.local)
```env
# Ya existentes
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...

# Nuevas a agregar (solo Zavu es del servidor, IA la pone cada usuario)
ZAVU_API_KEY=...
ZAVU_SENDER_EMAIL=newsletter@tuproyecto.sandbox.zavu.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_ENCRYPTION_KEY=...          # Clave para encriptar/desencriptar las API keys de IA de los usuarios (32 chars)
```

**NOTA**: NO hay OPENAI_API_KEY ni ANTHROPIC_API_KEY como env vars.
Cada usuario ingresa su propia API key desde el dashboard y se guarda encriptada en MongoDB.

---

## DIVISION DE TRABAJO POR AGENTE

### AGENTE 1: Landing Principal + Pagina Publica del Newsletter
**Archivos a crear/modificar:**
- `src/app/page.tsx` - Reescribir landing principal del SaaS
- `src/app/n/[slug]/page.tsx` - Landing publica del newsletter con:
  - Hero con nombre y descripcion del newsletter
  - Formulario de suscripcion (solo email)
  - Preview del ultimo issue generado (renderizado bonito)
  - Contador de suscriptores
  - Footer con unsubscribe
- `src/app/n/[slug]/unsubscribe/page.tsx` - Pagina de unsubscribe
- `src/app/api/subscribe/[slug]/route.ts` - API publica para suscribirse
- `src/app/api/unsubscribe/route.ts` - API publica para desuscribirse
- `src/app/api/public/newsletter/[slug]/route.ts` - API publica para obtener info del newsletter

**Criterios de calidad:**
- La landing principal debe vender la plataforma (hero, features, como funciona, CTA)
- La landing del newsletter `/n/[slug]` debe ser visualmente impresionante
- Usar Framer Motion para animaciones suaves
- Responsive y con dark/light mode
- El preview del newsletter debe verse como un email real

---

### AGENTE 2: Dashboard + CRUD de Newsletters
**Archivos a crear/modificar:**
- `src/models/Newsletter.ts` - Modelo mongoose
- `src/models/Subscriber.ts` - Modelo mongoose
- `src/models/NewsletterIssue.ts` - Modelo mongoose
- `src/app/api/newsletters/route.ts` - GET (listar) y POST (crear)
- `src/app/api/newsletters/[id]/route.ts` - GET, PUT, DELETE
- `src/app/api/newsletters/[id]/subscribers/route.ts` - GET suscriptores
- `src/app/api/newsletters/[id]/issues/route.ts` - GET issues
- `src/app/dashboard/page.tsx` - Dashboard principal: lista de newsletters
- `src/app/dashboard/newsletter/new/page.tsx` - Formulario crear newsletter
- `src/app/dashboard/newsletter/[id]/page.tsx` - Detalle/editar newsletter
- `src/app/dashboard/newsletter/[id]/issues/page.tsx` - Lista de issues
- `src/app/dashboard/newsletter/[id]/subscribers/page.tsx` - Lista suscriptores
- `src/app/dashboard/layout.tsx` - Adaptar sidebar para newsletter

**Criterios de calidad:**
- Dashboard limpio y funcional
- Formulario de creacion intuitivo (nombre, slug auto-generado, tema, frecuencia, estilo)
- **Seccion de configuracion de IA en el formulario de crear/editar newsletter:**
  - Selector de provider: OpenAI o Anthropic (Claude)
  - Selector de modelo (lista predefinida segun el provider seleccionado):
    - OpenAI: gpt-4o-mini (recomendado), gpt-4o
    - Anthropic: claude-haiku-4-5-20251001 (recomendado), claude-sonnet-4-20250514, claude-opus-4-20250514
  - Input para API Key (type="password", con boton para mostrar/ocultar)
  - Boton "Probar conexion" que hace una llamada de prueba a la API
- Vista de stats (suscriptores, issues enviados)
- Todas las rutas API protegidas con auth JWT
- Usar los componentes UI existentes (button.tsx, etc)

---

### AGENTE 3: Motor IA + Envio con Zavu.dev
**Archivos a crear/modificar:**
- `src/lib/ai.ts` - Servicio multi-provider de generacion con IA (OpenAI + Anthropic)
- `src/lib/crypto.ts` - Funciones encrypt/decrypt para las API keys de usuarios
- `src/lib/email.ts` - Servicio de envio de emails con Zavu.dev
- `src/lib/newsletter-template.ts` - Template HTML del email (inline styles)
- `src/app/api/newsletters/[id]/generate/route.ts` - Generar issue con IA
- `src/app/api/newsletters/[id]/send/route.ts` - Enviar issue a suscriptores
- `src/app/api/newsletters/[id]/test-ai/route.ts` - Probar conexion de IA del usuario
- `src/app/api/cron/generate-newsletters/route.ts` - Cron endpoint

**Criterios de calidad:**
- **Multi-provider**: Leer aiProvider, aiModel y aiApiKey del Newsletter model.
  Desencriptar la key y usarla para llamar al provider correcto (OpenAI SDK o Anthropic SDK).
- El contenido generado debe ser genuinamente util e interesante
- Usar prompts sofisticados que generen contenido de alta calidad
- El template HTML del email debe ser responsive, profesional y bonito
- Manejar errores de envio gracefully
- El endpoint test-ai debe hacer una llamada simple para verificar que la key funciona
- El cron endpoint debe:
  1. Buscar newsletters activos cuya frecuencia corresponda (daily/weekly)
  2. Desencriptar la API key del usuario
  3. Generar contenido con el provider/modelo configurado
  4. Enviar a todos los suscriptores activos via Zavu.dev
  5. Registrar el issue en la BD
- Incluir link de unsubscribe en cada email
- El subject del email debe ser atractivo y generado por IA

---

## NOTAS IMPORTANTES

1. **No borrar funcionalidad existente** de auth, stripe, etc. Solo adaptar/extender.
2. **Usar las convenciones del proyecto**: los archivos existentes usan TypeScript estricto, mongoose schemas, JWT auth.
3. **Dark/Light mode**: todo debe funcionar con ambos temas.
4. **Responsive**: todo debe verse bien en mobile.
5. **El idioma principal es espanol** pero el contenido generado puede ser en el idioma que el usuario configure.
6. **Para el hackathon**: priorizar que funcione y se vea impresionante sobre ser perfecto internamente.
7. **Las API keys de IA son POR USUARIO**, no globales. Se guardan encriptadas en el modelo Newsletter.

---

## INSTRUCCIONES PARA COPIAR A CADA AGENTE

### Copiar a AGENTE 1:
```
Lee el archivo CONTEXT.md en la raiz del proyecto. Contiene toda la arquitectura del SaaS.

Tu eres el AGENTE 1: Landing Principal + Pagina Publica del Newsletter.

Ejecuta UNICAMENTE los archivos listados en la seccion "AGENTE 1" del documento.
NO toques archivos asignados a los otros agentes.

Tus archivos:
- src/app/page.tsx (reescribir landing del SaaS)
- src/app/n/[slug]/page.tsx (landing publica del newsletter)
- src/app/n/[slug]/unsubscribe/page.tsx
- src/app/api/subscribe/[slug]/route.ts
- src/app/api/unsubscribe/route.ts
- src/app/api/public/newsletter/[slug]/route.ts

Primero lee CONTEXT.md completo para entender la arquitectura.
Luego lee los archivos existentes que necesites (page.tsx, layout.tsx, globals.css, etc).
Despues implementa todo.

IMPORTANTE: La landing de /n/[slug] debe ser VISUALMENTE IMPRESIONANTE.
Es lo que el jurado va a ver. Usa Framer Motion, gradientes, animaciones.
Debe mostrar un preview del ultimo newsletter generado y un formulario de suscripcion.
```

---

### Copiar a AGENTE 2:
```
Lee el archivo CONTEXT.md en la raiz del proyecto. Contiene toda la arquitectura del SaaS.

Tu eres el AGENTE 2: Dashboard + CRUD de Newsletters.

Ejecuta UNICAMENTE los archivos listados en la seccion "AGENTE 2" del documento.
NO toques archivos asignados a los otros agentes.

Tus archivos:
- src/models/Newsletter.ts (incluye campos aiProvider, aiModel, aiApiKey)
- src/models/Subscriber.ts
- src/models/NewsletterIssue.ts
- src/app/api/newsletters/route.ts
- src/app/api/newsletters/[id]/route.ts
- src/app/api/newsletters/[id]/subscribers/route.ts
- src/app/api/newsletters/[id]/issues/route.ts
- src/app/dashboard/page.tsx
- src/app/dashboard/newsletter/new/page.tsx
- src/app/dashboard/newsletter/[id]/page.tsx
- src/app/dashboard/newsletter/[id]/issues/page.tsx
- src/app/dashboard/newsletter/[id]/subscribers/page.tsx
- src/app/dashboard/layout.tsx

Primero lee CONTEXT.md completo para entender la arquitectura.
Luego lee los archivos existentes (User.ts, auth.ts, dashboard/layout.tsx, etc).
Despues implementa todo.

IMPORTANTE: El formulario de crear/editar newsletter DEBE incluir seccion de configuracion de IA:
- Selector de provider (OpenAI / Anthropic)
- Selector de modelo (lista segun provider)
- Input de API key (password field)
- Boton "Probar conexion"
La API key se envia al backend y se guarda encriptada.
```

---

### Copiar a AGENTE 3:
```
Lee el archivo CONTEXT.md en la raiz del proyecto. Contiene toda la arquitectura del SaaS.

Tu eres el AGENTE 3: Motor IA + Envio con Zavu.dev.

Ejecuta UNICAMENTE los archivos listados en la seccion "AGENTE 3" del documento.
NO toques archivos asignados a los otros agentes.

Tus archivos:
- src/lib/ai.ts (servicio multi-provider: OpenAI + Anthropic)
- src/lib/crypto.ts (encrypt/decrypt para API keys)
- src/lib/email.ts (servicio Zavu.dev)
- src/lib/newsletter-template.ts (template HTML email con inline styles)
- src/app/api/newsletters/[id]/generate/route.ts
- src/app/api/newsletters/[id]/send/route.ts
- src/app/api/newsletters/[id]/test-ai/route.ts
- src/app/api/cron/generate-newsletters/route.ts

Primero lee CONTEXT.md completo para entender la arquitectura.
Luego lee los archivos existentes (db.ts, auth.ts, etc).
Despues implementa todo.

IMPORTANTE:
- El servicio ai.ts debe soportar AMBOS providers (OpenAI y Anthropic).
  Lee aiProvider, aiModel y aiApiKey del modelo Newsletter.
  Desencripta la key con crypto.ts y llama al SDK correspondiente.
- crypto.ts usa AI_ENCRYPTION_KEY del .env para encriptar/desencriptar con AES-256.
- El newsletter template debe ser HTML puro con inline styles (los emails no soportan CSS).
- Cada email debe tener link de unsubscribe en el footer.
- Instala: npm install @zavudev/sdk openai @anthropic-ai/sdk
```
