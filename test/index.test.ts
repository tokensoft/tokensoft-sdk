import TokensoftSDK from '../src/index'


describe('Base Unit Tests', () => {

  it('imports the Tokensoft SDK library', async() => {
    expect(TokensoftSDK).toBeTruthy()
  })

  it('can instantiate the Tokensoft SDK', async() => {
    expect(await new TokensoftSDK('', '', '')).toBeTruthy()
  })

  it('can fetch a current user', async() => {
    const client = await new TokensoftSDK('', '', '')
    expect(client.currentUser).toBeTruthy()
  })

  it('can authorize a user', async() => {
    const client = await new TokensoftSDK('', '', '')
    expect(client.authorizeUser).toBeTruthy()
  })
})
