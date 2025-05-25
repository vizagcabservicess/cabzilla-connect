import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const DisputeManager: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5">Dispute Management</Typography>
      <Alert severity="info" sx={{ mt: 2 }}>
        Dispute management coming soon.
      </Alert>
    </Box>
  );
};

export default DisputeManager; 