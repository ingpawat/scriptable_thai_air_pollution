// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: smog;

class AirQualityWidget {
    constructor() {
        this.widget = new ListWidget()
        this.widget.setPadding(10, 10, 10, 10)
        this.widget.url = 'https://pm2_5.nrct.go.th/'
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
            this.latitude = 14.990677499999999
            this.longitude = 100.47800949999998
            console.log("Using fallback location")
        }
    }

    async createWidget() {
        // Header with station name
        let stationStack = this.widget.addStack()
        stationStack.layoutVertically()
        
        let stationName = stationStack.addText(this.stationData.dustboy_name_en)
        stationName.font = Font.mediumRoundedSystemFont(12)
        stationName.minimumScaleFactor = 0.5
        stationName.lineLimit = 2
        
        let distanceText = stationStack.addText(`${parseFloat(this.stationData.distance).toFixed(1)} km away`)
        distanceText.font = Font.systemFont(10)
        distanceText.textColor = Color.gray()
        
        this.widget.addSpacer(8)

        // Main data display
        let dataStack = this.widget.addStack()
        dataStack.layoutHorizontally()
        
        // Left side - PM2.5
        let pmStack = dataStack.addStack()
        pmStack.layoutVertically()
        
        let pmLabel = pmStack.addText("PM2.5")
        pmLabel.font = Font.mediumRoundedSystemFont(13)
        
        let pmValue = pmStack.addText(this.stationData.pm25.toString())
        pmValue.font = Font.boldMonospacedSystemFont(20)
        pmValue.textColor = new Color('#' + this.getAQIColor(this.stationData.us_aqi))
        
        dataStack.addSpacer()

        // Right side - US AQI
        let aqiStack = dataStack.addStack()
        aqiStack.layoutVertically()
        
        let aqiLabel = aqiStack.addText("US AQI")
        aqiLabel.font = Font.mediumRoundedSystemFont(13)
        
        let aqiValue = aqiStack.addText(this.stationData.us_aqi)
        aqiValue.font = Font.boldMonospacedSystemFont(20)
        aqiValue.textColor = new Color('#' + this.getAQIColor(this.stationData.us_aqi))

        this.widget.addSpacer(8)

        // Status
        let statusText = this.widget.addText(this.stationData.us_title_en)
        statusText.font = Font.mediumRoundedSystemFont(13)
        statusText.textColor = new Color('#' + this.getAQIColor(this.stationData.us_aqi))
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