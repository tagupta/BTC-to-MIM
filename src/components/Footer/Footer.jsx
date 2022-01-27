import React, { Component } from 'react'
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';


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
          this.setState({displayData: 'MIM: 0xd8e49E22C250B71aB479f93b6a95eA0dA575B758'});
      }
      else if(newValue === 1){
            await this.props.handleUserMimBalance();
            this.setState({displayData: this.props.userMIMBalance +' MIM'});
      }
      else if(newValue === 2){
        this.setState({displayData: "My address: " + this.props.userAddress});
      }
      else{
          this.props.handleDetails(true);
      }
    }


    render() {
        const {value,displayData} = this.state;
        return (
                <Box sx={{ width: 500 }}>
                    <span className='details'>{displayData}</span>
                <BottomNavigation showLabels value={value} onChange = {this.handleChange}>
                    <BottomNavigationAction label="MIM address" icon={<HomeIcon />}/>
                    <BottomNavigationAction label="Check MIM Balance" icon={<AccountBalanceWalletIcon />}/>
                    <BottomNavigationAction label="My address" icon={<PersonIcon />}/>
                    <BottomNavigationAction label="Details" icon={<SettingsIcon />}/>
                </BottomNavigation>
                </Box>
        )
    }
}
