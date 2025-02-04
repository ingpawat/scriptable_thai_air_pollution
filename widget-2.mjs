// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: smog;

class AirQualityWidget {
    constructor() {
        this.widget = new ListWidget()
        // Increase padding for better visual balance
        this.widget.setPadding(16, 16, 16, 16)
        this.widget.url = "https://pm2_5.nrct.go.th/"
        // Add subtle gradient background
        this.widget.backgroundGradient = this.createBackgroundGradient()
    }

    createBackgroundGradient() {
        const gradient = new LinearGradient()
        gradient.locations = [0, 1]
        gradient.colors = [
            new Color("#1c1c1e"),
            new Color("#2c2c2e")
        ]
        return gradient
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
            // this.latitude = 14.990677499999999
            // this.longitude = 100.47800949999998
            console.log("Using fallback location")
        }
    }

    async createWidget() {
        // Configure background
        const bgColor = Color.dynamic(
            new Color("#FFFFFF", 0.8),
            new Color("#000000", 0.8)
        )
        this.widget.backgroundColor = bgColor
    
        // Station info with subtle styling
        const headerStack = this.widget.addStack()
        headerStack.layoutVertically()
        headerStack.spacing = 2
    
        const stationName = headerStack.addText(this.stationData.dustboy_name_en)
        stationName.font = Font.semiboldSystemFont(11)
        stationName.minimumScaleFactor = 0.7
        stationName.lineLimit = 1
        stationName.textColor = Color.dynamic(
            new Color("#000000", 0.8),
            new Color("#FFFFFF", 0.8)
        )
    
        const distanceText = headerStack.addText(`${parseFloat(this.stationData.distance).toFixed(1)} km`)
        distanceText.font = Font.systemFont(10)
        distanceText.textColor = Color.dynamic(
            new Color("#666666"),
            new Color("#999999")
        )
    
        this.widget.addSpacer(8)
    
        // Main metrics display
        const metricsStack = this.widget.addStack()
        metricsStack.layoutHorizontally()
        metricsStack.centerAlignContent()
        metricsStack.spacing = 20
    
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
    
        this.widget.addSpacer(8)
    
        // Status indicator
        const statusStack = this.widget.addStack()
        statusStack.layoutHorizontally()
        statusStack.centerAlignContent()
        
        const statusDot = statusStack.addText("●")
        statusDot.font = Font.boldSystemFont(8)
        statusDot.textColor = new Color('#' + this.getAQIColor(this.stationData.us_aqi))
        
        statusStack.addSpacer(4)
        
        const statusText = statusStack.addText(this.stationData.us_title_en)
        statusText.font = Font.mediumSystemFont(12)
        statusText.textColor = Color.dynamic(
            new Color("#000000", 0.8),
            new Color("#FFFFFF", 0.8)
        )
    
        // Minimal signature
        this.widget.addSpacer(4)
        const signature = this.widget.addText("@ingpawat")
        signature.font = Font.systemFont(8)
        signature.textColor = Color.dynamic(
            new Color("#666666", 0.6),
            new Color("#999999", 0.6)
        )
        signature.centerAlignText()
    }

    createMetricStack(parentStack, label, value, aqiValue) {
        const stack = parentStack.addStack()
        stack.layoutVertically()
        stack.spacing = 2
        stack.centerAlignContent()
    
        const labelText = stack.addText(label)
        labelText.font = Font.mediumSystemFont(11)
        labelText.textColor = Color.dynamic(
            new Color("#666666"),
            new Color("#999999")
        )
        labelText.centerAlignText()
    
        const valueText = stack.addText(value)
        valueText.font = Font.boldMonospacedSystemFont(24)
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
        if (value <= 50) return '65c64c'
        if (value <= 100) return 'c6bf22'
        if (value <= 150) return 'dfce60'
        if (value <= 200) return 'e39d64'
        if (value <= 300) return 'b74d34'
        return '800000'
    }

    async getImage(image) {
        let fm = FileManager.local()
        let dir = fm.documentsDirectory()
        let path = fm.joinPath(dir, image)
        if (fm.fileExists(path)) {
            return fm.readImage(path)
        } else {
            let imageUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkOTI3MmUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1jcm9zcy1zcXVhcmUiPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgeD0iMiIgeT0iMiIgcng9IjMiLz48cGF0aCBkPSJNMTQgMTBWN2MwLS42LS40LTEtMS0xaC0yYy0uNiAwLTEgLjQtMSAxdjNIN2MtLjYgMC0xIC40LTEgMXYyYzAgLjYuNCAxIDEgMWgzdjNjMCAuNi40IDEgMSAxaDJjLjYgMCAxLS40IDEtMXYtM2gzYy42IDAgMS0uNCAxLTF2LTJjMC0uNi0uNC0xLTEtMVoiLz48L3N2Zz4="
            let iconImage = await this.loadImage(imageUrl)
            fm.writeImage(path, iconImage)
            return iconImage
        }
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