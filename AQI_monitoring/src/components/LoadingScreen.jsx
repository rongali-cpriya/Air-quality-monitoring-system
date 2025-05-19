import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchStations } from "../services/database"; // Import API function
import "./LoadingScreen.css";

const LoadingScreen = () => {
  const [fact, setFact] = useState("Loading interesting fact...");
  const [stationsLoaded, setStationsLoaded] = useState(false);
  const [factDisplayComplete, setFactDisplayComplete] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFact = async () => {
      try {
        const response = await fetch("http://localhost:8000/random_fact");
        const data = await response.json();
        setFact(data.fact);
        
        // Simulate reading time for the fact (minimum 3 seconds)
        setTimeout(() => {
          setFactDisplayComplete(true);
        }, 3000);
      } catch (error) {
        setFact("Air pollution is a major environmental issue.");
        setFactDisplayComplete(true);
      }
    };

    const loadStations = async () => {
      try {
        // Start progress animation
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 5;
          if (progress > 90) {
            clearInterval(progressInterval);
          }
          setLoadingProgress(progress);
        }, 200);

        const data = await fetchStations();
        
        // Complete progress animation
        clearInterval(progressInterval);
        setLoadingProgress(100);
        
        if (data && Array.isArray(data)) {
          console.log(`Loaded ${data.length} stations successfully`);
          setStationsLoaded(true);
        } else {
          console.error("Failed to load stations: Invalid data format");
          // Even if it fails, we should set stationsLoaded to avoid getting stuck
          setStationsLoaded(true);
        }
      } catch (error) {
        console.error("Error loading stations:", error);
        // Even on error, we should eventually proceed
        setStationsLoaded(true);
        setLoadingProgress(100);
      }
    };

    fetchFact();
    loadStations();

    // Ensure the page doesn't transition until both conditions are met
    const transitionTimeout = setInterval(() => {
      if (stationsLoaded && factDisplayComplete) {
        clearInterval(transitionTimeout);
        navigate("/map");
      }
    }, 500); // Check every 500ms

    return () => clearInterval(transitionTimeout);
  }, [navigate, stationsLoaded, factDisplayComplete]);

  return (
    <div className="loading-screen">
      <div className="loading-spinner"></div>
      <p className="fact-text">{fact}</p>
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${loadingProgress}%` }}
        ></div>
      </div>
      <p className="loading-status">
        {!stationsLoaded ? "Loading air quality stations..." : "Ready!"}
      </p>
    </div>
  );
};

export default LoadingScreen;