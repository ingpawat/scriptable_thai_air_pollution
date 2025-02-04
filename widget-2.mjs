// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: smog;

class AirQualityWidget {
    constructor() {
        this.widget = new ListWidget()
        this.widget.setPadding(16, 16, 16, 16)
        this.widget.url = "https://pm2_5.nrct.go.th/"
        // Set clean white background with slight transparency
        this.widget.backgroundColor = new Color("#FFFFFF", 0.95)
    }

    async initialize() {
        await this.setLocation()
        this.stationData = await this.fetchPMData()
        await this.createWidget()
        return this.widget
    }

    async setLocation() {
        Location.setAccuracyToHundredMeters()
        try {
            const location = await Location.current()
            this.latitude = location.latitude
            this.longitude = location.longitude
        } catch (error) {
            console.log("Using fallback location")
        }
    }

    async createWidget() {
        // Station info with minimal styling
        const headerStack = this.widget.addStack()
        headerStack.layoutVertically()
        headerStack.spacing = 2

        const stationName = headerStack.addText(this.stationData.dustboy_name_en)
        stationName.font = Font.semiboldSystemFont(11)
        stationName.minimumScaleFactor = 0.7
        stationName.lineLimit = 1
        stationName.textColor = new Color("#000000", 0.8)

        const distanceText = headerStack.addText(`${parseFloat(this.stationData.distance).toFixed(1)} km`)
        distanceText.font = Font.systemFont(10)
        distanceText.textColor = new Color("#666666", 0.8)

        this.widget.addSpacer(10)

        // Main metrics display with enhanced spacing
        const metricsStack = this.widget.addStack()
        metricsStack.layoutHorizontally()
        metricsStack.centerAlignContent()
        metricsStack.spacing = 24 // Increased spacing between metrics

        // PM2.5 Value
        const pmStack = this.createMetricStack(
            metricsStack,
            "PM2.5",
            this.stationData.pm25.toString(),
            this.stationData.us_aqi
        )

        // US AQI Value
        const aqiStack = this.createMetricStack(
            metricsStack,
            "AQI",
            this.stationData.us_aqi,
            this.stationData.us_aqi
        )

        this.widget.addSpacer(10)

        // Status indicator with refined styling
        const statusStack = this.widget.addStack()
        statusStack.layoutHorizontally()
        statusStack.centerAlignContent()
        
        const statusDot = statusStack.addText("●")
        statusDot.font = Font.boldSystemFont(8)
        statusDot.textColor = new Color('#' + this.getAQIColor(this.stationData.us_aqi))
        
        statusStack.addSpacer(4)
        
        const statusText = statusStack.addText(this.stationData.us_title_en)
        statusText.font = Font.mediumSystemFont(12)
        statusText.textColor = new Color("#000000", 0.7)

        // Refined signature
        this.widget.addSpacer(6)
        const signature = this.widget.addText("@ingpawat")
        signature.font = Font.systemFont(8)
        signature.textColor = new Color("#666666", 0.5)
        signature.centerAlignText()
    }

    createMetricStack(parentStack, label, value, aqiValue) {
        const stack = parentStack.addStack()
        stack.layoutVertically()
        stack.spacing = 3
        stack.centerAlignContent()

        const labelText = stack.addText(label)
        labelText.font = Font.mediumSystemFont(11)
        labelText.textColor = new Color("#666666", 0.8)
        labelText.centerAlignText()

        const valueText = stack.addText(value)
        valueText.font = Font.boldMonospacedSystemFont(26) // Increased size
        valueText.textColor = new Color('#' + this.getAQIColor(aqiValue))
        valueText.centerAlignText()

        return stack
    }

    async fetchPMData() {
        let url = `https://www-old.cmuccdc.org/api2/dustboy/near/${this.latitude}/${this.longitude}`
        const req = new Request(url)
        const apiResult = await req.loadJSON()
        return apiResult[0]
    }

    getAQIColor(value) {
        value = parseInt(value)
        if (value <= 50) return '3EC562' // Brighter green
        if (value <= 100) return 'FDD74B' // Brighter yellow
        if (value <= 150) return 'FB9B57' // Brighter orange
        if (value <= 200) return 'F65E5E' // Brighter red
        if (value <= 300) return 'A070B6' // Brighter purple
        return '7D1A1A' // Darker maroon
    }

    async loadImage(imgUrl) {
        const req = new Request(imgUrl)
        return await req.loadImage()
    }
}

// Usage
async function runWidget() {
    const widget = new AirQualityWidget()
    const finalWidget = await widget.initialize()
    
    if (!config.runsInWidget) {
        await finalWidget.presentSmall()
    }
    
    Script.setWidget(finalWidget)
    Script.complete()
}

await runWidget()