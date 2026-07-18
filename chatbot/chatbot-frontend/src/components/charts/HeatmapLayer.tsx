// src/components/charts/HeatmapLayer.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Paper,
  ButtonGroup,
  Button,
  Chip,
  Stack
} from '@mui/material';
import {
  MapContainer,
  TileLayer,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { useTheme } from '@mui/material/styles';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Add type declarations for leaflet plugins
declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      minOpacity?: number;
      gradient?: Record<number, string>;
    }
  ): any;
}

export interface HeatmapDataPoint {
  lat: number;
  lng: number;
  intensity?: number;
  radius?: number;
  id?: string | number;
  type?: string;
  timestamp?: Date;
  title?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
}

export interface HeatmapLayerProps {
  data: HeatmapDataPoint[] | Promise<HeatmapDataPoint[]>;
  center?: [number, number];
  zoom?: number;
  height?: string | number;
  width?: string | number;
  radius?: number;
  blur?: number;
  maxZoom?: number;
  minOpacity?: number;
  gradient?: Record<number, string>;
  colorScale?: string[];
  showLegend?: boolean;
  showControls?: boolean;
  showMarkers?: boolean;
  showClusters?: boolean;
  clusterRadius?: number;
  onPointClick?: (point: HeatmapDataPoint) => void;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  useRealData?: boolean;
  refreshInterval?: number;
  layerType?: 'heatmap' | 'markers' | 'both';
  intensityField?: string;
  valueRange?: [number, number];
}

// Custom hook for heatmap layer
const useHeatmapLayer = (
  map: L.Map | null,
  points: HeatmapDataPoint[],
  options: {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    minOpacity?: number;
    gradient?: Record<number, string>;
  }
) => {
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !points.length) return;

    // Convert points to heatmap format [lat, lng, intensity]
    const heatPoints = points.map(point => [
      point.lat,
      point.lng,
      point.intensity || 1
    ] as [number, number, number]);

    // Remove existing layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Create new heat layer
    heatLayerRef.current = L.heatLayer(heatPoints, {
      radius: options.radius || 25,
      blur: options.blur || 15,
      maxZoom: options.maxZoom || 18,
      minOpacity: options.minOpacity || 0.3,
      gradient: options.gradient || {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points, options.radius, options.blur, options.maxZoom, options.minOpacity, options.gradient]);
};

// Custom hook for marker clusters - COMPLETELY REWRITTEN
const useMarkerClusters = (
  map: L.Map | null,
  points: HeatmapDataPoint[],
  options: {
    showMarkers?: boolean;
    showClusters?: boolean;
    clusterRadius?: number;
    onPointClick?: (point: HeatmapDataPoint) => void;
  }
) => {
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [clusterLibAvailable, setClusterLibAvailable] = useState(false);

  // Check if marker cluster library is available
  useEffect(() => {
    const checkClusterLib = async () => {
      try {
        // Just try to import to check availability, but don't use it directly
        await import('leaflet.markercluster');
        setClusterLibAvailable(true);
      } catch (error) {
        console.warn('Marker cluster library not available, using regular markers', error);
        setClusterLibAvailable(false);
      }
    };

    if (options.showClusters) {
      checkClusterLib();
    }
  }, [options.showClusters]);

  // Handle markers (with or without clustering)
  useEffect(() => {
    if (!map || !points.length || !options.showMarkers) return;

    // Clean up previous markers
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
    }

    // Create a new layer group
    markersRef.current = L.layerGroup();

    // Add markers to the layer group
    points.forEach(point => {
      const marker = L.marker([point.lat, point.lng], {
        title: point.title || point.type || 'Incident'
      });

      // Add popup
      const popupContent = `
        <div style="min-width: 200px;">
          <h4 style="margin: 0 0 8px 0;">${point.title || 'Incident'}</h4>
          ${point.type ? `<p><strong>Type:</strong> ${point.type}</p>` : ''}
          ${point.severity ? `<p><strong>Severity:</strong> ${point.severity}</p>` : ''}
          ${point.status ? `<p><strong>Status:</strong> ${point.status}</p>` : ''}
          ${point.description ? `<p>${point.description}</p>` : ''}
          ${point.timestamp ? `<p><small>${new Date(point.timestamp).toLocaleString()}</small></p>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent);

      // Add click handler
      if (options.onPointClick) {
        marker.on('click', () => {
          options.onPointClick!(point);
        });
      }

      markersRef.current!.addLayer(marker);
    });

    // Add to map
    markersRef.current.addTo(map);

    return () => {
      if (markersRef.current) {
        map.removeLayer(markersRef.current);
      }
    };
  }, [map, points, options.showMarkers, options.onPointClick]);

  // Note: Clustering is disabled due to import issues
  // If you need clustering, consider using a different approach or library
};

// Map bounds updater component
const MapBoundsUpdater: React.FC<{ onBoundsChange?: (bounds: L.LatLngBounds) => void }> = ({ onBoundsChange }) => {
  const map = useMap();

  useEffect(() => {
    if (!onBoundsChange) return;

    const handleMoveEnd = () => {
      onBoundsChange(map.getBounds());
    };

    map.on('moveend', handleMoveEnd);
    handleMoveEnd();

    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);

  return null;
};

// Legend component
const HeatmapLegend: React.FC<{ gradient: Record<number, string>; min?: number; max?: number }> = ({ 
  gradient, 
  min = 0, 
  max = 1 
}) => {
  const sortedStops = Object.keys(gradient)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        p: 1.5,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 1,
        boxShadow: 2,
        minWidth: 200
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Intensity Legend
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {sortedStops.map((stop, index) => (
          <Box
            key={stop}
            sx={{
              flex: 1,
              height: 20,
              backgroundColor: gradient[stop],
              borderLeft: index === 0 ? 'none' : '1px solid rgba(0,0,0,0.1)'
            }}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption">{min}</Typography>
        <Typography variant="caption">Intensity</Typography>
        <Typography variant="caption">{max}</Typography>
      </Box>
    </Paper>
  );
};

// Main HeatmapLayer component
export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  data,
  center = [0, 0],
  zoom = 10,
  height = '500px',
  width = '100%',
  radius = 25,
  blur = 15,
  maxZoom = 18,
  minOpacity = 0.3,
  gradient,
  colorScale = ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
  showLegend = true,
  showControls = true,
  showMarkers = true,
  showClusters = false, // Note: Clustering is disabled due to import issues
  clusterRadius = 50,
  onPointClick,
  onBoundsChange,
  loadingComponent,
  errorComponent,
  useRealData = false,
  refreshInterval,
  layerType = 'heatmap',
  intensityField = 'intensity',
  valueRange = [0, 1]
}) => {
  const theme = useTheme();
  const mapRef = useRef<L.Map | null>(null);
  const [points, setPoints] = useState<HeatmapDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layerMode, setLayerMode] = useState<'heatmap' | 'markers' | 'both'>(layerType);
  const [heatIntensity, setHeatIntensity] = useState<number>(1);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Default gradient if not provided
  const defaultGradient = gradient || {
    0.2: colorScale[0],
    0.4: colorScale[1],
    0.6: colorScale[2],
    0.8: colorScale[3],
    1.0: colorScale[4]
  };

  // Fetch/process data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let result: HeatmapDataPoint[];
        
        if (data instanceof Promise) {
          result = await data;
        } else {
          result = data;
        }

        // Apply intensity scaling
        const processed = result.map(point => ({
          ...point,
          intensity: (point.intensity || 1) * heatIntensity
        }));

        setPoints(processed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load heatmap data');
        console.error('Heatmap data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [data, heatIntensity, refreshInterval]);

  // Filter points
  const filteredPoints = points.filter(point => {
    if (filterType !== 'all' && point.type !== filterType) return false;
    if (filterSeverity !== 'all' && point.severity !== filterSeverity) return false;
    return true;
  });

  // Get unique types for filter
  const uniqueTypes = Array.from(new Set(points.map(p => p.type).filter(Boolean))) as string[];
  const uniqueSeverities = Array.from(new Set(points.map(p => p.severity).filter(Boolean))) as string[];

  // Custom hook for heatmap layer
  useHeatmapLayer(
    mapRef.current,
    layerMode !== 'markers' ? filteredPoints : [],
    {
      radius,
      blur,
      maxZoom,
      minOpacity,
      gradient: defaultGradient
    }
  );

  // Custom hook for marker clusters (now using regular markers only)
  useMarkerClusters(
    mapRef.current,
    layerMode !== 'heatmap' ? filteredPoints : [],
    {
      showMarkers,
      showClusters: false, // Force to false to avoid clustering issues
      clusterRadius,
      onPointClick
    }
  );

  if (loading && points.length === 0) {
    return (
      <Box
        sx={{
          height,
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {loadingComponent || (
          <>
            <CircularProgress />
            <Typography variant="body2" color="textSecondary">
              Loading heatmap data...
            </Typography>
          </>
        )}
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height,
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2
        }}
      >
        {errorComponent || (
          <>
            <Typography variant="body1" color="error">
              Error loading heatmap
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {error}
            </Typography>
          </>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', height, width }}>
      {/* Map Container */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={(map) => {
          if (map) {
            mapRef.current = map;
          }
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsUpdater onBoundsChange={onBoundsChange} />
      </MapContainer>

      {/* Controls */}
      {showControls && (
        <Paper
          sx={{
            position: 'absolute',
            top: 10,
            left: 50,
            zIndex: 1000,
            p: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 1,
            boxShadow: 3,
            minWidth: 250
          }}
        >
          <Stack spacing={2}>
            <Typography variant="subtitle2" gutterBottom>
              Map Controls
            </Typography>

            {/* Layer toggle */}
            <ButtonGroup size="small" fullWidth>
              <Button
                variant={layerMode === 'heatmap' ? 'contained' : 'outlined'}
                onClick={() => setLayerMode('heatmap')}
              >
                Heatmap
              </Button>
              <Button
                variant={layerMode === 'markers' ? 'contained' : 'outlined'}
                onClick={() => setLayerMode('markers')}
              >
                Markers
              </Button>
              <Button
                variant={layerMode === 'both' ? 'contained' : 'outlined'}
                onClick={() => setLayerMode('both')}
              >
                Both
              </Button>
            </ButtonGroup>

            {/* Intensity slider for heatmap */}
            {layerMode !== 'markers' && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Heat Intensity: {heatIntensity.toFixed(1)}x
                </Typography>
                <Slider
                  size="small"
                  value={heatIntensity}
                  min={0.5}
                  max={2}
                  step={0.1}
                  onChange={(_, value) => setHeatIntensity(value as number)}
                />
              </Box>
            )}

            {/* Type filter */}
            {uniqueTypes.length > 0 && (
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  label="Type"
                  onChange={(e) => setFilterType(e.target.value as string)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {uniqueTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Severity filter */}
            {uniqueSeverities.length > 0 && (
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select
                  value={filterSeverity}
                  label="Severity"
                  onChange={(e) => setFilterSeverity(e.target.value as string)}
                >
                  <MenuItem value="all">All Severities</MenuItem>
                  {uniqueSeverities.map(severity => (
                    <MenuItem key={severity} value={severity}>
                      {severity}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={`${filteredPoints.length} points`}
                variant="outlined"
              />
              {filterType !== 'all' && (
                <Chip
                  size="small"
                  label={`Type: ${filterType}`}
                  onDelete={() => setFilterType('all')}
                />
              )}
              {filterSeverity !== 'all' && (
                <Chip
                  size="small"
                  label={`Severity: ${filterSeverity}`}
                  onDelete={() => setFilterSeverity('all')}
                />
              )}
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Legend */}
      {showLegend && layerMode !== 'markers' && (
        <HeatmapLegend 
          gradient={defaultGradient} 
          min={valueRange[0]} 
          max={valueRange[1]} 
        />
      )}

      {/* Data summary */}
      {filteredPoints.length === 0 && (
        <Paper
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            p: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center'
          }}
        >
          <Typography variant="body1" color="textSecondary">
            No data points to display
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

// Export additional utilities
export const heatmapUtils = {
  generateMockData: (
    centerLat: number,
    centerLng: number,
    count: number,
    radius: number = 0.05
  ): HeatmapDataPoint[] => {
    const types = ['robbery', 'fire', 'accident', 'medical', 'pothole', 'litter'];
    const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    const statuses = ['reported', 'dispatched', 'in_progress', 'resolved'];

    return Array.from({ length: count }, (_, i) => ({
      id: i,
      lat: centerLat + (Math.random() - 0.5) * radius * 2,
      lng: centerLng + (Math.random() - 0.5) * radius * 2,
      intensity: 0.5 + Math.random() * 0.5,
      type: types[Math.floor(Math.random() * types.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      title: `Incident ${i + 1}`,
      description: `This is a sample ${types[Math.floor(Math.random() * types.length)]} incident`
    }));
  },

  aggregateByGrid: (
    points: HeatmapDataPoint[],
    gridSize: number = 0.01
  ): HeatmapDataPoint[] => {
    const grid = new Map<string, { sum: number; count: number; point: HeatmapDataPoint }>();

    points.forEach(point => {
      const latIdx = Math.floor(point.lat / gridSize);
      const lngIdx = Math.floor(point.lng / gridSize);
      const key = `${latIdx},${lngIdx}`;

      if (!grid.has(key)) {
        grid.set(key, {
          sum: point.intensity || 1,
          count: 1,
          point: { ...point }
        });
      } else {
        const cell = grid.get(key)!;
        cell.sum += point.intensity || 1;
        cell.count++;
        
        cell.point.lat = (cell.point.lat * (cell.count - 1) + point.lat) / cell.count;
        cell.point.lng = (cell.point.lng * (cell.count - 1) + point.lng) / cell.count;
      }
    });

    return Array.from(grid.values()).map(cell => ({
      ...cell.point,
      intensity: cell.sum / cell.count
    }));
  },

  applyTimeDecay: (
    points: HeatmapDataPoint[],
    decayHours: number = 24
  ): HeatmapDataPoint[] => {
    const now = Date.now();
    const decayMs = decayHours * 60 * 60 * 1000;

    return points.map(point => {
      if (!point.timestamp) return point;

      const age = now - point.timestamp.getTime();
      const decay = Math.max(0, 1 - age / decayMs);
      
      return {
        ...point,
        intensity: (point.intensity || 1) * decay
      };
    });
  }
};

export default HeatmapLayer;