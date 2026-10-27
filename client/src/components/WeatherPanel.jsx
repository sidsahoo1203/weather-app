import { AlertTriangle, RotateCw } from 'lucide-react';
import { CurrentHero } from './CurrentHero.jsx';
import { HourlyChart } from './HourlyChart.jsx';
import { DailyForecast } from './DailyForecast.jsx';
import { DetailsGrid } from './DetailsGrid.jsx';
import { useLingering } from '../hooks/useTimers.js';
import { Skeleton } from './ui.jsx';

function PanelSkeleton({ message }) {
  return (
    <div aria-busy="true">
      <Skeleton className="h-7 w-[55%]" />
      <Skeleton className="mt-2.5 h-4 w-[35%]" />
      <div className="mt-7 flex justify-between">
        <Skeleton className="h-[92px] w-[150px]" />
        <Skeleton className="size-24 rounded-full" />
      </div>
      <Skeleton className="mt-6 h-4 w-4/5" />
      <Skeleton className="mt-7 h-[150px]" />
      <Skeleton className="mt-5 h-[260px]" />
      {message && <p className="mt-[18px] text-center text-[13px] text-muted">{message}</p>}
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="grid justify-items-center gap-2 px-3 py-12 text-center text-muted" role="alert">
      <AlertTriangle size={28} />
      <h2 className="mt-1 text-lg font-semibold text-fg">Couldn’t load the weather</h2>
      <p className="mb-2">{error?.message || 'Something went wrong.'}</p>
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 font-bold text-[#0b1020]"
        onClick={onRetry}
      >
        <RotateCw size={16} /> Try again
      </button>
    </div>
  );
}

export function WeatherPanel({ location, weatherQuery, place, isFavorite, onToggleFavorite }) {
  const { data, error, isPending, isError, isPlaceholderData, isFetching, refetch } = weatherQuery;
  const slow = useLingering(isPending, 6000);

  if (!location || isPending) {
    return <PanelSkeleton message={slow ? 'Still loading the forecast… this can take a few seconds on a slow connection.' : null} />;
  }
  if (isError && !data) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="flex animate-fade-up flex-col gap-[26px]" key={`${data.location.lat},${data.location.lon}`}>
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
      <footer className="pb-1 text-center text-[11px] text-faint [&_a]:text-muted">
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
