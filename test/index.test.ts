import {TokensoftSDK, Transaction} from '../src'
import {FakeWeb3, FakeContract} from './Fakes';


describe('Base Unit Tests', () => {
  it('imports the Tokensoft SDK library', async() => {
    expect(TokensoftSDK).toBeTruthy()
  })

  it('can instantiate the Tokensoft SDK', async() => {
    expect(new TokensoftSDK('https://example.com', 'key', 'secret')).toBeTruthy()
  })

  // Check to ensure that the basic client public interface remains as expected
  describe('Public Inteface', () => {
    let client: TokensoftSDK;
    beforeEach(() => {
      client = new TokensoftSDK('https://example.com', 'key', 'secret');
    });

    const clientPublicMethods: Array<keyof TokensoftSDK> = [
      "currentUser",
      "authorizeUser",
      "AdminParticipantUsers",
      "getUserById",
      "getUserByEmail",
      "addNewParticipant",
      "getRounds",
      "findSaleStatusFromUserEmail",
      "findUserByEthAddress",
      "getAccounts",
      "addAccount",
      "detectTransferRestriction",
    ];

    clientPublicMethods.forEach(method => {
      it(`has public '${method}' method`, () => {
        expect(client[method]).toBeTruthy()
      })
    });
  });

  describe('`detectTransferRestriction` method', () => {
    let client: TokensoftSDK;
    beforeEach(() => {
      client = new TokensoftSDK('https://example.com', 'key', 'secret', new FakeWeb3());
    });

    // Reset FakeContract values after each test
    afterEach(() => {
      FakeContract.resetDefaults();
    });

    const testTx: Transaction = {
      tokenAddress: "abcde12345",
      fromWallet: "aaaaa",
      toWallet: "bbbbb",
      qtyBaseUnits: 5e8,
    };

    it('should throw when no ethereum provider provided', async () => {
      client = new TokensoftSDK('https://example.com', 'key', 'secret');
      expect(async () => await client.detectTransferRestriction(testTx))
        .rejects
        .toThrow(/No Ethereum client provided/);
    });

    it('should return [] when no transfer restrictions detected', async () => {
      const restrictions = await client.detectTransferRestriction(testTx);
      expect(restrictions).toMatchObject([]);
    });

    it('should return obstruction when transfer restriction detected', async () => {
      FakeContract.values.call.detectTransferRestriction = 1;
      FakeContract.values.call.messageForTransferRestriction = "Whitelist issue";
      const restrictions = await client.detectTransferRestriction(testTx);
      expect(restrictions).toMatchObject([{
        code: "1",
        text: "Whitelist issue",
      }]);
    });
  });
})
