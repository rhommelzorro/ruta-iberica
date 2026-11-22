import React, { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import HomeMapScreen from './src/screens/HomeMapScreen';
import RouteDetailScreen from './src/screens/RouteDetailScreen';
import {
  AccountScreen,
  ForgotScreen,
  LoginScreen,
  RegisterScreen,
  ResetScreen,
  VerifyScreen,
} from './src/screens/AccountScreens';
import type { RootStackParamList } from './src/navigation/types';
import { colors } from './src/theme';

const logo = require('./assets/logo.png');

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const Stack = createNativeStackNavigator<RootStackParamList>();

function BootSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <View style={boot.root}>
      <Image source={logo} style={boot.logo} resizeMode="contain" accessibilityLabel="Ruta Ibérica" />
      <Text style={boot.title}>Ruta Ibérica</Text>
      <Text style={boot.sub}>España · Portugal</Text>
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  const finishBoot = useCallback(() => {
    setReady(true);
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    // Por si el splash nativo se queda colgado
    const safety = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, 2500);
    return () => clearTimeout(safety);
  }, []);

  if (!ready) {
    return (
      <>
        <StatusBar style="light" />
        <BootSplash onDone={finishBoot} />
      </>
    );
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.ink },
            headerTintColor: colors.sand,
            contentStyle: { backgroundColor: colors.mist },
          }}
        >
          <Stack.Screen name="Home" component={HomeMapScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RouteDetail" component={RouteDetailScreen} options={{ title: 'Ficha de ruta' }} />
          <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Cuenta' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar sesión' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Registro' }} />
          <Stack.Screen name="Verify" component={VerifyScreen} options={{ title: 'Verificar correo' }} />
          <Stack.Screen name="Forgot" component={ForgotScreen} options={{ title: 'Recuperar' }} />
          <Stack.Screen name="Reset" component={ResetScreen} options={{ title: 'Nueva contraseña' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

const boot = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  title: {
    color: colors.sand,
    fontSize: 34,
    fontFamily: 'serif',
    letterSpacing: 0.4,
  },
  sub: {
    color: '#B7A992',
    marginTop: 8,
    fontSize: 14,
  },
});
