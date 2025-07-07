// Configuration file for Adrenalin login

module.exports = {
    // Application URL
    URL: 'https://pureconnect.myadrenalin.com/AdrenalinMax/#/',
    
    // Login credentials
    USERNAME: 'Vikas.Anand',
    PASSWORD: 'Vikas@3891',
    
    // Browser launch options
    LAUNCH_OPTIONS: {
        headless: false,
        args: [
            '--start-maximized',
            '--disable-web-security'
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
