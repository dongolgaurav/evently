import "server-only";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

/** External data sources the agents call: Open-Meteo (geocoding, forecast, history) and Nager.Date (holidays). */

const TIMEOUT = 10_000;

/** GET JSON, retrying rate limits (429) and server errors with a short backoff. */
async function getJson<T>(url: string, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { accept: "application/json" } });
    if (res.ok) return (await res.json()) as T;
    if (i >= attempts || (res.status !== 429 && res.status < 500)) throw new Error(`${new URL(url).host} returned ${res.status}`);
    const wait = Number(res.headers.get("retry-after")) * 1000 || 800 * 2 ** (i - 1);
    await new Promise((r) => setTimeout(r, Math.min(wait, 4000)));
  }
}

export type Place = {
  name: string;
  region: string | null;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type GeoResult = { results?: { name: string; admin1?: string; country: string; country_code: string; latitude: number; longitude: number; timezone: string; population?: number }[] };

/** "Austin, TX" -> the best matching place. The qualifier after a comma narrows the match. */
export async function geocode(query: string): Promise<Place | null> {
  const [city, ...rest] = query.split(",").map((s) => s.trim()).filter(Boolean);
  if (!city) return null;
  const data = await getJson<GeoResult>(
    `https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&format=json&name=${encodeURIComponent(city)}`,
  );
  const results = data.results ?? [];
  const hint = rest.join(" ").toLowerCase();
  const STATES: Record<string, string> = { tx: "texas", ca: "california", ny: "new york", ma: "massachusetts", il: "illinois", wa: "washington", pa: "pennsylvania", fl: "florida", ga: "georgia", nc: "north carolina", mi: "michigan", oh: "ohio", co: "colorado", az: "arizona", va: "virginia", nj: "new jersey", md: "maryland", mn: "minnesota", or: "oregon", tn: "tennessee", in: "indiana", wi: "wisconsin", mo: "missouri", ut: "utah", on: "ontario", bc: "british columbia", qc: "quebec" };
  const hintFull = STATES[hint] ?? hint;
  const match =
    (hint &&
      results.find((r) =>
        [r.admin1, r.country, r.country_code].some((v) => v && (v.toLowerCase() === hintFull || v.toLowerCase().startsWith(hintFull))),
      )) ||
    results[0];
  if (!match) return null;
  return {
    name: match.name,
    region: match.admin1 ?? null,
    country: match.country,
    country_code: match.country_code,
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: match.timezone,
  };
}

export type WeatherReport =
  | {
      mode: "forecast";
      date: string;
      temp_max_c: number;
      temp_min_c: number;
      precip_probability_pct: number;
      precip_mm: number;
      wind_max_kmh: number;
    }
  | {
      mode: "historical";
      date: string;
      years: number[];
      avg_temp_max_c: number;
      avg_temp_min_c: number;
      rainy_day_share_pct: number;
      avg_precip_mm: number;
      avg_wind_max_kmh: number;
    };

const round = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const shiftDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Live forecast when the date is within 15 days, otherwise the same week over the last three years. */
export async function weatherFor(lat: number, lon: number, date: string): Promise<WeatherReport> {
  const today = new Date().toISOString().slice(0, 10);
  const ahead = (Date.parse(date) - Date.parse(today)) / 86_400_000;
  const daily = "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max";
  if (ahead >= 0 && ahead <= 15) {
    type F = { daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; precipitation_probability_max: number[]; wind_speed_10m_max: number[] } };
    const f = await getJson<F>(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${daily},precipitation_probability_max&timezone=auto&start_date=${date}&end_date=${date}`,
    ).catch(() => null);
    // If the live forecast is unavailable, fall through to historical averages below.
    if (f) return {
      mode: "forecast",
      date,
      temp_max_c: round(f.daily.temperature_2m_max[0] ?? 0),
      temp_min_c: round(f.daily.temperature_2m_min[0] ?? 0),
      precip_probability_pct: f.daily.precipitation_probability_max[0] ?? 0,
      precip_mm: round(f.daily.precipitation_sum[0] ?? 0),
      wind_max_kmh: round(f.daily.wind_speed_10m_max[0] ?? 0),
    };
  }
  const thisYear = Number(today.slice(0, 4));
  const targetMd = date.slice(5);
  const years = [1, 2, 3].map((n) => thisYear - n);
  type A = { daily: { temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; precipitation_sum: (number | null)[]; wind_speed_10m_max: (number | null)[] } };
  const runs = await Promise.all(
    years.map((y) => {
      const center = `${y}-${targetMd === "02-29" ? "02-28" : targetMd}`;
      return getJson<A>(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=${daily}&timezone=auto&start_date=${shiftDays(center, -3)}&end_date=${shiftDays(center, 3)}`,
      );
    }),
  );
  const pick = (k: keyof A["daily"]) => runs.flatMap((r) => r.daily[k]).filter((v): v is number => typeof v === "number");
  const precip = pick("precipitation_sum");
  return {
    mode: "historical",
    date,
    years,
    avg_temp_max_c: round(avg(pick("temperature_2m_max"))),
    avg_temp_min_c: round(avg(pick("temperature_2m_min"))),
    rainy_day_share_pct: Math.round((precip.filter((p) => p >= 1).length / Math.max(1, precip.length)) * 100),
    avg_precip_mm: round(avg(precip)),
    avg_wind_max_kmh: round(avg(pick("wind_speed_10m_max"))),
  };
}

export type Holiday = { date: string; name: string; days_from_event: number };

/** Public holidays within a week either side of the event date. */
export async function holidaysNear(countryCode: string, date: string): Promise<Holiday[]> {
  const year = Number(date.slice(0, 4));
  const yearsToCheck = [...new Set([year, Number(shiftDays(date, -7).slice(0, 4)), Number(shiftDays(date, 7).slice(0, 4))])];
  type N = { date: string; localName: string; name: string; global: boolean; counties: string[] | null }[];
  const lists = await Promise.all(
    yearsToCheck.map((y) => getJson<N>(`https://date.nager.at/api/v3/PublicHolidays/${y}/${countryCode.toUpperCase()}`).catch(() => [] as N)),
  );
  const target = Date.parse(date);
  return lists
    .flat()
    .map((h) => ({ date: h.date, name: h.name, days_from_event: Math.round((Date.parse(h.date) - target) / 86_400_000) }))
    .filter((h) => Math.abs(h.days_from_event) <= 7)
    .sort((a, b) => a.days_from_event - b.days_from_event);
}

/** LangChain tool wrappers so the Weather Scout agent can decide which calls to make. */
export const geocodeTool = tool(async ({ query }) => JSON.stringify((await geocode(query)) ?? { error: "Place not found" }), {
  name: "geocode_location",
  description: "Find the coordinates, country and timezone of a city or campus location, e.g. 'Austin, TX'.",
  schema: z.object({ query: z.string().describe("City, optionally followed by state or country") }),
});

export const weatherTool = tool(
  async ({ latitude, longitude, date }) => JSON.stringify(await weatherFor(latitude, longitude, date)),
  {
    name: "get_weather",
    description:
      "Weather for a location on a date (YYYY-MM-DD). Returns a live forecast within 15 days, otherwise averages for the same week over the last three years.",
    schema: z.object({ latitude: z.number(), longitude: z.number(), date: z.string().describe("YYYY-MM-DD") }),
  },
);
