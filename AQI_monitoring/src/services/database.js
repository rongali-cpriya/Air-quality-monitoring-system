const API_URL = "http://localhost:8000/stations"; // Adjust if running backend on a different port

export async function fetchStations() {
    try {
        const response = await fetch("http://localhost:8000/stations");
        const data = await response.json();
        console.log("Fetched Stations:", data);  // Debugging line
        return data;
    } catch (error) {
        console.error("Error fetching stations:", error);
        return [];
    }
}


