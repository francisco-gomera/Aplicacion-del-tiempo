import 'react-native-gesture-handler';
import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

const API_KEY = 'bb2977856afbad78594fc37dfa819fa6';
const municipiosData = require('./municipios.json');

const sortedMunicipios = [...municipiosData].sort((a, b) =>
  a.Población.localeCompare(b.Población, 'es', { sensitivity: 'base' })
);

const parseCoordinate = (coord) => {
  if (typeof coord === 'number') return coord;
  if (typeof coord === 'string') {
    return parseFloat(coord.replace(',', '.'));
  }
  return 0;
};

const getWeatherIconUrl = (iconCode) => {
  if (!iconCode) return 'https://openweathermap.org/img/wn/10d@2x.png';
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};

const findClosestMunicipio = (lat, lon) => {
  let closest = null;
  let minDistance = Infinity;
  for (const m of sortedMunicipios) {
    const mLat = parseCoordinate(m.Latitud);
    const mLon = parseCoordinate(m.Longitud);
    const distance = Math.pow(lat - mLat, 2) + Math.pow(lon - mLon, 2);
    if (distance < minDistance) {
      minDistance = distance;
      closest = m;
    }
  }
  return closest;
};

const generateMockWeatherData = (lat, lon, locationName = 'Ubicación') => {
  const seed = (Math.abs(lat) + Math.abs(lon)) % 10;
  const currentTemp = Math.round(15 + seed + Math.random() * 5);
  const descriptions = ['Soleado', 'Parcialmente Nublado', 'Nublado', 'Lluvia Ligera', 'Despejado'];
  const weatherIcons = ['01d', '02d', '03d', '10d', '01d'];
  const descIdx = Math.floor(seed % descriptions.length);

  const hourly = [];
  const startHour = new Date().getHours();
  for (let i = 0; i < 12; i++) {
    const hour = (startHour + i) % 24;
    const tempOffset = Math.sin((hour - 6) / 24 * Math.PI * 2) * 4;
    hourly.push({
      dt: Math.floor(Date.now() / 1000) + i * 3600,
      hour: `${hour}:00`,
      temp: Math.round(currentTemp + tempOffset),
      icon: weatherIcons[(descIdx + i) % weatherIcons.length],
      description: descriptions[(descIdx + i) % descriptions.length]
    });
  }

  const daily = [];
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayIdx = new Date().getDay();
  for (let i = 0; i < 7; i++) {
    const dayName = daysOfWeek[(todayIdx + i) % 7];
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
    const daySeed = (seed + i) % descriptions.length;
    daily.push({
      dt: Math.floor(Date.now() / 1000) + i * 86400,
      dayName: i === 0 ? 'Hoy' : dayName,
      dateStr,
      tempMin: Math.round(currentTemp - 4 - (i % 2)),
      tempMax: Math.round(currentTemp + 4 + (i % 3)),
      icon: weatherIcons[daySeed],
      description: descriptions[daySeed]
    });
  }

  return {
    isMock: true,
    locationName,
    current: {
      temp: currentTemp,
      description: descriptions[descIdx],
      icon: weatherIcons[descIdx],
      humidity: Math.round(50 + seed * 3),
      wind_speed: Math.round((5 + seed) * 1.8 * 10) / 10,
    },
    hourly,
    daily
  };
};

const fetchWeather = async (lat, lon, locationName = 'Ubicación') => {
  const latitude = parseCoordinate(lat);
  const longitude = parseCoordinate(lon);
  try {
    const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&units=metric&exclude=minutely&lang=es&appid=${API_KEY}`;
    const response = await fetch(oneCallUrl);
    
    if (response.ok) {
      const data = await response.json();
      const hourly = data.hourly.slice(0, 24).map(item => ({
        dt: item.dt,
        hour: `${new Date(item.dt * 1000).getHours()}:00`,
        temp: Math.round(item.temp),
        icon: item.weather[0].icon,
        description: item.weather[0].description
      }));

      const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const daily = data.daily.slice(0, 7).map((item, idx) => {
        const date = new Date(item.dt * 1000);
        const dayName = daysOfWeek[date.getDay()];
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
        
        return {
          dt: item.dt,
          dayName: idx === 0 ? 'Hoy' : dayName,
          dateStr,
          tempMin: Math.round(item.temp.min),
          tempMax: Math.round(item.temp.max),
          icon: item.weather[0].icon,
          description: item.weather[0].description
        };
      });

      return {
        isMock: false,
        locationName,
        current: {
          temp: Math.round(data.current.temp),
          description: data.current.weather[0].description,
          icon: data.current.weather[0].icon,
          humidity: data.current.humidity,
          wind_speed: Math.round(data.current.wind_speed * 3.6),
        },
        hourly,
        daily
      };
    }
  } catch (error) {
    console.warn('Error en OneCall API:', error);
  }

  try {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=es&appid=${API_KEY}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&lang=es&appid=${API_KEY}`;

    const [weatherRes, forecastRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(forecastUrl)
    ]);

    if (weatherRes.ok && forecastRes.ok) {
      const weatherData = await weatherRes.json();
      const forecastData = await forecastRes.json();

      const hourly = forecastData.list.slice(0, 8).map(item => ({
        dt: item.dt,
        hour: `${new Date(item.dt * 1000).getHours()}:00`,
        temp: Math.round(item.main.temp),
        icon: item.weather[0].icon,
        description: item.weather[0].description
      }));

      const dailyMap = {};
      const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = {
            temps: [],
            weather: item.weather[0],
            dt: item.dt,
            dateObj: date
          };
        }
        dailyMap[dateKey].temps.push(item.main.temp);
      });

      const daily = Object.values(dailyMap).slice(0, 5).map((day, idx) => {
        const dayName = daysOfWeek[day.dateObj.getDay()];
        const dateStr = `${day.dateObj.getDate()}/${day.dateObj.getMonth() + 1}/${day.dateObj.getFullYear().toString().slice(-2)}`;
        const tempMin = Math.round(Math.min(...day.temps));
        const tempMax = Math.round(Math.max(...day.temps));

        return {
          dt: day.dt,
          dayName: idx === 0 ? 'Hoy' : dayName,
          dateStr,
          tempMin,
          tempMax,
          icon: day.weather.icon,
          description: day.weather.description
        };
      });

      return {
        isMock: false,
        locationName,
        current: {
          temp: Math.round(weatherData.main.temp),
          description: weatherData.weather[0].description,
          icon: weatherData.weather[0].icon,
          humidity: weatherData.main.humidity,
          wind_speed: Math.round(weatherData.wind.speed * 3.6),
        },
        hourly,
        daily
      };
    }
  } catch (error) {
    console.warn('Error en APIs estándar:', error);
  }

  return generateMockWeatherData(latitude, longitude, locationName);
};

function HomeScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(100);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const stripAccents = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const filteredMunicipios = useMemo(() => {
    if (!searchQuery.trim()) return sortedMunicipios;
    const query = stripAccents(searchQuery);
    return sortedMunicipios.filter(m => 
      stripAccents(m.Población).includes(query)
    );
  }, [searchQuery]);

  useEffect(() => {
    setVisibleCount(100);
  }, [searchQuery]);

  const dataToRender = useMemo(() => {
    return filteredMunicipios.slice(0, visibleCount);
  }, [filteredMunicipios, visibleCount]);

  const loadMore = () => {
    if (visibleCount < filteredMunicipios.length) {
      setVisibleCount(prev => prev + 100);
    }
  };

  const handleLocationPress = async () => {
    setLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación.');
        setLoadingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const { latitude, longitude } = location.coords;
      navigation.navigate('Weather', {
        latitude,
        longitude,
        name: 'Mi Ubicación',
        municipio: null
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo obtener la ubicación.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleMunicipioPress = (item) => {
    const lat = parseCoordinate(item.Latitud);
    const lon = parseCoordinate(item.Longitud);
    navigation.navigate('Weather', {
      latitude: lat,
      longitude: lon,
      name: item.Población,
      municipio: item
    });
  };

  return (
    <SafeAreaView style={styles.homeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={styles.homeHeader}>
        <Text style={styles.homeTitle}>El Tiempo</Text>
        <Text style={styles.homeSubtitle}>Busca un municipio de España o usa tu GPS</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar municipio..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.locationButton} onPress={handleLocationPress} disabled={loadingLocation}>
          {loadingLocation ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="location" size={22} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={dataToRender}
        keyExtractor={(item, index) => `${item.Población}-${item.Provincia}-${index}`}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemContainer} onPress={() => handleMunicipioPress(item)} activeOpacity={0.7}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitleText}>{item.Población}</Text>
              <Text style={styles.itemSubtitleText}>{item.Provincia} • {item.Comunidad}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No se encontraron municipios</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function WeatherScreen({ route, navigation }) {
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
        setError('No se pudo cargar el clima.');
      } finally {
        setLoading(false);
      }
    };
    loadWeather();
  }, [latitude, longitude, displayName]);

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
    <SafeAreaView style={styles.weatherBg}>
      <StatusBar barStyle="dark-content" backgroundColor="#e2e8f0" />
      <View style={styles.weatherHeader}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1e293b" />
          <Text style={styles.headerButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.weatherHeaderTitle} numberOfLines={1}>{displayName}</Text>
        {resolvedMunicipio ? (
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Detail', { municipio: resolvedMunicipio })}>
            <Ionicons name="information-circle-outline" size={26} color="#1e293b" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isMock && (
          <View style={styles.mockBadge}>
            <Text style={styles.mockBadgeText}>Modo Demo (Clave API no disponible)</Text>
          </View>
        )}

        <View style={styles.currentWeatherContainer}>
          <Image source={{ uri: getWeatherIconUrl(current.icon) }} style={styles.weatherIcon} />
          <Text style={styles.tempText}>{current.temp}°</Text>
          <Text style={styles.descText}>{current.description}</Text>

          <View style={styles.extraInfoContainer}>
            <View style={styles.extraInfoItem}>
              <Ionicons name="water-outline" size={20} color="#475569" />
              <View style={styles.extraInfoTextContainer}>
                <Text style={styles.extraInfoLabel}>Humedad</Text>
                <Text style={styles.extraInfoVal}>{current.humidity}%</Text>
              </View>
            </View>

            <View style={styles.extraInfoDivider} />

            <View style={styles.extraInfoItem}>
              <Ionicons name="thunderstorm-outline" size={20} color="#475569" />
              <View style={styles.extraInfoTextContainer}>
                <Text style={styles.extraInfoLabel}>Viento</Text>
                <Text style={styles.extraInfoVal}>{current.wind_speed} km/h</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Próximas horas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyContainer}>
            {hourly.map((item, index) => (
              <View key={index} style={styles.hourlyCard}>
                <Text style={styles.hourlyTime}>{item.hour}</Text>
                <Image source={{ uri: getWeatherIconUrl(item.icon) }} style={styles.hourlyIcon} />
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
                  <Image source={{ uri: getWeatherIconUrl(item.icon) }} style={styles.dailyIcon} />
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
  );
}

function DetailScreen({ route, navigation }) {
  const { municipio } = route.params;

  const latitude = useMemo(() => parseCoordinate(municipio.Latitud), [municipio.Latitud]);
  const longitude = useMemo(() => parseCoordinate(municipio.Longitud), [municipio.Longitud]);

  const Maps = useMemo(() => {
    if (Platform.OS === 'web') return null;
    try {
      return require('react-native-maps');
    } catch (e) {
      return null;
    }
  }, []);

  const MapView = Maps?.default || Maps;
  const Marker = Maps?.Marker;

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const total = municipio.Habitantes || 0;
  const men = municipio.Hombres || 0;
  const women = municipio.Mujeres || 0;
  
  const menPercentage = useMemo(() => total === 0 ? 0 : Math.round((men / total) * 100), [men, total]);
  const womenPercentage = useMemo(() => total === 0 ? 0 : Math.round((women / total) * 100), [women, total]);

  return (
    <SafeAreaView style={styles.detailContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
          <Text style={styles.headerButtonText}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Información</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.titleSection}>
          <Text style={styles.municipioName}>{municipio.Población}</Text>
          <Text style={styles.provinciaName}>{municipio.Provincia}</Text>
          <Text style={styles.comunidadName}>{municipio.Comunidad}</Text>
        </View>

        <View style={styles.mapCard}>
          {Platform.OS === 'web' || !MapView || !Marker ? (
            <WebView
              style={styles.map}
              source={{ 
                uri: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}` 
              }}
              domStorageEnabled={true}
              javaScriptEnabled={true}
            />
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
                ? `${parseCoordinate(municipio.Altitud).toFixed(0)} metros` 
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

const StackNavigator = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StackNavigator.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <StackNavigator.Screen name="Home" component={HomeScreen} />
        <StackNavigator.Screen name="Weather" component={WeatherScreen} />
        <StackNavigator.Screen name="Detail" component={DetailScreen} />
      </StackNavigator.Navigator>
    </NavigationContainer>
  );
}


const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  homeHeader: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 5,
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  homeSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  locationButton: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  itemContent: {
    flex: 1,
  },
  itemTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  itemSubtitleText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },

  weatherBg: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 50,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 60,
  },
  headerButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 2,
  },
  weatherHeaderTitle: {
    color: '#1e293b',
    fontSize: 18,
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
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  mockBadgeText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  currentWeatherContainer: {
    alignItems: 'center',
    paddingVertical: 25,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  weatherIcon: {
    width: 100,
    height: 100,
  },
  tempText: {
    fontSize: 64,
    fontWeight: '300',
    color: '#0f172a',
    letterSpacing: -1,
  },
  descText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  extraInfoContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
    marginTop: 20,
    width: '100%',
  },
  extraInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraInfoDivider: {
    width: 1,
    backgroundColor: '#cbd5e1',
  },
  extraInfoTextContainer: {
    marginLeft: 8,
  },
  extraInfoLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  extraInfoVal: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 1,
  },
  sectionContainer: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  hourlyContainer: {
    paddingRight: 10,
  },
  hourlyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: 70,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hourlyTime: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  hourlyIcon: {
    width: 36,
    height: 36,
    marginVertical: 2,
  },
  hourlyTemp: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  dailyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dailyDayContainer: {
    width: 80,
  },
  dailyDayName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  dailyDate: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 1,
  },
  dailyStatusContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dailyIcon: {
    width: 28,
    height: 28,
    marginRight: 4,
  },
  dailyDesc: {
    color: '#475569',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  dailyTempRange: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  dailyTempMin: {
    color: '#94a3b8',
    fontWeight: '400',
  },

  detailContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  detailHeaderTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
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