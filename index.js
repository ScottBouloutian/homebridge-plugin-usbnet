const Promise = require('bluebird');
const usb = require('usb');

let Service = null;
let Characteristic = null;

// UsbNet Homebridge Accessory
class UsbNet {
    constructor(log, config) {
        // Initialize HAP service
        this.log = log;
        this.name = config.name;
        this.service = new Service.Lightbulb(this.name);
        this.service
            .getCharacteristic(Characteristic.On)
            .on('set', (value, callback) => {
                log(`Setting accessory state to ${value}`);
                this.set(value).then(() => callback())
                    .catch(error => callback(error));
            })
            .on('get', (callback) => {
                log('Getting accessory state');
                this.status().then(status => callback(null, status))
                    .catch(error => callback(error));
            });

        // Initialize UsbNet device
        const vid = 0x067b;
        const pid = 0x2303;
        const device = usb.findByIds(vid, pid);
        this.transfer = Promise.promisify(device.controlTransfer, { context: device });
        device.open();
    }

    status() {
        return this.transfer(0xc0, 0x01, 0x0081, 0x0000, 0x0001).then((data) => {
            const on = Buffer.from('a0', 'hex');
            return data.equals(on);
        });
    }

    set(on) {
        const code = on ? 0xa0 : 0x20;
        return this.transfer(0x40, 0x01, 0x0001, code, Buffer.alloc(0));
    }

    getServices() {
        return [this.service];
    }
}

// UsbNet Homebridge plugin
function UsbNetPlugin(homebridge) {
    console.log(`homebridge API version: ${homebridge.version}`);
    Service = homebridge.hap.service;
    Characteristic = homebridge.hap.service;
    homebridge.registerAccessory('homebridge-plugin-usbnet', 'UsbNet', UsbNet);
}
module.exports = UsbNetPlugin;
