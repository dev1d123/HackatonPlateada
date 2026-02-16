# agent.md — Estado del proyecto (ALIADO+50)

Fecha: 2026-02-15  
Actualización: 2026-02-16 (fix web 500/tslib + ajuste animaciones)  
Workspace: `HackatonPlateada/`  
App principal: `frontend/aliado50/` (Expo + Expo Router)

## Objetivo actual (MVP)
Flujo mínimo implementado:
1) Splash tipo carga con marca **ALIADO+50**
2) Pantalla **Login** (sin backend) con botón **Modo demo**
3) **DashboardPrincipal** con lista (1 columna) de 3 módulos principales:
   - AhorraMed
   - LegalAsi
   - TramiteSeg

**Importante:** Los módulos NO son accesibles todavía (tarjetas deshabilitadas).

## UX implementada (lo que ya funciona)
- **Splash**: muestra ALIADO+50 + barra de progreso animada y auto-navega a Login.
- **Login**:
  - Inputs de correo y contraseña (solo UI).
  - Botón “Iniciar sesión” deshabilitado.
  - Botón “Modo demo” navega al Dashboard.
- **DashboardPrincipal**:
  - Lista vertical (una sola columna) con 3 tarjetas.
  - Cada tarjeta indica “próximamente” y aparece con candado.

Extras visuales actuales:
- Fondo con **imagen remota + gradiente + partículas** en Splash/Login/Dashboard.
- Hover en web (Pressable `hovered`) para dar feedback.
- Transición de navegación tipo **fade** entre pantallas.

## Rutas / navegación
Navegación por `expo-router` con un stack simple.

Archivo clave:
- [frontend/aliado50/app/_layout.tsx](frontend/aliado50/app/_layout.tsx)

Stack actual (sin headers):
- `/` → Splash ([frontend/aliado50/app/index.tsx](frontend/aliado50/app/index.tsx))
- `/login` → Login ([frontend/aliado50/app/login.tsx](frontend/aliado50/app/login.tsx))
- `/dashboard` → DashboardPrincipal ([frontend/aliado50/app/dashboard.tsx](frontend/aliado50/app/dashboard.tsx))

Nota: La carpeta de tabs del template sigue existiendo (`app/(tabs)/...`) pero ya no es la entrada del flujo.

## Componentes agregados
- Partículas (sin dependencia extra):
  - [frontend/aliado50/components/particles-background.tsx](frontend/aliado50/components/particles-background.tsx)
- Fondo reutilizable (imagen + gradiente + partículas):
  - [frontend/aliado50/components/screen-background.tsx](frontend/aliado50/components/screen-background.tsx)
- Helper para alpha desde colores del tema:
  - [frontend/aliado50/components/color.ts](frontend/aliado50/components/color.ts)

## Iconos
El proyecto usa `IconSymbol` con mapeo a MaterialIcons en Android/Web y SF Symbols en iOS.

Se agregaron mapeos para:
- `lock.fill`
- `heart.fill`
- `gavel.fill`
- `verified.fill`

Archivo:
- [frontend/aliado50/components/ui/icon-symbol.tsx](frontend/aliado50/components/ui/icon-symbol.tsx)

## Dependencias (relevante)
Se instaló:
- `expo-linear-gradient` (para overlay/gradientes de fondo)

Se probó y se removió:
- `moti` (provocaba crash en web/Metro: `tslib.default` undefined → `GET / 500`)

Nota: las animaciones de Login siguen existiendo, pero ahora están hechas con `Animated` (React Native) para mantener compatibilidad en web.

En `frontend/aliado50/package.json`.

## Comandos de desarrollo (Windows / PowerShell)
Ejecutar SIEMPRE dentro de `frontend/aliado50/`.

- Instalar deps:
  - `npm install`
- Lint:
  - `npx expo lint`
- Correr app:
  - `npx expo start`
  - (o) `npm run start`

- Correr web:
  - `npx expo start --web --clear`

Tip: si no ves output, confirma el cwd con `Get-Location`.

## Estilo / tema
- Se respetan los colores base del template en:
  - [frontend/aliado50/constants/theme.ts](frontend/aliado50/constants/theme.ts)
- Los overlays (glass/gradiente) derivan de esos colores usando `withAlpha()`.

## Estado técnico / calidad
- `expo lint` pasa (sin warnings) al momento de este registro.

## Limitaciones conocidas (intencionales)
- No hay autenticación real (sin backend).
- Los módulos están bloqueados (no navegación a AhorraMed/LegalAsi/TramiteSeg).
- Se usan imágenes remotas (requiere internet para verse). Si se necesita offline, mover a `assets/`.

## Próximos pasos sugeridos (para mejorar)
1) Animación de entrada del contenido (fade/slide) por pantalla (sin cambiar el flujo).
2) Unificar espaciado/typography (posible creación de `ui/Button`, `ui/Card` reutilizables).
3) Reemplazar imágenes remotas por assets locales si el demo debe funcionar offline.
4) Preparar rutas placeholder para módulos (pero manteniendo bloqueo) si se quiere pre-armar navegación.

## Checklist rápido (para validar en demo)
- Abrir app → se ve Splash “ALIADO+50” → navega solo a Login.
- En Login, tocar “Modo demo” → abre DashboardPrincipal.
- En Dashboard, las 3 tarjetas existen, están deshabilitadas y muestran candado.
