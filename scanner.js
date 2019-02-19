const noble = require('noble')
const fs = require('fs-extra')

const filename = 'maclist.json'

/* ****************************************** */
// BLE error handler
/* ****************************************** */
function BleFailure() {
    console.error(`BLE failure detected. Exiting in order to be restarted`)
    process.exit(0)
}

/* ****************************************** */
// BLE Agent Object
/* ****************************************** */

let scanner = {
    isScanning: false,
    scans: new Map(),
    wifiScans: new Map(),
    total_scans: 0,
    lastPrintTime: 0,
    noble: noble,
    failedScans: 0,
    macList: [],

    start: () => {
        scanner.scans = new Map()
        scanner.isScanning = true
        scanner.total_scans = 0

        if (noble.state === 'poweredOn') {
            noble.startScanning([], true)
        }
    },

    stop: () => {
        scanner.isScanning = false
        noble.stopScanning()
    },

    clear: () => {
        scanner.scans.clear()
        scanner.total_scans = 0
        scanner.wifiScans.clear()
    },

    length: () => {
        return scanner.scans.size
    },

    // Upload scanned events in queue
    uploadScanned() {
    },
}

exports.scanner = scanner

/* ****************************************** */
// Parsers
/* ****************************************** */
/* eslint-disable-next-line */
class Adv {
    constructor(peripheral) {
        this.timestamp = Date.now()
        this.mac = peripheral.address
        this.rssi = peripheral.rssi
        let data = peripheral.advertisement
        this.data = data
        // this.data = peripheral.advertisement.manufacturerdata.toString('base64')
    }

    toString() {
        return this.data
    }
}

class RawAdv {
    constructor(adv) {
        this.timestamp = Date.now() / 1000
        this.mac = adv.address
        this.rssi = adv.rssi
        this.data = adv.eir.toString('hex')
        this.connectable = adv.connectable
    }

    toString() {
        return this.mac
    }

    pretty() {
        return `${this.mac} ${this.data}`
    }
}

function processRawAdvertisement(adv) {
    const parsedAdv = new RawAdv(adv)

    if (scanner.macList.length == 0 || scanner.macList.includes(parsedAdv.mac)) {
        console.log(JSON.stringify(parsedAdv))
    }
}
/* ****************************************** */
// Noble Callbacks
/* ****************************************** */

noble.on('stateChange', (state) => {
    if (state !== 'poweredOn') console.warn(`BLE adapter status changed!`)
    if (state === 'poweredOn' && scanner.isScanning) { scanner.start() }
    if (!scanner.isScanning) { scanner.stop() }
})

// noble.on('discover', (peripheral) => {
//    processPeripheral(peripheral)
// })

noble.on('raw_discover', (peripheral) => {
    processRawAdvertisement(peripheral)
})

let scannerTimeout = null
noble.on('scanStart', () => {
    clearTimeout(scannerTimeout)
    console.warn('Scan started.')
})

noble.on('scanStop', () => {
    console.warn('Scan stopped.')
    if (scanner.isScanning) {
        scanner.start()
        console.error(`The scan should not have stopped. Restarting.`)
    }
    scannerTimeout = setTimeout(() => {
        console.error(`ScanStop Timeout. The scan has been stopped for too long. Failure detected`)
        BleFailure()
    }, config.BeaconConnectionTimeout)
})

noble.on('warning', (warning) => console.warn(`Noble warning: ${warning}`))
noble.on('error', (warning) => console.error(`Noble error: ${warning}`))


console.info(`Put an array of mac addresses, JSON formatted, in ${filename} in order to print only them!`)
if (fs.existsSync(filename)) {
    let configs = fs.readJSONSync(filename)
    scanner.macList.push(...configs)
    console.warn(`Config file with ${configs.length} MACs found`)
} else {
    console.error(`Config file ${filename} not found`)
}

scanner.start()