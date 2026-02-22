# ALIADO+50 (Expo + Expo Router)

App móvil (Android/iOS) con flujo MVP:
- Splash (carga animada + fondo animado)
- Login (sin backend) + botón **Modo demo**
- DashboardPrincipal con 3 módulos (bloqueados): **AhorraMed**, **LegalAsi**, **TramiteSeg**

## Requisitos
- Node.js + npm
- Expo Go en tu celular (para demo)

## Ejecutar (IMPORTANTE: carpeta correcta)
Este proyecto vive en `frontend/aliado50`.

En Windows / PowerShell:
```bash
cd frontend/aliado50
npm install
npx expo start
```

## Ejecutar en Web
```bash
cd frontend/aliado50
npx expo start --web --clear
```

Si ves `GET http://localhost:8081/ 500` revisa primero que el comando se esté ejecutando dentro de `frontend/aliado50` (en la raíz del repo no hay `package.json`).

Si el puerto 8081 está ocupado:
```bash
cd frontend/aliado50
npx expo start --port 8082
```

## Ver el Splash en modo desarrollo
En desarrollo, a veces Expo/Router puede “recordar” la última pantalla al recargar.
Si quieres ver el Splash sí o sí:
- Cierra la app en el celular y vuelve a abrirla desde Expo Go
- O inicia el servidor con cache limpia:

```bash
cd frontend/aliado50
npx expo start --clear
```

## Estructura (rutas)
- Splash: `app/index.tsx`
- Login: `app/login.tsx`
- Dashboard: `app/dashboard.tsx`

La navegación está en `app/_layout.tsx`.

## Notas
- No hay backend (login real deshabilitado).
- Los módulos aún no están accesibles (por diseño del MVP).

## Generar instalable (producción)
Este proyecto ya quedó preparado para EAS Build con perfiles en `eas.json`.

### 1) Instala EAS CLI y autentícate
```bash
npm install -g eas-cli
eas login
```

### 2) Configura el proyecto EAS (primera vez)
```bash
cd frontend/aliado50
eas build:configure
```

### 3) Generar APK instalable (pruebas internas)
```bash
cd frontend/aliado50
npm run build:apk
```

### 4) Generar AAB de producción (Play Store)
```bash
cd frontend/aliado50
npm run build:aab
```

### Importante
- Si usas Expo Go, módulos nativos como STT no están disponibles.
- Para STT nativo, instala un build generado por EAS (APK/AAB).
