// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;
"use strict";

class AirQualityWidget {
    constructor() {
        this.widget = new ListWidget();
        this.widget.setPadding(16, 16, 16, 16);
        this.widget.url = "https://pm2_5.nrct.go.th/";
        this.colors = {
            Hazardous: { bg: '#4C1036', text: '#FFFFFF' },
            'Very Unhealthy': { bg: '#8F3F97', text: '#FFFFFF' },
            Unhealthy: { bg: '#ED3D3D', text: '#FFFFFF' },
            Moderate: { bg: '#F7D84B', text: '#000000' },
            Good: { bg: '#3EC562', text: '#000000' }
        };
    }

    getColors(status) {
        return this.colors[status] || this.colors.Moderate;
    }

    setupBackground(status) {
        const { bg } = this.getColors(status);
        const gradient = new LinearGradient();
        gradient.locations = [0, 1];
        gradient.colors = [
            new Color(bg, 1),
            new Color(bg, 0.8)
        ];
        this.widget.backgroundGradient = gradient;
    }

    async initialize() {
        await this.setLocation();
        this.stationData = await this.fetchPMData();
        this.setupBackground(this.stationData.us_title_en);
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
            this.latitude = 14.990677499999999;
            this.longitude = 100.47800949999998;
        }
    }

    async createWidget() {
        const { text } = this.getColors(this.stationData.us_title_en);
        
        // Header
        const headerStack = this.widget.addStack();
        headerStack.layoutHorizontally();
        headerStack.centerAlignContent();

        const titleStack = headerStack.addStack();
        titleStack.layoutVertically();
        
        const qualityLabel = titleStack.addText("AIR QUALITY");
        qualityLabel.font = Font.mediumSystemFont(10);
        qualityLabel.textColor = new Color(text);

        const statusText = titleStack.addText(this.stationData.us_title_en);
        statusText.font = Font.semiboldSystemFont(14);
        statusText.textColor = new Color(text);

        this.widget.addSpacer(8);

        // PM2.5 Value
        const pm25Stack = this.widget.addStack();
        pm25Stack.layoutVertically();
        
        const pm25Label = pm25Stack.addText("PM 2.5");
        pm25Label.font = Font.mediumSystemFont(10);
        pm25Label.textColor = new Color(text);
        
        const pm25Text = pm25Stack.addText(`${this.stationData.pm25} μg/m³`);
        pm25Text.font = Font.boldSystemFont(32);
        pm25Text.textColor = new Color(text);

        this.widget.addSpacer(8);

        // Station Distance
        const distanceStack = this.widget.addStack();
        distanceStack.layoutVertically();
        distanceStack.spacing = 4;

        const locationText = distanceStack.addText(this.stationData.dustboy_name_en);
        locationText.font = Font.mediumSystemFont(12);
        locationText.textColor = new Color(text);

        const distanceText = distanceStack.addText(
            `Station Distance: ${parseFloat(this.stationData.distance).toFixed(1)} km`
        );
        distanceText.font = Font.systemFont(10);
        distanceText.textColor = new Color(text, 0.8);

        const timeText = distanceStack.addText(
            `Updated ${new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })}`
        );
        timeText.font = Font.systemFont(10);
        timeText.textColor = new Color(text, 0.8);

        // Signature
        this.widget.addSpacer(6);
        const signature = this.widget.addText("Made by @ingpawat");
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