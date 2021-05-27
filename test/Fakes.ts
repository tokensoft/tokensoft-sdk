import { Eth } from "../src";

export class FakeWeb3 implements Eth.Web3Interface {
  public eth = new FakeEth();
}

export class FakeEth implements Eth.EthInterface {
  public Contract = FakeContract;
}

export class FakeContract {
  public static values: { [k in keyof Eth.ContractMethod]: { [k: string]: any } } = {
    send: {},
    call: {
      detectTransferRestriction: 0,
      messageForTransferRestriction: "",
    },
    estimateGas: {},
    encodeABI: {},
  };
  public static resetDefaults() {
    FakeContract.values = {
      send: {},
      call: {
        detectTransferRestriction: 0,
        messageForTransferRestriction: "",
      },
      estimateGas: {},
      encodeABI: {},
    }
  }

  public methods: { [methodName: string]: (...args: Array<any>) => Eth.ContractMethod } = {};
  public constructor(protected abi: Array<Eth.AbiItem>, protected address?: string) {
    abi.forEach(item => {
      // All items in eth contract are called as functions, so create a function here
      this.methods[item.name!] = jest.fn(() => {
        // Create function for returning correct value when method is called
        const getReturn = (m: keyof Eth.ContractMethod, def?: any) => {
          return () => {
            let value: any = def;
            const values = FakeContract.values[m];
            if (values && typeof values[item.name!] !== "undefined") {
              value = values[item.name!];
            }

            if (value instanceof Error) {
              if (m === "encodeABI") {
                throw value;
              } else {
                return Promise.reject(value);
              }
            } else {
              return m === "encodeABI" ? value : Promise.resolve(value);
            }
          }
        }

        return <Eth.ContractMethod><any>{
          send: jest.fn(getReturn("send")),
          call: jest.fn(getReturn("call")),
          estimateGas: jest.fn(getReturn(
            "estimateGas",
            Promise.resolve(Math.round(Math.random()*1e8)))
          ),
          encodeABI: jest.fn(getReturn("encodeABI", "abcde12345")),
        }
      });
    });
  }
}

