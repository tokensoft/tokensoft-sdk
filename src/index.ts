import fetch from 'node-fetch'
import * as crypto from 'crypto'

interface KYCInfoInput {
    firstName: string
    lastName: string
    address: {
        streetAddress: string
        city: string
        state: string
        zip: string
        country: string
    }
}

export default class TokensoftSDK {
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
     * Authorize an existing Tokensoft account to be able to hold an asset
     * @param email 
     * @param address 
     */
    async authorizeUser(email: string, address: string, kycInfo: KYCInfoInput): Promise<string> {
        const body = JSON.stringify({
            query: `mutation {
                whitelistUser(
                    email: "${email}",
                    address: "${address}",
                    kyc: {
                        firstName: "${kycInfo.firstName}",
                        lastName: "${kycInfo.lastName}",
                        address: {
                          streetAddress: "${kycInfo.address.streetAddress}",
                          city: "${kycInfo.address.city}",
                          state: "${kycInfo.address.state}",
                          zip: "${kycInfo.address.zip}",
                          country:"${kycInfo.address.country}"
                        }
                      }
                    }
                )
            }`
        })

        return this.sendRequest(body)
    }
}
