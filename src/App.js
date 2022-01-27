import React from 'react';
import Web3 from "web3";
import "./App.css";
import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import 'bootstrap/dist/css/bootstrap.min.css';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import RenJS from "@renproject/ren";
import { Bitcoin, Ethereum } from "@renproject/chains";
import {utils} from 'ethers';
import {ethers} from 'ethers';


import ABI from "./json/ABI.json"; //json of basic contract
import RENERC20 from "./json/RenERC20.json";
import MoneyToCurve from './json/MoneytoCurve.json';
import Booster from './json/Booster.json';
import MIM from './json/MIM.json';

import Welcome from './components/Welcome/Welcome';
import Header from './components/Header/Header';
import Balance from './components/Balance/Balance';
import Message from './components/Message/Message';
import Footer from './components/Footer/Footer';

const contractAddress = "0x0095B4DAc18654bc59c38943feE47C92c51C6D62"; // basic contract
///const curveCRVAddress = "0x6C0aF5282BE21338BcCB2A78fE516EA8A3530d35";
//const owner = "0x9C87885Dfe734F274Da768EC985768C483BB89fa";
const defiAddress  = "0x5CA2B97161Fa8184D18ebB74838ed46eD3A3B2bF";
const wBTCAddress = "0x87F922881dA425220CC99F79A65D9C643912530E";
const cauldronAddress = "0xc69055B7E0FC1a00A6Ac426999bcb9FCc1B8B16f"
const mimAddress = "0xd8e49E22C250B71aB479f93b6a95eA0dA575B758";
const boosterAddress = "0xf0E16a8914F0a93aD97D1165c4EBd726A30961B6";

const AppDiv = styled.div`
font-family: monospace;
color: #b406c4;
`;

function addZeroToString(str1, str2){
  while (str1.length > str2.length) {
      str2 = "0" + str2;
  }
  return str2;
}

function addTwoBigNumbers(a, b) {
  if (a.length > b.length) {
      b = addZeroToString(a,b);
  } else {
      a = addZeroToString(b,a);
  }
  var a1 = a.split("");
  let sum = 0;
  let carry = 0;
  let array = [];
  for (var i = a1.length-1; i >= 0; i--) {
      sum = parseInt(a[i]) + parseInt(b[i]) + parseInt(carry);
      if (sum >= 10) {
          carry = 1;
          sum = sum - 10;
      } else {
          carry = 0;
      }
      array.push(sum);
  }
  array.reverse().join("");
  return array.join("");
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
      openDetails: true,
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
      this.updates();
    });
  }

  updates = async () => {
   
    const {web3} = this.state;
    const basicContract = new web3.eth.Contract(ABI, contractAddress);
    const renAddress = await basicContract.methods.getRenERC20().call();
  
    this.setState({renAddress , basicContract});
    console.log("renBTCAddress: "+ renAddress);
    //this.log("Connected Account: "+ address);
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
              this.mintingMIM();
            }
          })
        } else {
          this.handleClose();
          throw new Error('revert was present on the out')
        }
    
      this.log(`Deposited ${amount} BTC.`);
    });
  }

  mintingMIM = async () => {
    const { address, web3, renAddress, basicContract } = this.state;
    const renBTC = await new web3.eth.Contract(RENERC20, renAddress,{from: address});
    const wBTC = await new web3.eth.Contract(RENERC20, wBTCAddress, {from: address});
    const renBTCToCRV = await new web3.eth.Contract(MoneyToCurve,defiAddress,{from:address});
    const booster = await new web3.eth.Contract(Booster,boosterAddress,{from: address});

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
          }
        });

        var _pool = await booster.methods.poolInfo(0).call();
        var mimCollateral = _pool.token;

        //Here the calling of cook funcion for abracadabra for borrowing MIM
        var cvxrencrvBalance = await renBTCToCRV.methods.cvxrencrvDeposits(address).call();
        //1 MIM = 1 USD
        //1 cvxrencrv = 42304.3455 MIM
        // Borrow balance for 25% collateralization ratio
        var mim_borrow = web3.utils.fromWei(cvxrencrvBalance.toString(),'ether') * 42304.3455 * 0.25;
        //ACTION_BENTO_SETAPPROVAL
        var data_0 = ethers.utils.defaultAbiCoder.encode( ["address","address", "bool"],[defiAddress, cauldronAddress, true]);
        //ACTION_BORROW
        var data_1 = ethers.utils.defaultAbiCoder.encode(["int256","address"],[web3.utils.toWei(mim_borrow.toString(),'ether'), defiAddress]);
        //ACTION_BENTO_WITHDRAW
        var data_2 = ethers.utils.defaultAbiCoder.encode(["address","address","int256","int256"],[mimAddress, defiAddress,web3.utils.toWei(mim_borrow.toString(),'ether'),0]);
        //ACTION_BENTO_DEPOSIT
        var data_3 = ethers.utils.defaultAbiCoder.encode(["address","address","int256","int256"],[mimCollateral, defiAddress,(cvxrencrvBalance).toString(),0]);
        //ACTION_ADD_COLLATERAL
        var data_4 = ethers.utils.defaultAbiCoder.encode(["int256","address","bool"],[1,defiAddress,false]);
        
        await renBTCToCRV.methods.cookCalling([24,5,21,20,10],[0,0,0,0,0],[data_0,data_1,data_2,data_3,data_4],false,0).send({from: address,value: 0},(error, txHash) => {
          if(error){
            this.logError(error);
            this.handleClose();
          }
          else{
            this.log('MIM deposited in your account');
          }
        });

      }
      console.log("time: "+ time);
    }, 1000);
    this.handleClose();
  }

  withdraw = async(withdrawalAmt) =>{
    this.setState({isOpen: true});
    this.logError(""); // Reset error.

    const { address, web3, renAddress, renJS } = this.state;
    const renBTCToCRV = await new web3.eth.Contract(MoneyToCurve,defiAddress,{from:address});
    const mim = await new web3.eth.Contract(MIM,mimAddress,{from: address});
    const booster = await new web3.eth.Contract(Booster,boosterAddress,{from: address});

    var mimBorrowed = await renBTCToCRV.methods.mimBorrowed(address).call();
    var _mimBorrowed = addTwoBigNumbers(mimBorrowed.toString(),(1 * 10 ** 18).toString());
    const maxDeposit = await renBTCToCRV.methods.rbtcDeposits(address).call();
    var _pool = await booster.methods.poolInfo(0).call();
    var mimCollateral = _pool.token;

    var cvxrencrvBalance = await renBTCToCRV.methods.cvxrencrvDeposits(address).call();
    var userMIMBalance = await mim.methods.balanceOf(address).call();

    if(withdrawalAmt >= (_mimBorrowed/10 ** 18) && withdrawalAmt <= (userMIMBalance/10**18)){
      withdrawalAmt = withdrawalAmt * (10 ** 18);
     
      if(withdrawalAmt > 0){

        await mim.methods.approve(defiAddress,_mimBorrowed).send({from: address},(error, txHash) => {
          if(error){
            this.logError(error);
            this.handleClose();
          }
          else{
            this.log(`Approving Dapp to use your MIM: 1/2`);
          }
        });

        //ACTION_BENTO_DEPOSIT
        var data_0 = ethers.utils.defaultAbiCoder.encode(["address","address","int256","int256"],[mimAddress,defiAddress,(_mimBorrowed).toString(),0]);
        
        //ACTION_REPAY
        var data_1 = ethers.utils.defaultAbiCoder.encode(["int256","address","bool"],[(mimBorrowed).toString(),defiAddress,false]);
      
        //ACTION_REMOVE_COLLATERAL
        var data_2 = ethers.utils.defaultAbiCoder.encode(["int256","address"],[1,defiAddress]);
        
        //ACTION_BENTO_WITHDRAW
        var data_3 = ethers.utils.defaultAbiCoder.encode(["address","address","int256","int256"],[mimCollateral,defiAddress,(cvxrencrvBalance).toString(),0]);

        await renBTCToCRV.methods.cookCalling([20,2,4,21],[0,0,0,0],[data_0,data_1,data_2,data_3],true,(_mimBorrowed).toString()).send({from: address, value: 0},(error, txHash) => {
          if(error){
            this.logError(error);
            this.handleClose();
          }
          else{
            this.log(`MIM extracted from your wallet`);
          }
        });

        await renBTCToCRV.methods.multiStepWithdraw([maxDeposit.toString(),"0"]).send({from: address},(error,txHash)=>{
          if(error){
            this.logError(error);
            this.handleClose();
          }
          else{
            this.log(`Liquidity ${maxDeposit} is extracted.`);
          }
        });
      }
      else{
        alert('Please enter correct value');
        this.handleClose();
        return;
      }
      
      const renBTC = await new web3.eth.Contract(RENERC20, renAddress,{from: address});
      await renBTC.methods.approve(contractAddress, maxDeposit).send({from:address},(error,txHash)=>{
        if(error){
          this.logError(error);
          this.handleClose();
        }
        else{
          this.log('Approval: 2/2');
        }
      });
  
      const recipient = prompt("Enter BTC recipient:");
      const amount = maxDeposit / (10 ** 8);
  
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

  handleMax = async () => {
    this.setState({isOpen: true});
    const {address,web3} = this.state;
    const renBTCToCRV = await new web3.eth.Contract(MoneyToCurve,defiAddress,{from:address});
    var mimBorrowed = await renBTCToCRV.methods.mimBorrowed(address).call();
    var _mimBorrowed = addTwoBigNumbers(mimBorrowed.toString(),(1 * 10 ** 18).toString());
    const max = _mimBorrowed
    this.setState({maxDeposit: max/10 ** 18});
    this.handleClose();
  }

  handleUserMimBalance = async () => {
    const {address,web3} = this.state;
    const mimm = await new web3.eth.Contract(MIM,mimAddress,{from: address});
    var userMIMBalance = await mimm.methods.balanceOf(address).call();
    var tokens = new BigNumber(userMIMBalance).dividedBy(10 ** 18);
    this.setState({userMIMBalance: tokens.toPrecision(26)});
  }

  // handleExtraMinting = async() => {
  //   const {address,web3} = this.state;
  //   const mimm = await new web3.eth.Contract(MIM,mimAddress,{from: address});
  //   await mimm.methods.__mint(address, web3.utils.toWei('100000000','ether')).send({from: address}, (error, txHash) => {
  //     if(error){
  //       this.logError(error);
  //     }
  //     else{
  //       this.log('MIM minted for owner');
  //     }
  //   });
  // }

  handleDetails = (open) =>{
    this.setState({openDetails: open});
  }

  render = () => {
    const { message, error, isOpen ,maxDeposit, userShare, address,userMIMBalance,openDetails} = this.state;
    return (
      <AppDiv>
        <Welcome openDetails={openDetails} 
                 handleDetails={this.handleDetails}/>
        <Header/>
        <Balance mimBorrow = {maxDeposit}
                 handleMax = {this.handleMax}
                 handleCRVBalance = {this.handleCRVBalance} 
                 deposit = {this.deposit}
                 withdraw = {this.withdraw}
                 logError = {this.logError}/>

        <Message msg = {message} err = {error}/>

        <Footer fetch={this.handleFetch} 
                claim={this.handleClaim} 
                userShare={userShare} 
                userAddress={address}
                userMIMBalance = {userMIMBalance}
                handleUserMimBalance = {this.handleUserMimBalance}
                handleDetails={this.handleDetails}/>

        <Backdrop sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                  open={isOpen}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </AppDiv>
    );
  };

}
export default App;