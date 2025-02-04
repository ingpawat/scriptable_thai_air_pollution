// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: leaf;
// V3
"use strict";

class AirQualityWidget {
    constructor(config = {}) {
        this.widget = new ListWidget();
        this.config = {
            padding: config.padding || 12,
            updateInterval: config.updateInterval || 30, // minutes
            fallbackLocation: {
                latitude: 7.1897,
                longitude: 100.5954
            },
            symbols: {
                location: "mappin.circle.fill",
                logo: "light.min"
            },
            ...config
        };

        this.widget.setPadding(
            this.config.padding,
            this.config.padding,
            this.config.padding,
            this.config.padding
        );
        
        this.widget.url = "https://pm2_5.nrct.go.th/";
        
        this.colors = {
            Hazardous: { bg: '#4C1036', text: '#FFFFFF', threshold: 300.5 },
            'Very Unhealthy': { bg: '#8F3F97', text: '#FFFFFF', threshold: 200.5 },
            Unhealthy: { bg: '#ED3D3D', text: '#FFFFFF', threshold: 150.5 },
            'Unhealthy for Sensitive Groups': { bg: '#FF7E00', text: '#000000', threshold: 100.5 },
            Moderate: { bg: '#F7D84B', text: '#000000', threshold: 50.5 },
            Good: { bg: '#3EC562', text: '#000000', threshold: 0 }
        };

        this.cacheKey = 'AirQualityWidgetData';
        this.cacheExpiry = 60 * this.config.updateInterval * 1000;
    }

    getAirQualityStatus(pm25) {
        const thresholds = Object.entries(this.colors)
            .sort((a, b) => b[1].threshold - a[1].threshold);
        
        for (const [status, data] of thresholds) {
            if (pm25 >= data.threshold) return status;
        }
        return 'Good';
    }

    getColors(pm25) {
        const status = this.getAirQualityStatus(pm25);
        return this.colors[status] || this.colors.Moderate;
    }

    setupBackground(pm25) {
        const { bg } = this.getColors(pm25);
        const gradient = new LinearGradient();
        gradient.locations = [0, 1];
        gradient.colors = [
            new Color(bg, 1),
            new Color(bg, 0.8)
        ];
        this.widget.backgroundGradient = gradient;
    }

    async initialize() {
        try {
            await this.setLocation();
            this.stationData = await this.fetchPMDataWithCache();
            this.setupBackground(this.stationData.pm25);
            await this.createWidget();
            return this.widget;
        } catch (error) {
            return this.createErrorWidget(error);
        }
    }

    async setLocation() {
        Location.setAccuracyToHundredMeters();
        try {
            const location = await Location.current();
            this.latitude = location.latitude;
            this.longitude = location.longitude;
        } catch (error) {
            console.log('Using fallback location:', error);
            this.latitude = this.config.fallbackLocation.latitude;
            this.longitude = this.config.fallbackLocation.longitude;
        }
    }

    createErrorWidget(error) {
        const errorWidget = new ListWidget();
        errorWidget.backgroundColor = new Color("#FF0000", 0.3);
        errorWidget.addText("Error loading widget").font = Font.boldSystemFont(12);
        errorWidget.addText(error.message).font = Font.systemFont(10);
        return errorWidget;
    }

    async fetchPMDataWithCache() {
        const cache = this.loadFromCache();
        if (cache) return cache;

        const data = await this.fetchPMData();
        this.saveToCache(data);
        return data;
    }

    loadFromCache() {
        try {
            const cached = Keychain.get(this.cacheKey);
            if (!cached) return null;

            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp > this.cacheExpiry) return null;

            return data;
        } catch (error) {
            console.log('Cache read error:', error);
            return null;
        }
    }

    saveToCache(data) {
        try {
            const cache = {
                timestamp: Date.now(),
                data
            };
            Keychain.set(this.cacheKey, JSON.stringify(cache));
        } catch (error) {
            console.log('Cache write error:', error);
        }
    }

    async createWidget() {
        const { text } = this.getColors(this.stationData.pm25);
        
        // Header with logo
        const headerStack = this.widget.addStack();
        headerStack.layoutVertically();
        headerStack.spacing = 2;

        const titleStack = headerStack.addStack();
        titleStack.centerAlignContent();
        titleStack.spacing = 4;

        const logoSymbol = SFSymbol.named(this.config.symbols.logo);
        const logoImage = titleStack.addImage(logoSymbol.image);
        logoImage.imageSize = new Size(10, 10);
        logoImage.tintColor = new Color(text);

        const qualityLabel = titleStack.addText("AIR QUALITY 🇹🇭");
        qualityLabel.font = Font.mediumSystemFont(8);
        qualityLabel.textColor = new Color(text);

        const statusText = headerStack.addText(this.getAirQualityStatus(this.stationData.pm25));
        statusText.font = Font.semiboldSystemFont(12);
        statusText.textColor = new Color(text);

        this.widget.addSpacer(4);

        // PM2.5 Value
        const pm25Stack = this.widget.addStack();
        pm25Stack.layoutVertically();
        pm25Stack.spacing = 0;
        
        const pm25Label = pm25Stack.addText("PM 2.5");
        pm25Label.font = Font.mediumSystemFont(8);
        pm25Label.textColor = new Color(text);
        
        const pm25Value = Math.round(this.stationData.pm25 * 10) / 10;
        const pm25Text = pm25Stack.addText(`${pm25Value} μg/m³`);
        pm25Text.font = Font.boldSystemFont(24);
        pm25Text.textColor = new Color(text);

        this.widget.addSpacer(4);

        // Station info with location symbol
        const infoStack = this.widget.addStack();
        infoStack.layoutVertically();
        infoStack.spacing = 2;

        const locationStack = infoStack.addStack();
        locationStack.centerAlignContent();
        locationStack.spacing = 4;

        const locationSymbol = SFSymbol.named(this.config.symbols.location);
        const locationIcon = locationStack.addImage(locationSymbol.image);
        locationIcon.imageSize = new Size(12, 12);
        locationIcon.tintColor = new Color(text);

        const locationName = this.stationData.dustboy_name_en;
        const truncatedLocation = locationName.length > 25 
            ? locationName.substring(0, 25) + '...' 
            : locationName;

        const locationText = locationStack.addText(truncatedLocation);
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

        // Signature
        this.widget.addSpacer(2);
        const signature = this.widget.addText("Made by @ingpawat");
        signature.font = Font.systemFont(6);
        signature.textColor = new Color("#666666", 0.7);
        signature.centerAlignText();
    }

    async fetchPMData() {
        const url = `https://www-old.cmuccdc.org/api2/dustboy/near/${this.latitude}/${this.longitude}`;
        const req = new Request(url);
        req.timeoutInterval = 10;
        
        try {
            const apiResult = await req.loadJSON();
            if (!apiResult || !apiResult[0]) {
                throw new Error('No data received from API');
            }
            return apiResult[0];
        } catch (error) {
            throw new Error(`Failed to fetch PM data: ${error.message}`);
        }
    }
}

// Widget initialization
async function runWidget() {
    const widget = new AirQualityWidget({
        padding: 12,
        updateInterval: 30
    });
    
    const finalWidget = await widget.initialize();

    if (!config.runsInWidget) {
        await finalWidget.presentSmall();
    }

    Script.setWidget(finalWidget);
    Script.complete();
}

await runWidget();