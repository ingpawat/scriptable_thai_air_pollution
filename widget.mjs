// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-purple; icon-glyph: smog;

// Fetch PM2.5 data
const indexData = await fetchPMData()

const widget = new ListWidget()
await createWidget()

// Debugging: Show widget preview in the app
if (!config.runsInWidget) {
    await widget.presentSmall()
}

widget.setPadding(10, 10, 10, 10)
widget.url = 'https://pm2_5.nrct.go.th/'

Script.setWidget(widget)
Script.complete()

// Build the widget UI
async function createWidget() {
    let titleStack = widget.addStack()
    const icon = await getImage('dust') // Get dust icon
    const iconImg = titleStack.addImage(icon)
    iconImg.imageSize = new Size(30, 30)
    
    titleStack.layoutHorizontally()
    titleStack.addSpacer(8)

    let textStack = titleStack.addStack()
    textStack.layoutVertically()

    let title = textStack.addText("Air Quality")
    title.font = Font.mediumRoundedSystemFont(13)
    let subtitle = textStack.addText("PM2.5 Index")
    subtitle.font = Font.mediumRoundedSystemFont(13)

    widget.addSpacer(10)

    let row = widget.addStack()
    row.layoutHorizontally()

    let pmText = row.addText("PM2.5: ")
    pmText.font = Font.mediumRoundedSystemFont(18)
    
    let pmValue = row.addText(indexData.toString())
    pmValue.textColor = new Color('#' + getAQIColor(indexData))
    pmValue.font = Font.regularMonospacedSystemFont(18)

    let status = widget.addText(getAQIStatus(indexData))
    status.textColor = new Color('#' + getAQIColor(indexData))
    status.font = Font.regularMonospacedSystemFont(18)
}

// Determine AQI color based on PM2.5 value
function getAQIColor(value) {
    if (value <= 50) return '65c64c' // Good (Green)
    if (value <= 100) return 'c6bf22' // Moderate (Yellow)
    if (value <= 150) return 'dfce60' // Unhealthy for Sensitive Groups (Orange)
    if (value <= 200) return 'e39d64' // Unhealthy (Red)
    if (value <= 300) return 'b74d34' // Very Unhealthy (Purple)
    return '800000' // Hazardous (Maroon)
}

// Determine AQI status
function getAQIStatus(value) {
    if (value <= 50) return "Good"
    if (value <= 100) return "Moderate"
    if (value <= 150) return "Unhealthy for Sensitive Groups"
    if (value <= 200) return "Unhealthy"
    if (value <= 300) return "Very Unhealthy"
    return "Hazardous"
}

// Fetch PM2.5 data from the API
async function fetchPMData() {
    let url = "https://www-old.cmuccdc.org/api2/dustboy/near/14.990677499999999/100.47800949999998"
    const req = new Request(url)
    const apiResult = await req.loadJSON()
    
    return apiResult[0].pm25
}

// Get images from local storage or download them once
async function getImage(image) {
    let fm = FileManager.local()
    let dir = fm.documentsDirectory()
    let path = fm.joinPath(dir, image)
    if (fm.fileExists(path)) {
        return fm.readImage(path)
    } else {
        let imageUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNkOTI3MmUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1jcm9zcy1zcXVhcmUiPjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgeD0iMiIgeT0iMiIgcng9IjMiLz48cGF0aCBkPSJNMTQgMTBWN2MwLS42LS40LTEtMS0xaC0yYy0uNiAwLTEgLjQtMSAxdjNIN2MtLjYgMC0xIC40LTEgMXYyYzAgLjYuNCAxIDEgMWgzdjNjMCAuNi40IDEgMSAxaDJjLjYgMCAxLS40IDEtMXYtM2gzYy42IDAgMS0uNCAxLTF2LTJjMC0uNi0uNC0xLTEtMVoiLz48L3N2Zz4="
        let iconImage = await loadImage(imageUrl)
        fm.writeImage(path, iconImage)
        return iconImage
    }
}

// Download image helper function
async function loadImage(imgUrl) {
    const req = new Request(imgUrl)
    return await req.loadImage()
}