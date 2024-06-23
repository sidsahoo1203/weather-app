# Weather Application

## Overview

This repository contains a Weather Application built using React JS. The app fetches current weather data from the OpenWeatherMap API and displays information such as temperature, weather conditions, humidity, and wind speed based on the city, state, or country entered by the user.

## Features

- **Current Weather Data**: Get real-time weather updates.
- **Temperature**: Displays the current temperature.
- **Weather Condition**: Shows the current weather condition (e.g., sunny, cloudy, etc.).
- **Humidity**: Displays the current humidity level.
- **Wind Speed**: Shows the current wind speed.
- **Location Based Search**: Enter the name of a city, state, or country to get the weather data.

## Demo

[Link to live demo if available]

## Screenshots

[Include some screenshots of your application here]

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/your-username/weather-application.git
   cd weather-application
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Obtain an API key from [OpenWeatherMap](https://openweathermap.org/api).

4. Create a `.env` file in the root directory and add your API key:

   ```sh
   REACT_APP_WEATHER_API_KEY=your_api_key_here
   ```

5. Start the development server:

   ```sh
   npm start
   ```

6. Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

## Usage

1. Enter the name of the city, state, or country in the search bar.
2. Click the search button or press enter.
3. The app will display the current weather data for the entered location.

## Technologies Used

- **React JS**: A JavaScript library for building user interfaces.
- **OpenWeatherMap API**: Provides weather data.
- **Axios**: Used for making HTTP requests.
- **Tailwind CSS** (if used): For styling the application.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository.
2. Create your feature branch:

   ```sh
   git checkout -b feature/new-feature
   ```

3. Commit your changes:

   ```sh
   git commit -m 'Add new feature'
   ```

4. Push to the branch:

   ```sh
   git push origin feature/new-feature
   ```

5. Open a Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [OpenWeatherMap](https://openweathermap.org/) for the free weather API.
- [React](https://reactjs.org/) for providing the framework to build this application.
- Any other libraries or tools used.
