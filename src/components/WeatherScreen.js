import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchWeather, getWeatherIconUrl } from '../services/weatherService';

const municipiosData = require('../../municipios.json');

const findClosestMunicipio = (lat, lon) => {
  let closest = null;
  let minDistance = Infinity;
  
  const parseCoord = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val.replace(',', '.'));
    return 0;
  };
  
  for (const m of municipiosData) {
    const mLat = parseCoord(m.Latitud);
    const mLon = parseCoord(m.Longitud);
    const distance = Math.pow(lat - mLat, 2) + Math.pow(lon - mLon, 2);
    if (distance < minDistance) {
      minDistance = distance;
      closest = m;
    }
  }
  return closest;
};

const getGradientColors = (iconCode) => {
  if (!iconCode) return ['#3b82f6', '#1d4ed8'];
  const isNight = iconCode.endsWith('n');
  const code = iconCode.slice(0, 2);

  if (isNight) {
    return ['#0f172a', '#1e293b']; 
  }

  switch (code) {
    case '01': 
    case '02': 
      return ['#3b82f6', '#1d4ed8']; 
    case '03': 
    case '04': 
      return ['#64748b', '#334155']; 
    case '09': 
    case '10': 
    case '11': 
      return ['#475569', '#1e293b']; 
    case '13': 
      return ['#cbd5e1', '#64748b']; 
    case '50': 
      return ['#94a3b8', '#475569']; 
    default:
      return ['#3b82f6', '#1d4ed8'];
  }
};

export default function WeatherScreen({ route, navigation }) {
  const { latitude, longitude, name, municipio } = route.params;
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const resolvedMunicipio = useMemo(() => {
    if (municipio) return municipio;
    return findClosestMunicipio(latitude, longitude);
  }, [latitude, longitude, municipio]);

  const displayName = useMemo(() => {
    if (name !== 'Mi Ubicación') return name;
    return resolvedMunicipio ? resolvedMunicipio.Población : 'Mi Ubicación';
  }, [name, resolvedMunicipio]);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        setLoading(true);
        const data = await fetchWeather(latitude, longitude, displayName);
        setWeatherData(data);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar la información del clima.');
      } finally {
        setLoading(false);
      }
    };

    loadWeather();
  }, [latitude, longitude, displayName]);

  const gradientColors = useMemo(() => {
    if (weatherData && weatherData.current) {
      return getGradientColors(weatherData.current.icon);
    }
    return ['#3b82f6', '#1d4ed8'];
  }, [weatherData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Obteniendo pronóstico del clima...</Text>
      </View>
    );
  }

  if (error || !weatherData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'Error al cargar los datos'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver al buscador</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { current, hourly, daily, isMock } = weatherData;

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
            <Text style={styles.headerButtonText}>Volver</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>

          {resolvedMunicipio ? (
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => navigation.navigate('Detail', { municipio: resolvedMunicipio })}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={26} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isMock && (
            <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>Modo Demo (Clave API no disponible o inactiva)</Text>
            </View>
          )}

          <View style={styles.currentWeatherContainer}>
            <Image 
              source={{ uri: getWeatherIconUrl(current.icon) }} 
              style={styles.weatherIcon}
            />
            <Text style={styles.tempText}>{current.temp}°</Text>
            <Text style={styles.descText}>{current.description}</Text>

            <View style={styles.extraInfoContainer}>
              <View style={styles.extraInfoItem}>
                <Ionicons name="water-outline" size={20} color="#ffffff" />
                <View style={styles.extraInfoTextContainer}>
                  <Text style={styles.extraInfoLabel}>Humedad</Text>
                  <Text style={styles.extraInfoVal}>{current.humidity}%</Text>
                </View>
              </View>

              <View style={styles.extraInfoDivider} />

              <View style={styles.extraInfoItem}>
                <Ionicons name="thunderstorm-outline" size={20} color="#ffffff" />
                <View style={styles.extraInfoTextContainer}>
                  <Text style={styles.extraInfoLabel}>Viento</Text>
                  <Text style={styles.extraInfoVal}>{current.wind_speed} km/h</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Próximas horas</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourlyContainer}
            >
              {hourly.map((item, index) => (
                <View key={index} style={styles.hourlyCard}>
                  <Text style={styles.hourlyTime}>{item.hour}</Text>
                  <Image 
                    source={{ uri: getWeatherIconUrl(item.icon) }} 
                    style={styles.hourlyIcon}
                  />
                  <Text style={styles.hourlyTemp}>{item.temp}°</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Próximos días</Text>
            <View style={styles.dailyContainer}>
              {daily.map((item, index) => (
                <View key={index} style={styles.dailyRow}>
                  <View style={styles.dailyDayContainer}>
                    <Text style={styles.dailyDayName}>{item.dayName}</Text>
                    <Text style={styles.dailyDate}>{item.dateStr}</Text>
                  </View>
                  
                  <View style={styles.dailyStatusContainer}>
                    <Image 
                      source={{ uri: getWeatherIconUrl(item.icon) }} 
                      style={styles.dailyIcon}
                    />
                    <Text style={styles.dailyDesc} numberOfLines={1}>{item.description}</Text>
                  </View>
                  
                  <Text style={styles.dailyTempRange}>
                    {item.tempMax}°  <Text style={styles.dailyTempMin}>{item.tempMin}°</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorText: {
    marginTop: 15,
    fontSize: 18,
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 50,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 2,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  mockBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  mockBadgeText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  currentWeatherContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  weatherIcon: {
    width: 120,
    height: 120,
    marginTop: -10,
  },
  tempText: {
    fontSize: 72,
    fontWeight: '200',
    color: '#ffffff',
    letterSpacing: -2,
  },
  descText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  extraInfoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 30,
    width: '100%',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  extraInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraInfoDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 15,
  },
  extraInfoTextContainer: {
    marginLeft: 10,
  },
  extraInfoLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  extraInfoVal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionContainer: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 15,
  },
  hourlyContainer: {
    paddingRight: 20,
  },
  hourlyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    width: 70,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hourlyTime: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  hourlyIcon: {
    width: 40,
    height: 40,
    marginVertical: 4,
  },
  hourlyTemp: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dailyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dailyDayContainer: {
    width: 100,
  },
  dailyDayName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  dailyDate: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  dailyStatusContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dailyIcon: {
    width: 32,
    height: 32,
    marginRight: 6,
  },
  dailyDesc: {
    color: '#ffffff',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  dailyTempRange: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  dailyTempMin: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
  },
});
