import { BigNumber, ethers, utils } from "ethers"
import { CTOKEN_ABI, MKR_TOKEN_ABI, TOKEN_ABI } from "../abi"
import Logos from "../logos"
import { Network } from "../networks"
import { Comptroller } from "./comptrollerClass"

const blockTime = 2.1 // seconds
const mantissa = 1e18 // mantissa is the same even the underlying asset has different decimals
const blocksPerDay = (24 * 60 * 60) / blockTime
const daysPerYear = 365

export class CTokenInfo{
    pTokenAddress: string
    underlyingAddress: string | null
    symbol: string
    logoSource: string
    supplyApy: BigNumber
    borrowApy: BigNumber
    underlyingAllowance: ethers.BigNumber
    walletBalance: ethers.BigNumber
    supplyBalanceInTokenUnit: ethers.BigNumber
    supplyBalance: ethers.BigNumber
    marketTotalSupply: ethers.BigNumber
    borrowBalanceInTokenUnit: ethers.BigNumber
    borrowBalance: ethers.BigNumber
    marketTotalBorrowInTokenUnit: ethers.BigNumber
    marketTotalBorrow: ethers.BigNumber
    isEnterMarket: boolean
    underlyingAmount: ethers.BigNumber
    underlyingPrice: ethers.BigNumber
    liquidity: ethers.BigNumber
    collateralFactor: ethers.BigNumber
    pctSpeed: ethers.BigNumber
    decimals: number
    spinner: boolean
    supplySpinner: boolean
    withdrawSpinner: boolean
    borrowSpinner: boolean
    repaySpinner: boolean
    isNativeToken: boolean

    constructor(pTokenAddress: string,
                underlyingAddress: string | null,
                symbol: string,
                logoSource: string,
                supplyApy: BigNumber,
                borrowApy: BigNumber,
                underlyingAllowance: ethers.BigNumber,
                walletBalance: ethers.BigNumber,
                supplyBalanceInTokenUnit: ethers.BigNumber,
                supplyBalance: ethers.BigNumber,
                marketTotalSupply: ethers.BigNumber,
                borrowBalanceInTokenUnit: ethers.BigNumber,
                borrowBalance: ethers.BigNumber,
                marketTotalBorrowInTokenUnit: ethers.BigNumber,
                marketTotalBorrow: ethers.BigNumber,
                isEnterMarket: boolean,
                underlyingAmount: ethers.BigNumber,
                underlyingPrice: ethers.BigNumber,
                liquidity: ethers.BigNumber,
                collateralFactor: ethers.BigNumber,
                pctSpeed: ethers.BigNumber,
                decimals: number,
                isNativeToken: boolean){
        this.pTokenAddress= pTokenAddress
        this.underlyingAddress= underlyingAddress
        this.symbol= symbol
        this.logoSource= logoSource
        this.supplyApy= supplyApy
        this.borrowApy= borrowApy
        this.underlyingAllowance= underlyingAllowance
        this.walletBalance= walletBalance
        this.supplyBalanceInTokenUnit= supplyBalanceInTokenUnit
        this.supplyBalance= supplyBalance
        this.marketTotalSupply= marketTotalSupply
        this.borrowBalanceInTokenUnit= borrowBalanceInTokenUnit
        this.borrowBalance= borrowBalance
        this.marketTotalBorrowInTokenUnit= marketTotalBorrowInTokenUnit
        this.marketTotalBorrow= marketTotalBorrow
        this.isEnterMarket= isEnterMarket
        this.underlyingAmount= underlyingAmount
        this.underlyingPrice= underlyingPrice
        this.liquidity= liquidity
        this.collateralFactor= collateralFactor
        this.pctSpeed= pctSpeed
        this.decimals= decimals
        this.isNativeToken = isNativeToken
        this.spinner = false
        this.supplySpinner = false
        this.withdrawSpinner = false
        this.borrowSpinner = false
        this.repaySpinner = false
    }
}

class UnderlyingInfo{
      address: string
      symbol: string
      name: string
      decimals: number
      totalSupply: number
      logo: string
      price: BigNumber
      walletBalance: BigNumber
      allowance: BigNumber

      constructor(address: string, symbol: string, name: string, decimals: number, totalSupply: number, logo: string, price: BigNumber, walletBalance: BigNumber, allowance: BigNumber){
        this.address = address 
        this.symbol = symbol
        this.name = name 
        this.decimals = decimals 
        this.totalSupply = totalSupply 
        this.logo = logo 
        this.price = price 
        this.walletBalance = walletBalance 
        this.allowance = allowance 
      }
}

export const getCtokenInfo = async (address : string, isNativeToken : boolean, provider: ethers.providers.Web3Provider, userAddress: string, comptrollerData: Comptroller, network: Network) : Promise<CTokenInfo>=> {
    const ctoken = new ethers.Contract(address, CTOKEN_ABI, provider)
    const underlyingAddress = isNativeToken ? null : await ctoken.underlying()
    const underlying = await getUnderlying(underlyingAddress, address, comptrollerData, provider,userAddress, network)
    const decimals = underlying.decimals
    const underlyingPrice = underlying.price

    const accountSnapshot = await ctoken.getAccountSnapshot(userAddress)
    const supplyBalanceInTokenUnit = BigNumber.from(accountSnapshot[1].toString()).mul(BigNumber.from(accountSnapshot[3].toString()))
    const supplyBalance = supplyBalanceInTokenUnit.mul(underlyingPrice)

    const borrowBalanceInTokenUnit = BigNumber.from(accountSnapshot[2].toString())
    const borrowBalance = borrowBalanceInTokenUnit.mul(underlyingPrice)

    const cTokenTotalSupply = await ctoken.totalSupply()
    const exchangeRateStored = await ctoken.exchangeRateStored()
    const marketTotalSupply = cTokenTotalSupply.mul(exchangeRateStored.toString()).mul(underlyingPrice)

    const totalBorrows = await ctoken.totalBorrows()
    const marketTotalBorrowInTokenUnit = totalBorrows
    const marketTotalBorrow = totalBorrows?.mul(underlyingPrice)

    const isEnterMarket = comptrollerData.enteredMarkets.includes(address);

    const markets = await comptrollerData.comptroller.markets(address)

    const collateralFactor: BigNumber = BigNumber.from(markets.collateralFactorMantissa.toString())
    
    const supplyRatePerBlock: BigNumber = await ctoken.supplyRatePerBlock()
    const supplyApy = utils.parseUnits((Math.pow((supplyRatePerBlock.toNumber() / mantissa) * blocksPerDay + 1, daysPerYear - 1) - 1).toFixed(36-decimals), 36-decimals)

    const borrowRatePerBlock: ethers.BigNumber = await ctoken.borrowRatePerBlock()
    const borrowApy = utils.parseUnits((Math.pow((borrowRatePerBlock.toNumber() / mantissa) * blocksPerDay + 1, daysPerYear - 1) - 1).toFixed(36-decimals), 36-decimals)

    const cash: BigNumber = await ctoken.getCash() 
    const underlyingAmount = cash;

    const liquidity = underlyingAmount.mul(underlyingPrice)
    
    const underlyingAllowance = underlying.allowance
    
    const speed = await comptrollerData.comptroller.compSpeeds(address)
    const pctSpeed = speed;

    return new CTokenInfo(
      address,
      underlyingAddress,
      underlying.symbol,
      underlying.logo,
      supplyApy,
      borrowApy,
      underlyingAllowance,
      underlying.walletBalance,
      supplyBalanceInTokenUnit,
      supplyBalance,
      marketTotalSupply,
      borrowBalanceInTokenUnit,
      borrowBalance,
      marketTotalBorrowInTokenUnit,
      marketTotalBorrow,
      isEnterMarket,
      underlyingAmount,
      underlyingPrice,
      liquidity,
      collateralFactor,
      pctSpeed,
      decimals,
      isNativeToken
    )
  }

  const getUnderlying = async (underlyingAddress: string, ptoken: string, comptrollerData: Comptroller, provider: ethers.providers.Web3Provider, userAddress: string, network: Network) => {  
    if (!underlyingAddress)
      return await getNativeTokenInfo(ptoken, comptrollerData, provider, userAddress, network)
    else if (underlyingAddress.toLowerCase() === "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2")
      return await getMakerInfo(underlyingAddress, ptoken, comptrollerData, provider, userAddress)
    else 
      return await getTokenInfo(underlyingAddress, ptoken, comptrollerData, provider, userAddress)
  }

  const getNativeTokenInfo = async (ptoken: string, comptrollerData: Comptroller, provider: ethers.providers.Web3Provider, userAddress: string, network: Network) : Promise<UnderlyingInfo> => {
    return new UnderlyingInfo(
      "0x0",
      network.symbol,
      network.name,
      18,
      0,
      Logos[network.symbol],
      await comptrollerData.oracle.getUnderlyingPrice(ptoken),
      await provider.getBalance(userAddress),
      ethers.constants.MaxUint256,
    )
  }

  const getTokenInfo = async(address: string, ptoken: string, comptrollerData: Comptroller, provider: ethers.providers.Web3Provider, userAddress: string) : Promise<UnderlyingInfo> => {
    const contract = new ethers.Contract(address, TOKEN_ABI, provider)
    const symbol = await contract.symbol()
    const logo = Logos[symbol]
    let price = ethers.BigNumber.from("0")
    try{
      price = await comptrollerData.oracle.getUnderlyingPrice(ptoken)
    }
    catch(err){
      console.log(address)
      console.log(err)
    }
    const token = new UnderlyingInfo(
      address,
      symbol,
      await contract.name(),
      await contract.decimals(),
      await contract.totalSupply(),
      logo, //`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`,
      price,
      await contract.balanceOf(userAddress),
      await contract.allowance(userAddress, ptoken)
    )
    return token
  }

  const getMakerInfo = async (address: string, ptoken: string, comptrollerData: Comptroller, provider: ethers.providers.Web3Provider, userAddress: string): Promise<UnderlyingInfo> => {
    const contract = new ethers.Contract(address, MKR_TOKEN_ABI, provider)
    const decimals = await contract.decimals()
    return new UnderlyingInfo(
      address,
      ethers.utils.parseBytes32String(await contract.symbol()),
      ethers.utils.parseBytes32String(await contract.name()),
      decimals/1,
      await contract.totalSupply(),
      Logos["MKR"],
      await comptrollerData.oracle.getUnderlyingPrice(ptoken),
      await contract.balanceOf(userAddress),
      await contract.allowance(userAddress, ptoken)
    )
  }