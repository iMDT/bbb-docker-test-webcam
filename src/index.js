const puppeteer = require('puppeteer');
const test_id = (new Date()).getTime();
const fs = require('fs');

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }

async function screenshot(page, who, action) {
    const now = new Date().toISOString().split('.')[0].replace(/T/g, ' ').replace(' ', '_').replace(/[:-]/g, '');
    await page.screenshot({path: `/debug/${test_id}-${now}-${who}-${action}.png`});
}

function log (who, text) {
    fs.appendFileSync(`/debug/${test_id}-${who}.log`, text);

    const pad = `                              `;
    who = String(`${pad}${who}`).slice(-pad.length);
    console.log(`${who}\t\t`, text);
}

const selectors = {
    close_audio: "button[aria-label='Close Join audio modal']",
    share_webcam: "button[aria-label='Share webcam']",
    start_sharing: "button[aria-label='Start sharing']:enabled"
};

const WEBCAM_TIMEOUT = 30;

const browsers = [];

// Browser 1 - the one that publish webcam
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
        page
        .on('console', message =>
            log('broadcaster-browser', `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
        .on('pageerror', ({ message }) => 
            log('broadcaster-browser', message)) 
        // .on('response', response =>
        //     log('broadcaster-browser', `${response.status()} ${response.url()}`))
        .on('requestfailed', request =>
            log('broadcaster-browser', `${request.failure().errorText} ${request.url()}`));

        await page.goto(JOIN_URL);
        
        // Close audio modal
        log('broadcaster-main', 'Wait for audio modal');
        await page.waitForSelector(selectors.close_audio);

        log('broadcaster-main', 'Click on close audio modal');
        await page.click(selectors.close_audio);
        
        // Share webcam
        log('broadcaster-main', 'Click on share webcam');
        await page.click(selectors.share_webcam);

        // Start sharing
        log('broadcaster-main', 'Wait for start sharing');
        await page.waitForSelector(selectors.start_sharing);
        await screenshot(page, 'broadcaster', 'before-start-sharing');

        log('broadcaster-main', 'Click on start sharing');
        await page.click(selectors.start_sharing);

        // Take one screenshot per second
        for(let i = 0; i < WEBCAM_TIMEOUT; i ++ ) {
            await screenshot(page, 'broadcaster', `${i}_seconds_after_share`);
            await delay(1000);
        }

    } catch (e) {
        log('broadcaster-main', `Test ${test_id} result: FAILURE_OTHER`);
        log('broadcaster-main', `Details: ${e}`);
        process.exit(1);
    }
});

// Browser 2 - the one that waits for image
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
        page
        .on('console', message =>
            log('watcher-browser', `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
        .on('pageerror', ({ message }) => 
            log('watcher-browser', message)) 
        // .on('response', response =>
        //     log('watcher-browser', `${response.status()} ${response.url()}`))
        .on('requestfailed', request =>
            log('watcher-browser', `${request.failure().errorText} ${request.url()}`));

        let dataFromLog = {};
        page.on('console', message => {
            if(message.text().indexOf("Camera media is flowing (server)")) {
                dataFromLog.mediaFlowing = true;
            }
        });

        await page.goto(JOIN_URL);
        
        // Close audio modal
        log('watcher-main', 'Wait for audio modal');
        await page.waitForSelector(selectors.close_audio);

        log('watcher-main', 'Click on close audio modal');
        await page.click(selectors.close_audio);
        
        let testSuccess = false;

        // Wait to see webcam
        for ( let i = 0 ; i<WEBCAM_TIMEOUT; i ++) {
            await screenshot(page, 'watcher', `${i}_seconds_after_join`);
            try {
                // Wait for video tag
                await page.waitForSelector('video', { timeout: 1000 });
                log('watcher-main', 'Webcam detected!');
                await delay(10000);

                // Check for media flowing log
                if(dataFromLog.mediaFlowing) {
                    testSuccess = true;
                    break;
                }
            } catch (e) {
                log('watcher-main', 'No webcam yet...');
            }
        }

        // Close browsers
        log('watcher-main', 'Closing browsers');
        browsers.forEach(browser => browser.close() );

        if(!testSuccess) {
            log('watcher-main', `Test ${test_id} result: FAILURE`);
            process.exit(1);
        }

        log('watcher-main', `Test ${test_id} result: SUCCESS`);
        process.exit(0);
    } catch (e) {
        log('watcher-main', `Test ${test_id} result: FAILURE_OTHER`);
        log('watcher-main', `Details: ${e}`);
        process.exit(1);
    }
});

broadcaster();
watcher();
