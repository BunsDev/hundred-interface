import React, {useRef, useEffect, useState} from "react"
import { Tab, TabContent, TabContentItem, TabHeader, TabHeaderItem } from "../../TabControl/tabControl";
import TextBox from "../../Textbox/textBox";
import MarketDialogButton from "./marketDialogButton";
import DialogMarketInfoSection from "./marketInfoSection";
import "./supplyMarketDialog.css"
import MarketDialogItem from "./marketDialogItem";
import BorrowRateSection from "./borrowRateSection";
import BorrowLimitSection2 from "./borrowLimitSection2";
import { Spinner } from "../../../assets/huIcons/huIcons";
import { CTokenInfo } from "../../../Classes/cTokenClass";
import { BigNumber } from "../../../bigNumber";
import { GeneralDetailsData } from "../../../Classes/generalDetailsClass"
import closeIcon from "../../../assets/icons/closeIcon.png"


interface Props{
    closeBorrowMarketDialog : () => void,
    market: CTokenInfo | null,
    generalData: GeneralDetailsData | null,
    spinnerVisible: boolean,
    open: boolean,
    darkMode: boolean,
    getMaxAmount: (market: CTokenInfo) => Promise<BigNumber>,
    getMaxRepayAmount: (market: CTokenInfo) => BigNumber,
    handleBorrow: (symbol: string, amount: string) => Promise<void>,
    handleRepay: (symbol: string, amount: string, fullRepay: boolean) => Promise<void>,
    handleEnable: (symbol: string, borrowDialog: boolean) => Promise<void>
}
const BorrowMarketDialog: React.FC<Props> = (props : Props) =>{
    const ref = useRef<HTMLDivElement | null>(null)
    const [borrowInput, setBorrowInput] = useState<string>("")
    const [repayInput, setRepayInput] = useState<string>("")
    const [borrowValidation, setBorrowValidation] = useState<string>("")
    const [repayValidation, setRepayValidation] = useState<string>("")
    const [tabChange, setTabChange] = useState<number>(1)
    const [isFullRepay, setIsFullRepay] = useState<boolean>(false);

    const CloseDialog = () : void =>{
        setBorrowInput("")
        setRepayInput("")
        setBorrowValidation("")
        setRepayValidation("")
        setIsFullRepay(false)
        setTabChange(1)
        props.closeBorrowMarketDialog()
    }

    useEffect(()=>{
        const handleBorrowAmountChange = () => {
            if(borrowInput === ""){
                setBorrowValidation("")
                return;
            }

            if(isNaN(+borrowInput)){
                setBorrowValidation("Amount must be a number");
            }else if (+borrowInput <= 0) {
              setBorrowValidation("Amount must be > 0");
            } else if (props.market && props.generalData && +BigNumber.parseValue(borrowInput).mul(props.market?.underlyingPrice).toString() > +props.generalData?.totalBorrowLimit.toString()) {
              setBorrowValidation("Amount must be <= borrow limit");
            }else if (props.market && +BigNumber.parseValue(borrowInput).toString() > +props.market?.underlyingAmount.toString()) {
                setBorrowValidation("Amount must be <= liquidity");
            } else {
              setBorrowValidation("");
            }
        };
        
          handleBorrowAmountChange()
          // eslint-disable-next-line
    }, [borrowInput])

    useEffect(()=>{
        const handleRepayAmountChange = () => {
            if(repayInput===""){
                setRepayValidation("")
                return
            }
            
            if(isNaN(+repayInput)){
                setRepayValidation("Amount must be a number")
                return
            }
            const amount = BigNumber.parseValue(repayInput)
            if (+repayInput <= 0) {
                setRepayValidation("Amount must be > 0");
            } else if (!isFullRepay && props.market &&
                amount.gt(props.market?.borrowBalanceInTokenUnit)) {
                setRepayValidation("Amount must be <= your borrow balance");
              } else if (props.market && amount.gt(props.market?.walletBalance)) {
                setRepayValidation("Amount must be <= balance");
              } else {
                setRepayValidation("");
              }
        };
        
        handleRepayAmountChange()
          // eslint-disable-next-line
    }, [repayInput])

    useEffect(() => {
        /**
         * Alert if clicked on outside of element
         */
        
        const CloseDialog = () : void =>{
            if(props.spinnerVisible)
                return
            setBorrowInput("")
            setRepayInput("")
            setBorrowValidation("")
            setRepayValidation("")
            setIsFullRepay(false)
            setTabChange(1)
            props.closeBorrowMarketDialog()
        }

        if(props.open){
            document.getElementsByTagName("body")[0].style.overflow = 'hidden'
        }
        else{
            document.getElementsByTagName("body")[0].style.overflow = 'auto'
        }

        function handleClickOutside(event : any) : void {
            if (ref && ref.current && !ref.current.contains(event.target)) {
                CloseDialog()
            }
        }

        // Bind the event listener
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref, props]);

    const handleMaxRepay = async () => {
        const maxAffordable = props.market ? await props.getMaxAmount(
            props.market) : BigNumber.from("0")
          const fullRepayAmount = props.market ? props.getMaxRepayAmount(
            props.market) : BigNumber.from("0")
          const isFull = maxAffordable.gte(fullRepayAmount);
          setIsFullRepay(isFull);
          setRepayInput( BigNumber.minimum(
              maxAffordable,
              fullRepayAmount
            ).toString());
    }

    const handleMaxBorrow = async () => {
        if(props.generalData && props.market){
            const balance = (+props.generalData.totalBorrowLimit.toString() - +props.generalData.totalBorrowBalance.toString()) / +props.market.underlyingPrice.toString() / 2
            const amount = +props.market.underlyingAmount.toString() / 2
            if (balance > amount)
                setBorrowInput(BigNumber.parseValue(amount.toFixed(18)).toString())
            else
                setBorrowInput(BigNumber.parseValue(balance.toFixed(18)).toString())
        }
        else setBorrowInput("0")
        // const balance = props.generalData && props.market ? 
        //         (props.generalData?.totalBorrowLimit?.sub(props.generalData?.totalBorrowBalance)).div(props.market?.underlyingPrice) : BigNumber.from("0") //new BigNumber(props.generalData?.totalBorrowLimit.minus(props.generalData?.totalBorrowBalance)).div(props.market?.underlyingPrice).div(2).decimalPlaces(18)
        // if(props.market && balance.gt(props.market?.underlyingAmount))
        //     setBorrowInput(props.market?.underlyingAmount.toString())
        // else
        // setBorrowInput(balance.toString())
    }

    return (
        props.open ? (
            <div className={`dialog ${props.open ? "open-dialog" : ""}`}>
                <div ref={ref} className="supply-box">
                    <img src={closeIcon} alt="Close Icon" className="dialog-close" onClick={()=>CloseDialog()} />  
                    <div className="dialog-title">
                        {props.market?.symbol && (
                        <img
                            className="rounded-circle"
                            style={{ width: "30px", margin: "0px 10px 0px 0px" }}
                            src={props.market?.logoSource}
                            alt=""/>)}
                        {`${props.market?.symbol}`}
                    </div>
                    <Tab>
                        <TabHeader tabChange = {tabChange}>
                            <TabHeaderItem tabId={1} title="Borrow" tabChange = {tabChange} setTabChange = {setTabChange}/>
                            <TabHeaderItem tabId={2} title="Repay" tabChange = {tabChange} setTabChange = {setTabChange}/>
                        </TabHeader>
                        <TabContent>
                            <TabContentItem open={props.open} tabId={1} tabChange={tabChange}>
                                <TextBox placeholder={`0 ${props.market?.symbol}`} value={borrowInput} setInput={setBorrowInput} validation={borrowValidation} button={"MAX"}
                                onClick={ () => handleMaxBorrow()}/>
                                <BorrowRateSection market={props.market} darkMode={props.darkMode}/>
                                <BorrowLimitSection2 generalData={props.generalData} market = {props.market}
                                    borrowAmount={borrowInput} repayAmount={"0"}/>
                                <DialogMarketInfoSection market={props.market} collateralFactorText={"Liquidation Threshold"}/>
                                <MarketDialogButton disabled={(!borrowInput || borrowValidation || props.market?.borrowSpinner) ? true : false}
                                    onClick={() => {  props.market ? props.handleBorrow(
                                                            props.market?.symbol,
                                                            borrowInput
                                                        ) : null
                                                    }}>
                                    {props.market?.borrowSpinner ? (<Spinner size={"20px"}/>) :"Borrow"}
                                </MarketDialogButton>
                                <MarketDialogItem title={"You Borrowed"} value={`${props.market?.borrowBalanceInTokenUnit?.toRound(4)} ${props.market?.symbol}`}/>
                            </TabContentItem>
                            <TabContentItem open={props.open} tabId={2} tabChange={tabChange}>
                                <TextBox placeholder={`0 ${props.market?.symbol}`} value={repayInput} setInput={setRepayInput} validation={repayValidation} button={"MAX"}
                                 onClick={ ()=> handleMaxRepay()} onChange={()=>setIsFullRepay(false)}/>
                                <BorrowRateSection market={props.market} darkMode={props.darkMode}/>
                                <BorrowLimitSection2 generalData={props.generalData} market = {props.market}
                                    borrowAmount={"0"} repayAmount={repayInput}/>
                                <DialogMarketInfoSection market={props.market} collateralFactorText={"Liquidation Threshold"}/>
    
                                    {props.market && props.market?.underlyingAllowance?.gt(BigNumber.from("0")) &&
                                     props.market?.underlyingAllowance?.gte(repayInput==="" ? BigNumber.from("0") : BigNumber.parseValue(repayInput)) ? 
                                     (
                                        <MarketDialogButton disabled={(!repayInput || repayValidation || props.market?.repaySpinner) ? true : false}
                                            onClick={() => {props.market ? props.handleRepay(
                                                        props.market?.symbol,
                                                        repayInput,
                                                        isFullRepay) : null}}>
                                            {props.market?.repaySpinner? (<Spinner size={"20px"}/>) : "Repay"}
                                        </MarketDialogButton>
                                    ) : (
                                        <MarketDialogButton disabled={(props.market && props.market?.repaySpinner) ? true : false} onClick={() => {props.market ? props.handleEnable(
                                                                                props.market?.symbol, true) : null}}>
                                            {props.market?.repaySpinner ? (<Spinner size={"20px"}/>) : `Approve ${props.market?.symbol}`}
                                        </MarketDialogButton>)}
                                
                                        <MarketDialogItem title={"Wallet Ballance"} 
                                    value={`${props.market?.walletBalance?.toRound(4)} ${props.market?.symbol}`}/>
                            </TabContentItem>
                        </TabContent>
                    </Tab>
                </div>
            </div>) : null
    )
}

export default BorrowMarketDialog