import { AlertTriangle, RotateCw } from 'lucide-react';
import { CurrentHero } from './CurrentHero.jsx';
import { HourlyChart } from './HourlyChart.jsx';
import { DailyForecast } from './DailyForecast.jsx';
import { DetailsGrid } from './DetailsGrid.jsx';
import { useLingering } from '../hooks/useTimers.js';
import './WeatherPanel.css';

function PanelSkeleton({ message }) {
  return (
    <div className="panel-skeleton" aria-busy="true">
      <div className="skeleton" style={{ width: '55%', height: 28 }} />
      <div className="skeleton" style={{ width: '35%', height: 16, marginTop: 10 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
        <div className="skeleton" style={{ width: 150, height: 92 }} />
        <div className="skeleton" style={{ width: 96, height: 96, borderRadius: '50%' }} />
      </div>
      <div className="skeleton" style={{ width: '80%', height: 16, marginTop: 24 }} />
      <div className="skeleton" style={{ height: 150, marginTop: 28 }} />
      <div className="skeleton" style={{ height: 260, marginTop: 20 }} />
      {message && <p className="panel-skeleton__msg">{message}</p>}
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="panel-error" role="alert">
      <AlertTriangle size={28} />
      <h2>Couldn’t load the weather</h2>
      <p>{error?.message || 'Something went wrong.'}</p>
      <button type="button" className="btn" onClick={onRetry}>
        <RotateCw size={16} /> Try again
      </button>
    </div>
  );
}

export function WeatherPanel({ location, weatherQuery, place, booting, isFavorite, onToggleFavorite }) {
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } = weatherQuery;
  // The API is on a free host that sleeps; explain long first loads instead of spinning silently.
  const slow = useLingering(booting || isPending, 5000);

  if (booting) {
    return <PanelSkeleton message={slow ? 'Waiting for your location… allow access or search for a place.' : 'Finding your location…'} />;
  }
  if (!location || isPending) {
    return <PanelSkeleton message={slow ? 'Waking up the forecast server. The first load can take up to a minute on free hosting.' : null} />;
  }
  if (isError && !data) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="weather fade-up" key={`${data.location.lat},${data.location.lon}`}>
      <CurrentHero
        weather={data}
        place={place}
        location={location}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        refreshing={isPlaceholderData && isFetching}
      />
      <HourlyChart weather={data} />
      <DailyForecast weather={data} />
      <DetailsGrid weather={data} />
      <footer className="credits">
        Forecast data by{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>{' '}
        · Places by{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
      </footer>
    </div>
  );
}
