// Temperature and sunrise/sunset under the date, from Open-Meteo (free, no key).
const D = window.Dash;
const CODES = {0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
  56:"Freezing drizzle",57:"Freezing drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Freezing rain",71:"Light snow",73:"Snow",75:"Heavy snow",
  77:"Snow grains",80:"Showers",81:"Showers",82:"Heavy showers",85:"Snow showers",86:"Snow showers",95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm"};

async function load(){
  const loc = D.getSetting("dash.weather.loc", null);
  if (!loc) return;
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + loc.lat + "&longitude=" + loc.lon
      + "&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=2";
    const j = await (await fetch(url)).json();
    D.setWeather({
      temp: j.current.temperature_2m, desc: CODES[j.current.weather_code] || "",
      sunrise: j.daily.sunrise[0].slice(11,16), sunset: j.daily.sunset[0].slice(11,16),
      nextSunrise: (j.daily.sunrise[1] || "").slice(11,16), place: loc.name
    });
  } catch(e){ console.error(e); }
}

async function setCity(city){
  if (!city) return D.setMsg("Type a city first.");
  try {
    const j = await (await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=" + encodeURIComponent(city))).json();
    const r = j.results && j.results[0];
    if (!r) return D.setMsg("Couldn't find that city.");
    D.setSetting("dash.weather.loc", {name: r.name + (r.country ? ", " + r.country : ""), lat: r.latitude, lon: r.longitude});
    D.setMsg("Location set to " + r.name + ".");
    D.setAccount({}); load();
  } catch(e){ D.setMsg("Couldn't look that up. Check your connection."); }
}

function useMyLocation(){
  if (!navigator.geolocation) return D.setMsg("Location isn't available in this window. Type your city above and press Set city.");
  navigator.geolocation.getCurrentPosition(pos => {
    D.setSetting("dash.weather.loc", {name:"Your location", lat:pos.coords.latitude, lon:pos.coords.longitude});
    D.setMsg("Location set."); D.setAccount({}); load();
  }, () => D.setMsg("Location isn't available in this window. Type your city above and press Set city."), {timeout:10000});
}

if (D){
  addEventListener("dash:action", e => {
    if (e.detail.type === "weather-city") setCity(e.detail.city);
    if (e.detail.type === "weather-geo") useMyLocation();
  });
  load(); setInterval(load, 30*60*1000);
}
