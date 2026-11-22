import React, { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getRoute } from '../data/routeCache';
import { loadLocalRoutes } from '../data/mapRoutes';
import { routeNarrative } from '../data/routeNarrative';
import { PrimaryButton, SectionCard } from '../components/ui';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RouteDetail'>;

export default function RouteDetailScreen({ route }: Props) {
  const data = useMemo(() => {
    const cached = getRoute(route.params.id);
    if (cached) return cached;
    const locals = loadLocalRoutes(
      { min_lon: -10, min_lat: 35, max_lon: 5, max_lat: 44 },
      {},
    );
    return locals.find((r) => r.id === route.params.id) || null;
  }, [route.params.id]);

  const narrative = useMemo(() => (data ? routeNarrative(data) : null), [data]);

  if (!data || !narrative) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Ruta no encontrada en la app.</Text>
      </View>
    );
  }

  const line =
    data.route_type === 'via_pecuaria'
      ? data.vp_subtype === 'canada'
        ? colors.viaCanada
        : data.vp_subtype === 'cordel'
          ? colors.viaCordel
          : data.vp_subtype === 'vereda'
            ? colors.viaVereda
            : colors.viaColada
      : data.provider === 'osm'
        ? colors.osm
        : colors.moss;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {data.geometry.length > 1 && (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: data.geometry[0].latitude,
            longitude: data.geometry[0].longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          <Polyline coordinates={data.geometry} strokeColor={line} strokeWidth={4} />
        </MapView>
      )}

      <View style={styles.body}>
        <Text style={styles.kicker}>
          {data.vp_subtype_label || data.route_type}
          {data.is_official ? ' · fuente oficial' : ''}
          {data.is_demo ? ' · demo' : ''}
        </Text>
        <Text style={styles.title}>{data.name}</Text>
        <Text style={styles.lead}>{narrative.lead}</Text>

        <SectionCard style={styles.block}>
          <Text style={styles.h}>Sobre esta ruta</Text>
          <Text style={styles.bodyText}>{narrative.body}</Text>
        </SectionCard>

        <SectionCard style={styles.block}>
          <Text style={styles.h}>Datos del tramo</Text>
          {narrative.bullets.map((b) => (
            <Text key={b} style={styles.bullet}>
              · {b}
            </Text>
          ))}
        </SectionCard>

        <SectionCard style={styles.block}>
          <Text style={styles.h}>Inicio del trazado</Text>
          <Text style={styles.bodyText}>
            {data.start_lat != null
              ? `${data.start_lat.toFixed(5)}, ${data.start_lon?.toFixed(5)}`
              : 'desconocido'}
          </Text>
          <Text style={styles.meta}>
            {[data.locality, data.province, data.ccaa].filter(Boolean).join(' · ') || 'Sin localidad'}
          </Text>
        </SectionCard>

        <SectionCard style={styles.block}>
          <Text style={styles.h}>Fuente y atribución</Text>
          <Text style={styles.bodyText}>{data.attribution || 'Sin atribución'}</Text>
          <Text style={styles.meta}>{data.source_name}</Text>
          <Text style={styles.meta}>Licencia: {data.license_name || 'desconocida'}</Text>
          <Text style={styles.meta}>
            Actualización: {data.source_updated_at || 'desconocida'}
          </Text>
          {!!data.source_link && (
            <PrimaryButton
              label="Abrir fuente original"
              variant="ghost"
              onPress={() => Linking.openURL(data.source_link!)}
              style={{ marginTop: spacing.sm, alignSelf: 'flex-start', paddingHorizontal: 0 }}
            />
          )}
        </SectionCard>

        <PrimaryButton
          label="Abrir en mapa"
          onPress={() => {
            if (data.start_lat != null && data.start_lon != null) {
              Linking.openURL(
                `geo:${data.start_lat},${data.start_lon}?q=${data.start_lat},${data.start_lon}`,
              );
            }
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.mist },
  content: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mist },
  map: { height: 240, width: '100%' },
  body: { padding: spacing.lg },
  kicker: {
    color: colors.moss,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 11,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
    fontFamily: 'serif',
    marginBottom: 8,
  },
  lead: { color: colors.mute, marginBottom: spacing.lg, lineHeight: 22 },
  block: { marginBottom: spacing.md },
  h: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.mossDark,
    marginBottom: spacing.sm,
  },
  bodyText: { color: colors.ink, lineHeight: 22, fontSize: 15 },
  bullet: { color: colors.ink, lineHeight: 22, marginBottom: 2 },
  meta: { color: colors.mute, marginTop: 4, fontSize: 13 },
  error: { color: colors.danger },
});
