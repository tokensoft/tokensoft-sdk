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

interface RecordPaymentInput {
    paymentMethod: string,
    id: string,
    fromAddress: string,
    blockNumber: string,
    transactionHash: string,
    eventIndex: string,
    paymentAmount: string
}

export class TokensoftSDK {
    private keyId: string
    private secretKey: string
    private apiUrl: string

    constructor(apiUrl: string, keyId: string, secretKey: string) {
        this.apiUrl = apiUrl
        if (!apiUrl) {
            throw new Error('missing apiUrl argument')
        }

        this.keyId = keyId
        if (!keyId) {
            throw new Error('missing keyId argument')
        }

        this.secretKey = secretKey
        if (!secretKey) {
            throw new Error('missing secretKey argument')
        }
    }

    async sendRequest(body: string) {
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
            return await res.json()
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
        return this.sendRequest(body).then(d => d?.data)
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

        return this.sendRequest(body).then(d => d?.data)
    }

    /**
     * Retreieve the users that populate the dashboard
     * @param searchValue
     * @param page
     * @param pageSize
     * @param sortDir
     * @param sortByColumn
     */
    async AdminParticipantUsers(
        searchValue: string,
        page: number,
        pageSize: number,
        sortDir: string,
        sortByColumn: string
    ): Promise<string> {
        const body = JSON.stringify({
            query: `query {
                adminParticipantUsers(
                    searchValue: "${searchValue}",
                    page: "${page}",
                    pageSize: "${pageSize}",
                    sortDir: "${sortDir}",
                    sortByColumn: "${sortByColumn}"
                ) {
			        totalUsers
                    users {		   
                        id  
                        acceptedTerms
                        paymentCompleted
                        selectedPaymentMethod
                        kycStatus
                        kycExpirationDate
                        paymentAmount
                        paymentExpiration
                        usdTrackingNumber
                        ethPaymentCode
                        ethPaymentPayload
                        paymentDetailsConfirmed
                        updatedAt
                        userId { }
                        participatingRoundIds
                    }
                }
            }`
        })

        return this.sendRequest(body).then(d => d?.data)
    }

    /**
     * Record a payment
     * @param input
     */
     async recordPayment({
        paymentMethod,
        id,
        fromAddress,
        blockNumber,
        transactionHash,
        eventIndex,
        paymentAmount
      }: RecordPaymentInput
    ): Promise<string> {
        const body = JSON.stringify({
            query: `mutation {
                externalRecordPayment(
                    paymentMethod: "${paymentMethod}",
                    id: "${id}",
                    fromAddress: "${fromAddress}",
                    blockNumber: "${blockNumber}",
                    transactionHash: "${transactionHash}"
                    eventIndex: "${eventIndex}"
                    paymentAmount: "${paymentAmount}"
                ) {
			        paymentId
                }
            }`
        })

        const res = await this.sendRequest(body)
  
        if (
            (!res.data || Object.values(res.data).find(v => v === null) !== undefined) &&
            res.errors &&
            res.errors.length
        ) {
            throw new Error(
            res.errors
                // @ts-ignore
                .map(e => e.message)
                .join('; ')
            )
        }

        return res.data
    }
}
