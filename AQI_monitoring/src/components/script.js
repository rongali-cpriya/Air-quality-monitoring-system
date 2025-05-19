document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsContainer = document.getElementById('suggestions');
    const statusMessage = document.getElementById('statusMessage');

    let stationData = []; // Array to hold {name, address} objects
    let selectedIndex = -1;

    // Function to load and parse CSV data
    async function loadStationData() {
        try {
            const response = await fetch('available_stations_all.csv');

            if (!response.ok) {
                throw new Error(`Failed to load CSV: ${response.status}`);

                // If the fetch fails in this demo, we'll use sample data
                stationData = await getStationData();
                statusMessage.textContent = 'Using sample data (CSV could not be loaded)';
                return;
            }

            const csvText = await response.text();

            const lines = csvText.split('\n');
            const headers = lines[0].split(',');
            const stationNameIndex = headers.findIndex(h =>
                h.toLowerCase().trim() === 'station_name'
            );
            const stationIdIndex = headers.findIndex(h =>
                h.toLowerCase().trim() === 'station_id'
            );


            if (stationNameIndex === -1) {
                throw new Error('Column "station_name" not found in CSV');
            }

            // Extract station data: name and entire address
            stationData = lines.slice(1)
                .map(line => {
                    const columns = line.split(',');
                    const stationName = columns[stationNameIndex]?.trim();
                    //Construct the full address from all columns to the right of station name
                    let fullAddress = "";

                    if (stationNameIndex > -1 && stationNameIndex < columns.length) {
                        fullAddress = columns.slice(stationNameIndex).join(",").trim();
                    }
                    else {
                        return null; // skip the row if station name doesn't exist
                    }

                    return {
                        name: stationName,
                        address: fullAddress
                    };

                })
                .filter(item => item != null && item.address && item.address.length > 0);


            statusMessage.textContent = `${stationData.length} stations loaded successfully`;
        } catch (error) {
            console.error('Error loading station data:', error);
            statusMessage.textContent = 'Error loading station data. Using sample data instead.';

            // Fallback to sample data
            stationData = await getStationData();
        }
    }

    // Generate sample station data for demo/fallback purposes

    async function getStationData() {
    try {
        const response = await fetch('available_stations.csv');

        if (!response.ok) {
            throw new Error(`Failed to load CSV: ${response.status}`);
        }

        const csvText = await response.text();
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const stationNameIndex = headers.findIndex(h =>
            h.toLowerCase().trim() === 'station_name'
        );

        const stationIdIndex = headers.findIndex(h =>
            h.toLowerCase().trim() === 'station_id'
        );


        if (stationNameIndex === -1) {
            throw new Error('Column "station_name" not found in CSV');
        }

        // Extract station data: name and entire address
        const data = lines.slice(1)
            .map(line => {
                const columns = line.split(',');
                const stationName = columns[stationNameIndex]?.trim().replace(/^"(.*)"$/, '$1'); // Remove quotes
                return {
                    name: stationName,
                    address: stationName
                };
            })
            .filter(item => item != null && item.address && item.address.length > 0);

        return data;

    } catch (error) {
        console.error('Error loading station data:', error);
        return [
            { name: "Dr. Karni Singh Shooting Range", address: "Dr. Karni Singh Shooting Range, Delhi, Delhi, India" },
            { name: "Delhi Institute of Tool Engineering", address: "Delhi Institute of Tool Engineering, Wazirpur, Delhi, Delhi, India" }
        ]; // Return a fallback if loading fails.  Important to prevent breakage
    }
}


    // Function to get suggestions based on input
    function getSuggestions(input) {
        if (!input) return [];

        const inputLower = input.toLowerCase();

        // Find matches (case-insensitive) using the full address
        return stationData
            .filter(item => item.address.toLowerCase().includes(inputLower))
            .sort((a, b) => {
                // Prioritize addresses that start with the input
                const aStartsWith = a.address.toLowerCase().startsWith(inputLower);
                const bStartsWith = b.address.toLowerCase().startsWith(inputLower);

                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;

                // Secondary sort by string length (shorter addresses first)
                return a.address.length - b.address.length;
            })
            .slice(0, 10); // Limit to 10 suggestions
    }

    // Function to display suggestions
    function showSuggestions(suggestions) {
        // Clear previous suggestions
        suggestionsContainer.innerHTML = '';

        if (suggestions.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        // Add new suggestions
        suggestions.forEach((suggestion, index) => {
            const div = document.createElement('div');
            div.textContent = suggestion.address; // Use the full address as the suggestion text
            div.className = 'suggestion-item';
            div.dataset.index = index;

            // Highlight the matching text in the address
            const inputValue = searchInput.value.toLowerCase();
            if (inputValue) {
                const addressLower = suggestion.address.toLowerCase();
                const startIndex = addressLower.indexOf(inputValue);

                if (startIndex !== -1) {
                    const beforeMatch = suggestion.address.substring(0, startIndex);
                    const match = suggestion.address.substring(startIndex, startIndex + inputValue.length);
                    const afterMatch = suggestion.address.substring(startIndex + inputValue.length);

                    div.innerHTML = `${beforeMatch}<strong>${match}</strong>${afterMatch}`;
                }
            }

            div.addEventListener('click', () => {
                searchInput.value = suggestion.address; // Set the input value to the full address
                suggestionsContainer.style.display = 'none';
                statusMessage.textContent = `Selected: ${suggestion.address}`;
            });

            suggestionsContainer.appendChild(div);
        });

        suggestionsContainer.style.display = 'block';
    }

    // Input event handler
    searchInput.addEventListener('input', () => {
        const value = searchInput.value;
        const suggestions = getSuggestions(value);
        showSuggestions(suggestions);
        selectedIndex = -1;
    });

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        const items = suggestionsContainer.querySelectorAll('.suggestion-item');

        if (items.length === 0) return;

        // Arrow down
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateHighlight();
        }
        // Arrow up
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
            updateHighlight();
        }
        // Enter
        else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            searchInput.value = items[selectedIndex].textContent;
            suggestionsContainer.style.display = 'none';
            statusMessage.textContent = `Selected: ${searchInput.value}`;
        }

        function updateHighlight() {
            items.forEach((item, i) => {
                if (i === selectedIndex) {
                    item.classList.add('highlighted');
                } else {
                    item.classList.remove('highlighted');
                }
            });
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Focus back on input when clicking on the container
    searchInput.addEventListener('focus', () => {
        const value = searchInput.value;
        if (value) {
            const suggestions = getSuggestions(value);
            showSuggestions(suggestions);
        }
    });

    // Load the station data when the page loads
    loadStationData();
});
