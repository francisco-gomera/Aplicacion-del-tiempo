const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

export const parseCoordinate = (coord) => {
  if (typeof coord === 'number') return coord;
  if (typeof coord === 'string') {
    return parseFloat(coord.replace(',', '.'));
  }
  return 0;
};

export const getWeatherIconUrl = (iconCode) => {
  if (!iconCode) return 'https://openweathermap.org/img/wn/10d@2x.png';
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};

const generateMockData = (lat, lon, locationName = 'Ubicación') => {
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
      wind_speed: Math.round((5 + seed) * 1.8 * 10) / 10, // km/h
    },
    hourly,
    daily
  };
};

export const fetchWeather = async (lat, lon, locationName = 'Ubicación') => {
  const latitude = parseCoordinate(lat);
  const longitude = parseCoordinate(lon);
  try {
    const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&units=metric&exclude=minutely&lang=es&appid=${API_KEY}`;
    console.log('Intentando OneCall API:', oneCallUrl);
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
          wind_speed: Math.round(data.current.wind_speed * 3.6), // conversion m/s a km/h
        },
        hourly,
        daily
      };
    } else {
      console.warn('OneCall API falló con código:', response.status, '. Intentando fallback a APIs estándar...');
    }
  } catch (error) {
    console.warn('Error llamando a OneCall API:', error, '. Intentando fallback a APIs estándar...');
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
    } else {
      console.warn('Las APIs estándar fallaron:', weatherRes.status, forecastRes.status, '. Usando simulador de datos climáticos.');
    }
  } catch (error) {
    console.warn('Error en llamadas a APIs estándar:', error, '. Usando simulador de datos climáticos.');
  }

  return generateMockData(latitude, longitude, locationName);
};
