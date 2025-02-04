// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;
"use strict";

/**
 * Air Quality Widget
 * Combined implementation from PurpleAir and CMUCCDC APIs
 * Created by @ingpawat, modified from PurpleAir widget by Jason Snell and others
 */

// Configuration
const PURPLE_AIR_API_KEY = "your-purple-air-api-key";
const USE_PURPLE_AIR = true; // Set to false to use CMUCCDC API instead

class AirQualityWidget {
  constructor() {
    this.widget = new ListWidget();
    this.widget.setPadding(16, 16, 16, 16);
  }

  async initialize() {
    if (USE_PURPLE_AIR) {
      await this.initializePurpleAir();
    } else {
      await this.initializeCMUCCDC();
    }
    return this.widget;
  }

  async initializePurpleAir() {
    try {
      if (
        !PURPLE_AIR_API_KEY ||
        PURPLE_AIR_API_KEY === "your-purple-air-api-key"
      ) {
        throw "Please set your PurpleAir API key";
      }

      const sensorId = await this.getNearestPurpleAirSensor();
      const data = await this.getPurpleAirData(sensorId);
      const epaPM = this.computeEPAPM(data);
      const aqi = this.calculateAQI(epaPM);
      const level = this.calculateAQILevel(aqi);

      await this.createPurpleAirWidget(data, aqi, level);
    } catch (error) {
      this.createErrorWidget(error);
    }
  }

  async initializeCMUCCDC() {
    try {
      await this.setLocation();
      const data = await this.fetchCMUCCDCData();
      await this.createCMUCCDCWidget(data);
    } catch (error) {
      this.createErrorWidget(error);
    }
  }

  async setLocation() {
    Location.setAccuracyToHundredMeters();
    try {
      const location = await Location.current();
      this.latitude = location.latitude;
      this.longitude = location.longitude;
    } catch (error) {
      // Fallback coordinates
      this.latitude = 14.990677499999999;
      this.longitude = 100.47800949999998;
      console.log("Using fallback location");
    }
  }

  async getNearestPurpleAirSensor() {
    await this.setLocation();
    const BOUND_OFFSET = 0.2;
    const nwLat = this.latitude + BOUND_OFFSET;
    const seLat = this.latitude - BOUND_OFFSET;
    const nwLng = this.longitude - BOUND_OFFSET;
    const seLng = this.longitude + BOUND_OFFSET;

    const req = new Request(
      `https://api.purpleair.com/v1/sensors?fields=name,latitude,longitude&max_age=3600&location_type=0&nwlat=${nwLat}&selat=${seLat}&nwlng=${nwLng}&selng=${seLng}`
    );
    req.headers = { "X-API-Key": PURPLE_AIR_API_KEY };

    const res = await req.loadJSON();
    return this.findClosestSensor(res.data);
  }

  findClosestSensor(sensors) {
    let closestSensor;
    let closestDistance = Infinity;

    for (const sensor of sensors) {
      const distance = this.calculateDistance(
        { latitude: this.latitude, longitude: this.longitude },
        { latitude: sensor[2], longitude: sensor[3] }
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSensor = sensor;
      }
    }

    return closestSensor[0];
  }

  calculateDistance(start, end) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(end.latitude - start.latitude);
    const dLon = this.toRadians(end.longitude - start.longitude);
    const lat1 = this.toRadians(start.latitude);
    const lat2 = this.toRadians(end.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  async getPurpleAirData(sensorId) {
    const req = new Request(`https://api.purpleair.com/v1/sensors/${sensorId}`);
    req.headers = { "X-API-Key": PURPLE_AIR_API_KEY };
    const json = await req.loadJSON();

    return {
      val: json.sensor,
      adj: json.sensor["pm2.5_cf_1"],
      ts: json.sensor.last_seen,
      hum: json.sensor.humidity,
      loc: json.sensor.name,
      lat: json.sensor.latitude,
      lon: json.sensor.longitude,
    };
  }

  async fetchCMUCCDCData() {
    const url = `https://www-old.cmuccdc.org/api2/dustboy/near/${this.latitude}/${this.longitude}`;
    const req = new Request(url);
    const apiResult = await req.loadJSON();
    return apiResult[0];
  }

  computeEPAPM(data) {
    const pm25 = Number.parseInt(data.adj, 10);
    const hum = Number.parseInt(data.hum, 10);

    if (pm25 < 30) {
      return 0.524 * pm25 - 0.0862 * hum + 5.75;
    } else if (pm25 < 50) {
      return (
        (0.786 * (pm25 / 20 - 3 / 2) + 0.524 * (1 - (pm25 / 20 - 3 / 2))) *
          pm25 -
        0.0862 * hum +
        5.75
      );
    } else if (pm25 < 210) {
      return 0.786 * pm25 - 0.0862 * hum + 5.75;
    } else if (pm25 < 260) {
      return (
        (0.69 * (pm25 / 50 - 21 / 5) + 0.786 * (1 - (pm25 / 50 - 21 / 5))) *
          pm25 -
        0.0862 * hum * (1 - (pm25 / 50 - 21 / 5)) +
        2.966 * (pm25 / 50 - 21 / 5) +
        5.75 * (1 - (pm25 / 50 - 21 / 5)) +
        8.84 * 10 ** -4 * pm25 ** 2 * (pm25 / 50 - 21 / 5)
      );
    } else {
      return 2.966 + 0.69 * pm25 + 8.84 * 10 ** -4 * pm25 ** 2;
    }
  }

  calculateAQI(pm) {
    if (pm > 350.5) return this.calculateAQIValue(pm, 500, 401, 500, 350.5);
    if (pm > 250.5) return this.calculateAQIValue(pm, 400, 301, 350.4, 250.5);
    if (pm > 150.5) return this.calculateAQIValue(pm, 300, 201, 250.4, 150.5);
    if (pm > 55.5) return this.calculateAQIValue(pm, 200, 151, 150.4, 55.5);
    if (pm > 35.5) return this.calculateAQIValue(pm, 150, 101, 55.4, 35.5);
    if (pm > 12.1) return this.calculateAQIValue(pm, 100, 51, 35.4, 12.1);
    if (pm >= 0) return this.calculateAQIValue(pm, 50, 0, 12, 0);
    return "-";
  }

  calculateAQIValue(Cp, Ih, Il, BPh, BPl) {
    return Math.round(((Ih - Il) / (BPh - BPl)) * (Cp - BPl) + Il);
  }

  calculateAQILevel(aqi) {
    const level = Number(aqi) || 0;
    if (level > 300) return { label: "Hazardous", color: "7D1A1A" };
    if (level > 200) return { label: "Very Unhealthy", color: "A070B6" };
    if (level > 150) return { label: "Unhealthy", color: "F65E5E" };
    if (level > 100)
      return { label: "Unhealthy for Sensitive Groups", color: "FB9B57" };
    if (level > 50) return { label: "Moderate", color: "FDD74B" };
    return { label: "Good", color: "3EC562" };
  }

  async createPurpleAirWidget(data, aqi, level) {
    const gradient = new LinearGradient();
    gradient.colors = [
      new Color("#" + level.color, 0.95),
      new Color("#" + level.color, 0.75),
    ];
    gradient.locations = [0, 1];
    this.widget.backgroundGradient = gradient;

    // Header
    const headerStack = this.widget.addStack();
    headerStack.layoutVertically();

    const titleText = headerStack.addText("Air Quality");
    titleText.font = Font.boldSystemFont(12);
    titleText.textColor = Color.white();

    const locationText = headerStack.addText(data.loc);
    locationText.font = Font.regularSystemFont(10);
    locationText.textColor = Color.white();

    this.widget.addSpacer(12);

    // AQI Display
    const aqiStack = this.widget.addStack();
    aqiStack.layoutHorizontally();
    aqiStack.centerAlignContent();

    const aqiText = aqiStack.addText(aqi.toString());
    aqiText.font = Font.boldSystemFont(32);
    aqiText.textColor = Color.white();

    aqiStack.addSpacer(8);

    const levelStack = aqiStack.addStack();
    levelStack.layoutVertically();

    const levelText = levelStack.addText(level.label);
    levelText.font = Font.mediumSystemFont(12);
    levelText.textColor = Color.white();

    this.widget.addSpacer(8);

    // Updated time
    const updatedAt = new Date(data.ts * 1000).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const updateText = this.widget.addText(`Updated ${updatedAt}`);
    updateText.font = Font.regularSystemFont(8);
    updateText.textColor = new Color(Color.white(), 0.8);

    this.widget.url = `https://www.purpleair.com/map?opt=1/i/mAQI/a10/cC5#14/${data.lat}/${data.lon}`;
  }

  async createCMUCCDCWidget(data) {
    const gradient = new LinearGradient();
    gradient.colors = [new Color("#FFFFFF", 0.95), new Color("#F5F5F5", 0.95)];
    gradient.locations = [0, 1];
    this.widget.backgroundGradient = gradient;

    // Header with location
    const headerStack = this.widget.addStack();
    headerStack.layoutVertically();
    headerStack.spacing = 4;

    const locationStack = headerStack.addStack();
    locationStack.layoutHorizontally();
    locationStack.centerAlignContent();

    const locationSymbol = locationStack.addText("📍");
    locationSymbol.font = Font.mediumSystemFont(10);

    locationStack.addSpacer(4);

    const stationName = locationStack.addText(data.dustboy_name_en);
    stationName.font = Font.semiboldSystemFont(12);
    stationName.textColor = new Color("#000000", 0.9);

    const distanceText = headerStack.addText(
      `${parseFloat(data.distance).toFixed(1)} kilometers away`
    );
    distanceText.font = Font.systemFont(10);
    distanceText.textColor = new Color("#666666", 0.8);

    this.widget.addSpacer(12);

    // Metrics display
    const metricsStack = this.widget.addStack();
    metricsStack.layoutHorizontally();
    metricsStack.centerAlignContent();
    metricsStack.spacing = 24;

    this.createMetricStack(
      metricsStack,
      "PM2.5",
      data.pm25.toString(),
      data.us_aqi
    );
    this.createMetricStack(metricsStack, "US AQI", data.us_aqi, data.us_aqi);

    this.widget.addSpacer(12);

    // Status indicator
    const statusStack = this.widget.addStack();
    statusStack.layoutHorizontally();
    statusStack.centerAlignContent();

    const statusDot = statusStack.addText("●");
    statusDot.font = Font.boldSystemFont(8);
    statusDot.textColor = new Color(
      "#" + this.calculateAQILevel(data.us_aqi).color
    );

    statusStack.addSpacer(4);

    const statusText = statusStack.addText(data.us_title_en);
    statusText.font = Font.mediumSystemFont(12);
    statusText.textColor = new Color("#000000", 0.8);

    this.widget.url = "https://pm2_5.nrct.go.th/";
  }

  createErrorWidget(error) {
    this.widget.backgroundColor = new Color("999999");

    const header = this.widget.addText("Error");
    header.textColor = new Color("000000");
    header.font = Font.regularSystemFont(11);
    header.minimumScaleFactor = 0.5;

    this.widget.addSpacer(15);

    const errorMsg = this.widget.addText(
      error === 666 ? "Couldn't connect to the server." : `${error}`
    );
    errorMsg.textColor = new Color("000000");
    errorMsg.font = Font.semiboldSystemFont(15);
    errorMsg.minimumScaleFactor = 0.3;
  }
}

// Widget initialization and run
async function runWidget() {
  const widget = new AirQualityWidget();
  const finalWidget = await widget.initialize();

  if (!config.runsInWidget) {
    await finalWidget.presentSmall();
  }

  Script.setWidget(finalWidget);
  Script.complete();
}

await runWidget();
