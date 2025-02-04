// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;
"use strict";

class AirQualityWidget {
    constructor() {
        this.widget = new ListWidget();
        this.widget.setPadding(12, 12, 12, 12);
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
        
        // Header - Compact layout
        const headerStack = this.widget.addStack();
        headerStack.layoutVertically();
        headerStack.spacing = 2;

        const qualityLabel = headerStack.addText("AIR QUALITY");
        qualityLabel.font = Font.mediumSystemFont(8);
        qualityLabel.textColor = new Color(text);

        const statusText = headerStack.addText(this.stationData.us_title_en);
        statusText.font = Font.semiboldSystemFont(12);
        statusText.textColor = new Color(text);

        this.widget.addSpacer(4);

        // PM2.5 Value - Main focus
        const pm25Stack = this.widget.addStack();
        pm25Stack.layoutVertically();
        pm25Stack.spacing = 0;
        
        const pm25Label = pm25Stack.addText("PM 2.5");
        pm25Label.font = Font.mediumSystemFont(8);
        pm25Label.textColor = new Color(text);
        
        const pm25Text = pm25Stack.addText(`${this.stationData.pm25} &micro;g/m&sup3;`);
        pm25Text.font = Font.boldSystemFont(24);
        pm25Text.textColor = new Color(text);

        this.widget.addSpacer(4);

        // Station info - Compact
        const infoStack = this.widget.addStack();
        infoStack.layoutVertically();
        infoStack.spacing = 2;

        const locationName = this.stationData.dustboy_name_en;
        const truncatedLocation = locationName.length > 25 
            ? locationName.substring(0, 25) + '...' 
            : locationName;

        const locationText = infoStack.addText(truncatedLocation);
        locationText.font = Font.mediumSystemFont(9);
        locationText.textColor = new Color(text);
        locationText.lineLimit = 1;

        const distanceText = infoStack.addText(
            `${parseFloat(this.stationData.distance).toFixed(1)} km away`
        );
        distanceText.font = Font.systemFont(8);
        distanceText.textColor = new Color(text, 0.8);

        const timeText = infoStack.addText(
            `Updated ${new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })}`
        );
        timeText.font = Font.systemFont(8);
        timeText.textColor = new Color(text, 0.8);

        // Signature - Minimal
        this.widget.addSpacer(2);
        const signature = this.widget.addText("@ingpawat");
        signature.font = Font.systemFont(6);
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