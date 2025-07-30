// Configuration file for Adrenalin login

module.exports = {
    // Application URL
    URL: 'https://pureconnect.myadrenalin.com/AdrenalinMax/#/',
    
    // Login credentials
    USERNAME: 'Vikas.Anand',
    PASSWORD: 'Vikas@3891',
    
    // Browser launch options
    LAUNCH_OPTIONS: {
        headless: 'new', // Use new headless mode
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080',
            '--single-process',
            '--no-zygote'
        ]
    },
    
    // Browser settings
    VIEWPORT: {
        width: 1280,
        height: 720
    },
    
    // Timeout settings (in milliseconds)
    TIMEOUTS: {
        PAGE_LOAD: 15000,
        ELEMENT_WAIT: 10000,
        NAVIGATION: 15000,
        POST_LOGIN: 3000,
        USER_NAME: 5000
    },
    
    // Company settings
    COMPANY: 'PURESOF'
};
