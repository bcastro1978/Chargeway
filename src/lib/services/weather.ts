/**
 * Weather Service for ChargeWay
 * Primary: OpenWeatherMap (if configured with valid key)
 * Fallback: Open-Meteo (100% free, high precision, no API key required)
 */

const OWM_API_KEY = process.env.OPENWEATHERMAP_KEY;
const OWM_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export interface WeatherData {
  temp_c: number;
  wind_speed_ms: number;
  wind_deg: number;
  condition: string;
}

function mapWmoCodeToCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Clouds';
  if (code === 45 || code === 48) return 'Fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 95) return 'Thunderstorm';
  return 'Clear';
}

async function fetchFromOpenMeteo(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&wind_speed_unit=ms`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.current) return null;

    return {
      temp_c: Math.round(data.current.temperature_2m * 10) / 10,
      wind_speed_ms: Math.round(data.current.wind_speed_10m * 10) / 10,
      wind_deg: Math.round(data.current.wind_direction_10m),
      condition: mapWmoCodeToCondition(data.current.weather_code)
    };
  } catch (err) {
    console.warn('Error fetching weather from Open-Meteo:', err);
    return null;
  }
}

export async function fetchWeather(
  lat: number,
  lng: number
): Promise<WeatherData | null> {
  // If a valid OpenWeatherMap key is available, use it
  if (OWM_API_KEY && !OWM_API_KEY.includes('TU_LLAVE')) {
    const url = `${OWM_BASE_URL}?lat=${lat}&lon=${lng}&appid=${OWM_API_KEY}&units=metric`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
      const data = await response.json();
      if (response.status === 200 && data.main) {
        return {
          temp_c: data.main.temp,
          wind_speed_ms: data.wind.speed,
          wind_deg: data.wind.deg,
          condition: data.weather[0].main
        };
      }
    } catch (_) {
      // Fall through to Open-Meteo
    }
  }

  // High-availability automatic fallback: Open-Meteo (Real-time live weather for any coordinate in Ecuador)
  return await fetchFromOpenMeteo(lat, lng);
}
