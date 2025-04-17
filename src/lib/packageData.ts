
function calculateDynamicPrice(
  vehicleType: string = 'sedan', 
  packageId: string = '8hrs-80km'
): number {
  // Normalize vehicle type to match multipliers
  const normalizedVehicleType = vehicleType.toLowerCase()
    .replace(/\s+/g, '_')
    .replace('crysta', 'crysta')
    .replace('hycross', 'hycross');
  
  // Determine the multiplier based on vehicle type (default to 1.0 if not found)
  const multiplier = vehicleMultipliers[normalizedVehicleType] || 1.0;
  
  // Base prices for different packages
  const baseValues = {
    '4hrs-40km': 1200,
    '8hrs-80km': 2000,
    '10hrs-100km': 2500
  };
  
  // Normalize package ID to match base values
  const normalizedPackageId = packageId
    .replace(/\d+hr-/, match => match.replace('hr-', 'hrs-'))
    .replace(/\d+hr_/, match => match.replace('hr_', 'hrs-'))
    .replace('_', '-');
  
  // Get base value for package (default to 2000 if not found)
  const baseValue = baseValues[normalizedPackageId as keyof typeof baseValues] || 2000;
  
  // Calculate and return the dynamic price
  return Math.round(baseValue * multiplier);
}
