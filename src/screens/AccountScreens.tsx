import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as authApi from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { setToken } from '../api/client';
import { Field, PrimaryButton } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

function goHome(navigation: NativeStackScreenProps<RootStackParamList, keyof RootStackParamList>['navigation']) {
  navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
}

export function AccountScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Account'>) {
  const { user, signOut, setUser, refresh } = useAuth();
  const [name, setName] = useState(user?.public_name || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.public_name || '');
  }, [user?.public_name]);

  if (!user) {
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Cuenta</Text>
        <Text style={styles.p}>
          Sin cuenta verá unas pocas rutas de ejemplo. Regístrese gratis para el catálogo completo,
          favoritos, comentarios y avisos.
        </Text>
        <PrimaryButton label="Iniciar sesión" onPress={() => navigation.navigate('Login')} />
        <PrimaryButton
          label="Crear cuenta"
          variant="ghost"
          onPress={() => navigation.navigate('Register')}
          style={{ marginTop: 8 }}
        />
      </View>
    );
  }

  const dirty = name.trim() !== (user.public_name || '').trim();

  return (
    <ScrollView contentContainerStyle={styles.box} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.p}>
        Hola, {user.public_name}. Ya tiene acceso al catálogo completo.
      </Text>
      <PrimaryButton label="Ver mapa y rutas" onPress={() => goHome(navigation)} />

      <Text style={[styles.p, { marginTop: 22 }]}>Nombre público (el correo no se muestra a otros).</Text>
      <Field value={name} onChangeText={setName} placeholder="Nombre público" />
      {!!msg && <Text style={styles.ok}>{msg}</Text>}
      <PrimaryButton
        label={busy ? 'Guardando…' : 'Guardar nombre'}
        loading={busy}
        disabled={!dirty || name.trim().length < 2}
        onPress={async () => {
          setBusy(true);
          setMsg(null);
          try {
            const u = await authApi.updateProfile(name.trim());
            setUser(u);
            setMsg('Nombre actualizado.');
          } catch (e: any) {
            setMsg(e?.error || 'No se pudo guardar el nombre.');
          } finally {
            setBusy(false);
          }
        }}
      />
      <PrimaryButton
        label="Cerrar sesión"
        variant="secondary"
        onPress={async () => {
          await signOut();
          await refresh();
          goHome(navigation);
        }}
        style={{ marginTop: 12 }}
      />
      <PrimaryButton
        label="Eliminar cuenta"
        variant="danger"
        style={{ marginTop: 28 }}
        onPress={() =>
          Alert.alert(
            'Eliminar cuenta',
            'Se desactivará la cuenta y se borrarán favoritos. Los comentarios quedarán como «Cuenta eliminada».',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const r = await authApi.deleteAccount();
                    Alert.alert('Cuenta', r.message);
                  } catch (e: any) {
                    Alert.alert('Error', e?.error || 'No se pudo eliminar.');
                    return;
                  }
                  await signOut();
                  goHome(navigation);
                },
              },
            ],
          )
        }
      />
    </ScrollView>
  );
}

export function LoginScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Login'>) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Iniciar sesión</Text>
      <Field
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Correo"
        value={email}
        onChangeText={setEmail}
      />
      <Field secureTextEntry placeholder="Contraseña" value={password} onChangeText={setPassword} />
      {!!msg && <Text style={styles.error}>{msg}</Text>}
      <PrimaryButton
        label="Entrar"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await signIn(email.trim(), password);
            goHome(navigation);
          } catch (e: any) {
            setMsg(e?.error || 'Error de acceso');
          } finally {
            setBusy(false);
          }
        }}
      />
      <Pressable onPress={() => navigation.navigate('Forgot')}>
        <Text style={styles.link}>Recuperar contraseña</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Crear cuenta</Text>
      </Pressable>
    </View>
  );
}

export function RegisterScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Register'>) {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password_confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.box} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Registro</Text>
      <Text style={styles.p}>
        Cuenta gratis: desbloquea todas las rutas de la península (vías verdes, pecuarias, ciclovías…).
      </Text>
      <Field
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Correo"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        secureTextEntry
        placeholder="Contraseña (mín. 8)"
        value={password}
        onChangeText={setPassword}
      />
      <Field
        secureTextEntry
        placeholder="Confirmar contraseña"
        value={password_confirm}
        onChangeText={setConfirm}
      />
      {!!msg && <Text style={styles.error}>{msg}</Text>}
      <PrimaryButton
        label={busy ? 'Creando…' : 'Crear cuenta'}
        loading={busy}
        onPress={async () => {
          const localErrors: string[] = [];
          if (!email.includes('@')) localErrors.push('Correo no válido.');
          if (password.length < 8) localErrors.push('La contraseña debe tener al menos 8 caracteres.');
          if (password !== password_confirm) localErrors.push('La confirmación no coincide.');
          if (localErrors.length) {
            setMsg(localErrors.join('\n'));
            return;
          }
          setBusy(true);
          setMsg(null);
          try {
            const r = await authApi.register({
              email: email.trim(),
              password,
              password_confirm,
              public_name: email.trim().split('@')[0],
              accept_terms: true,
            });
            if (r.access_token) {
              await setToken(r.access_token);
            }
            setUser(r.user);
            // Al mapa con catálogo completo (no al perfil).
            goHome(navigation);
          } catch (e: any) {
            const details = Array.isArray(e?.details) ? e.details.join('\n') : '';
            setMsg(details || e?.error || 'No se pudo registrar.');
          } finally {
            setBusy(false);
          }
        }}
      />
      <Pressable onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Ya tengo cuenta</Text>
      </Pressable>
    </ScrollView>
  );
}

/** Pantalla residual por si llega un enlace antiguo; ya no forma parte del registro. */
export function VerifyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Verify'>) {
  useEffect(() => {
    goHome(navigation);
  }, [navigation]);
  return (
    <View style={styles.box}>
      <Text style={styles.p}>No hace falta verificar el correo en esta versión.</Text>
    </View>
  );
}

export function ForgotScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Forgot'>) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Recuperar contraseña</Text>
      <Field
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Correo"
        value={email}
        onChangeText={setEmail}
      />
      {!!msg && <Text style={styles.p}>{msg}</Text>}
      <PrimaryButton
        label="Enviar enlace"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            const r = await authApi.forgotPassword(email.trim());
            setMsg(
              r.mail?.sent
                ? 'Si la cuenta existe, recibirá un enlace.'
                : `El correo NO se ha enviado. ${r.mail?.message || r.message}`,
            );
            if (r.dev_token) navigation.navigate('Reset', { token: r.dev_token });
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

export function ResetScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Reset'>) {
  const [token, setTokenVal] = useState(route.params?.token || '');
  const [password, setPassword] = useState('');
  const [password_confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Nueva contraseña</Text>
      {!route.params?.token && (
        <Field placeholder="Código del enlace" value={token} onChangeText={setTokenVal} autoCapitalize="none" />
      )}
      <Field secureTextEntry placeholder="Nueva contraseña" value={password} onChangeText={setPassword} />
      <Field secureTextEntry placeholder="Confirmar" value={password_confirm} onChangeText={setConfirm} />
      {!!msg && <Text style={styles.p}>{msg}</Text>}
      <PrimaryButton
        label="Guardar"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            const r = await authApi.resetPassword(token.trim(), password, password_confirm);
            setMsg(r.message);
            navigation.navigate('Login');
          } catch (e: any) {
            setMsg(e?.error || 'No se pudo restablecer.');
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexGrow: 1, padding: spacing.xl, backgroundColor: colors.mist },
  title: { fontSize: 28, fontFamily: 'serif', color: colors.ink, marginBottom: 12 },
  p: { color: colors.ink, marginBottom: 12, lineHeight: 22 },
  ok: { color: colors.moss, marginBottom: 10, lineHeight: 20 },
  link: { color: colors.clay, marginTop: 14, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: 10, lineHeight: 20 },
});
