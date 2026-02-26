const locationInput = document.getElementById('location-input');
const searchBtn = document.getElementById('search-btn');
const locationName = document.getElementById('location-name');
const weatherDescription = document.getElementById('weather-description');
const temperature = document.getElementById('temperature');
const celsius = document.getElementById('celsius');
const fahrenheit = document.getElementById('fahrenheit');
const unitToggle = document.getElementById('unit-toggle');
let currentUnit = 'celsius';
let currentWeatherData;

fetch('data.json')
  .then(response => response.json())
  .then(data => {
    searchBtn.addEventListener('click', () => {
      const location = locationInput.value.trim();
      if (location) {
        const weatherData = data.find(item => item.location.toLowerCase() === location.toLowerCase());
        if (weatherData) {
          locationName.textContent = weatherData.location;
          weatherDescription.textContent = weatherData.weather;
          temperature.textContent = weatherData.temperature;
          celsius.textContent = '°C';
          fahrenheit.textContent = '°F';
          currentWeatherData = weatherData;
        } else {
          locationName.textContent = 'Location not found';
          weatherDescription.textContent = '';
          temperature.textContent = '';
        }
      } else {
        alert('Please enter a location');
      }
    });

    unitToggle.addEventListener('click', () => {
      if (currentWeatherData) {
        if (currentUnit === 'celsius') {
          temperature.textContent = (currentWeatherData.temperature * 9 / 5 + 32).toFixed(2);
          currentUnit = 'fahrenheit';
        } else {
          temperature.textContent = (currentWeatherData.temperature).toFixed(2);
          currentUnit = 'celsius';
        }
      }
    });
  })
  .catch(error => console.error('Error:', error));