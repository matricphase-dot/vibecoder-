let locations = ['New York', 'London', 'Paris', 'Tokyo'];
let currentLocationIndex = 0;
let weatherData = {
  'New York': { current: 'Sunny', temperature: 25, forecast: ['Cloudy', 'Rainy', 'Sunny'] },
  'London': { current: 'Rainy', temperature: 18, forecast: ['Sunny', 'Cloudy', 'Rainy'] },
  'Paris': { current: 'Cloudy', temperature: 22, forecast: ['Rainy', 'Sunny', 'Cloudy'] },
  'Tokyo': { current: 'Sunny', temperature: 28, forecast: ['Cloudy', 'Rainy', 'Sunny'] }
};

// Display initial weather data
let locationName = document.getElementById('location-name');
let currentWeatherDescription = document.getElementById('current-weather-description');
let temperatureValue = document.getElementById('temperature-value');
let forecastDiv = document.getElementById('forecast');
let changeLocationButton = document.getElementById('change-location-button');
let viewForecastButton = document.getElementById('view-forecast-button');

locationName.textContent = locations[currentLocationIndex];
currentWeatherDescription.textContent = weatherData[locations[currentLocationIndex]].current;
temperatureValue.textContent = weatherData[locations[currentLocationIndex]].temperature;

changeLocationButton.addEventListener('click', () => {
  if (currentLocationIndex < locations.length - 1) {
    currentLocationIndex++;
  } else {
    currentLocationIndex = 0;
  }
  locationName.textContent = locations[currentLocationIndex];
  currentWeatherDescription.textContent = weatherData[locations[currentLocationIndex]].current;
  temperatureValue.textContent = weatherData[locations[currentLocationIndex]].temperature;
});

viewForecastButton.addEventListener('click', () => {
  forecastDiv.innerHTML = '';
  let forecast = weatherData[locations[currentLocationIndex]].forecast;
  forecast.forEach((day) => {
    let dayDiv = document.createElement('div');
    dayDiv.textContent = day;
    forecastDiv.appendChild(dayDiv);
  });
});