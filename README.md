# Ruta Ibérica — Frontend

App React Native (Expo + TypeScript) para descubrir rutas de bicicleta y senderismo en España y Portugal peninsulares.

Backend (API): [ruta-iberica-backend](https://github.com/rhommelzorro/ruta-iberica-backend)

## Requisitos

- Node.js 20+ y npm
- Clave Google Maps (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env`, nunca en git)

## Arranque local

```bash
copy .env.example .env
# EXPO_PUBLIC_API_URL=http://127.0.0.1:5000
# EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
npm install
npx expo start
```

En producción, apunta la API a PythonAnywhere:

```env
EXPO_PUBLIC_API_URL=https://TUUSUARIO.pythonanywhere.com
```

## APK

```bash
npx eas-cli build -p android --profile preview
```

## Documentación

- `docs/GOOGLE_MAPS.md` — clave, restricciones, costes
- `docs/FUENTES.md` — datos embebidos y conectores
