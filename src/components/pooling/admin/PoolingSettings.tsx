import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const PoolingSettings: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5">Pooling Settings</Typography>
      <Alert severity="info" sx={{ mt: 2 }}>
        Settings management coming soon.
      </Alert>
    </Box>
  );
};

export default PoolingSettings; 