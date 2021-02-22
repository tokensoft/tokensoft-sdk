import fetch from 'node-fetch'
import * as crypto from 'crypto'
import * as Eth from "./Eth";
import { ERC1404 } from "./ERC1404";

export { ERC1404, Eth };

export interface KYCInfoInput {
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

export interface Transaction {
    tokenAddress: string;
    fromWallet: string;
    toWallet: string;
    qtyBaseUnits: number;
}

export interface ClientOptions {
    // The maximum age for the server time cache
    maxTimecacheAgeMs: number;
}

export class TokensoftSDK {
    private timecache: { serverMs: number, localMs: number } | null = null;
    private opts: ClientOptions;
    private keyId: string
    private secretKey: string
    private apiUrl: string
    private web3: Eth.Web3Interface | null;

    constructor(apiUrl: string, keyId: string, secretKey: string, web3: Eth.Web3Interface, opts?: Partial<ClientOptions>);
    constructor(apiUrl: string, keyId: string, secretKey: string, opts: Partial<ClientOptions>);
    constructor(apiUrl: string, keyId: string, secretKey: string);
    constructor(
        apiUrl: string,
        keyId: string,
        secretKey: string,
        web3OrOpts?: Eth.Web3Interface | Partial<ClientOptions>,
        opts?: Partial<ClientOptions>
    ) {
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

        this.web3 = isWeb3(web3OrOpts) ? web3OrOpts : null;
        this.opts = {
            maxTimecacheAgeMs: 1200000, // 20 minutes
            ...(
                isWeb3(web3OrOpts)
                ? (opts || {})
                : (web3OrOpts || {})
            )
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
        // Only get time from server if we don't have a recent cache of it
        if (
            !this.timecache ||
            ((Date.now() - this.timecache.localMs) > this.opts.maxTimecacheAgeMs)
        ) {
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

            // Fetch time from server
            const res = await fetch(this.apiUrl, options)
            const { data } = await res.json()

            // Use time from server to construct time cache
            this.timecache = {
                serverMs: Number(data.time),
                localMs: Date.now(),
            }
        }

        // Return string representation of the adjusted server time
        return String(
            this.timecache.serverMs + (Date.now() - this.timecache.localMs)
        );
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

        return this.sendRequest(body)
    }

    /**
     * Takes a transaction and returns an array (possibly empty) of reasons the transaction would
     * fail. If the array is empty, the transaction is not expected to fail.
     */
    async detectTransferRestriction(
        tx: Transaction
    ): Promise<Array<{ code: string; text: string; }>> {
        // The Ethereum provider is optional, so we need to check for that first and throw if we
        // don't have it
        if (!this.web3) {
            throw new Error(
                `Programmer: No Ethereum client provided, so can't access Ethereum. Fix this by ` +
                `providing an Ethereum provider (e.g., web3 instance) on instantiation.`
            );
        }

        // If we've got an ethereum provider, we'll use the tx data to see if the transaction can
        // go through
        const token = new this.web3.eth.Contract(ERC1404.abi, tx.tokenAddress);

        const code = await token.methods.detectTransferRestriction(
            tx.fromWallet,
            tx.toWallet,
            tx.qtyBaseUnits
        ).call();

        if (code === 0) {
            return [];
        }

        const text = <string> await token.methods.messageForTransferRestriction(code).call();
        return [{ code: String(code), text }];
    }
}

const isWeb3 = (thing: any): thing is Eth.Web3Interface => {
    return thing !== undefined &&  thing.eth !== undefined;
}
