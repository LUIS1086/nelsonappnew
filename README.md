# NelsonApp · Iconos profesionales (versión final)

Reemplazo de los iconos viejos por la versión profesional con el diseño de las **dos llaves cruzadas**.

## 📁 Contenido

10 archivos PNG, todos con el mismo diseño (variante A · naranja sobre negro):

```
icon-72x72.png
icon-96x96.png
icon-128x128.png
icon-144x144.png
icon-152x152.png
icon-192x192.png
icon-384x384.png
icon-512x512.png
icon-maskable-192x192.png   (versión Android adaptive)
icon-maskable-512x512.png   (versión Android adaptive)
```

## 🚀 Cómo reemplazarlos en GitHub

### Opción A · Sobrescribir uno por uno (recomendado)

Como los nombres son **idénticos** a los que ya tienes en el repo, simplemente:

1. Entra a tu repo de NelsonApp en github.com
2. Por cada archivo nuevo (uno a la vez):
   - Click en el archivo viejo (ej. `icon-512x512.png`)
   - Click el botón de **lápiz** (Edit) → no, mejor: click los **3 puntitos arriba a la derecha** → **Delete file**
   - Commit la eliminación
   - Vuelve atrás y click **Add file → Upload files**
   - Arrastra el nuevo archivo
   - Commit

### Opción B · Subir todos de una (más rápido)

1. En el repo, click **Add file → Upload files**
2. Arrastra **TODOS los 10 PNG** al área de subida
3. GitHub te avisará que algunos archivos van a sobrescribirse — confirma
4. Commit con mensaje "Replace icons with professional design"

> ⚠️ Importante: Los archivos deben quedar en la **raíz** del repo (mismo lugar donde están los actuales), NO dentro de una carpeta `icons/`.

## ⏱️ Después de subir

1. Vercel re-despliega automáticamente en ~30 segundos
2. Verifica abriendo: `https://appnew.vercel.app/icon-512x512.png` — debe mostrar el nuevo
3. **Importante para el APK ya instalado:** El APK guarda en cache el ícono viejo. Para ver el nuevo:
   - Desinstala el APK del celular
   - Vuelve a instalarlo
   - O alternativamente, regenera el APK desde PWABuilder (recomendado para que también lo tenga el splash screen)

## 🎨 Detalles del diseño

- **Estilo:** Dark mode profesional, coherente con tu app
- **Colores:** Negro con gradiente sutil + glow naranja inferior
- **Ícono:** Llaves cruzadas naranjas con sombra suave
- **Acabado:** Brillo superior tipo cristal iOS

Se verá excelente en cualquier tamaño, desde 32px en notificaciones hasta 512px en la pantalla de instalación.
