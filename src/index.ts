import fetch from 'node-fetch'
import * as crypto from 'crypto'

export default class TokensoftApiClient {
    private keyId: string
    private secretKey: string
    private apiUrl: string

    constructor(apiUrl: string, keyId: string, secretKey: string) {
        this.apiUrl = apiUrl
        this.keyId = keyId
        this.secretKey = secretKey
    }

    private async sendRequest(body: string) {
        const serverTime = await this.getServerTime()
        const text = serverTime + body
        const hmac = crypto.createHmac('sha256', this.secretKey)
        hmac.update(text)
        const signature = hmac.digest('hex')
        const options = {
            headers: {
              'access-key': this.keyId,
              'access-sign': signature,
              'access-timestamp': serverTime,
              'Content-Type': 'application/json',
            },
            method: 'post',
            body
        }

        try {
            const res = await fetch(this.apiUrl, options)
            const { data } = await res.json()
            return data
        } catch (e) {
            console.log('Error sending request to TokensoftApi: ', e)
            throw e
        }
    }

    /**
     * Get the current server time
     */
    async getServerTime(): Promise<string> {
        const request = {
            query: '{ time }'
        }
        const body = JSON.stringify(request)
        const options = {
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'post',
            body
        }
        
        const res = await fetch(this.apiUrl, options)
        const { data } = await res.json()
        return data.time
    }

    /**
     * Get currently authenticated user
     */
    async currentUser() {
        const body = JSON.stringify({
            query: '{ currentUser {id email } }'
        })
        return this.sendRequest(body)
    }

    /**
     * Whitelist a user
     * @param email 
     * @param address 
     */
    async whitelistUser(email: string, address: string): Promise<string> {
        const body = JSON.stringify({
            query: `mutation {
                whitelistUser(
                    email: "${email}",
                    address: "${address}"
                )
            }`
        })

        return this.sendRequest(body)
    }
}
