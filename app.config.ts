import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Ruta Ibérica',
  slug: 'ruta-iberica',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/logo.png',
  userInterfaceStyle: 'light',
  scheme: 'rutaiberica',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#14241E',
  },
  androidStatusBar: {
    backgroundColor: '#14241E',
    barStyle: 'light-content',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.rutaiberica.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Ruta Ibérica usa su ubicación solo al pulsar «Mi ubicación» o calcular la distancia al inicio de una ruta. No se almacena por defecto ni se rastrea en segundo plano.',
    },
  },
  android: {
    package: 'com.rutaiberica.app',
    adaptiveIcon: {
      backgroundColor: '#14241E',
      foregroundImage: './assets/logo.png',
    },
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#14241E',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    usesCleartextTraffic: true,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Ruta Ibérica usa su ubicación solo cuando usted lo solicita para centrar el mapa o medir la distancia al inicio. No hay seguimiento en segundo plano.',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#14241E',
        image: './assets/splash-icon.png',
        imageWidth: 220,
        resizeMode: 'contain',
      },
    ],
  ],
});

