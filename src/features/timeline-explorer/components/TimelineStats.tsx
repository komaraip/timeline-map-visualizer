import type { getStatistics } from "@/core/timeline";
import { formatDuration } from "@/shared/format/duration";

interface TimelineStatsProps {
  statistics: ReturnType<typeof getStatistics>;
}

export function TimelineStats({ statistics }: TimelineStatsProps) {
  return <div className="stats-bar"><article><small>VISITS</small><strong>{statistics.visits.toLocaleString()}</strong></article><article><small>ACTIVE DAYS</small><strong>{statistics.activeDays.toLocaleString()}</strong></article><article><small>MAPPED DISTANCE</small><strong>{statistics.mappedDistanceKm.toFixed(statistics.mappedDistanceKm < 100 ? 1 : 0)} <em>km</em></strong></article><article><small>RECORDED TIME</small><strong>{formatDuration(statistics.durationMs)}</strong></article></div>;
}
