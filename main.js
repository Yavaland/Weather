const apiKey = "a46784892df248d9c06372b7c2f3dd23";
const searchButton = document.getElementById("search-button");
const currentLocationButton = document.getElementById("current-location-button");
const cityInput = document.getElementById("city-input");
const weatherInfo = document.getElementById("weather-info");
const forecastContainer = document.getElementById("forecast-container");
const mapContainer = document.getElementById("map");
const searchHistoryContainer = document.getElementById("search-history");
const themeToggle = document.getElementById("theme-toggle");
const loadingIndicator = document.getElementById("loading");
const languageSelector = document.querySelectorAll('input[name="language"]');
let map;
let layerGroup;
let translations = {};

// Функция для отображения индикатора загрузки
function showLoading() {
    loadingIndicator.classList.remove("hidden");
}

// Функция для скрытия индикатора загрузки
function hideLoading() {
    loadingIndicator.classList.add("hidden");
}

// Функция для загрузки переводов
async function loadTranslations(language) {
    try {
        const response = await fetch(`${language}.json`);
        if (!response.ok) {
            throw new Error("Failed to load translations");
        }
        translations = await response.json();
        updateTranslations();
    } catch (error) {
        console.error("Error loading translations:", error);
    }
}

// Функция для обновления переводов на странице
function updateTranslations() {
    cityInput.placeholder = translations.search_placeholder || "Enter city";
    searchButton.textContent = translations.search_button || "Search";
    currentLocationButton.textContent = translations.current_location_button || "Use Current Location";
    loadingIndicator.textContent = translations.loading || "Loading...";
}

// Функция для получения данных о погоде
async function fetchWeatherData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error("Error fetching weather data:", error);
        return null;
    }
}

// Функция для получения погоды или прогноза
async function getWeatherOrForecast(cityOrCoords, type = "weather") {
    let url;
    if (typeof cityOrCoords === "string") {
        const endpoint = type === "weather" ? "weather" : "forecast";
        url = `https://api.openweathermap.org/data/2.5/${endpoint}?q=${cityOrCoords}&appid=${apiKey}&units=metric`;
    } else if (typeof cityOrCoords === "object" && cityOrCoords.latitude && cityOrCoords.longitude) {
        const endpoint = type === "weather" ? "weather" : "forecast";
        url = `https://api.openweathermap.org/data/2.5/${endpoint}?lat=${cityOrCoords.latitude}&lon=${cityOrCoords.longitude}&appid=${apiKey}&units=metric`;
    } else {
        console.error("Invalid input for city or coordinates");
        return;
    }

    showLoading(); // Показать индикатор загрузки

    const data = await fetchWeatherData(url);

    hideLoading(); // Скрыть индикатор загрузки

    if (data) {
        if (type === "weather") {
            displayWeather(data);
            if (typeof cityOrCoords === "string") {
                const { coord } = data;
                showMapWithWeatherLayer(coord.lat, coord.lon);
            }
        } else {
            displayForecast(data);
        }
    } else {
        const container = type === "weather" ? weatherInfo : forecastContainer;
        container.innerHTML = `<p>${translations.could_not_fetch || "Could not fetch data"}</p>`;
        container.classList.remove("hidden");
    }
}

// Функция для отображения текущей погоды
function displayWeather(data) {
    const { name, main, weather, wind, sys } = data;
    const iconUrl = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
    weatherInfo.innerHTML = `
        <h2>${name}</h2>
        <img src="${iconUrl}" alt="${weather[0].description}">
        <p>${translations.temperature || "Temperature"}: ${main.temp} °C</p>
        <p>${translations.weather || "Weather"}: ${weather[0].description}</p>
        <p>${translations.humidity || "Humidity"}: ${main.humidity}%</p>
        <p>${translations.wind_speed || "Wind Speed"}: ${wind.speed} m/s</p>
        <p>${translations.sunrise || "Sunrise"}: ${new Date(sys.sunrise * 1000).toLocaleTimeString()}</p>
        <p>${translations.sunset || "Sunset"}: ${new Date(sys.sunset * 1000).toLocaleTimeString()}</p>
    `;
    weatherInfo.classList.add("show");
}

// Функция для отображения прогноза погоды
function displayForecast(data) {
    forecastContainer.innerHTML = `<h2>${translations.forecast || "Forecast"}</h2>`;
    for (let i = 0; i < data.list.length; i += 8) {
        const day = data.list[i];
        const date = new Date(day.dt * 1000).toLocaleDateString();
        const iconUrl = `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`;
        forecastContainer.innerHTML += `
            <div class="forecast-day">
                <p>${date}</p>
                <img src="${iconUrl}" alt="${day.weather[0].description}">
                <p>${translations.temperature || "Temperature"}: ${day.main.temp} °C</p>
                <p>${translations.weather || "Weather"}: ${day.weather[0].description}</p>
            </div>
        `;
    }
    forecastContainer.classList.add("show");
}

// Функция для отображения карты с погодными слоями
function showMapWithWeatherLayer(lat, lon) {
    if (!map) {
        map = L.map("map").setView([lat, lon], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(map);
        layerGroup = L.layerGroup().addTo(map);
    } else {
        map.setView([lat, lon], 13);
        layerGroup.clearLayers();
    }

    L.marker([lat, lon]).addTo(layerGroup);

    // Добавление погодного слоя
    const weatherLayer = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`, {
        attribution: 'Weather data © OpenWeatherMap',
        opacity: 0.5
    });
    weatherLayer.addTo(map);

    mapContainer.classList.add("show");
}

// Функция для отображения ошибок
function showError(error) {
    weatherInfo.innerHTML = `<p>${translations.error || "Error"}: ${error.message}</p>`;
    weatherInfo.classList.add("show");
}

// Функция для добавления элемента в историю поиска
function addToSearchHistory(city) {
    const historyItem = document.createElement("div");
    historyItem.classList.add("history-item");
    historyItem.textContent = city;
    historyItem.addEventListener("click", () => {
        cityInput.value = city;
        searchButton.click();
    });
    searchHistoryContainer.appendChild(historyItem);
    searchHistoryContainer.classList.remove("hidden");
}

// Инициализация приложения
document.addEventListener("DOMContentLoaded", () => {
    // Устанавливаем язык по умолчанию
    loadTranslations("en");

    // Событие при изменении языка
    languageSelector.forEach((selector) => {
        selector.addEventListener("change", (event) => {
            loadTranslations(event.target.value);
        });
    });

    // Событие при переключении темы
    themeToggle.addEventListener("change", () => {
        document.body.classList.toggle("theme-dark");
    });

    // Событие при поиске города
    searchButton.addEventListener("click", () => {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherOrForecast(city, "weather");
            getWeatherOrForecast(city, "forecast");
            addToSearchHistory(city);
        }
    });

    // Событие при использовании текущего местоположения
    currentLocationButton.addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    getWeatherOrForecast({ latitude, longitude }, "weather");
                    getWeatherOrForecast({ latitude, longitude }, "forecast");
                },
                (error) => {
                    showError(error);
                }
            );
        } else {
            showError({ message: "Geolocation is not supported by this browser." });
        }
    });
});
