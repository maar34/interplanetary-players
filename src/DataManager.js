/**
 * @file DataManager.js
 * @description Manages data fetching, caching, and placeholder configuration for track information.
 * @version 1.0.0
 * @author 𝐵𝓇𝓊𝓃𝒶 𝒢𝓊𝒶𝓇𝓃𝒾𝑒𝓇𝒾 
 * @license MIT
 * @date 2024-12-07
 */

import { Constants } from './Constants.js';

/**
 * Class representing a data manager for handling track data and UI placeholders.
 */
export class DataManager {
    /**
     * Creates an instance of DataManager.
     */
    constructor() {
        // Set cache expiry time from constants or default to 10 minutes
        this.cacheExpiryMinutes = Constants.CACHE_EXPIRY_MINUTES || 10; // Tiempo de expiración de caché
        // Initialize placeholder configuration as an empty object
        this.placeholderConfig = {}; // Inicializar configuración de placeholders como vacío
    }

    /**
     * Fetches track data and updates the placeholder configuration.
     * @param {string} trackId - The ID of the track to fetch data for.
     */
    async fetchAndUpdateConfig(trackId) {
        console.log(`[DataManager] Starting fetch and update for trackId: ${trackId}`);

        try {
            // Fetch track data from the server or cache
            await this.fetchTrackData(trackId);

            // Update the placeholder configuration based on fetched data
            this.updatePlaceholderConfig();
            console.log('[DataManager] PlaceholderConfig updated successfully:', this.placeholderConfig);
        } catch (error) {
            console.error(`[DataManager] Error fetching and updating config: ${error.message}`);
        }
    }

    /**
     * Updates the configuration for UI placeholders using the retrieved track data.
     */
    updatePlaceholderConfig() {
        if (!Constants.TRACK_DATA) {
            console.error("[DataManager] TRACK_DATA is not available for placeholder configuration.");
            return;
        }

        const { track, soundEngine, interplanetaryPlayer } = Constants.TRACK_DATA;

        // Configure placeholders for different sections: monitorInfo, trackInfo, etc.
        this.placeholderConfig = {
            monitorInfo: {
                placeholder_1: "Distance:",
                placeholder_2: "-",
                placeholder_3: soundEngine?.soundEngineParams?.xParam?.label || "Unknown",
                placeholder_4: "-",
                placeholder_5: soundEngine?.soundEngineParams?.yParam?.label || "Unknown",
                placeholder_6: "-",
                placeholder_7: soundEngine?.soundEngineParams?.zParam?.label || "Unknown",
                placeholder_8: "-",
                placeholder_9: "Orbit A",
                placeholder_10: "-",
                placeholder_11: "Orbit B",
                placeholder_12: "-",
                placeholder_13: "Orbit C",
                placeholder_14: "-",
            },
            trackInfo: {
                placeholder_1: "Artist:",
                placeholder_2: track?.artists || "Unknown Artist",
                placeholder_3: "Track name:",
                placeholder_4: track?.trackName || "Unknown Track",
                placeholder_5: "Release:",
                placeholder_6: track?.releaseDate ? new Date(track.releaseDate).toLocaleDateString("en-GB") : "Unknown Date",
                placeholder_7: "Tags:",
                placeholder_8: track?.tags || "No Tags",
                placeholder_9: "Plays count:",
                placeholder_10: track?.playsCount || "0",
                placeholder_11: "Shares:",
                placeholder_12: track?.shares || "0",
                placeholder_13: "Likes:",
                placeholder_14: track?.likes || "0",
            },
            interplanetaryPlayerInfo: {
                placeholder_1: "Scientific Name:",
                placeholder_2: interplanetaryPlayer?.sciName || "Unknown Name",
                placeholder_3: "Artistic Name:",
                placeholder_4: interplanetaryPlayer?.artName || "Unknown Name",
                placeholder_5: "Creator:",
                placeholder_6: interplanetaryPlayer?.owner || "Unknown Owner",
                placeholder_7: "3D Artist:",
                placeholder_8: interplanetaryPlayer?.dddArtist || "Unknown Artist",
                placeholder_9: "Orbital Period:",
                placeholder_10: interplanetaryPlayer?.orbitalPeriod || "Unknown Period",
                placeholder_11: "",
                placeholder_12: "",
                placeholder_13: "",
                placeholder_14: "",
            },
            soundEngineInfo: {
                placeholder_1: "Name:",
                placeholder_2: soundEngine?.soundEngineName || "Unknown Engine",
                placeholder_3: "Developer:",
                placeholder_4: soundEngine?.developerUsername || "Unknown Developer",
                placeholder_5: "Availability:",
                placeholder_6: soundEngine?.availability || "Private",
                placeholder_7: "Credits:",
                placeholder_8: soundEngine?.credits || "No Credits",
                placeholder_9: "",
                placeholder_10: "",
                placeholder_11: "",
                placeholder_12: "",
                placeholder_13: "",
                placeholder_14: "",
            },
        };

        console.log("[DataManager] PlaceholderConfig updated:", this.placeholderConfig);
    }

    /**
     * Populates the UI placeholders with the configured data.
     * @param {string} target - The type of information to populate (e.g., 'trackInfo').
     */
    populatePlaceholders(target) {
        if (!target || !this.placeholderConfig[target]) {
            console.error(`[DataManager] Invalid or no active information type provided: ${target}`);
            this.clearPlaceholders(); // Clear placeholders if configuration is missing
            return;
        }
        
        const config = this.placeholderConfig[target];
        Object.entries(config).forEach(([placeholderId, value]) => {
            const element = document.getElementById(placeholderId);
            if (element) {
                // If the value is a function, execute it to get the content
                const content = typeof value === 'function' ? value() : value;
                element.textContent = content;
            } else {
                console.warn(`[DataManager] Element with ID ${placeholderId} not found.`);
            }
        });
        
        // Optionally log the update (commented out to reduce console noise)
        // console.log(`[DataManager] Placeholders updated for target: ${target}`);
    }

    /**
     * Clears all UI placeholders by setting their text content to empty strings.
     */
    clearPlaceholders() {
        for (let i = 1; i <= 14; i++) {
            const element = document.getElementById(`placeholder_${i}`);
            if (element) {
                element.textContent = "";
            }
        }
    }

    /**
     * Fetches track data from the server or retrieves it from the cache if available.
     * @param {string} trackId - The ID of the track to fetch data for.
     * @returns {Promise<Object>} The track data.
     * @throws Will throw an error if the fetch fails or the data is invalid.
     */
    async fetchTrackData(trackId) {
        // Attempt to retrieve cached data
        const cachedData = Constants.getTrackData(trackId);
        if (cachedData) {
            console.log('[DataManager] Track data found in cache:', cachedData);
            return cachedData;
        }

        const BASE_URL = 'https://media.maar.world:443/api';
        try {
            // Fetch data from the server
            const response = await fetch(`${BASE_URL}/tracks/player/${trackId}`);
            if (!response.ok) {
                throw new Error(`[DataManager] Server error: ${response.statusText} (${response.status})`);
            }

            const result = await response.json();
            if (!result.success || !result.data) {
                throw new Error('[DataManager] Invalid track data from server.');
            }

            // Cache the retrieved data for future use
            Constants.setTrackData(trackId, result.data);
            return result.data;
        } catch (error) {
            console.error(`[DataManager] Failed to fetch track data: ${error.message}`);
            throw error;
        }
    }
}