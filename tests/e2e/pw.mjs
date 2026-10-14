// Playwright is a dev dependency. PLAYWRIGHT_MODULE can point at another install (for example a global one).
export const { chromium, devices } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
