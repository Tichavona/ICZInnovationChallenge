// frontend/src/components/dashboards/UnifiedDashboard.tsx (corrected)
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  DirectionsCar as VehicleIcon,
  Assessment as AssessmentIcon,
  Dashboard as DashboardIcon,
  Map as MapIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Info as InfoIcon  // Added missing import
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { socket } from '../../services/socket';
import { formatDistance, format } from 'date-fns';

interface DashboardProps {
  departmentId?: string;
  stationId?: string;
  viewMode?: 'overview' | 'department' | 'station';
}

interface DashboardData {
  summary: DashboardSummary;
  incidents: {
    emergencies: any[];
    issues: any[];
    activeIncidents: any[];
    recentIncidents: any[];
  };
  performance: {
    slaCompliance: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    departmentPerformance: DepartmentPerformance[];
    stationPerformance: StationPerformance[];
    staffPerformance: StaffPerformance[];
  };
  analytics: DashboardAnalytics;
  notifications: Notification[];
}

interface DashboardSummary {
  totalIncidents: number;
  activeIncidents: number;
  resolvedToday: number;
  criticalIncidents: number;
  pendingAssignments: number;
  slaBreaches: number;
  activeEscalations: number;
  availableStaff: number;
  availableVehicles: number;
  stationsAtCapacity: number;
}

interface DepartmentPerformance {
  departmentId: string;
  departmentName: string;
  type: string;
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaCompliance: number;
  staffUtilization: number;
  capacityUtilization: number;
}

interface StationPerformance {
  stationId: string;
  stationName: string;
  department: string;
  currentLoad: number;
  maxCapacity: number;
  availableStaff: number;
  totalStaff: number;
  availableVehicles: number;
  totalVehicles: number;
  avgResponseTime: number;
  status: string;
}

interface StaffPerformance {
  staffId: string;
  name: string;
  role: string;
  specialization: string;
  isOnDuty: boolean;
  currentAssignments: number;
  completedToday: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  slaCompliance: number;
  customerRating: number;
}

interface DashboardAnalytics {
  trends: {
    hourly: TimeSeriesData[];
    daily: TimeSeriesData[];
    weekly: TimeSeriesData[];
    monthly: TimeSeriesData[];
  };
  heatmap: HeatmapData[];
  typeDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  departmentWorkload: Record<string, number>;
  responseTimeByType: Record<string, number>;
  resolutionTimeByType: Record<string, number>;
}

interface TimeSeriesData {
  timestamp: string;
  value: number;
  metric: string;
}

interface HeatmapData {
  latitude: number;
  longitude: number;
  intensity: number;
  type: string;
  timestamp: Date;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  createdAt: Date;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const PRIORITY_COLORS = {
  critical: '#f44336',
  high: '#ff9800',
  medium: '#2196f3',
  low: '#4caf50'
};

export const UnifiedDashboard: React.FC<DashboardProps> = ({
  departmentId,
  stationId,
  viewMode = 'overview'
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState({
    dateRange: '7d',
    status: [] as string[],
    priority: [] as string[],
    type: [] as string[],
    search: ''
  });
  const [activeTab, setActiveTab] = useState(0);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates
    socket.on('dashboard_update', handleDashboardUpdate);
    socket.on('notification', handleNewNotification);
    socket.on('sla_breach', handleSLABreach);

    return () => {
      socket.off('dashboard_update');
      socket.off('notification');
      socket.off('sla_breach');
    };
  }, [departmentId, stationId, filters.dateRange, filters.search, filters.status, filters.priority, filters.type]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/unified', {
        params: {
          departmentId,
          stationId,
          ...filters
        }
      });
      setDashboardData(response.data);
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load dashboard data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardUpdate = (update: any) => {
    setDashboardData(prev => ({
      ...prev!,
      ...update
    }));
  };

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    
    // Show toast for high priority notifications
    if (notification.priority === 'CRITICAL' || notification.priority === 'HIGH') {
      setSnackbar({
        open: true,
        message: notification.title,
        severity: 'warning'
      });
    }
  };

  const handleSLABreach = (breach: any) => {
    // Update dashboard with new breach
    setDashboardData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        summary: {
          ...prev.summary,
          slaBreaches: prev.summary.slaBreaches + 1,
          activeEscalations: prev.summary.activeEscalations + 1
        }
      };
    });

    // Show alert
    setSnackbar({
      open: true,
      message: `SLA Breach: ${breach.incidentId}`,
      severity: 'error'
    });
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const response = await api.get('/dashboard/export', {
        params: {
          departmentId,
          stationId,
          format,
          ...filters
        },
        responseType: 'blob'
      });

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading || !dashboardData) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  const { summary, incidents, performance, analytics } = dashboardData;

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {viewMode === 'overview' && 'Unified Command Dashboard'}
            {viewMode === 'department' && 'Department Dashboard'}
            {viewMode === 'station' && 'Station Dashboard'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated: {new Date().toLocaleString()}
          </Typography>
        </Box>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filters">
            <IconButton onClick={(e) => setFilterAnchorEl(e.currentTarget)}>
              <Badge badgeContent={Object.values(filters).filter(v => v.length > 0).length} color="primary">
                <FilterIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton onClick={() => handleExport('csv')}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* KPI Cards - Using Grid v2 syntax */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Incidents
                  </Typography>
                  <Typography variant="h4">{summary.totalIncidents}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.activeIncidents} active
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <AssessmentIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Critical Incidents
                  </Typography>
                  <Typography variant="h4" color="error">
                    {summary.criticalIncidents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.slaBreaches} SLA breaches
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main', width: 56, height: 56 }}>
                  <WarningIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Response Time
                  </Typography>
                  <Typography variant="h4">{performance.avgResponseTime} min</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {performance.slaCompliance}% SLA compliance
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56 }}>
                  <ScheduleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Resources
                  </Typography>
                  <Typography variant="h4">{summary.availableStaff}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary.availableVehicles} vehicles
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56 }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Overview" icon={<DashboardIcon />} iconPosition="start" />
          <Tab label="Incidents" icon={<WarningIcon />} iconPosition="start" />
          <Tab label="Analytics" icon={<AssessmentIcon />} iconPosition="start" />
          <Tab label="Map" icon={<MapIcon />} iconPosition="start" />
          <Tab label="Timeline" icon={<TimelineIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Department Performance */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Department Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performance.departmentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="departmentName" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="activeIncidents" fill="#8884d8" name="Active Incidents" />
                  <Bar yAxisId="right" dataKey="slaCompliance" fill="#82ca9d" name="SLA Compliance %" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Station Status */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Station Status
              </Typography>
              {performance.stationPerformance.map((station) => (
                <Box key={station.stationId} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2">{station.stationName}</Typography>
                    <Chip
                      label={station.status}
                      color={station.status === 'active' ? 'success' : 'warning'}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Typography variant="caption">
                      Load: {station.currentLoad}/{station.maxCapacity}
                    </Typography>
                    <Typography variant="caption">
                      Staff: {station.availableStaff}/{station.totalStaff}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(station.currentLoad / station.maxCapacity) * 100}
                    sx={{ mt: 1 }}
                  />
                </Box>
              ))}
            </Paper>
          </Grid>

          {/* Recent Incidents */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Incidents
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Priority</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Location</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Time</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.recentIncidents.slice(0, 10).map((incident) => (
                      <tr key={incident.id}>
                        <td style={{ padding: '8px' }}>#{incident.id}</td>
                        <td style={{ padding: '8px' }}>
                          <Chip
                            label={incident.type}
                            size="small"
                            color={incident.type === 'emergency' ? 'error' : 'default'}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <Chip
                            label={incident.status}
                            size="small"
                            variant="outlined"
                          />
                        </td>
                        <td style={{ padding: '8px' }}>
                          {incident.priority && (
                            <Chip
                              label={incident.priority}
                              size="small"
                              sx={{
                                bgcolor: PRIORITY_COLORS[incident.priority as keyof typeof PRIORITY_COLORS],
                                color: 'white'
                              }}
                            />
                          )}
                        </td>
                        <td style={{ padding: '8px' }}>{incident.location}</td>
                        <td style={{ padding: '8px' }}>
                          {formatDistance(new Date(incident.createdAt), new Date(), { addSuffix: true })}
                        </td>
                        <td style={{ padding: '8px' }}>
                          <IconButton size="small">
                            <MoreVertIcon />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Incident Type Distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Incidents by Type
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(analytics.typeDistribution).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(analytics.typeDistribution).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Priority Distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Incidents by Priority
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(analytics.priorityDistribution).map(([name, value]) => ({ name, value }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {Object.entries(analytics.priorityDistribution).map(([name], index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PRIORITY_COLORS[name as keyof typeof PRIORITY_COLORS] || COLORS[index]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Response Time Trends */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Response Time Trends (7 Days)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.trends.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {/* Staff Performance */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Staff Performance
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Role</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Current</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Completed</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Avg Response</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>SLA %</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.staffPerformance.map((staff) => (
                      <tr key={staff.staffId}>
                        <td style={{ padding: '8px' }}>{staff.name}</td>
                        <td style={{ padding: '8px' }}>{staff.role}</td>
                        <td style={{ padding: '8px' }}>
                          <Chip
                            label={staff.isOnDuty ? 'On Duty' : 'Off Duty'}
                            size="small"
                            color={staff.isOnDuty ? 'success' : 'default'}
                          />
                        </td>
                        <td style={{ padding: '8px' }}>{staff.currentAssignments}</td>
                        <td style={{ padding: '8px' }}>{staff.completedToday}</td>
                        <td style={{ padding: '8px' }}>{staff.avgResponseTime} min</td>
                        <td style={{ padding: '8px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '50px', mr: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={staff.slaCompliance}
                                color={staff.slaCompliance > 90 ? 'success' : staff.slaCompliance > 70 ? 'warning' : 'error'}
                              />
                            </Box>
                            {staff.slaCompliance}%
                          </Box>
                        </td>
                        <td style={{ padding: '8px' }}>{staff.customerRating}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Notifications Panel */}
      <Paper
        sx={{
          position: 'fixed',
          right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 300,
          maxHeight: 500,
          overflow: 'auto',
          zIndex: 1000,
          p: 2
        }}
      >
        <Typography variant="h6" gutterBottom>
          Notifications
          <Badge badgeContent={notifications.filter(n => !n.isRead).length} color="error" sx={{ ml: 2 }} />
        </Typography>
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            sx={{
              mb: 1,
              bgcolor: notification.isRead ? 'background.paper' : 'action.hover',
              cursor: 'pointer'
            }}
            onClick={() => markNotificationAsRead(notification.id)}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {notification.priority === 'CRITICAL' && <ErrorIcon color="error" sx={{ mr: 1, fontSize: 16 }} />}
                {notification.priority === 'HIGH' && <WarningIcon color="warning" sx={{ mr: 1, fontSize: 16 }} />}
                {notification.priority === 'MEDIUM' && <InfoIcon color="info" sx={{ mr: 1, fontSize: 16 }} />}
                <Typography variant="subtitle2" noWrap>
                  {notification.title}
                </Typography>
              </Box>
              <Typography variant="caption" display="block" color="text.secondary">
                {notification.message.substring(0, 50)}...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDistance(new Date(notification.createdAt), new Date(), { addSuffix: true })}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Paper>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
      >
        <Box sx={{ p: 2, width: 300 }}>
          <Typography variant="subtitle1" gutterBottom>
            Filters
          </Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as string })}
              label="Date Range"
            >
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="Search"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              setFilterAnchorEl(null);
              loadDashboardData();
            }}
          >
            Apply Filters
          </Button>
        </Box>
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity as any}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};