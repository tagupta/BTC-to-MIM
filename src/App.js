import React from 'react';
import Web3 from "web3";
import "./App.css";
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import 'bootstrap/dist/css/bootstrap.min.css';
import styled from 'styled-components';

import RenJS from "@renproject/ren";
import { Bitcoin, Ethereum } from "@renproject/chains";
import {utils} from 'ethers';

import ABI from "./json/ABI.json"; //json of basic contract
import RENERC20 from "./json/RenERC20.json";
import MoneyToCurve from './json/MoneytoCurve.json';

import Header from './components/Header/Header';
import Balance from './components/Balance/Balance';
import Message from './components/Message/Message';
import Footer from './components/Footer/Footer';

const contractAddress = "0xbdfdDa6842E8F3d18BE52d558a07dc69004d7e6C"; // basic contract
///const curveCRVAddress = "0x6C0aF5282BE21338BcCB2A78fE516EA8A3530d35";
const defiAddress  = "0x0853bcC18a24036e4C3BFbff576401282CD26D24";
const wBTCAddress = "0x90b5d4793552885686dA58289a0507D584Fde8FB";

const AppDiv = styled.div`
font-family: monospace;
color: #b406c4;
`;

const toFixed = (x) => {
  if (Math.abs(x) < 1.0) {
    var e = parseInt(x.toString().split('e-')[1]);
    if (e) {
        x *= Math.pow(10,e-1);
        x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
    }
  } else {
    var ee = parseInt(x.toString().split('+')[1]);
    if (ee > 20) {
        ee -= 20;
        x /= Math.pow(10,ee);
        x += (new Array(ee+1)).join('0');
    }
  }
  return x;
}

class App extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      balance : 0,      
      message : '',
      error : '',
      renJS: new RenJS("testnet", { useV2TransactionFormat: true }),
      isOpen: false,
      disableWithdraw: true,
      maxDeposit: 0,
      userShare: "",
    };
  }
  
  componentDidMount = async () =>{
    let web3Provider;
    if (window.ethereum) {
      web3Provider = window.ethereum;
      try {
        await window.ethereum.enable();
      } catch (error) {
        this.logError("Please allow access to your Web3 wallet.");
        return;
      }
    } else if (window.web3) {
      web3Provider = window.web3.currentProvider;
    }
    else {
      this.logError("Please install MetaMask!");
      return;
    }
    
    const web3 =  new Web3(web3Provider);
    const address = (await web3.eth.getAccounts())[0];
    const networkID = await web3.eth.net.getId();
    if (networkID !== 42) {
      this.logError("Please set your network to Kovan.");
      return;
    }
  
    this.setState({web3, address}, () => {
      this.updateBalance();
    });
  }

  updateBalance = async () => {
   
    const {web3,address} = this.state;
    const basicContract = new web3.eth.Contract(ABI, contractAddress);
    const renAddress = await basicContract.methods.getRenERC20().call();
  
    this.setState({renAddress , basicContract});
    console.log("renBTCAddress: "+ renAddress);
    this.log("Connected Account: "+ address);
  }

  handleTBTCBalance = async () => {
    const {address, basicContract} = this.state;
    const balance = await basicContract.methods.userBalance(address).call();
    this.setState({balance: parseInt(balance.toString()) / 10 ** 8});
  }

  deposit = async (amount) => {
    const { address, web3, basicContract, renJS } = this.state;
    this.log(`Generating deposit address...`);

    const nonce = utils.keccak256(Buffer.from("1"));
    const mint = await renJS.lockAndMint({
      asset: "BTC",
      from: Bitcoin(),
      to: Ethereum(web3.currentProvider).Contract({
        sendTo: contractAddress,
        contractFn: "temporaryMint",
        contractParams: [
          {
            name: "to",
            type: "address",
            value: address,
          },
          {
            name: "nonce",
            type: "bytes32",
            value: nonce,
          }
        ],
      }),
    });

    this.log(`Deposit ${amount} BTC to ${mint.gatewayAddress}`);

    mint.on("deposit", async (deposit) => {
    
      const hash = deposit.txHash();
      const depositLog = (msg) =>
        { 
          this.setState({isOpen: true});
          this.log(
            `BTC deposit: ${Bitcoin.utils.transactionExplorerLink(
              deposit.depositDetails.transaction,
              "testnet"
            )}\n
            RenVM Hash: ${hash}\n
            Status: ${deposit.status}\n
            ${msg}`
          );
        }
    
      await deposit
        .confirmed()
        .on("target", (target) => depositLog(`0/${target} confirmations`))
        .on("confirmation", (confs, target) =>
          depositLog(`${confs}/${target} confirmations`)
        );
    
      await deposit
        .signed()
        // Print RenVM status - "pending", "confirming" or "done".
        .on("status", (status) => depositLog(`Status: ${status}`));
    
      const tx = await deposit.queryTx()
        if (tx.out && !tx.out.revert) {
          await basicContract.methods.temporaryMint(address, nonce, 'BTC', tx.out.amount.toString(), tx.out.nhash, tx.out.signature).send({from: address},(error,txHash)=>{
            if(error){
              this.logError(error);
              this.handleClose();
            }
            else {
              this.log('BTCs on ETH are minted');
              //here's the logic for depositing renBTC to curve
              this.mintingCRV();
            }
          })
        } else {
          this.handleClose();
          throw new Error('revert was present on the out')
        }
    
      this.log(`Deposited ${amount} BTC.`);
    });
  }

  mintingCRV = async () => {
    const { address, web3, renAddress, basicContract } = this.state;
    const renBTC = await new web3.eth.Contract(RENERC20, renAddress,{from: address});
    const wBTC = await new web3.eth.Contract(RENERC20, wBTCAddress, {from: address});
    const renBTCToCRV = await new web3.eth.Contract(MoneyToCurve,defiAddress,{from:address});

    var renBalance = await basicContract.methods.userBalance(address).call();
    var _renBalance = 0;
    console.log("renBTC old balance: " + renBalance);
    var time = 0
    var interval = setInterval(async () => {
      time += 1000;
      _renBalance = await basicContract.methods.userBalance(address).call();
      if(_renBalance > renBalance){
        clearInterval(interval);
        console.log("renBTC Balance after minting: " + _renBalance/ 10 ** 8);
        await renBTC.methods.approve(defiAddress, _renBalance).send({from: address},(error,txHash)=>{
          if(error){
              this.logError(error);
              this.handleClose();
          }
          else{
            this.log("Approval: 1/2");
          }
        });

        await wBTC.methods.approve(defiAddress,0).send({from: address},(error,txHash)=>{
          if(error){
              this.logError(error);
              this.handleClose();
          }
          else{
             this.log("Approval: 2/2");
          }
        });

        await renBTCToCRV.methods.multiStepDeposit([_renBalance,0]).send({from: address},(error,txHash)=>{
          if(error){
            this.logError(error);
            this.handleClose();
          }
          else{ 
            this.log(`Deposited ${_renBalance/10 ** 8} renBTC.`);
            this.handleClose();
          }
        });

      }
      console.log("time: "+ time);
    }, 1000);
  }

  withdraw = async(withdrawalAmt) =>{
    this.setState({isOpen: true});
    this.logError(""); // Reset error.

    const { address, web3, renAddress, renJS } = this.state;
    const renBTCToCRV = await new web3.eth.Contract(MoneyToCurve,defiAddress,{from:address});
    const maxDeposit = await renBTCToCRV.methods.rbtcDeposits(address).call();

    if(withdrawalAmt <= (maxDeposit/10 ** 8)){
      withdrawalAmt = withdrawalAmt * (10 ** 8);
     
      if(withdrawalAmt > 0){
        await renBTCToCRV.methods.multiStepWithdraw([withdrawalAmt.toString(),"0"]).send({from: address},(error,txHash)=>{
          if(error){
            this.logError(error);
            this.handleClose();
          }
          else{
            this.log(`Liquidity ${withdrawalAmt} extracted is.`);
          }
        });
      }
      else{
        alert('Please enter correct value');
        this.handleClose();
        return;
      }
      
      const renBTC = await new web3.eth.Contract(RENERC20, renAddress,{from: address});
      await renBTC.methods.approve(contractAddress, withdrawalAmt).send({from:address},(error,txHash)=>{
        if(error){
          this.logError(error);
          this.handleClose();
        }
        else{
          this.log('Approval: 1/1');
        }
      });
  
      const recipient = prompt("Enter BTC recipient:");
      const amount = withdrawalAmt / (10 ** 8);
  
      const burnAndRelease = await renJS.burnAndRelease({
        asset: "BTC",
        to: Bitcoin().Address(recipient),
        from: Ethereum(web3.currentProvider).Contract((btcAddress) => ({
          sendTo: contractAddress,
    
          contractFn: "temporaryBurn",
    
          contractParams: [
            {
              type: "bytes",
              name: "_msg",
              value: Buffer.from(`Withdrawing ${amount} BTC`),
            },
            {
              type: "bytes",
              name: "_to",
              value: btcAddress,
            },
            {
              type: "uint256",
              name: "_amount",
              value: renJS.utils.toSmallestUnit(amount, 8),
            },
            {
              type: 'address',
              name: 'from',
              value: address
            }
          ],
        })),
      });
  
      let confirmations = 0;
      
      await burnAndRelease
      .burn()
      // Ethereum transaction confirmations.
      .on("confirmation", (confs) => {
        confirmations = confs;
      })
      // Print Ethereum transaction hash.
      .on("transactionHash", (txHash) => this.log(`txHash: ${String(txHash)}`));
  
      await burnAndRelease
        .release()
        // Print RenVM status - "pending", "confirming" or "done".
        .on("status", (status) =>
          status === "confirming"
            ? this.log(`${status} (${confirmations}/15)`)
            : this.log(status)
        )
        // Print RenVM transaction hash
        .on("txHash", this.log);
  
      this.log(`Withdrew ${amount} BTC to ${recipient}.`);
    }
    else{
      alert('Please enter correct value');
      this.handleClose();
    }
    this.handleClose();
  }

  logError = (error) => {
  console.error(error);
  this.setState({error: String((error || {}).message || error)});
  };

  log = (message) => {
    this.setState({message});
  };

  handleClose = () => {
    this.setState({isOpen: false});
  };

  handleToggle = () => {
    const {isOpen}  = this.state;
    this.setState({isOpen: !isOpen});
  };

  handleFetch = async () =>{
    this.setState({isOpen: true});
    const {address,web3} = this.state;
    const renBTCToCRV = await new web3.eth.Contract(MoneyToCurve,defiAddress,{from:address});
    // await renBTCToCRV.methods.crvTokenClaim().send((error,txHash) => {
    //   if(error){
    //     this.logError(error);
    //     this.handleClose();
    //     return;
    //   }
    //   else{
    //     this.log("Calculating your share of CRVs");
    //   }
    // });

    var crvResult = await renBTCToCRV.methods.fetchCRVShare().call({from: address});
    const {0: ratio, 1: crvAmount} = crvResult;
    var _ratio = ratio / 10**18;
    var share = parseFloat((_ratio * crvAmount)/10**18);
    this.setState({userShare: toFixed(share)});
    this.handleClose();
  };
  
  handleClaim = async () => {
    this.setState({isOpen: true});
    const {address,web3} = this.state;
    const renBTCToCRV = await new web3.eth.Contract(MoneyToCurve,defiAddress,{from:address});
    await renBTCToCRV.methods.claimCRV().send({from: address},(error,txHash) => {
      if(error){
        this.logError(error);
        this.handleClose();
      }
      else{
        this.log("Please check your wallet for CRVs");
        this.handleClose();
      }
    });
  }

  handleMax = async () => {
    this.setState({isOpen: true});
    const {address,web3} = this.state;
    const renBTCToCRV = await new web3.eth.Contract(MoneyToCurve,defiAddress,{from:address});
    const max = await renBTCToCRV.methods.rbtcDeposits(address).call();
    this.setState({maxDeposit: max/10 ** 8});
    this.handleClose();
  }

  render = () => {
    const { message, error, isOpen ,maxDeposit, userShare} = this.state;
    return (
      <AppDiv>
        <Header/>
        <Balance renBTC = {maxDeposit}
                 handleMax = {this.handleMax}
                 handleCRVBalance = {this.handleCRVBalance} 
                 deposit = {this.deposit}
                 withdraw = {this.withdraw}
                 logError = {this.logError}
                 /> 
        <Message msg = {message} err = {error}/>

        <Footer fetch={this.handleFetch} claim={this.handleClaim} userShare={userShare}/>

        <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                  open={isOpen}>
          <CircularProgress color="inherit" />
        </Backdrop>
          
      </AppDiv>
    );
  };

}
export default App;