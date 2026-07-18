//  // src/components/dashboard/PoliceDashboard.tsx
// import React, { useState } from 'react';
// import {
//   Grid,
//   Paper,
//   Typography,
//   Tabs,
//   Tab,
//   Box,
//   Button,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   MenuItem
// } from '@mui/material';
// import { BaseDashboard } from './BaseDashboard';
// import { policeApi } from '../../services/api/policeApi';
// import { HeatmapLayer } from '../charts/HeatmapLayer';

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

// export const PoliceDashboard: React.FC = () => {
//   const [tabValue, setTabValue] = useState(0);
//   const [assignDialogOpen, setAssignDialogOpen] = useState(false);
//   const [selectedIncident, setSelectedIncident] = useState<any>(null);

//   const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
//     setTabValue(newValue);
//   };

//   const handleAssignIncident = async (incidentId: string, stationId: string, staffIds?: string[]) => {
//     try {
//       await policeApi.assignIncident(incidentId, { stationId, staffIds });
//       setAssignDialogOpen(false);
//       // Refresh data
//     } catch (error) {
//       console.error('Assignment failed:', error);
//     }
//   };

//   return (
//     <>
//       <BaseDashboard
//         department="police"
//         apiService={policeApi}
//         incidentTypes={['robbery', 'crime', 'accident', 'other']}
//         title="Police Department"
//       />

//       {/* Additional Police-Specific Tabs */}
//       <Paper sx={{ mt: 3 }}>
//         <Tabs value={tabValue} onChange={handleTabChange}>
//           <Tab label="Crime Heatmap" />
//           <Tab label="Staff Performance" />
//           <Tab label="Resource Allocation" />
//           <Tab label="Investigations" />
//         </Tabs>

//         <TabPanel value={tabValue} index={0}>
//           <Typography variant="h6" gutterBottom>
//             Crime Heatmap (Last 30 Days)
//           </Typography>
//           <Box sx={{ height: '600px' }}>
//             <HeatmapLayer
//               data={policeApi.getCrimeHeatmap}
//               colorScale={['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15']}
//             />
//           </Box>
//         </TabPanel>

//         <TabPanel value={tabValue} index={1}>
//           <Typography variant="h6" gutterBottom>
//             Staff Performance Metrics
//           </Typography>
//           <Grid container spacing={3}>
//             {/* Staff performance cards would go here */}
//           </Grid>
//         </TabPanel>

//         <TabPanel value={tabValue} index={2}>
//           <Typography variant="h6" gutterBottom>
//             Resource Allocation
//           </Typography>
//           {/* Resource allocation charts */}
//         </TabPanel>

//         <TabPanel value={tabValue} index={3}>
//           <Typography variant="h6" gutterBottom>
//             Active Investigations
//           </Typography>
//           {/* Investigations list */}
//         </TabPanel>
//       </Paper>

//       {/* Assignment Dialog */}
//       <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
//         <DialogTitle>Assign Incident #{selectedIncident?.id}</DialogTitle>
//         <DialogContent>
//           <TextField
//             select
//             fullWidth
//             label="Select Station"
//             margin="normal"
//             variant="outlined"
//           >
//             <MenuItem value="station1">Central Police Station</MenuItem>
//             <MenuItem value="station2">North District Station</MenuItem>
//             <MenuItem value="station3">South District Station</MenuItem>
//           </TextField>
//           <TextField
//             select
//             fullWidth
//             label="Assign Staff (Optional)"
//             margin="normal"
//             variant="outlined"
//             SelectProps={{ multiple: true }}
//           >
//             <MenuItem value="staff1">Officer John Kufa</MenuItem>
//             <MenuItem value="staff2">Sergeant Jane Kavu</MenuItem>
//             <MenuItem value="staff3">Inspector Mike Mhitsa</MenuItem>
//           </TextField>
//           <TextField
//             fullWidth
//             label="Assignment Notes"
//             margin="normal"
//             variant="outlined"
//             multiline
//             rows={3}
//           />
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
//           <Button variant="contained" color="primary">
//             Assign
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </>
//   );
// };
