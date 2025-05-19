import React, { useState, useEffect } from "react";
import "./SearchComponent.css";

const SearchComponent = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (query.length > 2) {
      const fetchSuggestions = async () => {
        try {
          const response = await fetch(`http://localhost:8000/search_stations?query=${query}`);
          const data = await response.json();
          setSuggestions(data);
        } catch (error) {
          console.error("Error fetching search suggestions:", error);
        }
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const handleSelect = (station) => {
    setQuery(station.name);
    setSuggestions([]); // Hide suggestions
    onSearch(station); // Send selected station object to Map
  };

  return (
    <div className="search-container">
      <input
        type="text"
        className="search-input"
        placeholder="Search station..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && suggestions.length > 0) {
            handleSelect(suggestions[0]); // Select first suggestion on Enter
          }
        }}
      />
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((station, index) => (
            <div
              key={index}
              className="suggestion-item"
              onClick={() => handleSelect(station)}
            >
              {station.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
