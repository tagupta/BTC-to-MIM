import React, { Component } from 'react';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';

import { Container } from '@mui/material';
import './Balance.css';

const CssTextField = styled(TextField)({
    '& label.Mui-focused': {
    color: '#b406c4',
    },
    '& .MuiInput-underline:after': {
    borderBottomColor: '#b406c4',
    },
    '& .MuiOutlinedInput-root': {
    '& fieldset': {
        borderColor: '#b406c4',
    },
    '&:hover fieldset': {
        borderColor: '#b406c4',
    },
    '&.Mui-focused fieldset': {
        borderColor: '#b406c4',
    },
    },
});

export default class Balance extends Component {
    constructor (props){
      super(props);
      this.textInput = React.createRef();
      this.state ={
        balance : '0.003',
        errorMsg:'',
        showAlert: false,
      };
    }
    
    getBalance = async (event) => {
        if(event.target.value < 0){
            this.setState({errorMsg: 'Please enter appropriate balance',showAlert : true});
        }
       await this.setState({balance: event.target.value});
       console.log(this.state.balance); 
    }
    
    handleDeposit = () => {
        const {balance} = this.state;
        this.props.deposit(balance).catch(this.props.logError)
    }

    handleWithdraw = () =>{
       //console.log("Inside withdraw: "+ this.textInput.current.value);
       this.props.withdraw(this.textInput.current.value).catch(this.props.logError)
    }

    handleClick = async(e) => {
        e.preventDefault();
        await this.props.handleMax();
        this.textInput.current.value = this.props.mimBorrow;
        console.log("this.textInput.current.value: " + this.textInput.current.value);
    }
    closeAlert = () => {
        this.setState({showAlert: false});
    }

    render() {
        const {balance, showAlert , errorMsg} = this.state;
        return (
            <Container>
            { showAlert ? <Alert severity="error" className='alertClass' onClose={this.closeAlert}>{errorMsg}</Alert> : null }
                <div className='justify-content-around Div'>
                    <div className='mainDiv'>
                      <h5 className='H5'>Deposit BTC to Borrow MIM</h5>
                      <div style = {{ justifyContent: "space-evenly",
                                      display: 'flex'}}>
                      <CssTextField label="Enter Amount" 
                                    className="depositAmt"
                                    type="number" 
                                    defaultValue={0.003}
                                    onChange = {this.getBalance}
                                    size="small"/>
                      </div>
                       <div style = {{textAlign: 'center'}} className='buttonDiv'> 
                        <Button variant="contained" color="secondary" size="small"
                                onClick={this.handleDeposit}>
                                <strong>Deposit {balance} BTC</strong>
                        </Button>
                      </div>
                    </div>

                   <div className='mainDiv'>
                        <h5 className='H5'>Repay MIM to Withdraw BTC</h5>
                        <div style= {{display: 'flex',justifyContent: 'center'}}>
                        <CssTextField   inputRef={this.textInput}
                                        label="Enter Amount" 
                                        className="withdrawAmt"
                                        type="number" 
                                        size="small"
                                        defaultValue={this.props.mimBorrow}
                                        style = {{marginRight: '0.5rem'}}  />
                    
                        <Button variant="outlined" className='maxButton'
                                color="secondary" size="small"
                                onClick={this.handleClick} 
                                disabled={this.props.disable}><strong>Max</strong></Button>
                        </div>
                        <div style = {{textAlign: 'center'}} className='buttonDiv'>
                            <Button variant="contained" color="secondary" size="small"
                                    onClick={this.handleWithdraw}
                                    disabled={this.props.disable}>
                                <strong>Withdraw BTC</strong>
                            </Button>
                        </div>
                   </div>
                </div>
            </Container>
        )
    }
}
