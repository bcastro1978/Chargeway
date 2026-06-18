/**
 * Weather Service for ChargeWay
 * Integrates with OpenWeatherMap API.
 */

const OWM_API_KEY = process.env.OPENWEATHERMAP_KEY;
const OWM_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export interface WeatherData {
  temp_c: number;
  wind_speed_ms: number;
  wind_deg: number;
  condition: string;
}

export async function fetchWeather(
  lat: number,
  lng: number
): Promise<WeatherData | null> {
  if (!OWM_API_KEY) {
    console.warn('OWM_API_KEY is missing. Returning null weather.');
    return null;
  }

  const url = `${OWM_BASE_URL}?lat=${lat}&lon=${lng}&appid=${OWM_API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.status !== 200) {
      throw new Error(`OWM Error: ${data.message || response.status}`);
    }

    return {
      temp_c: data.main.temp,
      wind_speed_ms: data.wind.speed,
      wind_deg: data.wind.deg,
      condition: data.weather[0].main
    };
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    return null;
  }
}
