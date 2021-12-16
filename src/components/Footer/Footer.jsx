import React, { Component } from 'react'
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import HomeIcon from '@mui/icons-material/Home';


import './Footer.css';

export default class Footer extends Component {
    constructor(props){
        super(props);
        this.state = {
            value: '',
            displayData:'',
        }
    }

    handleChange = async (event,newValue) => {
      this.setState({value: newValue});
      if(newValue === 0){
          this.setState({displayData: 'CRV: 0x6C0aF5282BE21338BcCB2A78fE516EA8A3530d35'});
      }
      else if(newValue === 1){
            await this.props.fetch();
            this.setState({displayData: this.props.userShare +' CRV'});
      }
      else if(newValue === 2){
            this.props.claim();
      }
    }


    render() {
        const {value,displayData} = this.state;
        return (
                <Box sx={{ width: 500 }}>
                    <span className='details'>{displayData}</span>
                <BottomNavigation showLabels value={value} onChange = {this.handleChange}>
                    <BottomNavigationAction label="CRV address" icon={<HomeIcon />}/>
                    <BottomNavigationAction label="Check CRV Balance" icon={<AccountBalanceWalletIcon />}/>
                    <BottomNavigationAction label="Claim CRVs" icon={<AddCircleOutlineIcon />}/>
                </BottomNavigation>
                </Box>
        )
    }
}
