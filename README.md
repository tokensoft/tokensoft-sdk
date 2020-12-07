# tokensoft-sdk

![Logo](./docs/img/logo.png)

#### Installation

```
$ yarn add tokensoft-sdk
```
#### Roles

Investor:
 - Retail - Create and manage your account
 - Institutional - Create an account for your entity or fund
 - Broker Dealer or RIA - Create accounts on behalf of your clients

Administrator:
 - Broker Dealer ATS - Create accounts at the Tokensoft Transfer Agent and associate wallets with accounts.
 - Exchange - Create accounts at Tokensoft or the Tokensoft Transfer agent and associate wallets with accounts.


#### Assets

Every administrator will need unique credential per asset. Each set of credentials will enable an administrator to whitelist wallets to be authorized to hold the tokens.


#### Administrator Authentication

Export the authentication token on the command line:

```
$ export KEY_ID='TSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
$ export SECRET_KEY='TSXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

#### Authorize a User

In order for an investor or user to hold a security token, they must be authorized to do so by the administrator. The sample code below demonstrates this process.

```typescript
import { TokensoftSDK } from 'tokensoft-sdk'

const issuerEndpoint = 'https://app.arcalabs.com'

const client = new TokensoftSDK(issuerEndpoint, process.env.KEY_ID, process.env.SECRET_KEY)

const transactionHash = await client.authorizeUser('jay_clayton@gmail.com', '0x00192fb10df ... 3cd1bf599e8', {
  firstName: "john",
    lastName: "doe",
    address: {
      streetAddress: "123 abc street",
      city: "San Francisco",
      state: "CA",
      zip: "94000",
      country: "US"
    }
  }
)
```
