import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

export default function DetailScreen({ route, navigation }) {
  const { municipio } = route.params;

  const parseCoord = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
    return 0;
  };

  const latitude = useMemo(() => {
    return parseCoord(municipio.Latitud);
  }, [municipio.Latitud]);

  const longitude = useMemo(() => {
    return parseCoord(municipio.Longitud);
  }, [municipio.Longitud]);

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const total = municipio.Habitantes || 0;
  const men = municipio.Hombres || 0;
  const women = municipio.Mujeres || 0;
  
  const menPercentage = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((men / total) * 100);
  }, [men, total]);

  const womenPercentage = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((women / total) * 100);
  }, [women, total]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
          <Text style={styles.headerButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Información</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.municipioName}>{municipio.Población}</Text>
          <Text style={styles.provinciaName}>{municipio.Provincia}</Text>
          <Text style={styles.comunidadName}>{municipio.Comunidad}</Text>
        </View>

        <View style={styles.mapCard}>
          {Platform.OS === 'web' ? (
            <View style={styles.webMapContainer}>
              <Ionicons name="map" size={48} color="#94a3b8" />
              <Text style={styles.webMapText}>Mapa del municipio</Text>
              <Text style={styles.webMapSubtext}>
                Latitud: {latitude.toFixed(6)} • Longitud: {longitude.toFixed(6)}
              </Text>
              <TouchableOpacity 
                style={styles.webMapButton}
                activeOpacity={0.7}
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`)}
              >
                <Ionicons name="logo-google" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.webMapButtonText}>Ver en Google Maps</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: latitude,
                longitude: longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              <Marker
                coordinate={{ latitude, longitude }}
                title={municipio.Población}
                description={`${municipio.Provincia}, ${municipio.Comunidad}`}
              />
            </MapView>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Población total: {formatNumber(total)}</Text>
          
          <View style={styles.genderContainer}>
            <View style={styles.genderItem}>
              <View style={[styles.genderIconContainer, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="male" size={24} color="#0284c7" />
              </View>
              <View style={styles.genderDetails}>
                <Text style={styles.genderLabel}>Hombres</Text>
                <Text style={styles.genderCount}>{formatNumber(men)}</Text>
                <Text style={styles.genderPercent}>{menPercentage}% del total</Text>
              </View>
            </View>

            <View style={styles.genderItem}>
              <View style={[styles.genderIconContainer, { backgroundColor: '#fce7f3' }]}>
                <Ionicons name="female" size={24} color="#db2777" />
              </View>
              <View style={styles.genderDetails}>
                <Text style={styles.genderLabel}>Mujeres</Text>
                <Text style={styles.genderCount}>{formatNumber(women)}</Text>
                <Text style={styles.genderPercent}>{womenPercentage}% del total</Text>
              </View>
            </View>
          </View>

          {total > 0 && (
            <View style={styles.ratioBarContainer}>
              <View style={styles.ratioBarLabels}>
                <Text style={styles.ratioLabelBlue}>{menPercentage}%</Text>
                <Text style={styles.ratioLabelPink}>{womenPercentage}%</Text>
              </View>
              <View style={styles.ratioBarTrack}>
                <View style={[styles.ratioBarFillBlue, { flex: menPercentage }]} />
                <View style={[styles.ratioBarFillPink, { flex: womenPercentage }]} />
              </View>
            </View>
          )}
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>Datos Geográficos</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Altitud</Text>
            <Text style={styles.detailValue}>
              {municipio.Altitud !== undefined && municipio.Altitud !== null 
                ? `${parseCoord(municipio.Altitud).toFixed(0)} metros` 
                : 'No disponible'}
            </Text>
          </View>
          <View style={styles.detailRowDivider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Latitud</Text>
            <Text style={styles.detailValue}>{latitude.toFixed(6)}</Text>
          </View>
          <View style={styles.detailRowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Longitud</Text>
            <Text style={styles.detailValue}>{longitude.toFixed(6)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  headerButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 2,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  municipioName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  provinciaName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
  },
  comunidadName: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  mapCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  map: {
    flex: 1,
  },
  webMapContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webMapText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  webMapSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 14,
  },
  webMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  webMapButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 18,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  genderItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  genderDetails: {
    flex: 1,
  },
  genderLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  genderCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  genderPercent: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  ratioBarContainer: {
    marginTop: 5,
  },
  ratioBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ratioLabelBlue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  ratioLabelPink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#db2777',
  },
  ratioBarTrack: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  ratioBarFillBlue: {
    backgroundColor: '#0284c7',
  },
  ratioBarFillPink: {
    backgroundColor: '#db2777',
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  detailsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  detailRowDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
});
