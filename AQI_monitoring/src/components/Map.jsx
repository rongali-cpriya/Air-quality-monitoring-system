import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchStations } from "../services/database";
import SearchComponent from "./SearchComponent";
import "./Map.css";

// Fix missing marker icons in Leaflet (Vite/Webpack issue)
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Function to determine AQI color
const getAQIColor = (aqi) => {
  if (aqi === "N/A") return "#A0A0A0"; // Grey for missing data
  const aqiValue = parseInt(aqi, 10);
  if (aqiValue <= 50) return "#009966"; // Green (Good)
  if (aqiValue <= 100) return "#FFDE33"; // Yellow (Moderate)
  if (aqiValue <= 150) return "#FF9933"; // Orange (Unhealthy for Sensitive Groups)
  if (aqiValue <= 200) return "#CC0033"; // Red (Unhealthy)
  if (aqiValue <= 300) return "#660099"; // Purple (Very Unhealthy)
  return "#7E0023"; // Maroon (Hazardous)
};

// Create popup content function with prediction button
const createPopupContent = (station, onShowPrediction) => {
  const { station_name, aqi, co, no2, so2, o3, pm25, pm10, station_id } = station;
  const aqiColor = getAQIColor(aqi);

  return `
    <div class="aqi-popup">
      <h3>${station_name}</h3>
      <p>
        <strong>Air Quality Index:</strong>
        <span class="aqi-value" style="background-color:${aqiColor}; color:${parseInt(aqi, 10) > 150 ? 'white' : 'black'}">
          ${aqi}
        </span>
      </p>
      <div class="pollutants">
        <div class="pollutant-item">
          <span class="pollutant-label">CO</span>
          <span>${co}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">NO₂</span>
          <span>${no2}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">SO₂</span>
          <span>${so2}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">O₃</span>
          <span>${o3}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">PM2.5</span>
          <span>${pm25}</span>
        </div>
        <div class="pollutant-item">
          <span class="pollutant-label">PM10</span>
          <span>${pm10}</span>
        </div>
      </div>
      <button class="show-prediction-btn" data-station='${JSON.stringify({ station_id })}'>Show 48h Prediction</button>
    </div>
  `;
};

// SVG Line Chart Component
const SVGLineChart = ({ data, pollutantName, pollutantColor, width, height, onToggleFullscreen }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const svgRef = useRef(null);

  // Filter out any null values
  const validData = data.filter(point => point.value !== null);

  // Early return if no valid data
  if (validData.length === 0) {
    return (
      <div className="no-data-message">
        No prediction data available for {pollutantName}
      </div>
    );
  }

  // Calculate chart dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find min/max values for scaling
  const minValue = Math.min(...validData.map(d => d.value));
  const maxValue = Math.max(...validData.map(d => d.value));

  // Add some padding to y-axis
  const yMin = Math.max(0, minValue - (maxValue - minValue) * 0.1);
  const yMax = maxValue + (maxValue - minValue) * 0.1;

  // Scale functions
  const xScale = (index) => (index / (validData.length - 1)) * chartWidth;
  const yScale = (value) => chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

  // Generate path for the line
  const generateLinePath = () => {
    return validData.map((point, i) => {
      const x = xScale(i) + padding.left;
      const y = yScale(point.value) + padding.top;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Generate area under the line (for fill)
  const generateAreaPath = () => {
    let path = validData.map((point, i) => {
      const x = xScale(i) + padding.left;
      const y = yScale(point.value) + padding.top;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Add points to close the path at the bottom
    const lastIndex = validData.length - 1;
    path += ` L ${xScale(lastIndex) + padding.left} ${chartHeight + padding.top}`;
    path += ` L ${padding.left} ${chartHeight + padding.top}`;
    path += ' Z';

    return path;
  };

  // Handle mouse move to show tooltip
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left - padding.left;

    // Find closest point
    const xPos = mouseX / chartWidth;
    const index = Math.min(
      Math.max(Math.round(xPos * (validData.length - 1)), 0),
      validData.length - 1
    );

    setHoveredPoint({
      index,
      x: xScale(index) + padding.left,
      y: yScale(validData[index].value) + padding.top,
      label: validData[index].label,
      value: validData[index].value
    });
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Generate tick marks for x-axis (time)
  const xTicks = [];
  const xTickCount = 6;
  for (let i = 0; i < xTickCount; i++) {
    const index = Math.floor((i / (xTickCount - 1)) * (validData.length - 1));
    const x = xScale(index) + padding.left;
    xTicks.push(
      <g key={`x-tick-${i}`} className="chart-tick">
        <line
          x1={x}
          y1={chartHeight + padding.top}
          x2={x}
          y2={chartHeight + padding.top + 5}
          stroke="#ccc"
        />
        <text
          x={x}
          y={chartHeight + padding.top + 15}
          textAnchor="middle"
          fontSize="10"
          fill="#666"
        >
          {validData[index].label}
        </text>
      </g>
    );
  }

  // Generate tick marks for y-axis (values)
  const yTicks = [];
  const yTickCount = 5;
  for (let i = 0; i < yTickCount; i++) {
    const value = yMin + (i / (yTickCount - 1)) * (yMax - yMin);
    const y = yScale(value) + padding.top;
    yTicks.push(
      <g key={`y-tick-${i}`} className="chart-tick">
        <line
          x1={padding.left - 5}
          y1={y}
          x2={padding.left}
          y2={y}
          stroke="#ccc"
        />
        <text
          x={padding.left - 8}
          y={y + 4}
          textAnchor="end"
          fontSize="10"
          fill="#666"
        >
          {value.toFixed(1)}
        </text>
        <line
          x1={padding.left}
          y1={y}
          x2={width - padding.right}
          y2={y}
          stroke={i === 0 ? "#ccc" : "#eee"}
          strokeDasharray={i === 0 ? "none" : "2,2"}
          strokeWidth={i === 0 ? 1 : 0.5}
        />
      </g>
    );
  }

  // Generate data points
  const dataPoints = validData.map((point, i) => {
    const x = xScale(i) + padding.left;
    const y = yScale(point.value) + padding.top;
    return (
      <circle
        key={`point-${i}`}
        cx={x}
        cy={y}
        r={i === hoveredPoint?.index ? 4 : 2.5}
        fill="white"
        stroke={pollutantColor}
        strokeWidth="2"
        className="data-point"
      />
    );
  });

  return (
    <div className="svg-chart-container">
      <div className="chart-title">{pollutantName}</div>
      {onToggleFullscreen && (
        <button
          className="chart-fullscreen-btn"
          onClick={() => onToggleFullscreen(pollutantName)}
          title="View fullscreen"
        >
          ⤢
        </button>
      )}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        ref={svgRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="svg-chart"
      >
        {/* Chart Area */}
        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="#f9f9f9"
          stroke="#eee"
        />

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={chartHeight + padding.top}
          stroke="#ccc"
        />

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={chartHeight + padding.top}
          x2={width - padding.right}
          y2={chartHeight + padding.top}
          stroke="#ccc"
        />

        {/* Grid lines and ticks */}
        {yTicks}
        {xTicks}

        {/* Area under line */}
        <path
          d={generateAreaPath()}
          fill={`${pollutantColor}20`}
        />

        {/* Line path */}
        <path
          d={generateLinePath()}
          fill="none"
          stroke={pollutantColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {dataPoints}

        {/* Hover indicator */}
        {hoveredPoint && (
          <>
            {/* Vertical line at hovered position */}
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={chartHeight + padding.top}
              stroke="#999"
              strokeWidth="1"
              strokeDasharray="4,4"
            />

            {/* Enhanced highlight for the point */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="6"
              fill="rgba(255,255,255,0.7)"
              stroke={pollutantColor}
              strokeWidth="2"
            />

            {/* Tooltip */}
            <g transform={`translate(${
              hoveredPoint.x > chartWidth / 2 + padding.left
                ? hoveredPoint.x - 80
                : hoveredPoint.x + 10
            }, ${
              hoveredPoint.y > chartHeight / 2 + padding.top
                ? hoveredPoint.y - 45
                : hoveredPoint.y + 10
            })`}>
              <rect
                x="0"
                y="0"
                width="80"
                height="40"
                rx="4"
                ry="4"
                fill="white"
                stroke="#ddd"
              />
              <text x="40" y="15" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#333">
                {hoveredPoint.label}
              </text>
              <text x="40" y="30" textAnchor="middle" fontSize="12" fill={pollutantColor}>
                {hoveredPoint.value}
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
};

const Map = () => {
  const [stations, setStations] = useState([]);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [randomFact, setRandomFact] = useState(""); // State for random fact
  const [isLoading, setIsLoading] = useState(true); // State for loading status
  const [showPrediction, setShowPrediction] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [isPredictionExpanded, setIsPredictionExpanded] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const predictionCardRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [indianStationIds, setIndianStationIds] = useState(new Set());

  // Define pollutant colors
  const pollutantColors = {
    co: "#ff6384",
    no2: "#36a2eb",
    so2: "#ffcd56",
    o3: "#4bc0c0",
    pm25: "#9966ff",
    pm10: "#ff9f40",
    aqi: "#64b5f6"
  };

  // Pollutant display names
  const pollutantNames = {
    co: "Carbon Monoxide (CO)",
    no2: "Nitrogen Dioxide (NO₂)",
    so2: "Sulfur Dioxide (SO₂)",
    o3: "Ozone (O₃)",
    pm25: "PM2.5",
    pm10: "PM10",
    aqi: "Air Quality Index (AQI)"
  };

  // Fetch random fact when component mounts
  useEffect(() => {
    async function fetchRandomFact() {
      try {
        const response = await fetch("http://localhost:8000/random_fact");
        const data = await response.json();
        setRandomFact(data.fact);
      } catch (error) {
        console.error("Error fetching random fact:", error);
        setRandomFact("Air pollution affects millions worldwide."); // Fallback fact
      }
    }
    fetchRandomFact();
  }, []);

  // Fetch Indian station IDs
  useEffect(() => {
    async function fetchIndianStationIds() {
      try {
        const response = await fetch("/available_stations_India.csv");
        const text = await response.text();
        const lines = text.split("\n");
        // Assuming the header is on the first line and the station_id is in the first column
        const ids = new Set(lines.slice(1)  // Skip the header line
          .map(line => line.split(",")[0])  // Get the first column (station_id)
          .filter(id => id) // Filter out empty strings
        );

        setIndianStationIds(ids);

      } catch (error) {
        console.error("Error fetching or parsing CSV:", error);
        setIndianStationIds(new Set()); // Initialize with an empty set to avoid errors later
      }
    }

    fetchIndianStationIds();
  }, []);

  // Set up listener for prediction button clicks (using event delegation)
  useEffect(() => {
    if (!map) return;

    const handlePredictionClick = (e) => {
      if (e.target && e.target.classList.contains('show-prediction-btn')) {
        const stationData = JSON.parse(e.target.getAttribute('data-station'));
        handleShowPrediction(stationData.station_id); //Pass only the station_id
      }
    };

    map.getContainer().addEventListener('click', handlePredictionClick);

    return () => {
      map.getContainer().removeEventListener('click', handlePredictionClick);
    };
  }, [map, indianStationIds]);

  // Fetch stations and manage loading state
  useEffect(() => {
    async function loadStations() {
      setIsLoading(true); // Start loading
      try {
        const data = await fetchStations();
        console.log("Stations received in Map:", data);
        console.log("Stations without station_id:", data.filter(s => !s.station_id).length);
        setStations(data);
      } catch (error) {
        console.error("Error fetching stations:", error);
      } finally {
        setIsLoading(false); // End loading
      }
    }
    loadStations();
  }, []);

  // Initialize map
  useEffect(() => {
    const newMap = L.map("map").setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(newMap);
    setMap(newMap);
    return () => newMap.remove();
  }, []);

  // Add markers when stations or map changes
  useEffect(() => {
    if (!map) return;

    // Clear old markers
    markers.forEach((marker) => map.removeLayer(marker));
    const newMarkers = [];

    stations.forEach(
      ({ latitude, longitude, station_name, aqi, co, no2, so2, o3, pm25, pm10, station_id }) => {
        if (!latitude || !longitude) return;

        // Create station object with all data
        const station = {
          station_id, latitude, longitude, station_name, aqi,
          co, no2, so2, o3, pm25, pm10
        };

        // Outer Ring (Sky Blue)
        const outerRing = L.circleMarker([latitude, longitude], {
          color: "#87CEEB",
          fillOpacity: 0,
          radius: 6,
          weight: 2,
        }).addTo(map);

        // Inner Dot (Dark Blue)
        const innerDot = L.circleMarker([latitude, longitude], {
          color: "#00008B",
          fillColor: "#00008B",
          fillOpacity: 1,
          radius: 2,
        }).addTo(map);

        // Hover effect: Show AQI with color
        const aqiColor = getAQIColor(aqi);
        innerDot.bindTooltip(
          `<div style="color: ${aqiColor}; font-weight: bold;">AQI: ${aqi}</div>`,
          {
            direction: "top",
            offset: [0, -10],
            className: "aqi-tooltip",
          }
        );

        // Click effect: Popup with animation
        innerDot.bindPopup(createPopupContent(station), {
          className: "custom-popup",
          offset: [0, -10],
        });

        newMarkers.push(outerRing, innerDot);
      }
    );

    setMarkers(newMarkers);
  }, [stations, map, indianStationIds]);

  // Function to handle showing prediction
  const handleShowPrediction = async (stationId) => {
    // Check if the station ID is in the allowed set
    if (!indianStationIds.has(String(stationId))) {
      console.warn(`Station ID ${stationId} is not in the allowed list. Skipping prediction fetch.`);
      alert("Prediction data not available for this station.");  // Or display a message
      return;
    }

    const station = stations.find(s => s.station_id === stationId)
    setSelectedStation(station);
    setShowPrediction(true);
    setIsPredictionLoading(true);
    // Reset position when opening a new prediction
    setCardPosition({ x: 0, y: 0 });

    try {
      // Fetch prediction data from backend

      const response = await fetch(`http://localhost:8002/predictions/${stationId}`);
      const data = await response.json();

      // Map the data into the format required by the SVG Line Chart
      const formatPredictionData = (predictedValues) => {
        if (!predictedValues) return [];

        const timeLabels = [];
        const now = new Date();

        // Generate 48 hourly timestamps
        for (let i = 0; i < 48; i++) {
          const time = new Date(now.getTime() + i * 60 * 60 * 1000);
          timeLabels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }

        return predictedValues.map((value, index) => ({
          label: timeLabels[index],
          value: value === null ? null : parseFloat(value)  // Handle null values
        }));
      };

      // Structure prediction data
      const formattedPredictionData = {
        co: formatPredictionData(data.co_predicted),
        no2: formatPredictionData(data.no2_predicted),
        so2: formatPredictionData(data.so2_predicted),
        o3: formatPredictionData(data.ozone_predicted),
        pm25: formatPredictionData(data.pm25_predicted),
        pm10: formatPredictionData(data.pm10_predicted),
        aqi: formatPredictionData(data.aqi_predicted)
      };
      setPredictionData(formattedPredictionData);


      // Small delay to simulate loading
      setTimeout(() => {
        setIsPredictionLoading(false);
      }, 800);
    } catch (error) {
      console.error("Error fetching prediction data:", error);
      setIsPredictionLoading(false);
    }
  };

  const togglePredictionSize = () => {
    setIsPredictionExpanded(!isPredictionExpanded);
    // Reset position when toggling size
    setCardPosition({ x: 0, y: 0 });
  };


  // Handle search & zoom to station
  const handleSearch = async (selectedStation) => {
      console.log("Zooming to:", selectedStation.latitude, selectedStation.longitude);
      if (!map) return;
  
      try {
        const response = await fetch(`http://localhost:8000/station/${selectedStation.id}`);
        const data = await response.json();
  
        if (!data.latitude || !data.longitude) {
          console.error("No latitude/longitude found for station.");
          return;
        }
  
        // Smooth zoom to selected station
        map.flyTo([data.latitude, data.longitude], 12, {
          animate: true,
          duration: 1.5,
        });
  
        // Show popup with animation
        L.popup({
          className: "custom-popup",
          offset: [0, -10],
        })
          .setLatLng([data.latitude, data.longitude])
          .setContent(createPopupContent(data))
          .openOn(map);
      } catch (error) {
        console.error("Error fetching station details:", error);
      }
    };
  
  // Close prediction card
  const handleClosePrediction = () => {
    setShowPrediction(false);
    setSelectedStation(null);
    setPredictionData(null);
    setActiveTab("all");
    setIsPredictionExpanded(false);
  };

  // Draggable card functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-prediction-btn') ||
      e.target.closest('.close-prediction-btn') ||
      e.target.closest('.tab-button') ||
      e.target.closest('.chart-fullscreen-btn')) {
      return;
    }

    setIsDragging(true);
    const { clientX, clientY } = e;
    dragStartRef.current = {
      x: clientX - cardPosition.x,
      y: clientY - cardPosition.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const { clientX, clientY } = e;
    const newX = clientX - dragStartRef.current.x;
    const newY = clientY - dragStartRef.current.y;

    setCardPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for drag functionality
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Render tab buttons for prediction view
  const renderTabButtons = () => {
    const tabs = [
      { id: "all", label: "All Pollutants" },
      { id: "aqi", label: "AQI" },
      { id: "co", label: "CO" },
      { id: "no2", label: "NO₂" },
      { id: "so2", label: "SO₂" },
      { id: "o3", label: "O₃" },
      { id: "pm25", label: "PM2.5" },
      { id: "pm10", label: "PM10" }
    ];

    return (
      <div className="prediction-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const handleChartFullscreen = (chartName) => {
    setActiveTab(Object.keys(pollutantNames).find(key => pollutantNames[key] === chartName) || "all");
    setIsPredictionExpanded(true);
  };

  // Render appropriate charts based on active tab
  const renderCharts = () => {
    if (!predictionData) return null;

    if (activeTab === "all") {
      // Show a grid of all pollutant charts
      return (
        <div className="charts-grid">
          {Object.keys(predictionData).map(pollutant => (
            <SVGLineChart
              key={pollutant}
              data={predictionData[pollutant]}
              pollutantName={pollutantNames[pollutant]}
              pollutantColor={pollutantColors[pollutant]}
              width={270}
              height={180}
              onToggleFullscreen={handleChartFullscreen}
            />
          ))}
        </div>
      );
    } else {
      // Show single selected pollutant
      return (
        <div className="single-chart">
          <SVGLineChart
            data={predictionData[activeTab]}
            pollutantName={pollutantNames[activeTab]}
            pollutantColor={pollutantColors[activeTab]}
            width={550}
            height={300}
          />
        </div>
      );
    }
  };

  return (
    <div className="map-page">
      <SearchComponent onSearch={handleSearch} />
      <div className="map-container">
        {isLoading && (
          <div className="loading-screen">
            <div className="loading-content">
              <div className="dot-loader">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
              <div className="random-fact">
                <p>Did you know?</p>
                <p>{randomFact || "Fetching a fun fact..."}</p>
              </div>
            </div>
          </div>
        )}
        <div id="map"></div>

        {/* Prediction Card */}
        {showPrediction && (
          <div
            className={`prediction-card ${isPredictionExpanded ? 'expanded' : ''} ${isDragging ? 'dragging' : ''}`}
            ref={predictionCardRef}
            style={isPredictionExpanded ? {} : {
              transform: `translate(${cardPosition.x}px, ${cardPosition.y}px)`
            }}
          >
            <div
              className="prediction-header"
              onMouseDown={!isPredictionExpanded ? handleMouseDown : undefined}
            >
              <h3>{selectedStation?.station_name} - 48 Hour Forecast</h3>
              <div className="prediction-controls">
                <button
                  className="resize-prediction-btn"
                  onClick={togglePredictionSize}
                  title={isPredictionExpanded ? "Minimize" : "Maximize"}
                >
                  {isPredictionExpanded ? '⊟' : '⊞'}
                </button>
                <button
                  className="close-prediction-btn"
                  onClick={handleClosePrediction}
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {isPredictionLoading ? (
              <div className="prediction-loading">
                <div className="dot-loader">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
                <p>Loading prediction data...</p>
              </div>
            ) : (
              <div className="prediction-content">
                <p className="prediction-info">
                  Displaying predicted pollution levels for the next 48 hours
                </p>

                {/* Tab navigation */}
                {renderTabButtons()}

                {/* Charts section */}
                <div className="charts-container">
                  {renderCharts()}
                </div>

                <div className="prediction-footer">
                  <p className="prediction-note">
                    <i>Note: Predictions are based on historical data and weather patterns</i>
                  </p>
                </div>
              </div>
            )}

            {/* Helper text when dragging */}
            {isDragging && !isPredictionExpanded && (
              <div className="drag-helper">
                <div className="drag-icon">↖️</div>
                <p>Dragging prediction card</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;