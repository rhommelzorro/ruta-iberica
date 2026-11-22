import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loadMapRoutes, shouldQueryOverpass, type MapRoute } from '../data/mapRoutes';
import { applyGuestRouteLimit, GUEST_TEASER } from '../data/guestShowcase';
import { putRoutes } from '../data/routeCache';
import { useAuth } from '../context/AuthContext';
import { Chip, Field, FilterRow, PrimaryButton } from '../components/ui';
import { colors, radii, spacing } from '../theme';
import { formatKm, regionToBBox } from '../utils/geo';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const logo = require('../../assets/logo.png');

const SPAIN_REGION: Region = {
  latitude: 40.0,
  longitude: -3.5,
  latitudeDelta: 8.5,
  longitudeDelta: 10,
};

const PORTUGAL_REGION: Region = {
  latitude: 39.5,
  longitude: -8.2,
  latitudeDelta: 5.5,
  longitudeDelta: 4.2,
};

const IBERIA_REGION: Region = {
  latitude: 39.6,
  longitude: -4.2,
  latitudeDelta: 9.5,
  longitudeDelta: 13.5,
};

/** Comunidades autónomas (+ Portugal) para el filtro de zona. */
const CCAA_ZONES: {
  id: string;
  label: string;
  query: string;
  country?: 'ES' | 'PT';
  region: Region;
}[] = [
  {
    id: 'andalucia',
    label: 'Andalucía',
    query: 'Andalucía',
    country: 'ES',
    region: { latitude: 37.4, longitude: -4.6, latitudeDelta: 3.2, longitudeDelta: 4.2 },
  },
  {
    id: 'aragon',
    label: 'Aragón',
    query: 'Aragón',
    country: 'ES',
    region: { latitude: 41.6, longitude: -0.9, latitudeDelta: 2.6, longitudeDelta: 3.2 },
  },
  {
    id: 'asturias',
    label: 'Asturias',
    query: 'Asturias',
    country: 'ES',
    // Más ancho: Eo (oeste) y Llanes / Picos (este) entraban fuera del bbox.
    region: { latitude: 43.25, longitude: -5.9, latitudeDelta: 1.5, longitudeDelta: 2.8 },
  },
  {
    id: 'cantabria',
    label: 'Cantabria',
    query: 'Cantabria',
    country: 'ES',
    // Incluye Castro Urdiales / Piquillo al este y Liébana al sur.
    region: { latitude: 43.15, longitude: -4.0, latitudeDelta: 1.35, longitudeDelta: 2.4 },
  },
  {
    id: 'castilla-leon',
    label: 'Castilla y León',
    query: 'Castilla y León',
    country: 'ES',
    region: { latitude: 41.7, longitude: -4.5, latitudeDelta: 3.4, longitudeDelta: 4.5 },
  },
  {
    id: 'castilla-mancha',
    label: 'Castilla-La Mancha',
    query: 'Castilla-La Mancha',
    country: 'ES',
    region: { latitude: 39.6, longitude: -2.9, latitudeDelta: 3.0, longitudeDelta: 4.0 },
  },
  {
    id: 'cataluna',
    label: 'Cataluña',
    query: 'Cataluña',
    country: 'ES',
    region: { latitude: 41.7, longitude: 1.5, latitudeDelta: 2.6, longitudeDelta: 3.2 },
  },
  {
    id: 'valencia',
    label: 'C. Valenciana',
    query: 'Comunitat Valenciana',
    country: 'ES',
    region: { latitude: 39.5, longitude: -0.6, latitudeDelta: 2.8, longitudeDelta: 2.8 },
  },
  {
    id: 'extremadura',
    label: 'Extremadura',
    query: 'Extremadura',
    country: 'ES',
    region: { latitude: 39.2, longitude: -6.2, latitudeDelta: 2.8, longitudeDelta: 3.0 },
  },
  {
    id: 'galicia',
    label: 'Galicia',
    query: 'Galicia',
    country: 'ES',
    region: { latitude: 42.75, longitude: -8.1, latitudeDelta: 2.2, longitudeDelta: 2.6 },
  },
  {
    id: 'madrid',
    label: 'Madrid',
    query: 'Comunidad de Madrid',
    country: 'ES',
    region: { latitude: 40.4, longitude: -3.7, latitudeDelta: 1.4, longitudeDelta: 1.6 },
  },
  {
    id: 'murcia',
    label: 'Murcia',
    query: 'Región de Murcia',
    country: 'ES',
    region: { latitude: 37.95, longitude: -1.3, latitudeDelta: 1.6, longitudeDelta: 1.8 },
  },
  {
    id: 'navarra',
    label: 'Navarra',
    query: 'Navarra',
    country: 'ES',
    region: { latitude: 42.7, longitude: -1.65, latitudeDelta: 1.6, longitudeDelta: 1.8 },
  },
  {
    id: 'pais-vasco',
    label: 'País Vasco',
    query: 'País Vasco',
    country: 'ES',
    // Enkarterri / Muskiz al oeste y Bidasoa / Arditurri al este.
    region: { latitude: 43.0, longitude: -2.55, latitudeDelta: 1.55, longitudeDelta: 2.3 },
  },
  {
    id: 'rioja',
    label: 'La Rioja',
    query: 'La Rioja',
    country: 'ES',
    region: { latitude: 42.3, longitude: -2.5, latitudeDelta: 1.2, longitudeDelta: 1.5 },
  },
  {
    id: 'portugal',
    label: 'Portugal',
    query: '',
    country: 'PT',
    region: PORTUGAL_REGION,
  },
];

export default function HomeMapScreen({ navigation }: Props) {
  const { user } = useAuth();
  const isAuthed = !!user;
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(IBERIA_REGION);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [selectedCcaa, setSelectedCcaa] = useState<string | null>(null);
  const [country, setCountry] = useState<string | undefined>(undefined);
  const [usage, setUsage] = useState<'all' | 'walk' | 'bike'>('all');
  const [routeType, setRouteType] = useState<string | undefined>(undefined);
  const [userCoord, setUserCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flyTo = (next: Region) => {
    setRegion(next);
    mapRef.current?.animateToRegion(next, 700);
  };

  const load = useCallback(
    async (r: Region) => {
      setLoading(true);
      setError(null);
      try {
        const bbox = regionToBBox(r);
        const result = await loadMapRoutes(bbox, {
          q: q.trim() || undefined,
          country,
          usage,
          route_type: routeType,
          near_lat: userCoord?.latitude,
          near_lon: userCoord?.longitude,
        });
        const visible = applyGuestRouteLimit(result.routes, isAuthed);
        putRoutes(visible);
        setRoutes(visible);
        const osmN = visible.filter((x) => x.provider === 'osm').length;
        const rgvpN = visible.filter((x) => x.provider === 'rgvp').length;
        const usoLabel = usage === 'walk' ? 'A pie' : usage === 'bike' ? 'En bici' : 'Todos usos';
        const guestNote = isAuthed ? '' : ' · vista previa';
        if (result.osmError) {
          setHint(
            `${usoLabel} · ${visible.length} rutas${guestNote} · RGVP ${rgvpN}. OSM vivo: ${result.osmError}`,
          );
        } else if (!result.osmTried) {
          setHint(`${usoLabel} · ${visible.length} rutas${guestNote} (RGVP ${rgvpN}). Acerque para OSM vivo.`);
        } else {
          setHint(`${usoLabel} · ${visible.length} rutas${guestNote} · RGVP ${rgvpN} · OSM ${osmN}`);
        }
      } catch (e: any) {
        setError(e?.message || 'No se pudieron cargar las rutas.');
        setRoutes([]);
      } finally {
        setLoading(false);
      }
    },
    [q, country, usage, routeType, userCoord, isAuthed],
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(region), 450);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [region, load]);

  // Tras login/registro: al volver al mapa, recargar catálogo completo.
  useFocusEffect(
    useCallback(() => {
      load(region);
    }, [load, region]),
  );

  const onMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Ubicación denegada. Puede explorar y buscar sin ella.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    setUserCoord(coord);
    flyTo({ ...coord, latitudeDelta: 0.45, longitudeDelta: 0.45 });
  };

  const selectSpain = () => {
    setCountry('ES');
    setSelectedCcaa(null);
    setQ('');
    setRouteType('via_pecuaria');
    setUsage('all');
    flyTo(SPAIN_REGION);
  };

  const selectPortugal = () => {
    setCountry('PT');
    setSelectedCcaa('portugal');
    setRouteType(undefined);
    setUsage('all');
    setQ('');
    flyTo(PORTUGAL_REGION);
  };

  const selectBothCountries = () => {
    setCountry(undefined);
    setSelectedCcaa(null);
    setRouteType(undefined);
    setUsage('all');
    setQ('');
    flyTo(IBERIA_REGION);
  };

  const selectPeninsula = () => {
    setCountry(undefined);
    setSelectedCcaa(null);
    setRouteType(undefined);
    setUsage('all');
    setQ('');
    flyTo(IBERIA_REGION);
  };

  const openRoute = (item: MapRoute) => {
    putRoutes([item]);
    navigation.navigate('RouteDetail', { id: item.id });
  };

  const lineColor = (r: MapRoute) => {
    if (r.route_type === 'via_pecuaria') {
      if (r.vp_subtype === 'canada') return colors.viaCanada;
      if (r.vp_subtype === 'cordel') return colors.viaCordel;
      if (r.vp_subtype === 'vereda') return colors.viaVereda;
      if (r.vp_subtype === 'colada') return colors.viaColada;
      return colors.viaCanada;
    }
    if (r.provider === 'osm') return colors.osm;
    if (r.route_type === 'ecopista' || r.route_type === 'via_verde') return colors.moss;
    return colors.moss;
  };

  const selectCcaa = (zone: (typeof CCAA_ZONES)[number]) => {
    // No usar búsqueda por texto: las ciclistas OSM no llevan el nombre de la CCAA
    // y desaparecían. La comunidad se aplica centrando el mapa (bbox).
    setSelectedCcaa(zone.id);
    setCountry(zone.country);
    setQ('');
    if (zone.country === 'PT' || usage === 'bike') {
      setRouteType(undefined);
    }
    flyTo(zone.region);
  };

  return (
    <View style={styles.root}>
      <View style={styles.heroBar}>
        <View style={styles.brandRow}>
          <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Ruta Ibérica" />
          <View style={styles.brandText}>
            <Text style={styles.brand}>Ruta Ibérica</Text>
            <Text style={styles.tagline}>España · Portugal · caminos y vías</Text>
          </View>
        </View>
        <Pressable onPress={() => navigation.navigate('Account')} hitSlop={10} style={styles.accountBtn}>
          <Text style={styles.link}>Cuenta</Text>
        </Pressable>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={IBERIA_REGION}
        onRegionChangeComplete={setRegion}
        showsUserLocation={!!userCoord}
        showsMyLocationButton={false}
      >
        {routes.map((route) => (
          <React.Fragment key={route.id}>
            {route.geometry.length > 1 && (
              <Polyline
                coordinates={route.geometry}
                strokeColor={lineColor(route)}
                strokeWidth={route.provider === 'osm' ? 3 : 4}
              />
            )}
            {route.start_lat != null && route.start_lon != null && (
              <Marker
                coordinate={{ latitude: route.start_lat, longitude: route.start_lon }}
                title={route.name}
                description={route.summary || route.vp_subtype_label || route.route_type}
                onCalloutPress={() => openRoute(route)}
              />
            )}
          </React.Fragment>
        ))}
      </MapView>

      <View style={styles.mapActions}>
        <PrimaryButton compact label="Península" variant="primary" onPress={selectPeninsula} />
        <PrimaryButton compact label="Mi ubicación" variant="secondary" onPress={onMyLocation} />
      </View>

      <View style={styles.panel}>
        <FlatList
          data={routes}
          keyExtractor={(item) => item.id}
          extraData={`${usage}-${routeType}-${country}-${q}-${selectedCcaa}-${loading}-${hint}-${routes.length}-${isAuthed}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          ListHeaderComponent={() => (
            <View>
              {!isAuthed && (
                <View style={styles.teaser}>
                  <Text style={styles.teaserText}>{GUEST_TEASER}</Text>
                  <View style={styles.teaserActions}>
                    <PrimaryButton
                      compact
                      label="Crear cuenta"
                      onPress={() => navigation.navigate('Register')}
                    />
                    <PrimaryButton
                      compact
                      label="Entrar"
                      variant="secondary"
                      onPress={() => navigation.navigate('Login')}
                    />
                  </View>
                </View>
              )}
              <Field
                placeholder="Buscar localidad o ruta"
                value={q}
                onChangeText={(text) => {
                  setQ(text);
                  if (text.trim()) setSelectedCcaa(null);
                }}
              />

              <FilterRow title="País">
                <Chip label="España" tone="spain" active={country === 'ES'} onPress={selectSpain} />
                <Chip label="Portugal" tone="portugal" active={country === 'PT'} onPress={selectPortugal} />
                <Chip label="Ambos" tone="neutral" active={!country} onPress={selectBothCountries} />
              </FilterRow>

              <FilterRow title="Uso">
                <Chip label="A pie" tone="walk" active={usage === 'walk'} onPress={() => setUsage('walk')} />
                <Chip
                  label="En bici"
                  tone="bike"
                  active={usage === 'bike'}
                  onPress={() => {
                    setUsage('bike');
                    if (routeType === 'via_pecuaria') setRouteType(undefined);
                  }}
                />
                <Chip label="Todos" tone="neutral" active={usage === 'all'} onPress={() => setUsage('all')} />
              </FilterRow>

              <FilterRow title="Tipo de ruta">
                <Chip
                  label="Vías pecuarias"
                  tone="accent"
                  active={routeType === 'via_pecuaria'}
                  onPress={() => {
                    setRouteType('via_pecuaria');
                    if (usage === 'bike') setUsage('walk');
                    if (country === 'PT') setCountry('ES');
                  }}
                />
                <Chip
                  label="Todas"
                  tone="neutral"
                  active={!routeType}
                  onPress={() => setRouteType(undefined)}
                />
              </FilterRow>

              <FilterRow title="Comunidad autónoma">
                {CCAA_ZONES.map((zone) => (
                  <Chip
                    key={zone.id}
                    label={zone.label}
                    tone={zone.country === 'PT' ? 'portugal' : 'default'}
                    active={selectedCcaa === zone.id}
                    onPress={() => selectCcaa(zone)}
                  />
                ))}
                <Chip
                  label="Quitar zona"
                  tone="neutral"
                  active={false}
                  onPress={() => {
                    setQ('');
                    setSelectedCcaa(null);
                    setCountry(undefined);
                    flyTo(IBERIA_REGION);
                  }}
                />
              </FilterRow>

              <Text style={styles.legend}>
                Marrones: cañadas / cordeles / veredas · Naranja: OSM
                {shouldQueryOverpass(regionToBBox(region)) ? ' · OSM vivo ON' : ''}
              </Text>

              {loading && (
                <View style={styles.stateRow}>
                  <ActivityIndicator color={colors.moss} />
                  <Text style={styles.stateText}>Cargando rutas…</Text>
                </View>
              )}
              {!loading && error && <Text style={styles.error}>{error}</Text>}
              {!loading && !error && hint && <Text style={styles.stateText}>{hint}</Text>}
              {!loading && !error && routes.length === 0 && (
                <Text style={styles.stateText}>
                  {usage === 'bike'
                    ? 'Pocas rutas ciclistas en esta zona. Pruebe «Todos» usos u otra comunidad.'
                    : 'Sin resultados con estos filtros. Pruebe «Todas» en tipo o «Quitar zona».'}
                </Text>
              )}
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openRoute(item)}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={2}>
                {item.country === 'PT' ? 'Portugal' : item.country === 'ES' ? 'España' : item.country}
                {' · '}
                {item.vp_subtype_label || item.route_type}
                {item.locality ? ` · ${item.locality}` : ''}
                {item.province ? ` · ${item.province}` : ''}
                {` · ${formatKm(item.length_m)}`}
                {item.allows_cycling === true ? ' · bici' : ''}
                {item.allows_walking === true || item.route_type === 'via_pecuaria' ? ' · a pie' : ''}
              </Text>
              {!!(item.summary || item.description) && (
                <Text style={styles.rowDesc} numberOfLines={2}>
                  {item.summary || item.description}
                </Text>
              )}
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.mist },
  heroBar: {
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 },
  logo: { width: 100, height: 100, borderRadius: 12 },
  brandText: { flexShrink: 1 },
  brand: { color: colors.sand, fontSize: 26, fontFamily: 'serif', letterSpacing: 0.4 },
  tagline: { color: '#B7A992', fontSize: 12, marginTop: 2 },
  accountBtn: {
    borderWidth: 1,
    borderColor: '#B7A992',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.sm,
    marginBottom: 2,
  },
  link: { color: colors.sand, fontSize: 14, fontWeight: '700' },
  map: { height: 260 },
  mapActions: {
    position: 'absolute',
    right: 12,
    top: 178,
    gap: 8,
    width: 128,
  },
  panel: {
    flex: 1,
    backgroundColor: colors.mist,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    marginTop: -10,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  teaser: {
    backgroundColor: '#E8EFE6',
    borderWidth: 1,
    borderColor: colors.moss,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  teaserText: { color: colors.ink, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  teaserActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  list: { flex: 1 },
  listContent: { paddingBottom: 36 },
  legend: { color: colors.mute, fontSize: 11, marginBottom: 6 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  stateText: { color: colors.mute, marginBottom: 6, fontSize: 12 },
  error: { color: colors.danger, marginBottom: 6 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: colors.mute, fontSize: 12, marginTop: 3 },
  rowDesc: { color: colors.ink, fontSize: 12, marginTop: 4, lineHeight: 17, opacity: 0.85 },
});
