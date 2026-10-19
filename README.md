# 🛠️ Todo Repuestos Nelson — Sistema ERP/CRM para Taller de Reparaciones y Repuestos

**Todo Repuestos Nelson (NelsonApp)** es una aplicación web progresiva (**PWA**) de grado empresarial diseñada específicamente para la gestión integral de talleres de reparación de pequeños electrodomésticos, control de inventario de repuestos, caja diaria, seguimiento de clientes y facturación/tickets.

---

## 🚀 Características Principales

- **📱 PWA Offline-First:** Instalable en Android, iOS y Escritorio. Funciona con o sin conexión a Internet gracias a su Service Worker dedicado.
- **🔐 Seguridad Avanzada:** Acceso mediante código PIN y autenticación biométrica (FaceID / Huella dactilar) integrada.
- **📋 Gestión de Órdenes de Servicio:**
  - Creación de órdenes con diagnóstico, captura de fotos desde la cámara y registro de estado en tiempo real.
  - Avisos automáticos a clientes vía **WhatsApp** con plantillas preconfiguradas.
  - Generación de tickets e informes en PDF (`jsPDF`, `html2canvas`).
- **📦 Inventario y Caja:**
  - Control de stock de repuestos, precios, costos y movimientos de caja diaria.
  - Módulo de ventas directas con lectura de códigos QR / Códigos de Barras.
- **👥 Cartera y Clientes:**
  - Registro de clientes, seguimiento de garantías y promociones por canal directo.
- **☁️ Sincronización y Respaldos:**
  - Integración nativa con **Supabase** para el seguimiento y base de datos relacional.
  - Generación de copias de seguridad automáticas y exportación a **Google Drive**.
  - Exportación de reportes a **Excel (`xlsx`)**, **CSV** y **PDF**.
- **🎨 Interfaz Accesible y Adaptativa:**
  - Módulo de personalización con tema claro/oscuro, alto contraste y responsive avanzado.

---

## 📁 Estructura del Proyecto

```text
nelsonappnew-main/
├── css/                     # Hojas de estilo modulares y diseño responsive
│   ├── 01-tema-variables.css
│   ├── ...
│   └── tailwind.css
├── js/
│   ├── core/                # Módulos centrales (Base, DB, Autenticación, PIN)
│   ├── libs/                # Librerías externas (Chart.js, jsPDF, XLSX, QRCode)
│   └── modules/             # Lógica de negocio (40 módulos independientes)
│       ├── 05-cartera-clientes.js
│       ├── 08-ordenes-formulario-camara.js
│       ├── 12-inventario.js
│       ├── 23-google-drive.js
│       └── ...
├── supabase/                # Scripts de base de datos y esquemas SQL (`seguimiento.sql`)
├── docs/                    # Documentación auxiliar e inserciones HTML
├── icons/                   # Iconografía PWA multiplataforma
├── index.html               # Vista principal del sistema
├── dashboard.html           # Panel de control analítico
├── manifest.json            # Configuración PWA
└── service-worker.js        # Gestión de caché y capacidades offline
