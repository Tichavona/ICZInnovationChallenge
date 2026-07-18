// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// /* eslint-disable @typescript-eslint/no-floating-promises */
// /* eslint-disable @typescript-eslint/no-unsafe-call */
// /* eslint-disable @typescript-eslint/no-unsafe-return */
// /* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /* eslint-disable prettier/prettier */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// import React, { useState, useEffect } from 'react';
// import {
//   Grid,
//   Paper,
//   Typography,
//   Box,
//   Tabs,
//   Tab,
//   Chip,
//   IconButton,
//   Select,
//   MenuItem,
//   FormControl,
//   InputLabel,
//   Alert,
//   CircularProgress,
//   Card,
//   CardContent,
//   LinearProgress,
//   Button,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField
// } from '@mui/material';
// import {
//   Agriculture as AgricultureIcon,
//   Warning as WarningIcon,
//   CheckCircle as CheckCircleIcon,
//   Timeline as TimelineIcon,
//   LocalFlorist as CropIcon,
//   PestControl as PestIcon,
//   Grass as GrassIcon,
//   WaterDrop as WaterIcon,
//   Whatshot as FireIcon,
//   Article as AdvisoryIcon
// } from '@mui/icons-material';
// import { agriculturalApi } from '../../services/api/agriculturalApi';
// import { IncidentMap } from '../common/IncidentMap';
// import { 
//   AreaChart, 
//   Area, 
//   BarChart, 
//   Bar, 
//   PieChart, 
//   Pie, 
//   Cell,
//   XAxis, 
//   YAxis, 
//   CartesianGrid, 
//   Tooltip, 
//   Legend,
//   ResponsiveContainer,
//   LineChart,
//   Line
// } from 'recharts';

// interface TabPanelProps {
//   children?: React.ReactNode;
//   index: number;
//   value: number;
// }

// function TabPanel(props: TabPanelProps) {
//   const { children, value, index, ...other } = props;
//   return (
//     <div
//       role="tabpanel"
//       hidden={value !== index}
//       {...other}
//     >
//       {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
//     </div>
//   );
// }

// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

// export const AgriculturalDashboard: React.FC = () => {
//   const [tabValue, setTabValue] = useState(0);
//   const [timeframe, setTimeframe] = useState('30d');
//   const [region, setRegion] = useState('');
//   const [metrics, setMetrics] = useState<any>(null);
//   const [incidents, setIncidents] = useState<any[]>([]);
//   const [advisories, setAdvisories] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [advisoryDialogOpen, setAdvisoryDialogOpen] = useState(false);

//   useEffect(() => {
//     loadDashboardData();
//   }, [timeframe, region]);

//   const loadDashboardData = async () => {
//     try {
//       setLoading(true);
//       const [metricsData, incidentsData, advisoriesData] = await Promise.all([
//         agriculturalApi.getMetrics(region, timeframe),
//         agriculturalApi.getIncidents({ timeframe, region }),
//         agriculturalApi.getAdvisories({ region, isActive: true })
//       ]);
      
//       setMetrics(metricsData);
//       setIncidents(incidentsData);
//       setAdvisories(advisoriesData);
//       setError(null);
//     } catch (err) {
//       setError('Failed to load agricultural dashboard data');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
//     setTabValue(newValue);
//   };

//   const handleCreateAdvisory = async (advisoryData: any) => {
//     try {
//       await agriculturalApi.createAdvisory(advisoryData);
//       setAdvisoryDialogOpen(false);
//       loadDashboardData();
//     } catch (error) {
//       console.error('Failed to create advisory:', error);
//     }
//   };

//   if (loading && !metrics) {
//     return (
//       <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
//         <CircularProgress />
//       </Box>
//     );
//   }

//   return (
//     <Box sx={{ flexGrow: 1, p: 3 }}>
//       {/* Header */}
//       <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
//         <Box display="flex" alignItems="center">
//           <AgricultureIcon sx={{ fontSize: 40, mr: 2, color: '#2E7D32' }} />
//           <Typography variant="h4" component="h1">
//             Agricultural Dashboard
//           </Typography>
//         </Box>
//         <Box display="flex" gap={2}>
//           <FormControl sx={{ minWidth: 150 }} size="small">
//             <InputLabel>Region</InputLabel>
//             <Select
//               value={region}
//               label="Region"
//               onChange={(e) => setRegion(e.target.value)}
//             >
//               <MenuItem value="">All Regions</MenuItem>
//               <MenuItem value="Northern">Northern</MenuItem>
//               <MenuItem value="Central">Central</MenuItem>
//               <MenuItem value="Southern">Southern</MenuItem>
//               <MenuItem value="Eastern">Eastern</MenuItem>
//               <MenuItem value="Western">Western</MenuItem>
//             </Select>
//           </FormControl>
          
//           <FormControl sx={{ minWidth: 120 }} size="small">
//             <InputLabel>Timeframe</InputLabel>
//             <Select
//               value={timeframe}
//               label="Timeframe"
//               onChange={(e) => setTimeframe(e.target.value)}
//             >
//               <MenuItem value="24h">Last 24 Hours</MenuItem>
//               <MenuItem value="7d">Last 7 Days</MenuItem>
//               <MenuItem value="30d">Last 30 Days</MenuItem>
//               <MenuItem value="90d">Last 90 Days</MenuItem>
//               <MenuItem value="year">Last Year</MenuItem>
//             </Select>
//           </FormControl>
          
//           <Button 
//             variant="contained" 
//             color="primary"
//             onClick={() => setAdvisoryDialogOpen(true)}
//           >
//             New Advisory
//           </Button>
//         </Box>
//       </Box>

//       {error && (
//         <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
//           {error}
//         </Alert>
//       )}

//       {/* KPI Cards */}
//       <Grid container spacing={3} mb={3}>
//         <Grid item xs={12} sm={6} md={3}>
//           <Paper sx={{ p: 2, bgcolor: '#E8F5E9' }}>
//             <Box display="flex" alignItems="center">
//               <CropIcon sx={{ fontSize: 40, color: '#2E7D32', mr: 2 }} />
//               <Box>
//                 <Typography color="textSecondary" variant="body2">
//                   Total Farmers
//                 </Typography>
//                 <Typography variant="h4">
//                   {metrics?.summary?.totalFarmers || 0}
//                 </Typography>
//                 <Typography variant="caption" color="textSecondary">
//                   {metrics?.summary?.farmersAffected || 0} affected
//                 </Typography>
//               </Box>
//             </Box>
//           </Paper>
//         </Grid>

//         <Grid item xs={12} sm={6} md={3}>
//           <Paper sx={{ p: 2, bgcolor: '#FFF3E0' }}>
//             <Box display="flex" alignItems="center">
//               <PestIcon sx={{ fontSize: 40, color: '#E65100', mr: 2 }} />
//               <Box>
//                 <Typography color="textSecondary" variant="body2">
//                   Active Incidents
//                 </Typography>
//                 <Typography variant="h4">
//                   {metrics?.summary?.activeIncidents || 0}
//                 </Typography>
//                 <Typography variant="caption" color="textSecondary">
//                   {metrics?.summary?.totalIncidents || 0} total
//                 </Typography>
//               </Box>
//             </Box>
//           </Paper>
//         </Grid>

//         <Grid item xs={12} sm={6} md={3}>
//           <Paper sx={{ p: 2, bgcolor: '#E1F5FE' }}>
//             <Box display="flex" alignItems="center">
//               <AdvisoryIcon sx={{ fontSize: 40, color: '#01579B', mr: 2 }} />
//               <Box>
//                 <Typography color="textSecondary" variant="body2">
//                   Active Advisories
//                 </Typography>
//                 <Typography variant="h4">
//                   {metrics?.summary?.activeAdvisories || 0}
//                 </Typography>
//                 <Box display="flex" alignItems="center">
//                   <Chip 
//                     size="small" 
//                     label="Live" 
//                     color="success" 
//                     sx={{ height: 20, fontSize: '0.7rem' }}
//                   />
//                 </Box>
//               </Box>
//             </Box>
//           </Paper>
//         </Grid>

//         <Grid item xs={12} sm={6} md={3}>
//           <Paper sx={{ p: 2, bgcolor: '#FCE4EC' }}>
//             <Box display="flex" alignItems="center">
//               <WarningIcon sx={{ fontSize: 40, color: '#C2185B', mr: 2 }} />
//               <Box>
//                 <Typography color="textSecondary" variant="body2">
//                   Health Score
//                 </Typography>
//                 <Typography variant="h4">
//                   {metrics?.healthScore || 100}%
//                 </Typography>
//                 <LinearProgress 
//                   variant="determinate" 
//                   value={metrics?.healthScore || 100} 
//                   color={metrics?.healthScore > 70 ? 'success' : metrics?.healthScore > 40 ? 'warning' : 'error'}
//                   sx={{ mt: 1, height: 8, borderRadius: 4 }}
//                 />
//               </Box>
//             </Box>
//           </Paper>
//         </Grid>
//       </Grid>

//       {/* Main Tabs */}
//       <Paper sx={{ width: '100%' }}>
//         <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
//           <Tab label="Overview" icon={<AgricultureIcon />} iconPosition="start" />
//           <Tab label="Disease Outbreaks" icon={<PestIcon />} iconPosition="start" />
//           <Tab label="Crop Health" icon={<CropIcon />} iconPosition="start" />
//           <Tab label="Disasters" icon={<FireIcon />} iconPosition="start" />
//           <Tab label="Advisories" icon={<AdvisoryIcon />} iconPosition="start" />
//           <Tab label="Resources" icon={<TimelineIcon />} iconPosition="start" />
//         </Tabs>

//         {/* Overview Tab */}
//         <TabPanel value={tabValue} index={0}>
//           <Grid container spacing={3}>
//             {/* Incident Map */}
//             <Grid item xs={12} lg={8}>
//               <Paper sx={{ p: 2, height: 500 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Incident Map
//                 </Typography>
//                 <IncidentMap
//                   incidents={incidents}
//                   department="agricultural"
//                   height={400}
//                   onIncidentClick={(incident) => console.log('Clicked:', incident)}
//                 />
//               </Paper>
//             </Grid>

//             {/* Severity Distribution */}
//             <Grid item xs={12} lg={4}>
//               <Paper sx={{ p: 2, height: 500 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Incidents by Severity
//                 </Typography>
//                 <ResponsiveContainer width="100%" height={400}>
//                   <PieChart>
//                     <Pie
//                       data={Object.entries(metrics?.incidents?.bySeverity || {}).map(([key, value]) => ({
//                         name: key,
//                         value
//                       }))}
//                       cx="50%"
//                       cy="50%"
//                       labelLine={false}
//                       label={(entry) => `${entry.name}: ${entry.value}`}
//                       outerRadius={130}
//                       fill="#8884d8"
//                       dataKey="value"
//                     >
//                       {Object.entries(metrics?.incidents?.bySeverity || {}).map((entry, index) => (
//                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                       ))}
//                     </Pie>
//                     <Tooltip />
//                   </PieChart>
//                 </ResponsiveContainer>
//               </Paper>
//             </Grid>

//             {/* Disease Trends */}
//             <Grid item xs={12} md={6}>
//               <Paper sx={{ p: 2 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Disease Outbreak Trends
//                 </Typography>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <LineChart data={metrics?.trends?.daily || []}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="date" />
//                     <YAxis />
//                     <Tooltip />
//                     <Legend />
//                     <Line type="monotone" dataKey="count" stroke="#8884d8" />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </Paper>
//             </Grid>

//             {/* Top Diseases */}
//             <Grid item xs={12} md={6}>
//               <Paper sx={{ p: 2 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Top Diseases
//                 </Typography>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <BarChart data={metrics?.topDiseases || []}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="diseaseName" />
//                     <YAxis />
//                     <Tooltip />
//                     <Bar dataKey="count" fill="#8884d8" />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </Paper>
//             </Grid>

//             {/* Alerts */}
//             <Grid item xs={12}>
//               <Paper sx={{ p: 2 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Active Alerts
//                 </Typography>
//                 {metrics?.alerts?.length > 0 ? (
//                   <Grid container spacing={2}>
//                     {metrics.alerts.map((alert, index) => (
//                       <Grid item xs={12} key={index}>
//                         <Alert 
//                           severity={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info'}
//                         >
//                           <Typography variant="subtitle2">{alert.title}</Typography>
//                           <Typography variant="body2">{alert.description}</Typography>
//                           <Typography variant="caption">
//                             {new Date(alert.timestamp).toLocaleString()}
//                           </Typography>
//                         </Alert>
//                       </Grid>
//                     ))}
//                   </Grid>
//                 ) : (
//                   <Typography color="textSecondary">No active alerts</Typography>
//                 )}
//               </Paper>
//             </Grid>
//           </Grid>
//         </TabPanel>

//         {/* Disease Outbreaks Tab */}
//         <TabPanel value={tabValue} index={1}>
//           <Grid container spacing={3}>
//             <Grid item xs={12}>
//               <Paper sx={{ p: 2 }}>
//                 <Typography variant="h6" gutterBottom>
//                   Recent Disease Outbreaks
//                 </Typography>
//                 <Grid container spacing={2}>
//                   {incidents
//                     .filter(i => i.type === 'crop_disease')
//                     .map((incident, index) => (
//                       <Grid item xs={12} md={6} lg={4} key={index}>
//                         <Card>
//                           <CardContent>
//                             <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
//                               <Typography variant="h6">{incident.diseaseName}</Typography>
//                               <Chip 
//                                 label={incident.severity} 
//                                 color={
//                                   incident.severity === 'critical' || incident.severity === 'epidemic' 
//                                     ? 'error' 
//                                     : incident.severity === 'high' 
//                                     ? 'warning' 
//                                     : 'info'
//                                 }
//                                 size="small"
//                               />
//                             </Box>
//                             <Typography color="textSecondary" gutterBottom>
//                               Crop: {incident.cropType}
//                             </Typography>
//                             <Typography variant="body2">
//                               Farmer: {incident.farmerName}
//                             </Typography>
//                             <Typography variant="body2">
//                               Location: {incident.location}
//                             </Typography>
//                             <Typography variant="body2">
//                               Affected Area: {incident.affectedArea} hectares
//                             </Typography>
//                             <Typography variant="caption" color="textSecondary">
//                               Reported: {new Date(incident.createdAt).toLocaleDateString()}
//                             </Typography>
//                             <Box mt={1}>
//                               <Button size="small" variant="outlined" color="primary">
//                                 View Details
//                               </Button>
//                             </Box>
//                           </CardContent>
//                         </Card>
//                       </Grid>
//                     ))}
//                 </Grid>
//               </Paper>
//             </Grid>
//           </Grid>
//         </TabPanel>

//         {/* Advisories Tab */}
//         <TabPanel value={tabValue} index={4}>
//           <Grid container spacing={3}>
//             {advisories.map((advisory, index) => (
//               <Grid item xs={12} md={6} lg={4} key={index}>
//                 <Card>
//                   <CardContent>
//                     <Box display="flex" justifyContent="space-between" alignItems="center">
//                       <Typography variant="h6">{advisory.title}</Typography>
//                       <Chip 
//                         label={advisory.priority} 
//                         color={advisory.priority === 'high' ? 'error' : advisory.priority === 'medium' ? 'warning' : 'success'}
//                         size="small"
//                       />
//                     </Box>
//                     <Typography color="textSecondary" gutterBottom>
//                       {advisory.targetCrop} • {advisory.season}
//                     </Typography>
//                     <Typography variant="body2" paragraph>
//                       {advisory.content.substring(0, 150)}...
//                     </Typography>
//                     <Box display="flex" justifyContent="space-between" alignItems="center">
//                       <Typography variant="caption" color="textSecondary">
//                         Valid: {new Date(advisory.validFrom).toLocaleDateString()} - {new Date(advisory.validTo).toLocaleDateString()}
//                       </Typography>
//                       <Button size="small" color="primary">
//                         Read More
//                       </Button>
//                     </Box>
//                   </CardContent>
//                 </Card>
//               </Grid>
//             ))}
//           </Grid>
//         </TabPanel>
//       </Paper>

//       {/* Create Advisory Dialog */}
//       <Dialog open={advisoryDialogOpen} onClose={() => setAdvisoryDialogOpen(false)} maxWidth="md" fullWidth>
//         <DialogTitle>Create Agricultural Advisory</DialogTitle>
//         <DialogContent>
//           <Grid container spacing={2} sx={{ mt: 1 }}>
//             <Grid item xs={12}>
//               <TextField
//                 fullWidth
//                 label="Title"
//                 variant="outlined"
//               />
//             </Grid>
//             <Grid item xs={12} md={6}>
//               <TextField
//                 select
//                 fullWidth
//                 label="Target Crop"
//                 variant="outlined"
//                 SelectProps={{ native: true }}
//               >
//                 <option value="">All Crops</option>
//                 <option value="maize">Maize</option>
//                 <option value="wheat">Wheat</option>
//                 <option value="soybeans">Soybeans</option>
//                 <option value="cotton">Cotton</option>
//                 <option value="vegetables">Vegetables</option>
//                 <option value="fruits">Fruits</option>
//               </TextField>
//             </Grid>
//             <Grid item xs={12} md={6}>
//               <TextField
//                 select
//                 fullWidth
//                 label="Season"
//                 variant="outlined"
//                 SelectProps={{ native: true }}
//               >
//                 <option value="planting">Planting</option>
//                 <option value="growing">Growing</option>
//                 <option value="harvesting">Harvesting</option>
//               </TextField>
//             </Grid>
//             <Grid item xs={12} md={6}>
//               <TextField
//                 select
//                 fullWidth
//                 label="Priority"
//                 variant="outlined"
//                 SelectProps={{ native: true }}
//               >
//                 <option value="low">Low</option>
//                 <option value="medium">Medium</option>
//                 <option value="high">High</option>
//               </TextField>
//             </Grid>
//             <Grid item xs={12} md={6}>
//               <TextField
//                 select
//                 fullWidth
//                 label="Region"
//                 variant="outlined"
//                 SelectProps={{ native: true }}
//               >
//                 <option value="">All Regions</option>
//                 <option value="Northern">Northern</option>
//                 <option value="Central">Central</option>
//                 <option value="Southern">Southern</option>
//               </TextField>
//             </Grid>
//             <Grid item xs={12} md={6}>
//               <TextField
//                 fullWidth
//                 label="Valid From"
//                 type="date"
//                 variant="outlined"
//                 InputLabelProps={{ shrink: true }}
//               />
//             </Grid>
//             <Grid item xs={12} md={6}>
//               <TextField
//                 fullWidth
//                 label="Valid To"
//                 type="date"
//                 variant="outlined"
//                 InputLabelProps={{ shrink: true }}
//               />
//             </Grid>
//             <Grid item xs={12}>
//               <TextField
//                 fullWidth
//                 label="Content"
//                 variant="outlined"
//                 multiline
//                 rows={6}
//                 placeholder="Write advisory content here..."
//               />
//             </Grid>
//           </Grid>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setAdvisoryDialogOpen(false)}>Cancel</Button>
//           <Button variant="contained" color="primary">
//             Publish Advisory
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Box>
//   );
// };