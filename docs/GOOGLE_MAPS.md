# Google Maps — Android (Expo)

## ¿Hace falta development build?

**Sí, para Google Maps nativo en Android con clave propia.**  
`react-native-maps` en Expo Go puede mostrar mapas limitados; para Maps SDK for Android con su API key y restricciones de aplicación se recomienda un **development build** o un build de producción (`eas build` / `expo prebuild` + Gradle).

Documentación Expo: https://docs.expo.dev/versions/latest/sdk/map-view/

## Configurar la clave (no la pegue en el chat ni en commits)

1. Abra [Google Cloud Console — Credenciales](https://console.cloud.google.com/apis/credentials).
2. Seleccione o cree un **proyecto** (p. ej. `ruta-iberica`).
3. En «Biblioteca de APIs», habilite **Maps SDK for Android**.
4. Cree una **clave de API** → restrínjala:
   - **Restricción de aplicación**: Apps de Android.
   - **Nombre del paquete**: el de `app.json` (`android.package`, p. ej. `com.rutaiberica.app`).
   - **Huella SHA-1** del certificado de firma (debug y/o release).
   - **Restricción de API**: solo Maps SDK for Android (y las que realmente use).
5. Copie la clave solo a variables locales:
   - `app.json` → `android.config.googleMaps.apiKey`, **o**
   - mejor: `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env` (archivo ignorado por git).

Plantilla: `.env.example`.

### Obtener SHA-1 (debug)

```bash
# Tras prebuild / keystore debug
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Para release, use el keystore de EAS/producción.

## Costes y cuotas

- Consulte precios y cuotas actuales en Google Maps Platform.
- Las **alertas de presupuesto** avisan; **no cortan el gasto automáticamente**. Configure cuotas máximas o deshabilitación si necesita un tope duro.
- Para «Cómo llegar» usamos **enlaces a apps de navegación externas** (Google Maps / geo URI), sin Directions API de pago en esta versión.

## Privacidad de ubicación

- Solo se solicita ubicación cuando el usuario pulsa «Mi ubicación» o calcula distancia al inicio.
- Si deniega el permiso, puede explorar el mapa y buscar igual.
- **No** hay seguimiento en segundo plano en v1.
- **No** se almacena ni publica la ubicación precisa del usuario por defecto.
