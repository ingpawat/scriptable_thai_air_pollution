// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;
// V3
"use strict";

/**
 * Widget class for displaying air quality data.
 */
class AirQualityWidget {
  /**
   * Static color scheme for air quality categories.
   */
  static colorScheme = {
    "Very Unhealthy": { 
      bg: "#8B0000",  // Dark Red
      text: "#FFFFFF", 
      threshold: 75.1 
    },
    "Unhealthy": { 
      bg: "#FF4500",  // Intense Red-Orange
      text: "#FFFFFF", 
      threshold: 37.6 
    },
    "Unhealthy for Sensitive Groups": { 
      bg: "#FFA500",  // Orange
      text: "#000000", 
      threshold: 25.1 
    },
    "Moderate": { 
      bg: "#A6CE39",  // Light Green
      text: "#000000", 
      threshold: 15.1 
    },
    "Good": { 
      bg: "#66B32D",  // Green
      text: "#FFFFFF", 
      threshold: 0 
    }
  };

  /**
   * Pre-sorted thresholds for quick lookup.
   */
  static sortedThresholds = Object.entries(AirQualityWidget.colorScheme)
    .sort((a, b) => b[1].threshold - a[1].threshold);

  /**
   * Default configuration options for the widget.
   */
  static defaultConfig = {
    padding: 12,
    updateInterval: 30, // minutes
    fallbackLocation: {
      latitude: 7.1897,
      longitude: 100.5954,
    },
    symbols: {
      location: "pin",
      logo: "light.min",
    },
    cacheVersion: 1,
    maxRetries: 3,
    retryDelay: 5000, // milliseconds
    cacheKey: "AirQualityWidgetData",
    pm25ApiUrl: "https://www-old.cmuccdc.org/api2/dustboy/near",
    signatureText: "Made by @ingpawat",
    signatureColor: "#666666",
    signatureOpacity: 0.7,
    headerText: "THAILAND AIR QUALITY 🇹🇭",
  };

  constructor(config = {}) {
    this.widget = new ListWidget();
    this.config = { ...AirQualityWidget.defaultConfig, ...config };

    this.widget.setPadding(
      this.config.padding,
      this.config.padding,
      this.config.padding,
      this.config.padding
    );

    this.widget.url = "https://pm2_5.nrct.go.th/pmhours";

    this.colors = AirQualityWidget.colorScheme;
    this.cacheExpiry = 60 * this.config.updateInterval * 1000;
  }

  /**
   * Determines the air quality status based on PM2.5 levels.
   * @param {number} pm25 - PM2.5 value to evaluate.
   * @returns {string} - Air quality status category.
   */
  getAirQualityStatus(pm25) {
    for (const [status, data] of AirQualityWidget.sortedThresholds) {
      if (parseFloat(pm25) >= data.threshold) {
        return status;
      }
    }
    return "Very Good"; // Default if no threshold is met
  }

  /**
   * Retrieves color scheme for a given PM2.5 level.
   * @param {number} pm25 - PM2.5 value to evaluate.
   * @returns {object} - Color scheme object with background and text colors.
   */
  getColors(pm25) {
    const status = this.getAirQualityStatus(pm25);
    return this.colors[status] || this.colors.Moderate;
  }

  /**
   * Sets up the widget's background gradient based on PM2.5 level.
   * @param {number} pm25 - PM2.5 value to evaluate.
   */
  setupBackground(pm25) {
    const { bg } = this.getColors(pm25);
    const gradient = new LinearGradient();
    gradient.locations = [0, 1];
    gradient.colors = [new Color(bg, 1), new Color(bg, 0.8)];
    this.widget.backgroundGradient = gradient;
  }

  /**
   * Initializes and returns the widget.
   * @returns {Promise<ListWidget>} - Configured widget instance.
   */
  async initialize() {
    try {
      await this.setLocation();
      this.stationData = await this.fetchPMDataWithCache();
      this.setupBackground(this.stationData.pm25);
      await this.createWidget();
      return this.widget;
    } catch (error) {
      console.error("Widget initialization failed:", error);
      return this.createErrorWidget(error);
    }
  }

  /**
   * Sets the widget's location using device location or fallback.
   * @returns {Promise<void>} - Promise that resolves when location is set.
   */
  async setLocation() {
    Location.setAccuracyToHundredMeters();
    try {
      const location = await Location.current();
      this.latitude = location.latitude;
      this.longitude = location.longitude;
    } catch (error) {
      console.log("Using fallback location:", error);
      this.latitude = this.config.fallbackLocation.latitude;
      this.longitude = this.config.fallbackLocation.longitude;
    }
  }

  /**
   * Creates an error widget with details about the error.
   * @param {Error} error - Error object to display.
   * @returns {ListWidget} - Error widget instance.
   */
  createErrorWidget(error) {
    const errorWidget = new ListWidget();
    errorWidget.backgroundColor = new Color("#FF0000", 0.3);
    errorWidget.addText("Error loading widget").font = Font.boldSystemFont(12);
    errorWidget.addText(error.message).font = Font.systemFont(10);
    return errorWidget;
  }

  /**
   * Fetches PM2.5 data with caching support.
   * @returns {Promise<object>} - Fetched PM2.5 data.
   */
  async fetchPMDataWithCache() {
    const cache = this.loadFromCache();
    if (cache) return cache;

    const data = await this.fetchPMData();
    this.saveToCache(data);
    return data;
  }

  /**
   * Loads cached data if available and not expired.
   * @returns {object|null} - Cached data or null if not available.
   */
  loadFromCache() {
    try {
      const cached = Keychain.get(this.config.cacheKey);
      if (!cached) return null;

      const { timestamp, data, cacheVersion } = JSON.parse(cached);
      if (cacheVersion !== this.config.cacheVersion || Date.now() - timestamp > this.cacheExpiry) {
        return null;
      }

      return data;
    } catch (error) {
      console.log("Cache read error:", error);
      return null;
    }
  }

  /**
   * Saves data to cache with an expiration timestamp.
   * @param {object} data - Data to cache.
   */
  saveToCache(data) {
    try {
      const cache = {
        timestamp: Date.now(),
        data,
        cacheVersion: this.config.cacheVersion
      };
      Keychain.set(this.config.cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.log("Cache write error:", error);
    }
  }

  /**
   * Creates and configures the widget's UI.
   * @returns {Promise<void>} - Promise that resolves when widget is created.
   */
  async createWidget() {
    const { text } = this.getColors(this.stationData.pm25);

    // Header Section
    this.createHeaderSection(text);

    // PM2.5 Value Section
    this.createPM25Section(text);

    // Station Information Section
    this.createStationInformationSection(text);

    // Signature
    this.createSignature();
  }

  /**
   * Creates the header section of the widget.
   * @param {string} textColor - Text color for the header.
   */
  createHeaderSection(textColor) {
    const headerStack = this.widget.addStack();
    headerStack.layoutVertically();
    headerStack.spacing = 3;

    const titleStack = headerStack.addStack();
    titleStack.centerAlignContent();
    titleStack.spacing = 4;

    const qualityLabel = titleStack.addText(this.config.headerText);
    qualityLabel.font = Font.mediumSystemFont(8);
    qualityLabel.textColor = new Color(textColor);

    const statusText = headerStack.addText(
      this.getAirQualityStatus(this.stationData.pm25)
    );
    statusText.font = Font.semiboldSystemFont(12);
    statusText.textColor = new Color(textColor);
  }

  /**
   * Creates the PM2.5 value section of the widget.
   * @param {string} textColor - Text color for the section.
   */
  createPM25Section(textColor) {
    const pm25Stack = this.widget.addStack();
    pm25Stack.layoutVertically();
    pm25Stack.spacing = 0;

    const pm25Label = pm25Stack.addText("PM 2.5");
    pm25Label.font = Font.mediumSystemFont(8);
    pm25Label.textColor = new Color(textColor);

    const pm25Value = Math.round(this.stationData.pm25 * 10) / 10;
    const pm25Text = pm25Stack.addText(`${pm25Value} μg/m³`);
    pm25Text.font = Font.boldSystemFont(24);
    pm25Text.textColor = new Color(textColor);
  }

  /**
   * Creates the station information section of the widget.
   * @param {string} textColor - Text color for the section.
   */
  createStationInformationSection(textColor) {
    const infoStack = this.widget.addStack();
    infoStack.layoutVertically();
    infoStack.spacing = 2;

    const locationStack = infoStack.addStack();
    locationStack.centerAlignContent();
    locationStack.spacing = 4;

    const locationSymbol = SFSymbol.named(this.config.symbols.location);
    const locationIcon = locationStack.addImage(locationSymbol.image);
    locationIcon.imageSize = new Size(12, 12);
    locationIcon.tintColor = new Color(textColor);

    const locationName = this.stationData.dustboy_name_en;
    const truncatedLocation =
      locationName.length > 25
        ? locationName.substring(0, 25) + "..."
        : locationName;

    const locationText = locationStack.addText(truncatedLocation);
    locationText.font = Font.mediumSystemFont(9);
    locationText.textColor = new Color(textColor);
    locationText.lineLimit = 1;

    const distanceText = infoStack.addText(
      `${parseFloat(this.stationData.distance).toFixed(1)} km away`
    );
    distanceText.font = Font.systemFont(8);
    distanceText.textColor = new Color(textColor, 0.8);

    const timeText = infoStack.addText(
      `Updated ${new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}`
    );
    timeText.font = Font.systemFont(8);
    timeText.textColor = new Color(textColor, 0.8);
  }

  /**
   * Creates the widget's signature.
   */
  createSignature() {
    this.widget.addSpacer(2);
    const signature = this.widget.addText(this.config.signatureText);
    signature.font = Font.systemFont(6);
    signature.textColor = new Color(this.config.signatureColor, this.config.signatureOpacity);
    signature.centerAlignText();
  }

  /**
   * Fetches PM data from the API with retry logic.
   * @returns {Promise<object>} - PM data from the API.
   */
  async fetchPMData() {
    const { maxRetries, retryDelay, pm25ApiUrl } = this.config;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const url = `${pm25ApiUrl}/${this.latitude}/${this.longitude}`;
        const req = new Request(url);
        req.timeoutInterval = 10;

        const apiResult = await req.loadJSON();
        if (!apiResult || !apiResult[0]) {
          throw new Error("No data received from API");
        }
        return apiResult[0];
      } catch (error) {
        retries++;
        console.error(`Attempt ${retries} failed: ${error.message}`);
        if (retries === maxRetries) {
          throw new Error(`Failed to fetch PM data after ${maxRetries} attempts: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
}

// Widget initialization
async function runWidget() {
  const widget = new AirQualityWidget({
    padding: 12,
    updateInterval: 30,
  });

  const finalWidget = await widget.initialize();

  if (!config.runsInWidget) {
    await finalWidget.presentSmall();
  }

  Script.setWidget(finalWidget);
  Script.complete();
}

await runWidget();