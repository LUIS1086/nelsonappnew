# Respaldo del keystore del APK (PWABuilder / TWA)

**Si pierdes el keystore y su contraseña, NO podrás actualizar la app ya publicada** (ni instalar encima de la versión actual en los celulares).

## Qué guardar (los 3 juntos)
1. El archivo `.keystore` / `.jks` (el que PWABuilder te entregó con el APK).
2. La contraseña del keystore y la del alias.
3. El nombre del alias (`key alias`) y la huella SHA-256 (la misma que está en `.well-known/assetlinks.json`).

## Dónde guardarlo
- Una copia en tu Google Drive **personal** (carpeta privada, no compartida).
- Una copia en una memoria USB guardada fuera del negocio.
- Las contraseñas en un gestor de contraseñas (no en WhatsApp ni en el mismo archivo).
- **No** lo subas a GitHub: el `.gitignore` ya ignora `*.keystore` y `*.jks`; verifica que siga así.

## Revisión cada 6 meses
- Abre el archivo y confirma que la contraseña aún funciona: `keytool -list -keystore TU_ARCHIVO.keystore`
- Confirma que la huella SHA-256 que muestra coincide con `.well-known/assetlinks.json`.

## Si vendes la app a otros negocios
Cada negocio debe tener **su propio keystore y su propio paquete** (no reutilices el de Nelson).
