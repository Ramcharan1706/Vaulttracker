/**
 * Configuration validator - checks if the app is properly configured
 */

export interface ConfigStatus {
    isConfigured: boolean
    appId: number
    message?: string
}

export const getConfigStatus = (): ConfigStatus => {
    const appId = parseInt(import.meta.env.VITE_APP_ID || '0')

    if (appId === 0) {
        return {
            isConfigured: false,
            appId: 0,
            message: '⚙️ App not configured. You need to deploy the contract and set VITE_APP_ID in .env.local'
        }
    }



    return {
        isConfigured: true,
        appId
    }
}
