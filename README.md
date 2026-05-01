# NelsonApp · Migración a TWA (PWABuilder)

Paquete PWA optimizado para que **PWABuilder** dé score alto (90-100) y genere un APK gratis y permanente que reemplace Appilix.

---

## 📦 ¿Qué hay aquí?

```
nelson_pwa/
├── manifest.json          ← Configurado para alto score PWABuilder
├── service-worker.js      ← Con push handlers (suma puntos)
├── vercel.json            ← Headers correctos para PWA
├── icons/                 ← 10 tamaños distintos (PWABuilder los pide todos)
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   ├── icon-maskable-192x192.png
│   └── icon-maskable-512x512.png
└── README.md
```

---

## 🚀 Pasos

### 1️⃣ Reemplaza estos archivos en tu repo de NelsonApp

Sube los 13 archivos (incluida la carpeta `icons/`) al repo de NelsonApp en GitHub, **manteniendo la estructura** (los iconos deben quedar en `/icons/`).

> ⚠️ **No reemplaces tu `index.html`** — esos archivos los conservas como están. Solo agregas/reemplazas: `manifest.json`, `service-worker.js`, `vercel.json` y la carpeta `icons/`.

### 2️⃣ Espera 30 segundos a que Vercel re-despliegue

Vercel detecta el cambio y publica automáticamente. Verifica que tu URL siga abriendo bien.

### 3️⃣ Ve a PWABuilder

👉 [pwabuilder.com](https://pwabuilder.com)

- Pega tu URL de NelsonApp en Vercel
- Click **Start**
- Espera el análisis (30-60 segundos)

### 4️⃣ Verifica que el score esté alto

Deberías ver:
- ✅ Manifest: 100
- ✅ Service Worker: 100
- ✅ Security: 100

Si algo está rojo, haz screenshot y me cuentas.

### 5️⃣ Genera el APK

- Click **Package for Stores**
- Selecciona **Android**
- En la pantalla de configuración:
  - **Package ID:** `com.nelsonapp.taller`
  - **App name:** `NelsonApp Pro`
  - **Launcher name:** `NelsonApp`
  - **Display mode:** Standalone
  - **Status bar color:** `#f97316`
  - **Splash color:** `#0f172a`
- Click **Generate**

### 6️⃣ Signing key (firma digital)

Aquí PWABuilder te pregunta qué hacer con la firma. Escoge:

✅ **"Create a new signing key"** (la primera vez)

PWABuilder te genera una. **MUY IMPORTANTE:** Guarda el archivo `.keystore` que descargues junto con el password en un lugar seguro. Lo necesitas para futuras actualizaciones.

### 7️⃣ Descarga el ZIP

Te da un ZIP con:
- `app-release-signed.apk` ← este es el que instalas
- `signing-key-info.txt` ← guarda esto
- otros archivos para Play Store

### 8️⃣ Instala el APK

Pasas el `.apk` al celular por WhatsApp/USB, lo abres, te pide permiso de "Instalar apps de fuentes desconocidas", lo aceptas, instalas. Listo.

---

## ✨ Por qué este TWA es mejor que Appilix

| | Appilix | TWA (PWABuilder) |
|---|---|---|
| Costo mensual | $5–10 USD | **Gratis para siempre** |
| Login Google | ❌ Bloqueado | ✅ Funciona |
| Notificaciones push | Limitadas | ✅ Nativas |
| Calidad visual | Básica | Profesional |
| Splash screen | Genérico | Personalizado naranja |
| Actualizaciones | Reinstalar APK | Automáticas (es web real) |

Lo mejor: como TWA carga tu URL directamente, **cada vez que actualizas el repo en Vercel, los usuarios ven la nueva versión sin reinstalar el APK**. El APK es solo el "envoltorio".

---

## ❓ Si algo falla

**Score bajo en PWABuilder:** Revisa que el archivo `manifest.json` tenga `Content-Type: application/manifest+json` (lo arregla `vercel.json` automáticamente).

**APK no instala:** Asegúrate de que descargaste `app-release-signed.apk`, no `app-release-unsigned.apk`.

**Login Google sigue fallando:** Verifica que en Google Cloud Console el Client ID tiene tu URL de Vercel agregada como "Authorized JavaScript origins".

**No abre offline:** Espera 1-2 cargas iniciales para que el service worker cachee. Después funciona sin internet.
