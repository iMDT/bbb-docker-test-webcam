const puppeteer = require('puppeteer');

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }
 
const selectors = {
    close_audio: "button[aria-label='Close Join audio modal']",
    share_webcam: "button[aria-label='Share webcam']",
    start_sharing: "button[aria-label='Start sharing']:enabled"
};

const WEBCAM_TIMEOUT = 30;

const browsers = [];
const broadcaster = (async () => {
    try {
        const {argv} = process;
        const JOIN_URL=argv[2];

        const browser = await puppeteer.launch({
            executablePath: 'google-chrome-stable',
            args: [
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream',
                '--allow-file-access'
            ],
        });
        browsers.push(browser);

        const page = await browser.newPage();
        await page.goto(JOIN_URL);
        
        // Close audio modal
        console.log("Wait for audio modal");
        await page.waitForSelector(selectors.close_audio);

        console.log("Click on close audio modal");
        await page.click(selectors.close_audio);
        
        // Share webcam
        console.log("Click on share webcam");
        await page.click(selectors.share_webcam);

        // Start sharing
        console.log("Wait for start sharing");
        await page.waitForSelector(selectors.start_sharing);

        // await page.screenshot({path: '/debug/before-start-sharing.png'});

        console.log("Click on start sharing");
        await page.click(selectors.start_sharing);
    } catch (e) {
        console.log(`Test result: FAILURE_OTHER`);
        process.exit(1);
    }
});

const watcher = (async () => {
    try {
        const {argv} = process;
        const JOIN_URL=argv[2];

        const browser = await puppeteer.launch({
            executablePath: 'google-chrome-stable',
            args: [
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ],
        });
        browsers.push(browser);

        const page = await browser.newPage();
        await page.goto(JOIN_URL);
        
        // Close audio modal
        console.log("Wait for audio modal");
        await page.waitForSelector(selectors.close_audio);

        console.log("Click on close audio modal");
        await page.click(selectors.close_audio);
        
        let webcamFound = false;

        // Wait to see webcam
        for ( let i = 0 ; i<WEBCAM_TIMEOUT; i ++) {
            try {
                await page.waitForSelector('video', { timeout: 1000 });
                console.log("Webcam detected!");
                webcamFound = true;
                break;
            } catch (e) {
                console.log("No webcam yet...");
            }
        }

        // Close browsers
        console.log("Closing browsers");
        browsers.forEach(browser => browser.close() );

        if(!webcamFound) {
            console.log(`Test result: FAILURE`);
            process.exit(1);
        }

        console.log(`Test result: SUCCESS`);
        process.exit(0);
    } catch (e) {
        console.log(`Test result: FAILURE_OTHER`);
        process.exit(1);
    }
});

broadcaster();
watcher();