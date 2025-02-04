// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;
"use strict";

/**
 * Air Quality Widget
 * Created by @ingpawat
 * A widget to display PM2.5 and AQI data from nearby air quality stations
 * Using CMUCCDC API
 */

class AirQualityWidget {
    constructor() {
        this.widget = new ListWidget();
        this.widget.setPadding(16, 16, 16, 16);
        this.widget.url = "https://pm2_5.nrct.go.th/";
        this.setupBackground();
    }

    setupBackground() {
        const gradient = new LinearGradient();
        gradient.locations = [0, 1];
        gradient.colors = [
            new Color("#FFFFFF", 0.95),
            new Color("#F5F5F5", 0.95)
        ];
        this.widget.backgroundGradient = gradient;
    }

    async initialize() {
        await this.setLocation();
        this.stationData = await this.fetchPMData();
        await this.createWidget();
        return this.widget;
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

    async createWidget() {
        this.addLocationHeader();
        this.widget.addSpacer(12);
        this.addMetricsDisplay();
        this.widget.addSpacer(12);
        this.addStatusIndicator();
        this.addSignature();
    }

    addLocationHeader() {
        const headerStack = this.widget.addStack();
        headerStack.layoutVertically();
        headerStack.spacing = 4;

        const locationStack = headerStack.addStack();
        locationStack.layoutHorizontally();
        locationStack.centerAlignContent();

        const locationSymbol = locationStack.addText("📍");
        locationSymbol.font = Font.mediumSystemFont(10);

        locationStack.addSpacer(4);

        const stationName = locationStack.addText(this.stationData.dustboy_name_en);
        stationName.font = Font.semiboldSystemFont(12);
        stationName.minimumScaleFactor = 0.7;
        stationName.lineLimit = 1;
        stationName.textColor = new Color("#000000", 0.9);

        const distanceText = headerStack.addText(
            `${parseFloat(this.stationData.distance).toFixed(1)} kilometers away`
        );
        distanceText.font = Font.systemFont(10);
        distanceText.textColor = new Color("#666666", 0.8);
    }

    addMetricsDisplay() {
        const metricsStack = this.widget.addStack();
        metricsStack.layoutHorizontally();
        metricsStack.centerAlignContent();
        metricsStack.spacing = 24;

        this.createMetricStack(
            metricsStack,
            "PM2.5",
            this.stationData.pm25.toString(),
            this.stationData.us_aqi
        );

        this.createMetricStack(
            metricsStack,
            "US AQI",
            this.stationData.us_aqi,
            this.stationData.us_aqi
        );
    }

    createMetricStack(parentStack, label, value, aqiValue) {
        const stack = parentStack.addStack();
        stack.layoutVertically();
        stack.spacing = 2;
        stack.centerAlignContent();

        const labelText = stack.addText(label);
        labelText.font = Font.mediumSystemFont(11);
        labelText.textColor = new Color("#666666", 0.8);
        labelText.centerAlignText();

        const valueText = stack.addText(value);
        valueText.font = Font.boldMonospacedSystemFont(32);
        valueText.textColor = new Color('#' + this.getAQIColor(aqiValue));
        valueText.centerAlignText();

        return stack;
    }

    addStatusIndicator() {
        const statusStack = this.widget.addStack();
        statusStack.layoutHorizontally();
        statusStack.centerAlignContent();

        const statusDot = statusStack.addText("●");
        statusDot.font = Font.boldSystemFont(8);
        statusDot.textColor = new Color('#' + this.getAQIColor(this.stationData.us_aqi));

        statusStack.addSpacer(4);

        const statusText = statusStack.addText(this.stationData.us_title_en);
        statusText.font = Font.mediumSystemFont(12);
        statusText.textColor = new Color("#000000", 0.8);
    }

    addSignature() {
        this.widget.addSpacer(6);
        const signature = this.widget.addText("@ingpawat");
        signature.font = Font.systemFont(8);
        signature.textColor = new Color("#666666", 0.5);
        signature.centerAlignText();
    }

    async fetchPMData() {
        const url = `https://www-old.cmuccdc.org/api2/dustboy/near/${this.latitude}/${this.longitude}`;
        const req = new Request(url);
        const apiResult = await req.loadJSON();
        return apiResult[0];
    }

    getAQIColor(value) {
        value = parseInt(value);
        if (value <= 50) return "3EC562";  // Good
        if (value <= 100) return "FDD74B"; // Moderate
        if (value <= 150) return "FB9B57"; // Unhealthy for Sensitive Groups
        if (value <= 200) return "F65E5E"; // Unhealthy
        if (value <= 300) return "A070B6"; // Very Unhealthy
        return "7D1A1A";                   // Hazardous
    }
}

// Widget initialization
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