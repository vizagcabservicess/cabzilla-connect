const BASE_URL = 'https://vizagup.com/api/admin';

export async function getVehicleData() {
    try {
        const response = await fetch(`${BASE_URL}/vehicles-data.php?includeInactive=false`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`Error fetching vehicle data: ${response.status} - ${response.statusText}`);
            throw new Error(`Failed to fetch vehicle data: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching vehicle data:', error);
        throw new Error('Unable to fetch vehicle data. Please check the API or network connection.');
    }
}